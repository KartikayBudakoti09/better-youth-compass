import React from "react";
import MentorDashboard from "./pages/MentorDashboard";
import StudentAI from "./pages/StudentAI";

export default function App() {
  const [tab, setTab] = React.useState<"mentor" | "student">("mentor");

  return (
    <div>
      <div style={{ padding: 12, display: "flex", gap: 8, borderBottom: "1px solid #ddd" }}>
        <button onClick={() => setTab("mentor")} disabled={tab === "mentor"}>Mentor</button>
        <button onClick={() => setTab("student")} disabled={tab === "student"}>Student</button>
        <span style={{ marginLeft: "auto", opacity: 0.6 }}>Better Youth Compass (Starter)</span>
      </div>
      {tab === "mentor" ? <MentorDashboard /> : <StudentAI />}
    </div>
  );
}
