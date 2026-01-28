import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { aoai } from "../lib/openai.js";

export async function chat(req: HttpRequest, ctx: InvocationContext): Promise<HttpResponseInit> {
  const body = await req.json().catch(() => ({}));
  const role = (body.role ?? "student") as "student" | "mentor";
  const message = String(body.message ?? "").trim();

  if (!message) return { status: 400, jsonBody: { error: "Missing message" } };

  const system =
    role === "mentor"
      ? "You are a mentor assistant for Better Youth. Be practical, concise, and data-driven. Suggest next actions mentors can take."
      : "You are a friendly tutor for Better Youth students. Explain step-by-step, simple language, give short practice tasks.";

  const resp = await aoai.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: message }
    ],
    temperature: 0.4
  });

  const answer = resp.choices?.[0]?.message?.content ?? "";
  return { jsonBody: { answer } };
}

app.http("chat", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "chat",
  handler: chat
});
