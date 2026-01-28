import React, { useState } from "react";
import { postJson } from "../api";

export default function StudentAI() {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function ask() {
    setLoading(true);
    setA("");
    setErr("");
    try {
      const resp = await postJson<{ answer: string }>("chat", { role: "student", message: q });
      setA(resp.answer);
    } catch (e:any) {
      setErr(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Student AI Tutor</h2>
      <textarea value={q} onChange={e => setQ(e.target.value)} rows={5} style={{ width: "100%" }} />
      <br />
      <button onClick={ask} disabled={loading || !q.trim()}>{loading ? "Thinking..." : "Ask"}</button>
      {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>}
      <pre style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{a}</pre>
    </div>
  );
}
