import { app } from "@azure/functions";
import { aoai } from "../lib/openai.js";
import { ENV } from "../lib/env.js";
export async function chat(req, ctx) {
    const body = await req.json().catch(() => ({}));
    const role = (body.role ?? "student");
    const message = String(body.message ?? "").trim();
    if (!message)
        return { status: 400, jsonBody: { error: "Missing message" } };
    const system = role === "mentor"
        ? "You are a mentor assistant for Better Youth. Be practical, concise, and data-driven. Suggest next actions mentors can take."
        : "You are a friendly tutor for Better Youth students. Explain step-by-step, simple language, give short practice tasks.";
    const resp = await aoai.chat.completions.create({
        model: ENV.AZURE_OPENAI_DEPLOYMENT,
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
app.http("chat", {
    methods: ["POST"],
    authLevel: "anonymous",
    route: "chat",
    handler: chat
});
