"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaDescribe = metaDescribe;
const functions_1 = require("@azure/functions");
const databricks_js_1 = require("../lib/databricks.js");
const env_js_1 = require("../lib/env.js");
function qident(x) {
    return `\`${x.replace(/`/g, "``")}\``;
}
function fqtn(table) {
    return `${qident(env_js_1.ENV.DATABRICKS_CATALOG)}.${qident(env_js_1.ENV.DATABRICKS_SCHEMA)}.${qident(table)}`;
}
async function metaDescribe(req, ctx) {
    try {
        const table = req.query.get("table");
        if (!table) {
            // Helpful response instead of “looks broken”
            const listSql = `SHOW TABLES IN ${qident(env_js_1.ENV.DATABRICKS_CATALOG)}.${qident(env_js_1.ENV.DATABRICKS_SCHEMA)}`;
            const rows = await (0, databricks_js_1.runSql)(listSql);
            const tables = rows
                .map((r) => r.tableName ?? r.name ?? r.c1 ?? r[1])
                .filter(Boolean);
            return {
                status: 400,
                jsonBody: {
                    error: "Missing ?table=... (example: /api/meta/describe?table=students)",
                    catalog: env_js_1.ENV.DATABRICKS_CATALOG,
                    schema: env_js_1.ENV.DATABRICKS_SCHEMA,
                    tables,
                },
            };
        }
        const sql = `DESCRIBE TABLE ${fqtn(table)}`;
        const rows = await (0, databricks_js_1.runSql)(sql);
        return {
            status: 200,
            jsonBody: {
                catalog: env_js_1.ENV.DATABRICKS_CATALOG,
                schema: env_js_1.ENV.DATABRICKS_SCHEMA,
                table,
                rows,
            },
        };
    }
    catch (err) {
        return {
            status: 500,
            jsonBody: {
                error: "metaDescribe failed",
                message: err?.message ?? String(err),
            },
        };
    }
}
functions_1.app.http("metaDescribe", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "meta/describe",
    handler: metaDescribe,
});
