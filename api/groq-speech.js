// Server-side proxy for Groq TTS (audio/speech) — JSON in, binary audio out. This is only
// the fallback path when ElevenLabs TTS fails, but it hits api.groq.com directly and is
// CORS-blocked in the browser, so route it through the server too.
export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const key = process.env.REACT_APP_GROQ_KEY || process.env.GROQ_KEY;
  if (!key) { res.status(500).json({ error: "Groq key not configured" }); return; }
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
    });
    if (!upstream.ok) {
      const errText = await upstream.text();
      res.status(upstream.status);
      res.setHeader("Content-Type", "application/json");
      res.send(errText || JSON.stringify({ error: "Groq speech failed" }));
      return;
    }
    const arrayBuf = await upstream.arrayBuffer();
    res.status(200);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    res.send(Buffer.from(arrayBuf));
  } catch (e) {
    res.status(502).json({ error: "Groq speech proxy failed: " + (e && e.message ? e.message : "unknown") });
  }
}
