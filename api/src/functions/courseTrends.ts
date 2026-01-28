import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";

function colNames(rows: any[]): string[] {
  return rows
    .map((r) => r.col_name ?? r.colName ?? r.c1 ?? r.name ?? r[0])
    .filter((x) => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    // DESCRIBE in Databricks can contain partition/info rows; ignore those
    .filter((c) => !c.startsWith("#"));
}

async function describeTable(table: string): Promise<string[]> {
  const sql = `DESCRIBE ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.${table}`;
  const rows = await runSql(sql);
  return colNames(rows);
}

function pick(cols: string[], preferred: string[]): string | null {
  const lower = new Map(cols.map((c) => [c.toLowerCase(), c]));
  for (const p of preferred) {
    const hit = lower.get(p.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

export async function courseTrends(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const weeks = Number(req.query.get("weeks") ?? "12");
  const safeWeeks = Number.isFinite(weeks) ? Math.max(1, Math.min(52, weeks)) : 12;

  const catalog = ENV.DATABRICKS_CATALOG;
  const schema = ENV.DATABRICKS_SCHEMA;

  const [enrCols, progCols] = await Promise.all([
    describeTable("program_enrollment"),
    describeTable("programs"),
  ]);

  // program_enrollment columns (auto-detect)
  const enrDate = pick(enrCols, ["enrollment_date", "enrolled_at", "created_at", "createdon", "date"]);
  const enrStudentId = pick(enrCols, ["student_id", "studentid", "student"]);
  const enrProgramId = pick(enrCols, ["program_id", "programid", "program"]);

  // programs columns (auto-detect)
  const progProgramId = pick(progCols, ["program_id", "id", "programid"]);
  const progName = pick(progCols, ["program_name", "name", "title"]);

  if (!enrDate || !enrStudentId || !enrProgramId) {
    return {
      status: 400,
      jsonBody: {
        error: "courseTrends: could not map required columns in program_enrollment",
        needed: ["(enrollment date)", "student_id", "program_id"],
        program_enrollment_columns: enrCols,
      },
    };
  }

  if (!progProgramId || !progName) {
    return {
      status: 400,
      jsonBody: {
        error: "courseTrends: could not map required columns in programs",
        needed: ["program_id", "program name"],
        programs_columns: progCols,
      },
    };
  }

  const sql = `
    SELECT
      date_trunc('week', e.${enrDate}) AS week_start,
      p.${progName} AS program,
      COUNT(DISTINCT e.${enrStudentId}) AS enrolled_students
    FROM ${catalog}.${schema}.program_enrollment e
    JOIN ${catalog}.${schema}.programs p
      ON e.${enrProgramId} = p.${progProgramId}
    WHERE e.${enrDate} >= dateadd(week, -${safeWeeks}, current_date())
    GROUP BY 1,2
    ORDER BY 1 DESC, 3 DESC
    LIMIT 500
  `;

  const rows = await runSql(sql);
  return { jsonBody: { weeks: safeWeeks, rows } };
}

app.http("courseTrends", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "analytics/course-trends",
  handler: courseTrends,
});
