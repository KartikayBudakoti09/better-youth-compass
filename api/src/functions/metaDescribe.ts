import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { runSql } from "../lib/databricks.js";
import { ENV } from "../lib/env.js";

function qident(x: string) {
  return `\`${x.replace(/`/g, "``")}\``;
}
function fqtn(table: string) {
  return `${qident(ENV.DATABRICKS_CATALOG)}.${qident(ENV.DATABRICKS_SCHEMA)}.${qident(table)}`;
}

export async function metaDescribe(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  try {
    const table = req.query.get("table");

    if (!table) {
      // Helpful response instead of “looks broken”
      const listSql = `SHOW TABLES IN ${qident(ENV.DATABRICKS_CATALOG)}.${qident(ENV.DATABRICKS_SCHEMA)}`;
      const rows: any[] = await runSql(listSql);
      const tables = rows
        .map((r: any) => r.tableName ?? r.name ?? r.c1 ?? r[1])
        .filter(Boolean);

      return {
        status: 400,
        jsonBody: {
          error: "Missing ?table=... (example: /api/meta/describe?table=students)",
          catalog: ENV.DATABRICKS_CATALOG,
          schema: ENV.DATABRICKS_SCHEMA,
          tables,
        },
      };
    }

    const sql = `DESCRIBE TABLE ${fqtn(table)}`;
    const rows = await runSql(sql);

    return {
      status: 200,
      jsonBody: {
        catalog: ENV.DATABRICKS_CATALOG,
        schema: ENV.DATABRICKS_SCHEMA,
        table,
        rows,
      },
    };
  } catch (err: any) {
    return {
      status: 500,
      jsonBody: {
        error: "metaDescribe failed",
        message: err?.message ?? String(err),
      },
    };
  }
}

app.http("metaDescribe", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "meta/describe",
  handler: metaDescribe,
});
