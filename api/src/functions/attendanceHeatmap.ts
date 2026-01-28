import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";

type Col = string;

function colList(rows: any[]): string[] {
  // metaDescribe returns many shapes; this is defensive
  return (rows || [])
    .map((r) => (r?.col_name ?? r?.colName ?? r?.name ?? r?.c0 ?? r?.[0] ?? "").toString().trim())
    .filter(Boolean)
    .filter((x) => !x.startsWith("#"))
    .filter((x) => x.toLowerCase() !== "col_name");
}

function pick(cols: Col[], candidates: string[]): string | null {
  const lower = new Map(cols.map((c) => [c.toLowerCase(), c]));
  for (const cand of candidates) {
    const hit = lower.get(cand.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

async function describeTable(catalog: string, schema: string, table: string) {
  const rows = await runSql(`DESCRIBE ${catalog}.${schema}.${table}`);
  return colList(rows);
}

export async function attendanceHeatmap(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const catalog = ENV.DATABRICKS_CATALOG; // you have hackathon
  const schema = ENV.DATABRICKS_SCHEMA;   // you have amer

  // Describe tables to avoid guessing column names
  const attendanceCols = await describeTable(catalog, schema, "attendance");
  const sessionCols = await describeTable(catalog, schema, "program_sessions");
  const programsCols = await describeTable(catalog, schema, "programs");

  const aDate = pick(attendanceCols, ["attendance_date", "date", "session_date"]);
  const aSessionId = pick(attendanceCols, ["session_id", "program_session_id", "sessionid"]);
  const aStatus = pick(attendanceCols, ["attendance_status", "status"]);

  if (!aDate || !aSessionId) {
    return {
      status: 500,
      jsonBody: {
        error: "Attendance table is missing required columns to build the heatmap.",
        required: ["attendance_date (or equivalent)", "session_id (or equivalent)"],
        attendanceColumns: attendanceCols,
      },
    };
  }

  // program_sessions join keys
  const sSessionId = pick(sessionCols, ["session_id", "id"]);
  const sProgramId = pick(sessionCols, ["program_id", "programid"]);

  if (!sSessionId || !sProgramId) {
    return {
      status: 500,
      jsonBody: {
        error: "program_sessions table is missing required columns to join attendance -> programs.",
        required: ["session_id (or id)", "program_id"],
        program_sessions_columns: sessionCols,
      },
    };
  }

  // programs columns
  const pProgramId = pick(programsCols, ["program_id", "id"]);
  const pProgramName = pick(programsCols, ["program_name", "name", "title"]);

  if (!pProgramId) {
    return {
      status: 500,
      jsonBody: {
        error: "programs table is missing program_id/id column.",
        programs_columns: programsCols,
      },
    };
  }

  // Presence logic: if attendance_status exists, treat these as "present"
  // (you can tweak list if your data uses different values)
  const presentExpr = aStatus
    ? `
      CASE
        WHEN lower(a.${aStatus}) IN ('present','attended','checked_in','on_time','late') THEN 1
        ELSE 0
      END
    `
    : `0`;

  const programLabel = pProgramName ? `p.${pProgramName}` : `cast(p.${pProgramId} as string)`;

  const sql = `
    SELECT
      dayofweek(a.${aDate}) AS dow,
      ${programLabel} AS program,
      AVG(${presentExpr}) AS attendance_rate
    FROM ${catalog}.${schema}.attendance a
    JOIN ${catalog}.${schema}.program_sessions s
      ON a.${aSessionId} = s.${sSessionId}
    JOIN ${catalog}.${schema}.programs p
      ON s.${sProgramId} = p.${pProgramId}
    WHERE a.${aDate} >= dateadd(day, -90, current_date())
    GROUP BY 1,2
    ORDER BY 2,1
    LIMIT 700
  `;

  const rows = await runSql(sql);
  return { jsonBody: { catalog, schema, rows } };
}

app.http("attendanceHeatmap", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "analytics/attendance-heatmap",
  handler: attendanceHeatmap,
});
