"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaTables = metaTables;
const functions_1 = require("@azure/functions");
const databricks_js_1 = require("../lib/databricks.js");
const env_js_1 = require("../lib/env.js");
async function metaTables(req, ctx) {
    const sql = `SHOW TABLES IN ${env_js_1.ENV.DATABRICKS_CATALOG}.${env_js_1.ENV.DATABRICKS_SCHEMA}`;
    const rows = await (0, databricks_js_1.runSql)(sql);
    const tables = rows.map((r) => r.tableName ?? r.name ?? r.c1 ?? r[1]).filter(Boolean);
    return { jsonBody: { catalog: env_js_1.ENV.DATABRICKS_CATALOG, schema: env_js_1.ENV.DATABRICKS_SCHEMA, tables } };
}
functions_1.app.http("metaTables", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "meta/tables",
    handler: metaTables
});
