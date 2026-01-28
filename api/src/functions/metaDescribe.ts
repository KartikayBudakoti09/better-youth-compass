import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";

function normalizeTableName(x: string) {
  return (x || "").trim();
}

function pickTableNameRow(r: any): string | undefined {
  // Different Databricks drivers return different shapes
  return r?.tableName ?? r?.name ?? r?.c1 ?? r?.[1] ?? r?.[0];
}

export async function metaDescribe(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const catalog = ENV.DATABRICKS_CATALOG;
  const schema = ENV.DATABRICKS_SCHEMA;

  // Always fetch tables so we can validate + give a helpful response
  const tablesRows = await runSql(`SHOW TABLES IN ${catalog}.${schema}`);
  const tables = (tablesRows || [])
    .map(pickTableNameRow)
    .map((t: any) => (typeof t === "string" ? t : ""))
    .map((t) => t.trim())
    .filter(Boolean)
    .sort();

  const tableParam = normalizeTableName(req.query.get("table") ?? "");

  // If user didn't pass table, return help + list of real tables
  if (!tableParam) {
    return {
      status: 400,
      jsonBody: {
        error: `Missing ?table=... (example: /api/meta/describe?table=students)`,
        catalog,
        schema,
        tables,
      },
    };
  }

  // Validate requested table exists (no assumptions)
  const table = tableParam;
  const exists = tables.includes(table);

  if (!exists) {
    return {
      status: 404,
      jsonBody: {
        error: `Unknown table '${table}'. Use one of the tables returned by /api/meta/tables.`,
        catalog,
        schema,
        tables,
      },
    };
  }

  // Describe the real table
  const fullName = `${catalog}.${schema}.${table}`;
  const descRows = await runSql(`DESCRIBE ${fullName}`);

  // Try to extract columns cleanly (stop when Databricks starts metadata sections)
  const columns: Array<{ name: string; type: string; comment?: string }> = [];
  for (const r of descRows || []) {
    const name = (r?.col_name ?? r?.colName ?? r?.name ?? r?.c0 ?? r?.[0] ?? "").toString();
    const type = (r?.data_type ?? r?.dataType ?? r?.type ?? r?.c1 ?? r?.[1] ?? "").toString();
    const comment = (r?.comment ?? r?.c2 ?? r?.[2] ?? "").toString();

    if (!name) continue;
    if (name.startsWith("#")) break; // Databricks section markers like "# Detailed Table Information"
    if (name.toLowerCase().includes("col_name")) continue;

    columns.push({ name, type, comment: comment || undefined });
  }

  return {
    jsonBody: {
      catalog,
      schema,
      table,
      fullName,
      columns,
      raw: descRows, // keep raw too (helps debugging)
    },
  };
}

app.http("metaDescribe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "meta/describe",
  handler: metaDescribe,
});
