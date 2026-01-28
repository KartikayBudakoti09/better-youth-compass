import { ENV } from "./env.js";

type DbxStatementState = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELED";

type StatementResponse = {
  statement_id: string;
  status: { state: DbxStatementState; error?: { message?: string } };
  result?: {
    schema?: { columns: Array<{ name: string; type_text: string }> };
    data_array?: any[][];
  };
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function dbxFetch(path: string, init?: RequestInit) {
  const url = `${ENV.DATABRICKS_HOST}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Authorization": `Bearer ${ENV.DATABRICKS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Databricks API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Runs a SQL statement on a Databricks SQL Warehouse and returns rows as array of objects.
 * Keep result sets SMALL (always LIMIT) for hackathon speed.
 */
export async function runSql(statement: string, timeoutMs = 15000): Promise<any[]> {
  const body = {
    warehouse_id: ENV.DATABRICKS_WAREHOUSE_ID,
    catalog: ENV.DATABRICKS_CATALOG,
    schema: ENV.DATABRICKS_SCHEMA,
    statement,
    disposition: "INLINE",
    format: "JSON_ARRAY"
  };

  const created: StatementResponse = await dbxFetch(`/api/2.0/sql/statements/`, {
    method: "POST",
    body: JSON.stringify(body)
  });

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const polled: StatementResponse = await dbxFetch(`/api/2.0/sql/statements/${created.statement_id}`, {
      method: "GET"
    });

    const state = polled.status.state;
    if (state === "SUCCEEDED") {
      const cols = polled.result?.schema?.columns?.map(c => c.name) ?? [];
      const rows = polled.result?.data_array ?? [];
      return rows.map(r => Object.fromEntries(r.map((v, i) => [cols[i] ?? `c${i}`, v])));
    }
    if (state === "FAILED" || state === "CANCELED") {
      throw new Error(`SQL ${state}: ${polled.status.error?.message ?? "Unknown error"}`);
    }
    await sleep(250);
  }

  throw new Error(`SQL timeout after ${timeoutMs}ms`);
}
