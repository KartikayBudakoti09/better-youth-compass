const base = import.meta.env.VITE_API_BASE ?? "";

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${base}/api/${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${base}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
