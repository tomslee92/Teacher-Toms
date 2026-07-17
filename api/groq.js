// Server-side proxy for Groq chat completions.
// The browser can't call api.groq.com directly (Groq blocks CORS from all origins), so the
// client calls this same-origin route and we forward the request with the server-side key.
// Same pattern/style as notify.js / subscribe.js. Groq's status is passed through so the
// client's existing rate-limit / error handling (and Gemini fallback on !ok) still works.
export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const key = process.env.REACT_APP_GROQ_KEY || process.env.GROQ_KEY;
  if (!key) { res.status(500).json({ error: "Groq key not configured" }); return; }
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "Groq proxy failed: " + (e && e.message ? e.message : "unknown") });
  }
}
