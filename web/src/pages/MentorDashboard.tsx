import React, { useEffect, useState } from "react";
import { getJson } from "../api";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Row = { week_start: string; program: string; enrolled_students: number };

export default function MentorDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    getJson<{ rows: Row[] }>("analytics/course-trends?weeks=12")
      .then(d => setRows(d.rows))
      .catch(e => setErr(String(e)));
  }, []);

  const totals = new Map<string, number>();
  rows.forEach(r => totals.set(r.program, (totals.get(r.program) ?? 0) + Number(r.enrolled_students ?? 0)));
  const topPrograms = [...totals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(x=>x[0]);

  const byWeek = new Map<string, any>();
  rows.filter(r => topPrograms.includes(r.program)).forEach(r => {
    const k = r.week_start;
    if (!byWeek.has(k)) byWeek.set(k, { week_start: k });
    byWeek.get(k)[r.program] = r.enrolled_students;
  });

  const data = [...byWeek.values()].sort((a,b)=> String(a.week_start).localeCompare(String(b.week_start)));

  return (
    <div style={{ padding: 16 }}>
      <h2>Mentor Dashboard</h2>
      {err && <pre style={{ color: "crimson", whiteSpace: "pre-wrap" }}>{err}</pre>}

      <div style={{ width: "100%", height: 360 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <XAxis dataKey="week_start" />
            <YAxis />
            <Tooltip />
            <Legend />
            {topPrograms.map(p => <Line key={p} type="monotone" dataKey={p} dot={false} />)}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p style={{ opacity: 0.7 }}>
        If you see SQL errors, first open:
        <br/>
        <code>/api/meta/describe?table=program_enrollment</code> and <code>/api/meta/describe?table=programs</code>
        <br/>
        Then update the SQL column names in <code>api/src/functions/courseTrends.ts</code>.
      </p>
    </div>
  );
}
