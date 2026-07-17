// Server-side proxy for Groq Whisper transcription (multipart audio in → JSON out).
// bodyParser is disabled so the raw multipart body (file + fields + boundary) passes through
// unchanged; we just add the server-side key. Fixes the record button, which otherwise hits
// api.groq.com directly and is CORS-blocked in the browser.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  const key = process.env.REACT_APP_GROQ_KEY || process.env.GROQ_KEY;
  if (!key) { res.status(500).json({ error: "Groq key not configured" }); return; }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const upstream = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": req.headers["content-type"], // preserve the multipart boundary
      },
      body,
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: "Groq transcribe proxy failed: " + (e && e.message ? e.message : "unknown") });
  }
}
