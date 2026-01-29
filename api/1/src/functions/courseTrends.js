import { app } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";
/**
 * IMPORTANT:
 * Use /api/meta/describe?table=program_enrollment and /api/meta/describe?table=programs
 * Then update the SQL below to match your real column names.
 */
export async function courseTrends(req, ctx) {
    const weeks = Number(req.query.get("weeks") ?? "12");
    const safeWeeks = Number.isFinite(weeks) ? Math.max(1, Math.min(52, weeks)) : 12;
    // ---- Update these column names after you check DESCRIBE ----
    const sql = `
    SELECT
      date_trunc('week', enrollment_date) AS week_start,
      p.program_name AS program,
      COUNT(DISTINCT e.student_id) AS enrolled_students
    FROM ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.program_enrollment e
    JOIN ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.programs p
      ON e.program_id = p.program_id
    WHERE enrollment_date >= dateadd(week, -${safeWeeks}, current_date())
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
    handler: courseTrends
});
