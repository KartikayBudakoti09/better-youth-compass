import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";

export async function metaTables(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const sql = `SHOW TABLES IN ${ENV.DATABRICKS_CATALOG}.${ENV.DATABRICKS_SCHEMA}`;
  const rows = await runSql(sql);

  const tables = rows.map((r: any) => r.tableName ?? r.name ?? r.c1 ?? r[1]).filter(Boolean);

  return { jsonBody: { catalog: ENV.DATABRICKS_CATALOG, schema: ENV.DATABRICKS_SCHEMA, tables } };
}

app.http("metaTables", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "meta/tables",
  handler: metaTables
});
