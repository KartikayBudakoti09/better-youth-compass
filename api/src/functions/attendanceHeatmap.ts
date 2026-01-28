import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";

function normalizeCols(rows: any[]): string[] {
  // DESCRIBE TABLE returns different shapes depending on driver.
  // Common patterns: { col_name }, { column_name }, or c0
  return (rows || [])
    .map((r: any) => (r.col_name ?? r.column_name ?? r.c0 ?? r[0] ?? "").toString())
    .map((s: string) => s.trim())
    .filter(Boolean)
    .filter((name: string) => !name.startsWith("#")); // databricks describe headers
}

export async function attendanceHeatmap(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  const fq = (t: string) => `${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.${t}`;

  // 1) Inspect columns so we don't "assume" the schema
  const descAttendance = await runSql(`DESCRIBE TABLE ${fq("attendance")}`);
  const aCols = normalizeCols(descAttendance);

  const descSessions = await runSql(`DESCRIBE TABLE ${fq("program_sessions")}`);
  const psCols = normalizeCols(descSessions);

  const descPrograms = await runSql(`DESCRIBE TABLE ${fq("programs")}`);
  const pCols = normalizeCols(descPrograms);

  // 2) Decide join columns safely
  const aSessionCol = aCols.includes("session_id") ? "session_id" : null;
  const psSessionCol = psCols.includes("session_id") ? "session_id" : null;

  const psProgramCol =
    psCols.includes("program_id") ? "program_id" :
    psCols.includes("program") ? "program" :
    null;

  const pProgramIdCol =
    pCols.includes("program_id") ? "program_id" :
    pCols.includes("id") ? "id" :
    null;

  const pProgramNameCol =
    pCols.includes("program_name") ? "program_name" :
    pCols.includes("name") ? "name" :
    null;

  if (!aSessionCol || !psSessionCol) {
    return {
      status: 500,
      jsonBody: {
        error: "Missing join key for attendance -> program_sessions",
        attendanceColumns: aCols,
        programSessionsColumns: psCols
      }
    };
  }
  if (!psProgramCol || !pProgramIdCol || !pProgramNameCol) {
    return {
      status: 500,
      jsonBody: {
        error: "Missing join key for program_sessions -> programs",
        programSessionsColumns: psCols,
        programsColumns: pCols
      }
    };
  }

  // 3) Decide how to compute PRESENT without assuming a 'present' boolean
  let presentExpr: string | null = null;

  if (aCols.includes("present")) {
    presentExpr = `CASE WHEN a.present = true THEN 1 ELSE 0 END`;
  } else if (aCols.includes("is_present")) {
    presentExpr = `CASE WHEN a.is_present = true THEN 1 ELSE 0 END`;
  } else if (aCols.includes("attendance_status")) {
    // Your table has this column (per your screenshot).
    // Treat common variants as "present"
    presentExpr = `
      CASE
        WHEN lower(trim(a.attendance_status)) IN ('present','attended','in','yes','y') THEN 1
        ELSE 0
      END
    `;
  } else if (aCols.includes("status")) {
    presentExpr = `
      CASE
        WHEN lower(trim(a.status)) IN ('present','attended','in','yes','y') THEN 1
        ELSE 0
      END
    `;
  }

  if (!presentExpr) {
    return {
      status: 500,
      jsonBody: {
        error: "Could not find a present/attendance flag column in attendance table",
        attendanceColumns: aCols
      }
    };
  }

  // 4) Attendance date column
  const dateCol =
    aCols.includes("attendance_date") ? "attendance_date" :
    aCols.includes("date") ? "date" :
    null;

  if (!dateCol) {
    return {
      status: 500,
      jsonBody: { error: "No attendance date column found", attendanceColumns: aCols }
    };
  }

  // 5) Build heatmap query (day-of-week x program)
  // Use date_sub(current_date(), 90) to avoid timestamp casting issues.
  // dayofweek() returns 1-7 (Sun..Sat) in Spark SQL.
  const sql = `
    SELECT
      dayofweek(a.${dateCol}) AS dow,
      p.${pProgramNameCol} AS program,
      AVG(${presentExpr}) AS attendance_rate
    FROM ${fq("attendance")} a
    JOIN ${fq("program_sessions")} ps
      ON a.${aSessionCol} = ps.${psSessionCol}
    JOIN ${fq("programs")} p
      ON ps.${psProgramCol} = p.${pProgramIdCol}
    WHERE a.${dateCol} >= date_sub(current_date(), 90)
    GROUP BY 1,2
    ORDER BY 2,1
  `;

  const rows = await runSql(sql);

  // Return a clean shape the frontend can consume
  return {
    jsonBody: {
      rows: rows.map((r: any) => ({
        // normalize possible driver shapes: {dow, program, attendance_rate} or {c0,c1,c2}
        dow: r.dow ?? r.c0 ?? r[0],
        program: r.program ?? r.c1 ?? r[1],
        attendance_rate: r.attendance_rate ?? r.c2 ?? r[2]
      }))
    }
  };
}

app.http("attendanceHeatmap", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "analytics/attendance-heatmap",
  handler: attendanceHeatmap
});
