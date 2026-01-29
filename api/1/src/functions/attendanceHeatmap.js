import { app } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";
/**
 * Heatmap: day-of-week x program
 * Adjust column names after DESCRIBE attendance/program_enrollment/programs
 */
export async function attendanceHeatmap(req, ctx) {
    const sql = `
    SELECT
      dayofweek(a.attendance_date) AS dow,
      p.program_name AS program,
      AVG(CASE WHEN a.present = true THEN 1 ELSE 0 END) AS attendance_rate
    FROM ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.attendance a
    JOIN ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.program_enrollment e
      ON a.student_id = e.student_id
    JOIN ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.programs p
      ON e.program_id = p.program_id
    WHERE a.attendance_date >= dateadd(day, -90, current_date())
    GROUP BY 1,2
    ORDER BY 2,1
    LIMIT 700
  `;
    const rows = await runSql(sql);
    return { jsonBody: { rows } };
}
app.http("attendanceHeatmap", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "analytics/attendance-heatmap",
    handler: attendanceHeatmap
});
