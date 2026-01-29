"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = chat;
const functions_1 = require("@azure/functions");
const openai_js_1 = require("../lib/openai.js");
const env_js_1 = require("../lib/env.js");
async function chat(req, ctx) {
    const body = await req.json().catch(() => ({}));
    const role = (body.role ?? "student");
    const message = String(body.message ?? "").trim();
    if (!message)
        return { status: 400, jsonBody: { error: "Missing message" } };
    const system = role === "mentor"
        ? "You are a mentor assistant for Better Youth. Be practical, concise, and data-driven. Suggest next actions mentors can take."
        : "You are a friendly tutor for Better Youth students. Explain step-by-step, simple language, give short practice tasks.";
    const resp = await openai_js_1.aoai.chat.completions.create({
        model: env_js_1.ENV.AZURE_OPENAI_DEPLOYMENT,
        messages: [
            { role: "system", content: system },
            { role: "user", content: message }
        ],
        temperature: 0.4
    });
    return { jsonBody: {
            answer: resp.choices[0].message.content
        } };
}
functions_1.app.http("chat", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "chat",
    handler: chat
});
