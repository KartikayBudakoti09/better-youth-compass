import { app } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";
export async function metaTables(req, ctx) {
    const sql = `SHOW TABLES IN ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}`;
    const rows = await runSql(sql);
    return { jsonBody: { catalog: ENV.DATABRICKS_CATALOG, schema: ENV.DATABRICKS_SCHEMA, tables: rows } };
}
app.http("metaTables", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "meta/tables",
    handler: metaTables
});
