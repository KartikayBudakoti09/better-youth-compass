"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceHeatmap = attendanceHeatmap;
const functions_1 = require("@azure/functions");
const databricks_js_1 = require("../lib/databricks.js");
const env_js_1 = require("../lib/env.js");
function qident(x) {
    // Databricks SQL identifier quoting
    return `\`${x.replace(/`/g, "``")}\``;
}
function fqtn(table) {
    return `${qident(env_js_1.ENV.DATABRICKS_CATALOG)}.${qident(env_js_1.ENV.DATABRICKS_SCHEMA)}.${qident(table)}`;
}
function pick(cols, candidates) {
    for (const c of candidates)
        if (cols.has(c))
            return c;
    return null;
}
async function describeCols(table) {
    const sql = `DESCRIBE TABLE ${fqtn(table)}`;
    const rows = await (0, databricks_js_1.runSql)(sql);
    // Databricks DESCRIBE often returns columns as: col_name / data_type / comment
    // But your runSql sometimes returns generic c0/c1/c2 – handle both.
    const names = new Set();
    for (const r of rows) {
        const col = r.col_name ??
            r.column_name ??
            r.colName ??
            r.c0 ??
            r.C0 ??
            r[0];
        if (typeof col === "string") {
            const trimmed = col.trim();
            // Stop at partition/info sections
            if (!trimmed || trimmed.startsWith("#"))
                continue;
            names.add(trimmed);
        }
    }
    return names;
}
async function attendanceHeatmap(req, ctx) {
    try {
        // Validate required tables exist by describing (fast + fails clearly)
        const attendanceCols = await describeCols("attendance");
        const programsCols = await describeCols("programs");
        const programSessionsCols = await describeCols("program_sessions");
        // Pick columns without assuming exact names
        const attendanceDateCol = pick(attendanceCols, ["attendance_date", "date", "session_date", "attended_on", "attended_at"]);
        const presentCol = pick(attendanceCols, ["present", "is_present", "attended", "was_present"]);
        const programIdInAttendance = pick(attendanceCols, ["program_id"]);
        const programSessionIdInAttendance = pick(attendanceCols, ["program_session_id", "session_id"]);
        const programIdInSessions = pick(programSessionsCols, ["program_id"]);
        const sessionIdInSessions = pick(programSessionsCols, ["program_session_id", "session_id"]);
        const programIdInPrograms = pick(programsCols, ["program_id", "id"]);
        const programNameInPrograms = pick(programsCols, ["program_name", "name", "title"]);
        if (!attendanceDateCol) {
            return {
                status: 500,
                jsonBody: {
                    error: "Could not find a date column in attendance table",
                    attendanceColumns: Array.from(attendanceCols),
                },
            };
        }
        if (!presentCol) {
            return {
                status: 500,
                jsonBody: {
                    error: "Could not find a present/attendance flag column in attendance table",
                    attendanceColumns: Array.from(attendanceCols),
                },
            };
        }
        if (!programNameInPrograms || !programIdInPrograms) {
            return {
                status: 500,
                jsonBody: {
                    error: "Could not find program id/name columns in programs table",
                    programsColumns: Array.from(programsCols),
                },
            };
        }
        // Strategy (no assumptions):
        // A) If attendance has program_id -> join programs directly.
        // B) Else if attendance has program_session_id/session_id -> join program_sessions -> programs.
        // C) Else return a clear JSON error.
        const a = fqtn("attendance");
        const s = fqtn("program_sessions");
        const p = fqtn("programs");
        const dateExpr = `a.${qident(attendanceDateCol)}`;
        const presentExpr = `a.${qident(presentCol)}`;
        const baseAgg = `
      SELECT
        dayofweek(${dateExpr}) AS dow,
        prog.${qident(programNameInPrograms)} AS program,
        AVG(CASE WHEN ${presentExpr} = true THEN 1 ELSE 0 END) AS attendance_rate
      FROM __FROM__
      WHERE ${dateExpr} >= dateadd(day, -90, current_date())
      GROUP BY 1,2
      ORDER BY 2,1
      LIMIT 700
    `;
        let sqlToRun = null;
        let mode = null;
        if (programIdInAttendance) {
            // A) attendance.program_id -> programs
            sqlToRun = baseAgg.replace("__FROM__", `${a} a
         JOIN ${p} prog
           ON a.${qident(programIdInAttendance)} = prog.${qident(programIdInPrograms)}`);
            mode = "attendance.program_id -> programs";
        }
        else if (programSessionIdInAttendance && programIdInSessions && sessionIdInSessions) {
            // B) attendance.session -> program_sessions -> programs
            sqlToRun = baseAgg.replace("__FROM__", `${a} a
         JOIN ${s} ps
           ON a.${qident(programSessionIdInAttendance)} = ps.${qident(sessionIdInSessions)}
         JOIN ${p} prog
           ON ps.${qident(programIdInSessions)} = prog.${qident(programIdInPrograms)}`);
            mode = "attendance.session_id -> program_sessions -> programs";
        }
        else {
            return {
                status: 500,
                jsonBody: {
                    error: "Could not find a way to link attendance to programs. " +
                        "Expected either attendance.program_id OR attendance.program_session_id/session_id with program_sessions.*",
                    attendanceColumns: Array.from(attendanceCols),
                    programSessionsColumns: Array.from(programSessionsCols),
                    programsColumns: Array.from(programsCols),
                },
            };
        }
        const rows = await (0, databricks_js_1.runSql)(sqlToRun);
        return {
            status: 200,
            jsonBody: { mode, rows },
        };
    }
    catch (err) {
        return {
            status: 500,
            jsonBody: {
                error: "attendanceHeatmap failed",
                message: err?.message ?? String(err),
            },
        };
    }
}
functions_1.app.http("attendanceHeatmap", {
    methods: ["GET"],
    authLevel: "anonymous",
    route: "analytics/attendance-heatmap",
    handler: attendanceHeatmap,
});
