import { app } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";
export async function metaDescribe(req, ctx) {
    const table = req.query.get("table");
    if (!table)
        return { status: 400, jsonBody: { error: "Missing ?table=students" } };
    if (!/^[A-Za-z0-9_]+$/.test(table))
        return { status: 400, jsonBody: { error: "Invalid table name" } };
    const sql = `DESCRIBE TABLE ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}.${table}`;
    const rows = await runSql(sql);
    return { jsonBody: { table, columns: rows } };
}
app.http("metaDescribe", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "meta/describe",
    handler: metaDescribe
});
