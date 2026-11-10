const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};
const SYSTEM = "Give useful and short answers. Don't forget to add, \"sir\".";
const MODEL = "llama-3.3-70b-versatile";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) return json({ error: "GROQ_API_KEY is not set" }, 500);

  let messages;
  try { ({ messages } = await req.json()); } catch { return json({ error: "bad json" }, 400); }
  if (!Array.isArray(messages)) return json({ error: "messages required" }, 400);
  // trust boundary: only user/assistant roles, capped size
  const clean = messages.slice(-10)
    .filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!clean.length) return json({ error: "empty" }, 400);

  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: "system", content: SYSTEM }, ...clean] }),
  });
  const d = await r.json();
  if (!r.ok) return json({ error: d?.error?.message ?? "Groq error" }, 502);
  return json({ reply: d.choices[0].message.content.trim() });
});
