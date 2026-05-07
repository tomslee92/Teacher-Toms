import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ulpnmewvejvpancvqnrp.supabase.co";
const SUPABASE_KEY = "sb_publishable_sDP-kuCv5E2LmpDMPp8Y4A_n1ryWhNO";
const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;
const TEACHER_PASS = "wayve2026";
const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const FONT_DISPLAY = "'DM Serif Display', Georgia, serif";

// ── Supabase ──────────────────────────────────────────────────────────────────
const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", "Prefer": opts.prefer || "return=representation", ...opts.headers },
    ...opts
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};
const db = {
  get: (t, q = "") => sb(`${t}?${q}`),
  insert: (t, d) => sb(t, { method: "POST", body: JSON.stringify(d) }),
  update: (t, q, d) => sb(`${t}?${q}`, { method: "PATCH", body: JSON.stringify(d) }),
  delete: (t, q) => sb(`${t}?${q}`, { method: "DELETE", headers: { "Prefer": "return=representation" } }),
  upsert: (t, d) => sb(t, { method: "POST", body: JSON.stringify(d), headers: { "Prefer": "resolution=merge-duplicates,return=representation" } }),
};

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#0F1117", bgSoft: "#161B27", bgMid: "#1E2535", bgCard: "#1A2030",
  bgGlass: "rgba(255,255,255,0.04)",
  text: "#F0EDE8", textMid: "#A8A39B", textLight: "#5C5850",
  border: "#2A3145", borderLight: "#222840",
  gold: "#C9A84C", goldBright: "#E8C56A", goldDim: "#8B6E2E",
  goldBg: "rgba(201,168,76,0.1)", goldBorder: "rgba(201,168,76,0.25)",
  success: "#2ECC7A", successBg: "rgba(46,204,122,0.1)", successBorder: "rgba(46,204,122,0.2)",
  error: "#E05555", errorBg: "rgba(224,85,85,0.1)", errorBorder: "rgba(224,85,85,0.2)",
  retry: "#E8913A", retryBg: "rgba(232,145,58,0.1)", retryBorder: "rgba(232,145,58,0.2)",
  gradGold: "linear-gradient(135deg, #C9A84C 0%, #E8C56A 50%, #C9A84C 100%)",
  gradDark: "linear-gradient(135deg, #0F1117 0%, #161B27 100%)",
  gradCard: "linear-gradient(145deg, #1A2030, #161B27)",
  gradSuccess: "linear-gradient(135deg, #1A7A45, #2ECC7A)",
  gradNight: "linear-gradient(135deg, #0D1B2A 0%, #1A1035 50%, #0D1B2A 100%)",
};

// ── Global Style ──────────────────────────────────────────────────────────────
const GlobalStyle = () => React.createElement("style", null, `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{font-family:${FONT};background:${C.bg};color:${C.text};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}
  input,button,select,textarea{font-family:${FONT};}
  input::placeholder,textarea::placeholder{color:${C.textLight};}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-track{background:transparent;}
  ::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px;}
  ::-webkit-scrollbar-thumb:hover{background:${C.textLight};}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeInUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
  @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.5;}}
  @keyframes recPulse{0%,100%{box-shadow:0 0 0 0 rgba(224,85,85,0.4);}50%{box-shadow:0 0 0 10px rgba(224,85,85,0);}}
  @keyframes goldShimmer{0%{background-position:0% 50%;}50%{background-position:100% 50%;}100%{background-position:0% 50%;}}
  @keyframes float{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
  @keyframes streakFire{0%,100%{transform:scale(1) rotate(-2deg);}50%{transform:scale(1.15) rotate(2deg);}}
  .fade-in{animation:fadeIn 0.25s ease both;}
  .fade-in-up{animation:fadeInUp 0.3s ease both;}
  .scale-in{animation:scaleIn 0.2s ease both;}
  .rec-pulse{animation:recPulse 1.5s ease-in-out infinite;}
  select option{background:${C.bgMid};color:${C.text};}
`);

// ── Helpers ───────────────────────────────────────────────────────────────────
// Strips everything that isn't Korean hangul, English/Latin, numbers, punctuation, or emoji
const cleanText = t => {
  if (!t) return t;
  return t.split("").filter(c => {
    const code = c.charCodeAt(0);
    const isKorean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F);
    const isLatin = code >= 0x0020 && code <= 0x007E;
    const isEmoji = (code >= 0x1F300 && code <= 0x1FAFF) || (code >= 0x2600 && code <= 0x27BF) || (code >= 0xFE00 && code <= 0xFE0F) || (code >= 0x1F900 && code <= 0x1F9FF);
    const isNewline = c === "\n";
    // Explicitly block: CJK (Chinese/Japanese Kanji), Hiragana, Katakana, Cyrillic, Arabic, etc.
    const isCJK = (code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) || (code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF) || (code >= 0x0400 && code <= 0x04FF) || (code >= 0x0600 && code <= 0x06FF);
    return (isKorean || isLatin || isEmoji || isNewline) && !isCJK;
  }).join("");
};

// ── Feedback Display — rich formatted output ──────────────────────────────────
function FeedbackDisplay({ text }) {
  if (!text) return null;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const sectionIcon = l =>
    l.startsWith("🎯") || l.startsWith("✅") || l.startsWith("📝") ||
    l.startsWith("💡") || l.startsWith("💪") || l.startsWith("📌");

  const isScore = l => l.startsWith("🎯");
  const isGood = l => l.startsWith("✅");
  const isGrammar = l => l.startsWith("📝");
  const isTip = l => l.startsWith("💡");
  const isMotivation = l => l.startsWith("💪");
  const isWrong = l => l.startsWith("❌");
  const isCorrect = l => l.startsWith("✅") && !sectionIcon(l);
  const isExplain = l => l.startsWith("📌");
  const isAlt = l => l.startsWith("→");

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } },
    lines.map((line, i) => {
      if (isScore(line)) return React.createElement("div", { key: i, style: { background: C.bgMid, borderRadius: "10px", padding: "12px 16px", display: "flex", alignItems: "center", gap: "8px" } },
        React.createElement("span", { style: { fontSize: "18px" } }, "🎯"),
        React.createElement("span", { style: { fontSize: "15px", fontWeight: "700", color: C.gold } }, line.replace("🎯", "").trim())
      );
      if (line === "✅ 잘한 점" || line === "✅ 잘한점" || line === "잘한 점") return React.createElement("div", { key: i, style: { fontSize: "13px", fontWeight: "700", color: C.success, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" } }, "✅ 잘한 점");
      if (line === "📝 문법 피드백" || line === "📝 문법피드백" || line === "문법 피드백") return React.createElement("div", { key: i, style: { fontSize: "13px", fontWeight: "700", color: C.error, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" } }, "📝 문법 피드백");
      if (line === "💡 이렇게도 말할 수 있어요" || line === "이렇게도 말할 수 있어요") return React.createElement("div", { key: i, style: { fontSize: "13px", fontWeight: "700", color: C.gold, textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "4px" } }, "💡 이렇게도 말할 수 있어요");
      if (line === "완벽해요!" || line === "완벽해요") return React.createElement("div", { key: i, style: { background: C.successBg, border: `1px solid #A8D5B5`, borderRadius: "6px", padding: "8px 12px", fontSize: "14px", color: C.success, fontWeight: "600" } }, "✨ 완벽해요!");
      if (isWrong(line)) return React.createElement("div", { key: i, style: { background: C.errorBg, borderRadius: "6px", padding: "8px 12px", fontSize: "14px", color: C.error, fontFamily: "monospace" } }, line);
      if (line.startsWith("✅") && i > 0 && (lines[i-1].startsWith("❌") || lines[i-2]?.startsWith("❌"))) return React.createElement("div", { key: i, style: { background: C.successBg, borderRadius: "6px", padding: "8px 12px", fontSize: "14px", color: C.success, fontFamily: "monospace" } }, line);
      if (isExplain(line)) return React.createElement("div", { key: i, style: { background: C.goldBg, borderLeft: `3px solid ${C.gold}`, borderRadius: "0 6px 6px 0", padding: "8px 12px", fontSize: "13px", color: C.textMid } }, line.replace("📌", "").trim());
      if (isAlt(line)) return React.createElement("div", { key: i, style: { background: C.bgSoft, borderRadius: "6px", padding: "8px 12px", fontSize: "14px", color: C.text, fontStyle: "italic" } }, line);
      if (isMotivation(line)) return React.createElement("div", { key: i, style: { marginTop: "4px", fontSize: "14px", color: C.textMid, fontWeight: "500", textAlign: "center" } }, line.replace("💪", "").trim() + " 💪");
      // Regular text line
      return React.createElement("div", { key: i, style: { fontSize: "14px", color: C.text, lineHeight: 1.7 } }, line);
    })
  );
}

function highlightMissed(target, spoken) {
  if (!target || !spoken) return React.createElement("span", null, target);
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const spokenNorm = norm(spoken);
  return React.createElement("span", null,
    target.split(" ").map((word, i, arr) =>
      React.createElement("span", { key: i, style: { color: spokenNorm.includes(norm(word)) ? C.text : C.error, textDecoration: spokenNorm.includes(norm(word)) ? "none" : "underline", fontWeight: spokenNorm.includes(norm(word)) ? "400" : "600" } }, word + (i < arr.length - 1 ? " " : ""))
    )
  );
}

// ── TTS — ElevenLabs (Teacher Tom's cloned voice) ─────────────────────────────
const ELEVEN_KEY = process.env.REACT_APP_ELEVEN_KEY;
const ELEVEN_VOICE_ID = "G5a1Ud6ZWQkWenDnvdV9";
let currentAudio = null;
let globalPlaybackSpeed = 1.0;

async function speak(text, speed = null) {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  const playSpeed = speed !== null ? speed : globalPlaybackSpeed;
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": ELEVEN_KEY },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2_5",
        voice_settings: { stability: 0.3, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true },
      })
    });
    if (!res.ok) throw new Error("ElevenLabs TTS failed: " + await res.text());
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = playSpeed;
    currentAudio = audio;
    audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; };
    await audio.play();
  } catch(e) {
    console.warn("ElevenLabs TTS failed, falling back to Groq:", e.message);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
        body: JSON.stringify({ model: "playai-tts", input: text, voice: "Calum-PlayAI", response_format: "mp3" })
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.playbackRate = playSpeed;
      currentAudio = audio;
      audio.onended = () => { URL.revokeObjectURL(url); currentAudio = null; };
      await audio.play();
    } catch(e2) {
      try { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-US"; u.rate = 0.85 * playSpeed; window.speechSynthesis.speak(u); } catch(e3) {}
    }
  }
}

// ── Groq ──────────────────────────────────────────────────────────────────────
const SYSTEM = `You are Tom, a warm English coach for Korean learners at Wayve.

LANGUAGE RULE — THIS IS ABSOLUTE AND NON-NEGOTIABLE:
You may ONLY use TWO scripts:
1. Korean HANGUL characters: 가나다라마바사아자차카타파하 and their combinations
2. English/Latin characters: a-z A-Z 0-9 and standard punctuation

YOU MUST NEVER USE:
- Chinese characters: 練習努力繼續進步加油表現方法注意 — NEVER
- Japanese hiragana: あいうえお — NEVER  
- Japanese katakana: アイウエオ — NEVER
- Russian/Cyrillic: привет — NEVER
- ANY other non-Korean, non-Latin script — NEVER

If you want to write "practice" in Korean, write: 연습 (NOT 練習)
If you want to write "effort" in Korean, write: 노력 (NOT 努力)
If you want to write "continue" in Korean, write: 계속 (NOT 継続)

Motivational lines MUST be pure Korean hangul only. Examples:
✓ 잘하고 있어요!
✓ 화이팅!
✓ 계속 연습해요!
✓ 정말 잘했어요!
✓ 조금만 더 연습해요!

DO NOT write placeholder text like [Korean explanation]. Always write actual content.`;

async function groqCall(prompt) {
  if (!GROQ_KEY) throw new Error("GROQ_KEY not configured in Vercel environment variables");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 700, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }] })
  });
  if (!res.ok) throw new Error("Groq API error: " + await res.text());
  const d = await res.json();
  return cleanText(d.choices[0].message.content);
}

async function transcribe(blob) {
  if (!GROQ_KEY) throw new Error("GROQ_KEY not configured");
  const fd = new FormData();
  fd.append("file", blob, "rec.webm");
  fd.append("model", "whisper-large-v3");
  fd.append("response_format", "text");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { "Authorization": `Bearer ${GROQ_KEY}` }, body: fd });
  if (!res.ok) throw new Error("Transcription error: " + await res.text());
  return (await res.text()).trim();
}

async function getPhraseFeedback(said, phrase) {
  // Normalize both strings for comparison
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const saidNorm = normalize(said);
  const targetNorm = normalize(phrase.english);
  const isExact = saidNorm === targetNorm;
  const isVeryClose = targetNorm.length > 5 && (saidNorm.includes(targetNorm) || targetNorm.includes(saidNorm));

  const text = await groqCall(`Target phrase: "${phrase.english}"
Student said: "${said}"
${isExact || isVeryClose ? `\nNOTE: The student said the phrase correctly (or nearly perfectly). Give a high score of 9 or 10/10. Be very encouraging.` : ""}

Give warm, specific feedback in Korean hangul and English ONLY.
DO NOT write placeholder text. Write actual content for every section.

Format exactly like this:

🎯 점수: X/10
[Korean sentence explaining the score - if 8+ be very encouraging]

✅ 잘한 점
[Korean encouragement about what they did well]

📝 문법 피드백
[Korean explanation of what was wrong]
❌ ${said}
✅ [Corrected English]
📌 [Korean explanation of WHY the grammar rule matters]

💡 이렇게도 말할 수 있어요
→ [Alternative natural English]

💪 [One short Korean hangul motivating sentence]

IMPORTANT: If grammar was perfect, skip 📝 section entirely and write just 완벽해요! instead.
If the student said it perfectly, give 9 or 10/10.
Under 150 words. Korean hangul and English ONLY.`);
  const match = text.match(/점수.*?(\d+)\/10/);
  let score = match ? parseInt(match[1]) : 7;
  // Override score if we detected exact match but AI gave low score
  if ((isExact || isVeryClose) && score < 8) score = 9;
  return { text, score };
}

async function getFreeTalkFeedback(said) {
  const text = await groqCall(`Student said in English: "${said}"

Give warm grammar feedback in Korean hangul and English ONLY.
DO NOT write placeholder text like [Korean explanation]. Write actual content.

Format exactly like this:

🎯 점수: X/10
[Write actual Korean sentence explaining the score]

✅ 잘한 점
[Write actual Korean encouragement about what they did well]

📝 문법 피드백
[Write actual Korean explanation of the grammar issue]
❌ ${said}
✅ [Write the corrected English sentence - must be different from the ❌ line if there is an error]
📌 [Write actual Korean explanation of WHY - explain the grammar rule simply in Korean]

💡 이렇게도 말할 수 있어요
→ [Write a more natural or alternative English version - must be meaningfully different]

💪 [Write one short motivating Korean sentence using pure hangul only]

If grammar was perfect, skip 📝 section and write 완벽해요! instead.
Under 150 words. Korean hangul and English ONLY.`);
  const match = text.match(/점수.*?(\d+)\/10/);
  return { text, score: match ? parseInt(match[1]) : 7 };
}

async function getKoreanTranslation(input) {
  const text = await groqCall(`Korean learner wants to know how to say this in English: "${input}"

Respond in Korean hangul and English ONLY. DO NOT write placeholder text.

🇰🇷 한국어 표현
${input}

🗣 영어 표현
[Write the actual natural English translation here]

📌 예문
1. [Write an actual English example sentence]
→ [Write the actual Korean hangul translation]

2. [Write another actual English example sentence]
→ [Write the actual Korean hangul translation]

💡 사용 팁
[Write an actual short Korean hangul tip about when to use this]

💪 [Write one short encouraging Korean hangul sentence]

Under 130 words. No placeholder text.`);

  // Extract English phrase robustly
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let englishPhrase = "";
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("영어 표현")) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const line = lines[j].replace(/^[→\-\*🗣]\s*/, "").trim();
        if (line && /[a-zA-Z]/.test(line) && line.length > 2) { englishPhrase = line; break; }
      }
      if (englishPhrase) break;
    }
  }
  return { text, englishPhrase };
}

async function generateSituationPhrases(situation, excludePhrases = []) {
  const excludeList = excludePhrases.length > 0
    ? `\n\nIMPORTANT: Do NOT include any of these phrases (already shown or saved):\n${excludePhrases.map(p => `- "${p}"`).join("\n")}\n\nGenerate completely DIFFERENT phrases that have not been shown before.`
    : "";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 900,
      messages: [{
        role: "system",
        content: `You generate JSON arrays of English phrases for Korean learners.
STRICT RULE: The "korean" and "context" fields must use ONLY Korean hangul characters (가-힣).
NEVER use Chinese characters (漢字 like 食べ物, グルテン, etc.) or Japanese kana.
If you want to write Japanese food terms, write them in Korean hangul only.`
      }, {
        role: "user",
        content: `Generate 8 useful English phrases for this situation: "${situation}"
Korean translations and context MUST be in Korean HANGUL only — absolutely no Chinese or Japanese characters.
Return ONLY valid JSON array:
[{"english":"natural English phrase","korean":"Korean hangul translation ONLY","context":"Korean hangul context ONLY"}]${excludeList}`
      }]
    })
  });
  const d = await res.json();
  const t = d.choices[0].message.content.replace(/```json|```/g, "").trim();
  const s = t.indexOf("["); const e = t.lastIndexOf("]");
  const parsed = JSON.parse(t.slice(s, e + 1));
  // Apply cleanText to each field to strip any remaining non-Korean/English chars
  return parsed.map(p => ({
    english: p.english || "",
    korean: cleanText(p.korean || ""),
    context: cleanText(p.context || ""),
  }));
}

async function generateAIPhrases(topic) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 800,
      messages: [{
        role: "system",
        content: `You generate JSON arrays of English phrases for Korean learners.
STRICT: "korean" and "context" fields must use ONLY Korean hangul (가-힣). No Chinese, no Japanese.`
      }, {
        role: "user",
        content: `Generate 5 English phrases for Korean learners about: "${topic}".
All three fields required. "context" MUST be in Korean hangul only.
Return ONLY valid JSON array:
[{"english":"natural English phrase","korean":"Korean hangul translation","context":"Korean hangul explanation of when to use this phrase"}]`
      }]
    })
  });
  const d = await res.json();
  const t = d.choices[0].message.content.replace(/```json|```/g, "").trim();
  const s = t.indexOf("["); const e = t.lastIndexOf("]");
  const parsed = JSON.parse(t.slice(s, e + 1));
  return parsed.map(p => ({
    english: p.english || "",
    korean: cleanText(p.korean || ""),
    context: cleanText(p.context || ""),
  }));
}

async function autoFillKorean(english) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 200, messages: [{ role: "user", content: `For English phrase: "${english}"\nReturn ONLY valid JSON:\n{"ko":"Korean hangul translation","context":"Korean hangul explanation of when to use this"}` }] })
    });
    const d = await res.json();
    const t = d.choices[0].message.content.replace(/```json|```/g, "").trim();
    const s = t.indexOf("{"); const e = t.lastIndexOf("}");
    if (s !== -1 && e !== -1) {
      const p = JSON.parse(t.slice(s, e + 1));
      return { ko: cleanText(p.ko || ""), context: cleanText(p.context || "") };
    }
  } catch(e) {}
  return { ko: "", context: "" };
}

// ── Recording Hook ────────────────────────────────────────────────────────────
function useRecorder(onDone) {
  const [isRec, setIsRec] = useState(false);
  const [blob, setBlob] = useState(null);
  const [time, setTime] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Pick best supported MIME type - iOS Safari needs mp4, others support webm
  const getMimeType = () => {
    const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
    for (const t of types) { if (MediaRecorder.isTypeSupported(t)) return t; }
    return "";
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mimeType = getMimeType();
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const type = mr.mimeType || mimeType || "audio/webm";
        const b = new Blob(chunksRef.current, { type });
        setBlob(b); stream.getTracks().forEach(t => t.stop());
        if (onDoneRef.current) onDoneRef.current(b);
      };
      mr.start(100); // collect data every 100ms for better reliability
      setIsRec(true); setTime(0); setBlob(null);
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } catch(e) { alert("Microphone access needed. Please allow microphone in browser settings."); }
  };
  const stop = () => { mediaRef.current?.stop(); setIsRec(false); clearInterval(timerRef.current); };
  const reset = () => setBlob(null);
  return { isRec, blob, time, start, stop, reset };
}

// ── UI Components ─────────────────────────────────────────────────────────────
const Btn = ({ onClick, children, variant = "primary", disabled, style = {} }) => {
  const variants = {
    primary: { background: C.text, color: C.bg, border: "none", boxShadow: "0 2px 8px rgba(240,237,232,0.12)" },
    secondary: { background: C.bgMid, color: C.text, border: `1px solid ${C.border}` },
    gold: { background: C.gradGold, backgroundSize: "200% 200%", color: "#0F1117", border: "none", boxShadow: "0 2px 12px rgba(201,168,76,0.3)", fontWeight: "700" },
    ghost: { background: "transparent", color: C.textMid, border: `1px solid ${C.border}` },
    danger: { background: C.error, color: "#fff", border: "none", boxShadow: `0 2px 8px ${C.errorBg}` },
    success: { background: C.success, color: "#fff", border: "none", boxShadow: `0 2px 8px ${C.successBg}` },
  };
  return React.createElement("button", { onClick, disabled, style: { padding: "9px 18px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, fontFamily: FONT, transition: "all 0.15s", letterSpacing: "0.1px", ...variants[variant], ...style } }, children);
};

const Input = ({ value, onChange, onBlur, placeholder, type = "text", style = {} }) =>
  React.createElement("input", { value, onChange, onBlur: onBlur || (() => {}), placeholder, type, style: { width: "100%", padding: "11px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px", outline: "none", background: C.bgMid, color: C.text, fontFamily: FONT, transition: "border-color 0.15s", ...style } });

const Card = ({ children, style = {} }) =>
  React.createElement("div", { style: { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "18px", ...style } }, children);

const Spinner = () => React.createElement("span", { style: { display: "inline-block", width: "16px", height: "16px", border: `2px solid ${C.border}`, borderTop: `2px solid ${C.gold}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", verticalAlign: "middle" } });

const Msg = ({ text, type = "success" }) => {
  if (!text) return null;
  const s = {
    success: { background: C.successBg, border: `1px solid ${C.successBorder}`, color: C.success },
    error: { background: C.errorBg, border: `1px solid ${C.errorBorder}`, color: C.error },
    warn: { background: C.retryBg, border: `1px solid ${C.retryBorder}`, color: C.retry }
  };
  return React.createElement("div", { style: { ...s[type], padding: "10px 14px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px", fontWeight: "500" } }, text);
};

function InlineEdit({ value, onSave, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  const save = () => { if (val.trim() && val.trim() !== value) onSave(val.trim()); setEditing(false); };
  if (!editing) return React.createElement("span", { onClick: () => { setVal(value); setEditing(true); }, style: { cursor: "text", borderBottom: `1px dashed ${C.goldDim}`, paddingBottom: "1px", color: C.text, ...style }, title: "Click to edit" }, value);
  return React.createElement("input", { ref, value: val, onChange: e => setVal(e.target.value), onBlur: save, onKeyDown: e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }, style: { border: `1px solid ${C.gold}`, borderRadius: "4px", padding: "2px 6px", fontSize: "inherit", fontFamily: FONT, outline: "none", fontWeight: "inherit", ...style } });
}

// ── Mini Phrase Practice (inline recording + feedback) ────────────────────────
function MiniPractice({ phrase, user, isPreview, showListen = true, autoRecord = false }) {
  const [feedback, setFeedback] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [started, setStarted] = useState(autoRecord);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const autoStarted = useRef(false);

  const handleStop = async (blob) => {
    if (isPreview) return;
    setRecordingBlob(blob);
    const url = URL.createObjectURL(blob);
    setRecordingUrl(url);
    setLoading(true); setFeedback(null); setTranscription(null); setErrMsg("");
    try {
      const said = await transcribe(blob);
      setTranscription(said);
      const { text, score } = await getPhraseFeedback(said, phrase);
      setFeedback({ text, score });
    } catch(e) { setErrMsg("피드백 오류: " + e.message); }
    setLoading(false);
  };

  const rec = useRecorder(handleStop);

  // If autoRecord, start recording immediately on mount
  useEffect(() => {
    if (autoRecord && !isPreview && !autoStarted.current) {
      autoStarted.current = true;
      setTimeout(() => rec.start(), 250);
    }
  }, []);

  if (!started) {
    return (
      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${C.border}`, textAlign: "center" }}>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {showListen && <Btn onClick={() => speak(phrase.english)} variant="secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>🔊 듣기</Btn>}
          <Btn onClick={() => { setStarted(true); setTimeout(() => rec.start(), 200); }} style={{ fontSize: "12px", padding: "6px 16px" }}>🎙 연습</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
        {showListen && <Btn onClick={() => speak(phrase.english)} variant="secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>🔊 듣기</Btn>}
        {!rec.isRec && !loading && !feedback && <Btn onClick={rec.start} style={{ fontSize: "12px", padding: "6px 16px" }}>🎙 다시 시도</Btn>}
        {rec.isRec && <Btn onClick={rec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error, fontSize: "12px", padding: "6px 14px" }}>⏹ 멈추기 ({rec.time}초)</Btn>}
        {loading && React.createElement(Spinner)}
      </div>
      {errMsg && <div style={{ color: C.error, fontSize: "12px", textAlign: "center" }}>{errMsg}</div>}
      {feedback && (
        <div className="fade-in">
          {transcription && (
            <div style={{ background: C.bgSoft, padding: "8px 10px", borderRadius: "6px", marginBottom: "8px", fontSize: "12px", color: C.textMid, borderLeft: `3px solid ${C.text}` }}>
              🎙 {highlightMissed(phrase.english, transcription)}
            </div>
          )}
          {recordingUrl && (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", color: C.textLight, marginBottom: "3px" }}>▶ 내 목소리 듣기</div>
              <audio src={recordingUrl} controls style={{ width: "100%", height: "36px" }} />
            </div>
          )}
          <FeedbackDisplay text={feedback.text} />
          {feedback.score >= 8
            ? <div style={{ marginTop: "8px", padding: "10px 14px", background: C.successBg, borderRadius: "8px", fontSize: "13px", color: C.success, fontWeight: "700", border: `1px solid ${C.successBorder}`, display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "18px" }}>🎉</span> 잘했어요!</div>
            : <div style={{ marginTop: "8px", display: "flex", gap: "6px", alignItems: "center" }}>
                <div style={{ fontSize: "12px", color: C.retry }}>계속 연습해요! 💪</div>
                <Btn onClick={() => { rec.reset(); setFeedback(null); setTranscription(null); rec.start(); }} variant="secondary" style={{ fontSize: "11px", padding: "4px 10px" }}>🔄 다시</Btn>
              </div>
          }
        </div>
      )}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("loading");
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    db.get("groups", "order=created_at.asc").then(setGroups).catch(() => {});
    // Auto-login from saved name
    const savedName = localStorage.getItem("wayve_student_name");
    if (savedName) {
      db.get("students", `name=eq.${encodeURIComponent(savedName)}&select=*,groups(name,id)`)
        .then(rows => {
          if (rows.length > 0) { setUser(rows[0]); setScreen("student"); }
          else { localStorage.removeItem("wayve_student_name"); setScreen("login"); }
        })
        .catch(() => setScreen("login"));
    } else {
      setScreen("login");
    }
  }, []);

  const handleLogin = async (name) => {
    try {
      const rows = await db.get("students", `name=eq.${encodeURIComponent(name)}&select=*,groups(name,id)`);
      if (!rows.length) return "이름을 찾을 수 없어요. Teacher Toms에게 등록을 요청해 주세요.";
      localStorage.setItem("wayve_student_name", rows[0].name);
      setUser(rows[0]); setScreen("student"); return null;
    } catch(e) { return "오류: " + e.message; }
  };

  const handleLogout = () => {
    localStorage.removeItem("wayve_student_name");
    setUser(null); setScreen("login");
  };

  if (screen === "loading") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, flexDirection: "column", gap: "16px" } }, React.createElement(Spinner), React.createElement("div", { style: { fontSize: "12px", color: C.textLight, letterSpacing: "2px", textTransform: "uppercase" } }, "WAYVE")));
  if (screen === "login") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(LoginScreen, { onLogin: handleLogin, onTeacher: p => { if (p === TEACHER_PASS) { setScreen("teacher"); return null; } return "Wrong password"; } }));
  if (screen === "teacher") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(TeacherScreen, { groups, setGroups, setScreen, onPreview: g => { setPreview(g); setScreen("preview"); } }));
  if (screen === "preview") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(StudentScreen, { user: { id: "preview", name: "Preview Mode", group_id: preview?.id, streak: 3, longest_streak: 7 }, group: preview, isPreview: true, onBack: () => setScreen("teacher") }));
  if (screen === "student") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(StudentScreen, { user, group: groups.find(g => g.id === user?.group_id) || user?.groups, isPreview: false, onBack: handleLogout }));
  return null;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onTeacher }) {
  const [mode, setMode] = useState("student");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleStudent = async () => {
    if (!name.trim()) return;
    setLoading(true); setError("");
    const err = await onLogin(name.trim());
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "24px", position: "relative", overflow: "hidden" }}>
      {/* Background atmosphere */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60vw", height: "60vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "50vw", height: "50vw", borderRadius: "50%", background: "radial-gradient(circle, rgba(46,204,122,0.04) 0%, transparent 70%)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "380px", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "52px", animation: "fadeInUp 0.5s ease both" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "18px", background: "linear-gradient(135deg, #C9A84C, #E8C56A)", marginBottom: "20px", boxShadow: "0 8px 32px rgba(201,168,76,0.35)" }}>
            <span style={{ fontSize: "28px" }}>🌊</span>
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: "42px", fontWeight: "400", letterSpacing: "4px", color: C.text, lineHeight: 1, marginBottom: "8px" }}>WAYVE</div>
          <div style={{ fontSize: "11px", color: C.gold, letterSpacing: "4px", textTransform: "uppercase", fontWeight: "500" }}>More than English</div>
        </div>

        {/* Mode tabs */}
        <div style={{ display: "flex", background: C.bgMid, borderRadius: "10px", padding: "3px", marginBottom: "28px", animation: "fadeInUp 0.5s ease 0.1s both" }}>
          {[["student", "Student"], ["teacher", "Teacher"]].map(([m, label]) =>
            React.createElement("button", { key: m, onClick: () => { setMode(m); setError(""); }, style: { flex: 1, padding: "9px", background: mode === m ? C.bgCard : "transparent", border: mode === m ? `1px solid ${C.border}` : "1px solid transparent", borderRadius: "8px", color: mode === m ? C.text : C.textLight, fontSize: "13px", fontWeight: mode === m ? "600" : "400", cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" } }, label)
          )}
        </div>

        <div style={{ animation: "fadeInUp 0.5s ease 0.15s both" }}>
          {mode === "student" && (
            <div>
              <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>이름 / Your Name</div>
              <Input value={name} onChange={e => setName(e.target.value)}
                onBlur={() => setFocused(false)}
                placeholder="Enter your name"
                style={{ marginBottom: "14px", fontSize: "16px", padding: "14px 16px", borderColor: focused ? C.gold : C.border, background: C.bgSoft }}
                onFocus={() => setFocused(true)}
              />
              {error && <Msg text={error} type="error" />}
              <Btn onClick={handleStudent} disabled={loading || !name.trim()} style={{ width: "100%", padding: "14px", fontSize: "15px", borderRadius: "10px" }} variant="gold">
                {loading ? React.createElement(Spinner) : "입장하기  →"}
              </Btn>
            </div>
          )}
          {mode === "teacher" && (
            <div>
              <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", fontWeight: "600" }}>Password</div>
              <Input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Teacher password" style={{ marginBottom: "14px", fontSize: "16px", padding: "14px 16px", background: C.bgSoft }} />
              {error && <Msg text={error} type="error" />}
              <Btn onClick={() => { const err = onTeacher(pass); if (err) setError(err); }} variant="gold" style={{ width: "100%", padding: "14px", fontSize: "15px", borderRadius: "10px" }}>Teacher Dashboard →</Btn>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px", fontSize: "11px", color: C.textLight, animation: "fadeInUp 0.5s ease 0.25s both" }}>
          Powered by AI · Built for Korean learners
        </div>
      </div>
    </div>
  );
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti() {
  const colors = ["#B8973A", "#1A7A45", "#C0392B", "#3498DB", "#9B59B6"];
  const pieces = Array.from({ length: 32 }, (_, i) => ({
    id: i, color: colors[i % colors.length],
    left: Math.random() * 100, delay: Math.random() * 0.6,
    size: 6 + Math.random() * 6,
  }));
  return React.createElement(React.Fragment, null,
    React.createElement("style", null, `
      @keyframes confettiFall {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
      }
    `),
    ...pieces.map(p => React.createElement("div", {
      key: p.id,
      style: {
        position: "fixed", top: 0, left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`,
        background: p.color, borderRadius: p.id % 3 === 0 ? "50%" : "2px",
        animation: `confettiFall 1.8s ease-in ${p.delay}s forwards`,
        zIndex: 999, pointerEvents: "none",
      }
    }))
  );
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({ user, group, isPreview, onBack }) {
  const [tab, setTab] = useState("practice");
  const [streak, setStreak] = useState(user.streak || 0);
  const [longest, setLongest] = useState(user.longest_streak || 0);
  const [showStreakBanner, setShowStreakBanner] = useState(false);

  useEffect(() => {
    if (isPreview) return;
    const today = new Date().toISOString().split("T")[0];
    if (user.last_practice !== today) setShowStreakBanner(true);
  }, [isPreview, user]);

  const updateStreak = useCallback(async () => {
    if (isPreview) return;
    const today = new Date().toISOString().split("T")[0];
    if (user.last_practice === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const ns = user.last_practice === yesterday ? streak + 1 : 1;
    const nl = Math.max(ns, longest);
    setStreak(ns); setLongest(nl); user.last_practice = today;
    setShowStreakBanner(false);
    await db.update("students", `id=eq.${user.id}`, { streak: ns, longest_streak: nl, last_practice: today });
  }, [isPreview, streak, longest, user]);

  // Update last_seen every 30 seconds for online presence
  useEffect(() => {
    if (isPreview) return;
    const update = () => db.update("students", `id=eq.${user.id}`, { last_seen: new Date().toISOString() }).catch(() => {});
    update();
    const interval = setInterval(update, 30000);
    // Request notification permission for push alerts
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    return () => clearInterval(interval);
  }, [isPreview, user.id]);

  const tabs = [["practice", "🎙 Practice"], ["freetalk", "💬 Free Talk"], ["myphrases", "⭐ My Phrases"], ["notes", "📝 Notes"]];

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        {isPreview && (
          <div style={{ background: C.goldBg, borderBottom: `1px solid ${C.goldBorder}`, padding: "7px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "600", color: C.gold }}>
            <span>👁 Preview Mode — {group?.name}</span>
            <button onClick={onBack} style={{ background: C.goldBorder, border: `1px solid ${C.gold}`, color: C.gold, padding: "3px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontFamily: FONT }}>← Dashboard</button>
          </div>
        )}
        <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "20px", fontWeight: "800", color: streak > 0 ? C.retry : C.textLight, lineHeight: 1, animation: streak > 0 ? "streakFire 2s ease-in-out infinite" : "none", display: "inline-block" }}>🔥 {streak}</div>
                <div style={{ fontSize: "8px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1.5px", marginTop: "2px" }}>연속 일</div>
              </div>
              {longest > 0 && (
                <div style={{ textAlign: "center", paddingLeft: "12px", borderLeft: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: C.gold, lineHeight: 1 }}>🏅 {longest}</div>
                  <div style={{ fontSize: "8px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1.5px", marginTop: "2px" }}>최고 기록</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "700", color: C.text }}>안녕하세요, {user.name}! 👋</div>
              <div style={{ fontSize: "11px", color: C.gold, fontWeight: "500" }}>{group?.name || ""}</div>
            </div>
          </div>
          <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textLight, padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontFamily: FONT, transition: "all 0.15s" }}>나가기</button>
        </div>
        <div style={{ display: "flex", padding: "0 20px", overflowX: "auto", gap: "2px" }}>
          {tabs.map(([t, label]) =>
            React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "10px 16px", background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.gold}` : "2px solid transparent", color: tab === t ? C.gold : C.textLight, fontSize: "13px", fontWeight: tab === t ? "700" : "400", cursor: "pointer", fontFamily: FONT, marginBottom: "-1px", whiteSpace: "nowrap", transition: "color 0.15s" } }, label)
          )}
        </div>
      </div>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px 16px" }}>
        {showStreakBanner && !isPreview && (
          <div style={{ background: "linear-gradient(135deg, #8B4A1A, #C9A84C)", borderRadius: "12px", padding: "14px 18px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", color: "#fff", border: "1px solid rgba(201,168,76,0.3)", boxShadow: "0 4px 20px rgba(201,168,76,0.15)" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "2px" }}>오늘 아직 연습 안 했어요! 🔥</div>
              <div style={{ fontSize: "12px", opacity: 0.9 }}>연속 {streak}일 streak을 지키세요!</div>
            </div>
            <button onClick={() => setShowStreakBanner(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>닫기</button>
          </div>
        )}
        {tab === "practice" && React.createElement(PracticeTab, { user, group, isPreview, onPracticed: updateStreak })}
        {tab === "freetalk" && React.createElement(FreeTalkTab, { user, isPreview, onPracticed: updateStreak })}
        {tab === "myphrases" && React.createElement(MyPhrasesTab, { user, isPreview })}
        {tab === "notes" && React.createElement(NotesTab, { user, group, isPreview })}
      </div>
      {!isPreview && React.createElement(FloatingChat, { user, group, isPreview, isTeacher: false, students: [] })}
    </div>
  );
}

// ── Practice Tab ──────────────────────────────────────────────────────────────
function PracticeTab({ user, group, isPreview, onPracticed }) {
  const [sessions, setSessions] = useState({});
  const [activeSession, setActiveSession] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [randomPhrase, setRandomPhrase] = useState(null);
  const [phraseOfDay, setPhraseOfDay] = useState(null);
  const [showPOD, setShowPOD] = useState(true);
  const [podOpen, setPodOpen] = useState(false);
  const [myPhrases, setMyPhrases] = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionResets, setSessionResets] = useState({}); // tracks local resets per session

  const loadData = useCallback(async () => {
    if (!group?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const sp = await db.get("session_phrases", `group_id=eq.${group.id}&select=*,phrase_bank(*)&order=session_number.asc,created_at.asc`);
      const bySession = {};
      sp.forEach(row => { const s = row.session_number; if (!bySession[s]) bySession[s] = []; if (row.phrase_bank) bySession[s].push({ ...row.phrase_bank, sp_id: row.id }); });
      setSessions(bySession);
      const nums = Object.keys(bySession).map(Number).sort((a, b) => b - a);
      if (nums.length > 0) setActiveSession(nums[0]);
      if (!isPreview) {
        const [prog, myP] = await Promise.all([
          db.get("student_progress", `student_id=eq.${user.id}`),
          db.get("student_phrases", `student_id=eq.${user.id}&hidden=eq.false&select=id,english,korean,context`),
        ]);
        const map = {};
        prog.forEach(p => { map[p.phrase_id] = p; });
        setProgress(map);
        setMyPhrases(myP);
        // Phrase of day: prefer unpassed from current session
        const allPractice = Object.values(bySession).flat();
        const unpassed = allPractice.filter(p => !map[p.id]?.passed);
        const pool = unpassed.length > 0 ? unpassed : allPractice;
        if (pool.length > 0) {
          // Use date as seed so phrase is consistent all day
          const dayIndex = Math.floor(Date.now() / 86400000) % pool.length;
          setPhraseOfDay(pool[dayIndex]);
        }
      }
    } catch(e) {}
    setLoading(false);
  }, [group, user, isPreview]);

  useEffect(() => { loadData(); }, [loadData]);

  // Combined pool for random: practice phrases + student's own phrases
  const allPracticePhrases = Object.values(sessions).flat();
  const allPhrasesForRandom = [...allPracticePhrases, ...myPhrases.filter(mp => !allPracticePhrases.find(p => p.id === mp.id))];

  const pickRandom = () => {
    if (!allPhrasesForRandom.length) return;
    const unpassed = allPhrasesForRandom.filter(p => !progress[p.id]?.passed);
    const pool = unpassed.length > 0 ? unpassed : allPhrasesForRandom;
    setRandomPhrase(pool[Math.floor(Math.random() * pool.length)]);
  };

  const handleProgressUpdate = (phraseId, prog) => {
    const prevProg = progress[phraseId];
    // Fire confetti on first-time pass OR when passing again after a session reset
    const wasFirstPass = !(prevProg?.passed) && prog?.passed;
    const wasResetPass = sessionResets[activeSession] && prog?.passed;
    setProgress(prev => ({ ...prev, [phraseId]: prog }));
    if (wasFirstPass || wasResetPass) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2200);
    }
  };

  const resetSession = (sessionNum) => {
    // Mark session as reset locally - clears visual color state
    // Does NOT touch Supabase - real progress persists and shows on next login
    setSessionResets(prev => ({ ...prev, [sessionNum]: Date.now() }));
  };

  if (loading) return React.createElement("div", { style: { textAlign: "center", padding: "60px" } }, React.createElement(Spinner));

  const sessionNums = Object.keys(sessions).map(Number).sort((a, b) => b - a);

  if (!sessionNums.length) return React.createElement("div", { style: { textAlign: "center", padding: "60px 20px" } },
    React.createElement("div", { style: { fontSize: "40px", marginBottom: "16px" } }, "📭"),
    React.createElement("div", { style: { fontSize: "15px", color: C.textMid } }, "아직 배정된 문장이 없어요."),
    React.createElement("div", { style: { fontSize: "13px", color: C.textLight, marginTop: "8px" } }, "수업 후 선생님이 문장을 추가해 드릴게요!")
  );

  const currentPhrases = sessions[activeSession] || [];
  const sessionKey = sessionResets[activeSession] || 0;
  const retry = currentPhrases.filter(p => progress[p.id]?.needs_retry && !progress[p.id]?.passed);
  const others = currentPhrases.filter(p => !progress[p.id]?.needs_retry || progress[p.id]?.passed);
  const ordered = [...retry, ...others];

  // Session progress counts
  const getSessionProgress = (n) => {
    const phrases = sessions[n] || [];
    const passed = phrases.filter(p => progress[p.id]?.passed).length;
    return { passed, total: phrases.length };
  };

  return (
    <div>
      {showConfetti && React.createElement(Confetti)}

      {/* Phrase of the Day */}
      {phraseOfDay && showPOD && !isPreview && (
        <div style={{ background: `linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.06))`, border: `1px solid ${C.goldBorder}`, borderRadius: "14px", padding: "16px 18px", marginBottom: "16px", position: "relative" }}>
          <button onClick={() => setShowPOD(false)} style={{ position: "absolute", top: "10px", right: "12px", background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "16px" }}>×</button>
          <div style={{ fontSize: "10px", fontWeight: "700", color: C.gold, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: C.gold }}></span>오늘의 표현</div>
          <div style={{ fontSize: "18px", fontStyle: "italic", color: C.text, marginBottom: "4px" }}>"{phraseOfDay.english}"</div>
          {phraseOfDay.korean && <div style={{ fontSize: "13px", color: C.textMid, marginBottom: "10px" }}>{phraseOfDay.korean}</div>}
          <Btn onClick={() => { setPodOpen(true); setShowPOD(false); }} variant="gold" style={{ fontSize: "12px", padding: "6px 14px" }}>🎙 지금 연습하기</Btn>
        </div>
      )}

      {/* Phrase of Day practice modal */}
      {podOpen && phraseOfDay && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => { if (e.target === e.currentTarget) setPodOpen(false); }}>
          <div style={{ background: C.bg, borderRadius: "12px", padding: "24px", maxWidth: "520px", width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: C.gold }}>⭐ 오늘의 표현</div>
              <button onClick={() => setPodOpen(false)} style={{ background: "transparent", border: "none", color: C.textLight, fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: "20px", fontStyle: "italic", marginBottom: "6px" }}>"{phraseOfDay.english}"</div>
            {phraseOfDay.korean && <div style={{ fontSize: "14px", color: C.textMid, marginBottom: "6px" }}>{phraseOfDay.korean}</div>}
            {phraseOfDay.context && <div style={{ background: C.goldBg, borderLeft: `3px solid ${C.gold}`, padding: "8px 12px", marginBottom: "12px", fontSize: "13px", color: C.textMid }}>{phraseOfDay.context}</div>}
            <PhraseCard phrase={phraseOfDay} user={user} prog={progress[phraseOfDay.id]} isPreview={isPreview} onUpdate={handleProgressUpdate} onPracticed={onPracticed} hideContext={true} />
          </div>
        </div>
      )}

      {/* Random practice */}
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", marginBottom: "16px", background: "linear-gradient(135deg, rgba(46,204,122,0.06), rgba(46,204,122,0.02))", border: `1px solid ${C.successBorder}` }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600" }}>🎲 랜덤 연습</div>
          <div style={{ fontSize: "11px", color: C.textLight, marginTop: "2px" }}>연습 문장 + 나의 표현 모두에서 랜덤 선택</div>
        </div>
        <Btn onClick={pickRandom} variant="secondary" style={{ flexShrink: 0, fontSize: "13px" }}>시작하기</Btn>
      </Card>

      {/* Random phrase modal */}
      {randomPhrase && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => { if (e.target === e.currentTarget) setRandomPhrase(null); }}>
          <div style={{ background: C.bg, borderRadius: "12px", padding: "24px", maxWidth: "520px", width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: C.textMid }}>🎲 랜덤 문장</div>
              <button onClick={() => setRandomPhrase(null)} style={{ background: "transparent", border: "none", color: C.textLight, fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: "20px", fontStyle: "italic", marginBottom: "6px" }}>"{randomPhrase.english}"</div>
            {randomPhrase.korean && <div style={{ fontSize: "14px", color: C.textMid, marginBottom: "6px" }}>{randomPhrase.korean}</div>}
            {randomPhrase.context && <div style={{ background: C.goldBg, borderLeft: `3px solid ${C.gold}`, padding: "8px 12px", marginBottom: "12px", fontSize: "13px", color: C.textMid }}>{randomPhrase.context}</div>}
            <PhraseCard phrase={randomPhrase} user={user} prog={progress[randomPhrase.id]} isPreview={isPreview} onUpdate={handleProgressUpdate} onPracticed={onPracticed} hideContext={true} />
          </div>
        </div>
      )}

      {/* Scrollable session feed */}
      <SessionFeed
        sessionNums={sessionNums}
        sessions={sessions}
        progress={progress}
        sessionResets={sessionResets}
        user={user}
        isPreview={isPreview}
        onUpdate={handleProgressUpdate}
        onPracticed={onPracticed}
        getSessionProgress={getSessionProgress}
        resetSession={resetSession}
      />
    </div>
  );
}

// ── Session Feed ──────────────────────────────────────────────────────────────
function SessionFeed({ sessionNums, sessions, progress, sessionResets, user, isPreview, onUpdate, onPracticed, getSessionProgress, resetSession }) {
  const [collapsed, setCollapsed] = useState({});
  const latestSession = sessionNums[0];
  const currentRef = useRef(null);

  const toggleCollapse = (n) => setCollapsed(prev => ({ ...prev, [n]: !prev[n] }));

  // Jump to current session button visibility
  const [showJump, setShowJump] = useState(false);
  useEffect(() => {
    const handleScroll = () => setShowJump(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div>
      {/* Jump to current session button */}
      {showJump && (
        <button
          onClick={() => currentRef.current?.scrollIntoView({ behavior: "smooth" })}
          style={{ position: "fixed", bottom: "86px", left: "20px", background: C.text, color: "#fff", border: "none", borderRadius: "20px", padding: "8px 16px", fontSize: "12px", fontWeight: "600", cursor: "pointer", fontFamily: FONT, zIndex: 90, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "5px" }}
        >↑ 최신 세션으로</button>
      )}

      {sessionNums.map((n, idx) => {
        const isLatest = n === latestSession;
        const { passed, total } = getSessionProgress(n);
        const allDone = total > 0 && passed === total;
        const isCollapsed = isLatest ? false : (collapsed[n] !== false); // previous sessions start collapsed
        const sessionKey = sessionResets[n] || 0;

        const phrases = sessions[n] || [];
        const retry = phrases.filter(p => progress[p.id]?.needs_retry && !progress[p.id]?.passed);
        const others = phrases.filter(p => !progress[p.id]?.needs_retry || progress[p.id]?.passed);
        const ordered = [...retry, ...others];

        return (
          <div key={n} ref={isLatest ? currentRef : null} style={{ marginBottom: "20px" }}>
            {/* Session header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isLatest && (
                  <span style={{ background: "linear-gradient(135deg, #C9A84C, #E8C56A)", color: "#0F1117", fontSize: "10px", fontWeight: "700", padding: "3px 10px", borderRadius: "10px", letterSpacing: "0.5px", boxShadow: "0 2px 8px rgba(201,168,76,0.3)" }}>✨ 최신</span>
                )}
                <div style={{ fontSize: "16px", fontWeight: "700", color: C.text }}>Session {n}</div>
                <span style={{ fontSize: "12px", color: allDone ? C.success : C.textLight, background: allDone ? C.successBg : C.bgSoft, padding: "2px 8px", borderRadius: "10px", fontWeight: "600" }}>
                  {passed}/{total} {allDone ? "✅" : ""}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button onClick={() => resetSession(n)} style={{ background: "transparent", border: "none", color: C.textLight, fontSize: "12px", cursor: "pointer", fontFamily: FONT }}>↺ 다시</button>
                {!isLatest && (
                  <button onClick={() => toggleCollapse(n)} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMid, fontSize: "12px", cursor: "pointer", fontFamily: FONT, padding: "3px 10px", borderRadius: "12px" }}>
                    {isCollapsed ? `펼치기 ▼` : `접기 ▲`}
                  </button>
                )}
              </div>
            </div>

            {/* Phrase list */}
            {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="fade-in">
                {ordered.map(phrase => React.createElement(ExpandableRow, {
                  key: `${phrase.id}-${sessionKey}`,
                  phrase, progress,
                  sessionReset: !!sessionResets[n],
                  user, isPreview,
                  onUpdate, onPracticed,
                }))}
              </div>
            )}

            {/* Divider between sessions */}
            {idx < sessionNums.length - 1 && (
              <div style={{ height: "1px", background: C.border, marginTop: "16px" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Expandable Row ────────────────────────────────────────────────────────────
function ExpandableRow({ phrase, progress, sessionReset, user, isPreview, onUpdate, onPracticed }) {
  const [open, setOpen] = useState(false);
  // Always read from live progress map so updates from POD/random modals reflect immediately
  const prog = sessionReset ? null : (progress[phrase.id] || null);
  const passed = prog?.passed;
  const needsRetry = prog?.needs_retry && !passed;
  let bg = C.bgCard, border = C.border;
  if (passed) { bg = C.successBg; border = C.successBorder; }
  else if (needsRetry) { bg = C.retryBg; border = C.retryBorder; }
  else if (prog?.attempts > 0) { bg = C.errorBg; border = C.errorBorder; }

  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${border}`, background: bg, overflow: "hidden", transition: "box-shadow 0.15s" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontStyle: "italic", marginBottom: "2px" }}>"{phrase.english}"</div>
          {phrase.korean && <div style={{ fontSize: "12px", color: C.textMid }}>{phrase.korean}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {passed && <span>✅</span>}
          {needsRetry && <span>🔄</span>}
          {prog?.best_score > 0 && <span style={{ fontSize: "11px", color: C.textLight, background: C.bgMid, padding: "2px 7px", borderRadius: "10px", fontWeight: "600" }}>{prog.best_score}/10</span>}
          <span style={{ color: C.textLight, fontSize: "16px", display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</span>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${border}`, padding: "16px" }} className="fade-in">
          <PhraseCard phrase={phrase} user={user} prog={prog} isPreview={isPreview} onUpdate={onUpdate} onPracticed={onPracticed} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ── Phrase Card ───────────────────────────────────────────────────────────────
function PhraseCard({ phrase, user, prog, isPreview, onUpdate, onPracticed, onClose, autoStart = false, hideContext = false }) {
  const [feedback, setFeedback] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const autoStarted = useRef(false);

  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState(null);

  const handleStop = async (blob) => {
    if (isPreview) return;
    setRecordingBlob(blob);
    // Create URL immediately so playback is synchronous on tap
    const url = URL.createObjectURL(blob);
    setRecordingUrl(url);
    setLoading(true); setFeedback(null); setTranscription(null); setErrMsg("");
    try {
      const said = await transcribe(blob);
      setTranscription(said);
      const { text, score } = await getPhraseFeedback(said, phrase);
      setFeedback({ text, score });
      await onPracticed();
      const passed = score >= 8;
      const newProg = { student_id: user.id, phrase_id: phrase.id, passed: passed || prog?.passed || false, attempts: (prog?.attempts || 0) + 1, best_score: Math.max(score, prog?.best_score || 0), needs_retry: !passed, updated_at: new Date().toISOString() };
      try {
        const existing = await db.get("student_progress", `student_id=eq.${user.id}&phrase_id=eq.${phrase.id}`);
        if (existing.length > 0) await db.update("student_progress", `student_id=eq.${user.id}&phrase_id=eq.${phrase.id}`, newProg);
        else await db.insert("student_progress", newProg);
      } catch(e) {}
      onUpdate(newProg);
    } catch(e) { setErrMsg("Feedback error: " + e.message); }
    setLoading(false);
  };

  const rec = useRecorder(handleStop);

  useEffect(() => {
    if (autoStart && !isPreview && !autoStarted.current && !feedback) {
      autoStarted.current = true;
      setTimeout(() => rec.start(), 350);
    }
  }, []);

  return (
    <div>
      {!hideContext && phrase.context && <div style={{ background: C.goldBg, borderLeft: `3px solid ${C.gold}`, padding: "10px 14px", borderRadius: "0 8px 8px 0", marginBottom: "14px", fontSize: "13px", color: C.textMid, fontWeight: "500" }}>{phrase.context}</div>}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center", marginBottom: "14px", flexWrap: "wrap" }}>
        <Btn onClick={() => speak(phrase.english)} variant="secondary" style={{ fontSize: "13px", padding: "7px 14px" }}>🔊 듣기</Btn>
        {[1.0, 0.75, 0.5].map(s => (
          React.createElement("button", {
            key: s,
            onClick: () => { globalPlaybackSpeed = s; speak(phrase.english, s); },
            style: { padding: "5px 10px", borderRadius: "14px", border: `1px solid ${globalPlaybackSpeed === s ? C.text : C.border}`, background: globalPlaybackSpeed === s ? C.text : C.bg, color: globalPlaybackSpeed === s ? "#fff" : C.textMid, fontSize: "11px", fontWeight: "600", cursor: "pointer", fontFamily: FONT }
          }, s + "x")
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        {!rec.isRec && !loading && <Btn onClick={rec.start} style={{ padding: "12px 32px", fontSize: "15px" }}>🎙 녹음 시작</Btn>}
        {rec.isRec && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: C.error, animation: "recPulse 1.5s ease-in-out infinite" }} />
              <span style={{ color: C.error, fontSize: "14px", fontWeight: "500" }}>녹음 중… {rec.time}초</span>
            </div>
            <Btn onClick={rec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error }}>⏹ 멈추기 (자동 분석)</Btn>
          </div>
        )}
        {loading && <div style={{ padding: "16px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>분석 중…</span></div>}
      </div>
      {errMsg && <div style={{ color: C.error, fontSize: "13px", marginTop: "10px", textAlign: "center" }}>{errMsg}</div>}
      {feedback && (
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${C.border}` }} className="fade-in">
          {transcription && (
            <div style={{ background: C.bgSoft, padding: "9px 12px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: C.textMid, borderLeft: `3px solid ${C.text}` }}>
              🎙 {highlightMissed(phrase.english, transcription)}
            </div>
          )}
          {recordingUrl && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", color: C.textLight, marginBottom: "4px", letterSpacing: "0.5px" }}>▶ 내 목소리 듣기</div>
              <audio src={recordingUrl} controls style={{ width: "100%", height: "40px" }} />
            </div>
          )}
          <FeedbackDisplay text={feedback.text} />
          {feedback.score >= 8 ? (
            <div style={{ marginTop: "12px" }}>
              <Msg text="🎉 잘했어요! 8점 이상 달성!" type="success" />
              {onClose && <Btn onClick={onClose} variant="secondary" style={{ width: "100%" }}>닫기 ✓</Btn>}
            </div>
          ) : (
            <div style={{ marginTop: "12px", padding: "12px", background: C.retryBg, border: `1px solid #F0C090`, borderRadius: "6px" }}>
              <div style={{ fontSize: "13px", color: C.retry, fontWeight: "600", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}><span style={{ fontSize: "18px" }}>💪</span> 8점 이상이 될 때까지 계속 연습해 보세요!</div>
              <Btn onClick={() => { rec.reset(); setFeedback(null); setTranscription(null); }} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🔄 다시 시도</Btn>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Free Talk Tab ─────────────────────────────────────────────────────────────
function FreeTalkTab({ user, isPreview, onPracticed }) {
  const [mode, setMode] = useState("speak");
  const [feedback, setFeedback] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [koreanText, setKoreanText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [englishPhrase, setEnglishPhrase] = useState("");
  const [correctedEnglish, setCorrectedEnglish] = useState("");
  const [showCorrectPractice, setShowCorrectPractice] = useState(false);
  const [showPractice, setShowPractice] = useState(false);
  const [situation, setSituation] = useState("");
  const [situationPhrases, setSituationPhrases] = useState([]);
  const [generatingSituation, setGeneratingSituation] = useState(false);
  const [savedMsg, setSavedMsg] = useState({ text: "", type: "success" });
  const [myPhrases, setMyPhrases] = useState([]); // loaded for dedup
  const [shownPhrases, setShownPhrases] = useState([]); // track shown phrases for regeneration
  const [practiceSessionPhrases, setPracticeSessionPhrases] = useState([]); // student's practice phrases

  // Load student's existing saved phrases and practice phrases for deduplication
  useEffect(() => {
    if (!user?.id || user.id === "preview") return;
    db.get("student_phrases", `student_id=eq.${user.id}&select=english`).then(r => setMyPhrases(r.map(p => p.english.toLowerCase()))).catch(() => {});
    db.get("session_phrases", `select=phrase_bank(english)&order=created_at.desc`).then(r => {
      setPracticeSessionPhrases(r.map(sp => sp.phrase_bank?.english?.toLowerCase()).filter(Boolean));
    }).catch(() => {});
  }, [user]);

  const handleSpeakStop = async (blob) => {
    if (isPreview) return;
    setLoading(true); setFeedback(null); setTranscription(null); setErrMsg(""); setCorrectedEnglish(""); setShowCorrectPractice(false);
    try {
      const said = await transcribe(blob);
      setTranscription(said);
      const { text, score } = await getFreeTalkFeedback(said);
      setFeedback({ text, score });
      // Extract the ✅ corrected English line for practice
      const correctedLine = text.split("\n").find(l => l.trim().startsWith("✅") && /[a-zA-Z]/.test(l) && !l.includes("잘한"));
      if (correctedLine) {
        const extracted = correctedLine.replace(/^✅\s*/, "").trim();
        if (extracted && /[a-zA-Z]/.test(extracted)) setCorrectedEnglish(extracted);
      }
      if (score >= 8) await onPracticed();
    } catch(e) { setErrMsg("Feedback error: " + e.message); }
    setLoading(false);
  };

  const handleAskStop = async (blob) => {
    setTranslating(true); setTranslation(null); setEnglishPhrase(""); setShowPractice(false);
    try {
      const said = await transcribe(blob);
      if (!said || said.trim().length === 0) {
        setTranslation("음성을 인식하지 못했어요. 다시 시도해 주세요.");
        setTranslating(false); return;
      }
      setKoreanText(said);
      const { text, englishPhrase: ep } = await getKoreanTranslation(said);
      setTranslation(text); setEnglishPhrase(ep);
    } catch(e) {
      setTranslation("오류가 발생했어요: " + e.message);
    }
    setTranslating(false);
  };

  const askByText = async () => {
    if (!koreanText.trim()) return;
    setTranslating(true); setTranslation(null); setEnglishPhrase(""); setShowPractice(false);
    try {
      const { text, englishPhrase: ep } = await getKoreanTranslation(koreanText);
      setTranslation(text); setEnglishPhrase(ep);
    } catch(e) { setTranslation("Translation error: " + e.message); }
    setTranslating(false);
  };

  const generateSituation = async () => {
    if (!situation.trim()) return;
    setGeneratingSituation(true);
    const exclusions = [...new Set([...shownPhrases, ...myPhrases, ...practiceSessionPhrases])];
    try {
      const newPhrases = await generateSituationPhrases(situation, exclusions);
      if (!Array.isArray(newPhrases) || newPhrases.length === 0) {
        setSavedMsg({ text: "표현을 생성할 수 없었어요. 다시 시도해 주세요.", type: "error" });
        setTimeout(() => setSavedMsg({ text: "", type: "success" }), 4000);
        setGeneratingSituation(false); return;
      }
      const filtered = newPhrases.filter(p => p.english && !exclusions.includes(p.english.toLowerCase()));
      setSituationPhrases(filtered.length > 0 ? filtered : newPhrases);
      setShownPhrases(prev => [...prev, ...newPhrases.map(p => p.english?.toLowerCase()).filter(Boolean)]);
    } catch(e) {
      setSavedMsg({ text: "오류: " + e.message, type: "error" });
      setTimeout(() => setSavedMsg({ text: "", type: "success" }), 4000);
    }
    setGeneratingSituation(false);
  };

  const saveToMyPhrases = async (p) => {
    if (!user?.id || user.id === "preview") return;
    // Check if already saved client-side first
    if (myPhrases.includes(p.english.toLowerCase())) {
      setSavedMsg({ text: "이미 저장된 표현이에요.", type: "warn" });
      setTimeout(() => setSavedMsg({ text: "", type: "success" }), 3000);
      return;
    }
    try {
      await db.insert("student_phrases", { student_id: user.id, english: p.english, korean: p.korean || "", context: p.context || "" });
      setMyPhrases(prev => [...prev, p.english.toLowerCase()]);
      setSavedMsg({ text: "✓ 저장됨: " + p.english, type: "success" });
      setTimeout(() => setSavedMsg({ text: "", type: "success" }), 3000);
    } catch(e) {
      // Check if it's a unique constraint violation (already exists)
      if (e.message.includes("unique") || e.message.includes("duplicate") || e.message.includes("23505")) {
        setMyPhrases(prev => [...prev, p.english.toLowerCase()]);
        setSavedMsg({ text: "이미 저장된 표현이에요.", type: "warn" });
      } else {
        setSavedMsg({ text: "저장 오류: " + e.message, type: "error" });
      }
      setTimeout(() => setSavedMsg({ text: "", type: "success" }), 3000);
    }
  };

  const speakRec = useRecorder(handleSpeakStop);
  const askRec = useRecorder(handleAskStop);

  const tabs = [["speak", "Speak English"], ["ask", "영어로 어떻게?"], ["phrases", "표현 생성기"]];

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "20px", overflowX: "auto" }}>
        {tabs.map(([m, label]) =>
          React.createElement("button", { key: m, onClick: () => { setMode(m); setFeedback(null); setTranslation(null); speakRec.reset(); askRec.reset(); setErrMsg(""); setShowPractice(false); setCorrectedEnglish(""); setShowCorrectPractice(false); }, style: { padding: "11px 14px", background: "transparent", border: "none", borderBottom: mode === m ? `2px solid ${C.text}` : "2px solid transparent", color: mode === m ? C.text : C.textLight, fontSize: "13px", fontWeight: mode === m ? "600" : "400", cursor: "pointer", fontFamily: FONT, marginBottom: "-1px", whiteSpace: "nowrap" } }, label)
        )}
      </div>

      {/* SPEAK ENGLISH */}
      {mode === "speak" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: "16px", background: C.goldBg }}>
            <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "4px", color: C.text }}>자유롭게 영어로 말해보세요!</div>
            <div style={{ fontSize: "12px", color: C.textMid }}>오늘 있었던 일, 여행 계획, 하고 싶은 말 — 무엇이든 영어로 말하고 피드백을 받아보세요.</div>
          </Card>
          <div style={{ textAlign: "center" }}>
            {!speakRec.isRec && !loading && <Btn onClick={speakRec.start} style={{ padding: "12px 32px", fontSize: "15px" }}>🎙 말하기 시작</Btn>}
            {speakRec.isRec && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: C.error, animation: "recPulse 1.5s ease-in-out infinite" }} />
                  <span style={{ color: C.error, fontSize: "14px", fontWeight: "500" }}>녹음 중… {speakRec.time}초</span>
                </div>
                <Btn onClick={speakRec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error }}>⏹ 멈추기 (자동 분석)</Btn>
              </div>
            )}
            {loading && <div style={{ padding: "16px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>분석 중…</span></div>}
          </div>
          {errMsg && <Msg text={errMsg} type="error" />}
          {feedback && (
            <Card style={{ marginTop: "16px" }} className="fade-in">
              {transcription && <div style={{ background: C.bgSoft, padding: "9px 12px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: C.textMid, fontStyle: "italic", borderLeft: `3px solid ${C.text}` }}>🎙 "{transcription}"</div>}
              <FeedbackDisplay text={feedback.text} />
              <div style={{ marginTop: "10px", padding: "10px 12px", background: feedback.score >= 8 ? C.successBg : C.retryBg, borderRadius: "6px", fontSize: "13px", color: feedback.score >= 8 ? C.success : C.retry, fontWeight: "500" }}>
                {feedback.score >= 8 ? "🎉 잘했어요!" : "계속 연습하면 더 잘 할 수 있어요! 💪"}
              </div>
              {correctedEnglish && (
                <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "12px", color: C.textLight, marginBottom: "8px", letterSpacing: "0.5px" }}>교정된 표현으로 연습해 보세요:</div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <Btn onClick={() => speak(correctedEnglish)} variant="secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>🔊 듣기</Btn>
                    <Btn onClick={() => setShowCorrectPractice(p => !p)} variant="secondary" style={{ fontSize: "12px", padding: "6px 12px" }}>🎙 {showCorrectPractice ? "닫기" : "연습하기"}</Btn>
                    <Btn onClick={() => saveToMyPhrases({ english: correctedEnglish, korean: "", context: "Free Talk 연습 중 교정된 표현" })} variant={myPhrases.includes(correctedEnglish.toLowerCase()) ? "success" : "ghost"} style={{ fontSize: "12px", padding: "6px 12px" }}>
                      {myPhrases.includes(correctedEnglish.toLowerCase()) ? "✓ 저장됨" : "⭐ 저장"}
                    </Btn>
                  </div>
                  {savedMsg.text && <div style={{ fontSize: "12px", color: savedMsg.type === "success" ? C.success : savedMsg.type === "warn" ? C.retry : C.error, marginBottom: "6px" }}>{savedMsg.text}</div>}
                  {showCorrectPractice && <MiniPractice phrase={{ english: correctedEnglish, korean: "" }} user={user} isPreview={isPreview} showListen={false} />}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* HOW DO I SAY THIS */}
      {mode === "ask" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>영어로 어떻게 말하는지 물어보세요!</div>
            <div style={{ fontSize: "12px", color: C.textLight }}>한국어로 타이핑하거나 말하면 영어 표현을 알려드릴게요.</div>
          </Card>
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <Input value={koreanText} onChange={e => setKoreanText(e.target.value)} placeholder="한국어로 입력… (예: 배고파 죽겠어)" style={{ fontSize: "14px" }} />
            <Btn onClick={askByText} disabled={translating || !koreanText.trim()} variant="secondary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>묻기</Btn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
            <span style={{ fontSize: "11px", color: C.textLight }}>또는 말하기</span>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
          </div>
          <Card style={{ marginBottom: "12px", textAlign: "center" }}>
            {!askRec.isRec && !translating && <Btn onClick={askRec.start} variant="secondary" style={{ fontSize: "13px" }}>🎙 한국어로 말하기</Btn>}
            {askRec.isRec && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.error }} />
                  <span style={{ color: C.error, fontSize: "13px" }}>녹음 중… {askRec.time}초</span>
                </div>
                <Btn onClick={askRec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error, fontSize: "13px" }}>⏹ 멈추기 (자동 번역)</Btn>
              </div>
            )}
            {translating && <div style={{ padding: "10px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>번역 중…</span></div>}
          </Card>
          {translation && (
            <Card className="fade-in">
              <TranslationDisplay text={translation} />
              {englishPhrase && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "12px" }}>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
                    <Btn onClick={() => speak(englishPhrase)} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🔊 듣기</Btn>
                    <Btn onClick={() => setShowPractice(p => !p)} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🎙 {showPractice ? "닫기" : "연습하기"}</Btn>
                    <Btn onClick={() => saveToMyPhrases({ english: englishPhrase, korean: koreanText, context: "" })} variant={myPhrases.includes(englishPhrase.toLowerCase()) ? "success" : "ghost"} style={{ fontSize: "12px", padding: "7px 14px" }}>
                      {myPhrases.includes(englishPhrase.toLowerCase()) ? "✓ 저장됨" : "⭐ 저장"}
                    </Btn>
                  </div>
                  {savedMsg.text && <div style={{ fontSize: "12px", color: savedMsg.type === "success" ? C.success : savedMsg.type === "warn" ? C.retry : C.error, marginBottom: "6px" }}>{savedMsg.text}</div>}
                  {showPractice && (
                    <MiniPractice phrase={{ english: englishPhrase, korean: koreanText }} user={user} isPreview={isPreview} showListen={false} autoRecord={true} />
                  )}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* PHRASE GENERATOR */}
      {mode === "phrases" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>상황별 표현 생성기</div>
            <div style={{ fontSize: "12px", color: C.textLight }}>상황을 설명하면 유용한 영어 표현을 알려드릴게요. 새 표현만 생성되고, 이미 저장된 표현은 제외돼요!</div>
          </Card>
          {savedMsg.text && <Msg text={savedMsg.text} type={savedMsg.type} />}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <Input value={situation} onChange={e => { const v = e.target.value; setSituation(v); if (v !== situation) { setShownPhrases([]); setSituationPhrases([]); } }} placeholder="예: 호텔 체크인, 카페에서 주문, 새로운 친구 만나기" style={{ fontSize: "14px" }} />
            <Btn onClick={generateSituation} disabled={generatingSituation || !situation.trim()} variant="primary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{generatingSituation ? React.createElement(Spinner) : situationPhrases.length > 0 ? "다시 생성" : "생성하기"}</Btn>
          </div>
          {situationPhrases.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {situationPhrases.map((p, i) => React.createElement(SituationPhraseRow, { key: i, phrase: p, user, isPreview, alreadySaved: myPhrases.includes(p.english.toLowerCase()), onSave: async (phrase) => { await saveToMyPhrases(phrase); } }))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Translation Display — rich formatted Korean→English output ────────────────
function TranslationDisplay({ text }) {
  if (!text) return null;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const sections = [];
  let currentSection = null;

  const HEADERS = {
    "한국어 표현": { icon: "🇰🇷", color: C.textMid, bg: C.bgSoft },
    "영어 표현": { icon: "🗣", color: C.success, bg: C.successBg },
    "예문": { icon: "📌", color: C.gold, bg: C.goldBg },
    "사용 팁": { icon: "💡", color: "#6B5B95", bg: "#F3F0F9" },
  };

  for (const line of lines) {
    const headerKey = Object.keys(HEADERS).find(h => line === h || line.startsWith(h));
    if (headerKey) {
      currentSection = { header: headerKey, style: HEADERS[headerKey], lines: [] };
      sections.push(currentSection);
    } else if (line.startsWith("💪")) {
      sections.push({ header: null, motivation: true, line });
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      sections.push({ header: null, plain: true, line });
    }
  }

  return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "10px" } },
    sections.map((s, i) => {
      if (s.motivation) return React.createElement("div", { key: i, style: { textAlign: "center", fontSize: "14px", color: C.textMid, fontWeight: "500", paddingTop: "4px" } }, s.line.replace("💪", "").trim() + " 💪");
      if (s.plain) return React.createElement("div", { key: i, style: { fontSize: "14px", color: C.text } }, s.line);
      if (!s.header) return null;
      const { icon, color, bg } = s.style;
      return React.createElement("div", { key: i, style: { background: bg, borderRadius: "8px", overflow: "hidden" } },
        React.createElement("div", { style: { padding: "8px 14px", borderBottom: `1px solid ${color}22`, display: "flex", alignItems: "center", gap: "6px" } },
          React.createElement("span", { style: { fontSize: "15px" } }, icon),
          React.createElement("span", { style: { fontSize: "12px", fontWeight: "700", color, textTransform: "uppercase", letterSpacing: "1px" } }, s.header)
        ),
        React.createElement("div", { style: { padding: "10px 14px", display: "flex", flexDirection: "column", gap: "4px" } },
          s.lines.map((l, j) => {
            const isArrow = l.startsWith("→");
            const isNumbered = /^\d+\./.test(l);
            return React.createElement("div", { key: j, style: { fontSize: "14px", color: isArrow ? C.textMid : C.text, fontStyle: isArrow ? "italic" : "normal", paddingLeft: isArrow ? "8px" : "0", lineHeight: 1.7, fontWeight: isNumbered ? "500" : "400" } }, l);
          })
        )
      );
    })
  );
}

// ── Situation Phrase Row ──────────────────────────────────────────────────────
function SituationPhraseRow({ phrase, user, isPreview, alreadySaved, onSave }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(alreadySaved || false);

  const handleSave = async () => {
    if (saved) return;
    await onSave(phrase);
    setSaved(true);
  };

  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${C.border}`, background: C.bg, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "14px", fontStyle: "italic", color: C.text, marginBottom: "3px" }}>"{phrase.english}"</div>
          {phrase.korean && <div style={{ fontSize: "12px", color: C.textMid }}>{phrase.korean}</div>}
          {phrase.context && <div style={{ fontSize: "11px", color: C.gold, marginTop: "2px" }}>{phrase.context}</div>}
        </div>
        <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
          <Btn onClick={() => speak(phrase.english)} variant="secondary" style={{ fontSize: "11px", padding: "5px 10px" }}>🔊</Btn>
          <Btn onClick={() => setOpen(o => !o)} variant={open ? "primary" : "secondary"} style={{ fontSize: "11px", padding: "5px 10px" }}>🎙</Btn>
          <Btn onClick={handleSave} disabled={saved} variant={saved ? "success" : "ghost"} style={{ fontSize: "11px", padding: "5px 10px" }}>{saved ? "✓ 저장됨" : "⭐ 저장"}</Btn>
        </div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", background: C.bgSoft }} className="fade-in">
          <MiniPractice phrase={phrase} user={user} isPreview={isPreview} showListen={false} autoRecord={true} />
        </div>
      )}
    </div>
  );
}
function MyPhrasesTab({ user, isPreview }) {
  const [phrases, setPhrases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    if (!user?.id || user.id === "preview") { setLoading(false); return; }
    setLoading(true);
    db.get("student_phrases", `student_id=eq.${user.id}&order=created_at.desc`)
      .then(data => { setPhrases(data || []); setLoading(false); })
      .catch(e => { console.error("MyPhrases load error:", e); setLoading(false); });
  }, [user?.id]);

  const toggleHide = async (id, hidden) => {
    try {
      await db.update("student_phrases", `id=eq.${id}`, { hidden: !hidden });
      setPhrases(prev => prev.map(p => p.id === id ? { ...p, hidden: !hidden } : p));
    } catch(e) {}
  };

  const deletePhrase = async (id) => {
    try {
      await db.delete("student_phrases", `id=eq.${id}`);
      setPhrases(prev => prev.filter(p => p.id !== id));
    } catch(e) {}
  };

  const filtered = phrases.filter(p => {
    if (!showHidden && p.hidden) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.english.toLowerCase().includes(q) || (p.korean && p.korean.includes(q));
  });

  const visible = filtered.filter(p => !p.hidden);
  const hidden = filtered.filter(p => p.hidden);

  if (loading) return React.createElement("div", { style: { textAlign: "center", padding: "60px" } }, React.createElement(Spinner));

  if (isPreview || user.id === "preview") return React.createElement("div", { style: { textAlign: "center", padding: "40px", color: C.textLight, fontStyle: "italic" } }, "My Phrases not available in preview mode.");

  return (
    <div>
      <Card style={{ marginBottom: "16px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>⭐ 나의 표현 모음</div>
        <div style={{ fontSize: "12px", color: C.textLight }}>Free Talk에서 저장한 표현들이에요. 검색하고 연습하거나 숨길 수 있어요.</div>
      </Card>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "14px" }}>
        <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: C.textLight, fontSize: "14px" }}>🔍</div>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="표현 검색…" style={{ paddingLeft: "36px" }} />
      </div>

      {phrases.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⭐</div>
          <div style={{ fontSize: "15px", color: C.textMid, marginBottom: "8px" }}>아직 저장된 표현이 없어요.</div>
          <div style={{ fontSize: "13px", color: C.textLight }}>Free Talk → "영어로 어떻게?" 에서 표현을 저장해보세요!</div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", color: C.textLight }}>{visible.length}개 표현{hidden.length > 0 ? ` · 숨김 ${hidden.length}개` : ""}</div>
            {hidden.length > 0 && (
              <button onClick={() => setShowHidden(s => !s)} style={{ background: showHidden ? C.bgMid : C.bgSoft, border: `1px solid ${C.border}`, borderRadius: "20px", padding: "4px 12px", fontSize: "12px", color: C.textMid, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: "5px" }}>
                {showHidden ? "🙈 숨긴 표현 숨기기" : `👁 숨긴 표현 보기 (${hidden.length}개)`}
              </button>
            )}
          </div>

          {/* Hidden phrases section - shown at TOP when toggled */}
          {showHidden && hidden.length > 0 && (
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "11px", fontWeight: "700", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>숨긴 표현</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                {hidden.map(p => React.createElement(MyPhraseRow, { key: p.id, phrase: p, user, isPreview, onToggleHide: () => toggleHide(p.id, p.hidden), onDelete: () => deletePhrase(p.id) }))}
              </div>
              <div style={{ height: "1px", background: C.border, marginBottom: "12px" }} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {visible.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: C.textLight, fontStyle: "italic", fontSize: "13px" }}>
                표시할 표현이 없어요. 위에서 숨긴 표현을 확인해 보세요.
              </div>
            ) : (
              visible.map(p => React.createElement(MyPhraseRow, { key: p.id, phrase: p, user, isPreview, onToggleHide: () => toggleHide(p.id, p.hidden), onDelete: () => deletePhrase(p.id) }))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── My Phrase Row ─────────────────────────────────────────────────────────────
function MyPhraseRow({ phrase, user, isPreview, onToggleHide, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${C.border}`, background: phrase.hidden ? C.bgSoft : C.bg, opacity: phrase.hidden ? 0.6 : 1 }}>
      <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
        <div onClick={() => setOpen(o => !o)} style={{ flex: 1, cursor: "pointer" }}>
          <div style={{ fontSize: "14px", fontStyle: "italic", marginBottom: "2px" }}>"{phrase.english}"</div>
          {phrase.korean && <div style={{ fontSize: "12px", color: C.textMid }}>{phrase.korean}</div>}
          {phrase.context && <div style={{ fontSize: "11px", color: C.gold, marginTop: "2px" }}>{phrase.context}</div>}
        </div>
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button onClick={() => speak(phrase.english)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "5px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}>🔊</button>
          <button onClick={() => setOpen(o => !o)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "5px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}>🎙</button>
          <button onClick={onToggleHide} title={phrase.hidden ? "Show" : "Hide"} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "5px", padding: "4px 8px", cursor: "pointer", fontSize: "12px" }}>{phrase.hidden ? "👁" : "🙈"}</button>
          {confirmDelete ? (
            <div style={{ display: "flex", gap: "3px" }}>
              <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{ background: C.error, border: "none", borderRadius: "5px", padding: "4px 8px", cursor: "pointer", fontSize: "11px", color: "#fff", fontFamily: FONT }}>삭제</button>
              <button onClick={() => setConfirmDelete(false)} style={{ background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: "5px", padding: "4px 6px", cursor: "pointer", fontSize: "11px", fontFamily: FONT }}>취소</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "5px", padding: "4px 8px", cursor: "pointer", fontSize: "12px", color: C.error }}>×</button>
          )}
        </div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 14px" }} className="fade-in">
          <MiniPractice phrase={phrase} user={user} isPreview={isPreview} />
        </div>
      )}
    </div>
  );
}

// ── Notes Tab (Student) ───────────────────────────────────────────────────────

// ── Notes Tab (Student) ───────────────────────────────────────────────────────
function NotesTab({ user, group, isPreview }) {
  const [sessionNotes, setSessionNotes] = useState([]);
  const [studentNote, setStudentNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadReplies, setUnreadReplies] = useState(0);

  useEffect(() => {
    if (!group?.id || isPreview) { setLoading(false); return; }
    Promise.all([
      db.get("session_notes", `group_id=eq.${group.id}&order=session_number.desc`),
      db.get("student_notes", `student_id=eq.${user.id}&order=created_at.desc&limit=1`),
    ]).then(([sn, pn]) => { setSessionNotes(sn); setStudentNote(pn[0] || null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [group, user, isPreview]);

  if (loading) return React.createElement("div", { style: { textAlign: "center", padding: "40px" } }, React.createElement(Spinner));
  if (isPreview) return React.createElement("div", { style: { textAlign: "center", padding: "40px", color: C.textLight, fontStyle: "italic" } }, "Notes not available in preview mode.");

  return (
    <div>
      {/* Personal note */}
      {studentNote && (
        <NoteCard note={studentNote} noteType="student" user={user} isTeacher={false} />
      )}
      {/* Session notes */}
      {sessionNotes.length === 0 && !studentNote ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📝</div>
          <div style={{ fontSize: "15px", color: C.textMid, marginBottom: "8px" }}>아직 노트가 없어요.</div>
          <div style={{ fontSize: "13px", color: C.textLight }}>선생님이 수업 후 노트를 추가해 드릴게요!</div>
        </div>
      ) : sessionNotes.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.textLight, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>수업 노트</div>
          {sessionNotes.map(note =>
            React.createElement(NoteCard, { key: note.id, note, noteType: "session", user, isTeacher: false })
          )}
        </div>
      )}
    </div>
  );
}

// ── Note Card with Replies ────────────────────────────────────────────────────
function NoteCard({ note, noteType, user, isTeacher }) {
  const [replies, setReplies] = useState([]);
  const [replyInput, setReplyInput] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    db.get("note_replies", `note_id=eq.${note.id}&order=created_at.asc`)
      .then(setReplies).catch(() => {});
  }, [note.id]);

  const sendReply = async () => {
    if (!replyInput.trim()) return;
    setSending(true);
    try {
      const r = await db.insert("note_replies", {
        note_id: note.id, note_type: noteType,
        student_id: isTeacher ? null : user.id,
        sender: isTeacher ? "Teacher Tom" : user.name,
        is_teacher: isTeacher, content: replyInput.trim()
      });
      const newReply = Array.isArray(r) ? r[0] : r;
      setReplies(prev => [...prev, newReply]);
      setReplyInput(""); setShowReply(false);
    } catch(e) {}
    setSending(false);
  };

  const isPersonal = noteType === "student";

  return (
    <Card style={{ marginBottom: "12px", borderLeft: `3px solid ${isPersonal ? C.success : C.gold}`, background: C.bgCard }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: "700", color: isPersonal ? C.success : C.gold, letterSpacing: "1px", textTransform: "uppercase" }}>
          {isPersonal ? "📝 개인 피드백" : "📋 Session " + note.session_number + " 노트"}
        </div>
        <div style={{ fontSize: "11px", color: C.textLight }}>{new Date(note.updated_at || note.created_at).toLocaleDateString("ko-KR")}</div>
      </div>
      <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.8, whiteSpace: "pre-line", marginBottom: "10px" }}>{note.content}</div>

      {/* Replies */}
      {replies.length > 0 && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "8px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
          {replies.map(r => (
            React.createElement("div", { key: r.id, style: { display: "flex", gap: "8px", alignItems: "flex-start" } },
              React.createElement("div", { style: { fontSize: "11px", fontWeight: "600", color: r.is_teacher ? C.gold : C.text, minWidth: "80px", paddingTop: "2px" } }, r.is_teacher ? "👨🏫 Teacher" : r.sender),
              React.createElement("div", { style: { flex: 1, fontSize: "13px", color: C.text, background: C.bgSoft, padding: "6px 10px", borderRadius: "0 8px 8px 8px", lineHeight: 1.5 } }, r.content)
            )
          ))}
        </div>
      )}

      {/* Reply input */}
      {showReply ? (
        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
          <input value={replyInput} onChange={e => setReplyInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendReply()} placeholder="댓글 달기…" style={{ flex: 1, padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", fontFamily: FONT, outline: "none" }} />
          <Btn onClick={sendReply} disabled={sending || !replyInput.trim()} style={{ padding: "7px 12px", fontSize: "12px" }}>{sending ? React.createElement(Spinner) : "전송"}</Btn>
          <Btn onClick={() => setShowReply(false)} variant="ghost" style={{ padding: "7px 10px", fontSize: "12px" }}>✕</Btn>
        </div>
      ) : (
        <button onClick={() => setShowReply(true)} style={{ background: "transparent", border: "none", color: C.textLight, fontSize: "12px", cursor: "pointer", fontFamily: FONT, padding: "2px 0" }}>
          💬 {replies.length > 0 ? `${replies.length}개 댓글` : "댓글 달기"}
        </button>
      )}
    </Card>
  );
}


// ── Floating Chat Bubble System ───────────────────────────────────────────────
function FloatingChat({ user, group, isPreview, isTeacher = false, groups = [], students = [] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("group"); // group | private
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [typing, setTyping] = useState([]); // who is typing
  const [isTyping, setIsTyping] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(group || groups[0]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const lastReadRef = useRef(new Date().toISOString());

  const currentGroup = isTeacher ? selectedGroup : group;
  const isOnline = (lastSeen) => lastSeen && new Date() - new Date(lastSeen) < 90000;

  const groupStudents = isTeacher
    ? students.filter(s => s.group_id === currentGroup?.id)
    : students.filter(s => s.group_id === group?.id);

  const loadMessages = useCallback(async () => {
    if (!currentGroup?.id || isPreview) return;
    try {
      const query = mode === "group"
        ? `group_id=eq.${currentGroup.id}&is_private=eq.false&order=created_at.asc&limit=100`
        : isTeacher
          ? selectedStudent ? `group_id=eq.${currentGroup.id}&is_private=eq.true&student_id=eq.${selectedStudent.id}&order=created_at.asc&limit=100` : null
          : `group_id=eq.${currentGroup.id}&is_private=eq.true&student_id=eq.${user.id}&order=created_at.asc&limit=100`;
      if (!query) return;
      const msgs = await db.get("messages", query);
      setMessages(msgs);
      // Count unread
      if (!open) {
        const newUnread = msgs.filter(m => {
          const isFromOther = isTeacher ? !m.is_teacher : (m.is_teacher || m.sender !== user.name);
          return isFromOther && m.created_at > lastReadRef.current;
        }).length;
        if (newUnread > 0) {
          setUnread(prev => Math.max(prev, newUnread));
          // Browser notification when app is in background
          if ("Notification" in window && Notification.permission === "granted" && document.hidden) {
            const latestNew = msgs.filter(m => {
              const isFromOther = isTeacher ? !m.is_teacher : (m.is_teacher || m.sender !== user.name);
              return isFromOther && m.created_at > lastReadRef.current;
            }).slice(-1)[0];
            if (latestNew) {
              new Notification("Wayve 💬 새 메시지", {
                body: `${latestNew.sender}: ${latestNew.content.slice(0, 80)}`,
                icon: "/logo192.png",
                tag: "wayve-chat",
              });
            }
          }
        }
      }
      if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch(e) {}
  }, [currentGroup, mode, selectedStudent, open, isTeacher, user, isPreview]);

  // Load typing indicators
  const loadTyping = useCallback(async () => {
    if (!currentGroup?.id || isPreview) return;
    try {
      const cutoff = new Date(Date.now() - 5000).toISOString();
      const rows = await db.get("typing_indicators",
        `group_id=eq.${currentGroup.id}&updated_at=gt.${cutoff}&${isTeacher ? "" : `is_private=eq.${mode === "private"}&`}order=updated_at.desc`
      );
      const others = rows.filter(r => isTeacher ? !r.is_teacher : r.sender !== user.name);
      setTyping(others.map(r => r.sender));
    } catch(e) {}
  }, [currentGroup, mode, isTeacher, user, isPreview]);

  useEffect(() => {
    loadMessages();
    const msgInterval = setInterval(loadMessages, 5000);
    const typingInterval = setInterval(loadTyping, 2000);
    return () => { clearInterval(msgInterval); clearInterval(typingInterval); };
  }, [loadMessages, loadTyping]);

  useEffect(() => {
    if (open) { setUnread(0); lastReadRef.current = new Date().toISOString(); setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100); inputRef.current?.focus(); }
  }, [open]);

  const updateTyping = async (isTypingNow) => {
    if (!currentGroup?.id || isPreview) return;
    try {
      const senderName = isTeacher ? "Teacher Tom" : user.name;
      if (isTypingNow) {
        await db.upsert("typing_indicators", { group_id: currentGroup.id, student_id: isTeacher ? null : user.id, sender: senderName, is_teacher: isTeacher, is_private: mode === "private", updated_at: new Date().toISOString() });
      } else {
        await db.delete("typing_indicators", `group_id=eq.${currentGroup.id}&sender=eq.${encodeURIComponent(senderName)}`);
      }
    } catch(e) {}
  };

  const handleInputChange = (val) => {
    setInput(val);
    if (!isTyping && val.length > 0) { setIsTyping(true); updateTyping(true); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { setIsTyping(false); updateTyping(false); }, 3000);
    if (val.length === 0) { setIsTyping(false); updateTyping(false); }
  };

  const send = async () => {
    if (!input.trim() || sending || !currentGroup) return;
    setSending(true);
    setIsTyping(false); updateTyping(false);
    try {
      const senderName = isTeacher ? "Teacher Tom" : user.name;
      await db.insert("messages", {
        group_id: currentGroup.id,
        student_id: isTeacher ? (selectedStudent?.id || null) : user.id,
        sender: senderName,
        content: input.trim(),
        is_teacher: isTeacher,
        is_private: mode === "private",
        read: false
      });
      setInput("");
      await loadMessages();
    } catch(e) { console.error("Send failed:", e); }
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Group messages by day
  const groupedMessages = [];
  let lastDay = null;
  messages.forEach(msg => {
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDay) { groupedMessages.push({ type: "day", label: formatDay(msg.created_at) }); lastDay = day; }
    groupedMessages.push({ type: "msg", msg });
  });

  const onlineStudents = groupStudents.filter(s => s.id !== user.id && isOnline(s.last_seen));

  return (
    <React.Fragment>
      {/* Floating bubble button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ position: "fixed", bottom: "20px", right: "20px", width: "56px", height: "56px", borderRadius: "50%", background: C.text, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", boxShadow: "0 4px 20px rgba(0,0,0,0.25)", zIndex: 100, transition: "transform 0.2s", transform: open ? "scale(0.9)" : "scale(1)" }}
      >
        {open ? "✕" : "💬"}
        {unread > 0 && !open && (
          <span style={{ position: "absolute", top: "-4px", right: "-4px", background: C.error, color: "#fff", borderRadius: "50%", width: "20px", height: "20px", fontSize: "11px", fontWeight: "700", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Chat drawer - full screen on mobile, popup on desktop */}
      {open && (
        <div style={{
          position: "fixed",
          // Mobile: full screen. Desktop: popup near bubble
          bottom: window.innerWidth < 600 ? 0 : "86px",
          right: window.innerWidth < 600 ? 0 : "16px",
          left: window.innerWidth < 600 ? 0 : "auto",
          top: window.innerWidth < 600 ? 0 : "auto",
          width: window.innerWidth < 600 ? "100%" : "min(380px, calc(100vw - 32px))",
          height: window.innerWidth < 600 ? "100%" : "min(560px, calc(100vh - 110px))",
          background: C.bg,
          borderRadius: window.innerWidth < 600 ? 0 : "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: window.innerWidth < 600 ? "none" : `1px solid ${C.border}`
        }}>

          {/* Header */}
          <div style={{ background: C.text, padding: "14px 16px", flexShrink: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ fontSize: "15px", fontWeight: "600", color: "#fff" }}>
                {mode === "group" ? "👥 Class Chat" : "🔒 Private Chat"}
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {isTeacher && groups.length > 1 && (
              <select value={selectedGroup?.id || ""} onChange={e => { const g = groups.find(x => x.id === e.target.value); setSelectedGroup(g); setMessages([]); }} style={{ width: "100%", background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", fontSize: "12px", fontFamily: FONT, outline: "none", marginBottom: "8px", borderRadius: "6px", padding: "6px 8px" }}>
                {groups.map(g => React.createElement("option", { key: g.id, value: g.id, style: { color: C.text, background: C.bg } }, g.name))}
              </select>
            )}
            <div style={{ display: "flex", gap: "6px" }}>
              {[["group", "👥 Class"], ["private", "🔒 Private"]].map(([m, label]) =>
                React.createElement("button", { key: m, onClick: () => { setMode(m); setSelectedStudent(null); setMessages([]); }, style: { padding: "6px 14px", borderRadius: "20px", border: "none", background: mode === m ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.08)", color: "#fff", fontSize: "13px", fontWeight: mode === m ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, label)
              )}
            </div>
            {mode === "group" && onlineStudents.length > 0 && (
              <div style={{ marginTop: "6px", fontSize: "11px", color: "rgba(255,255,255,0.7)" }}>
                🟢 {onlineStudents.map(s => s.name).join(", ")}
              </div>
            )}
          </div>

          {/* Student selector for private */}
          {mode === "private" && isTeacher && (
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <select value={selectedStudent?.id || ""} onChange={e => { setSelectedStudent(groupStudents.find(s => s.id === e.target.value) || null); setMessages([]); }} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "14px", fontFamily: FONT, outline: "none", background: C.bg }}>
                <option value="">학생 선택…</option>
                {groupStudents.map(s => React.createElement("option", { key: s.id, value: s.id }, s.name + (isOnline(s.last_seen) ? " 🟢" : "")))}
              </select>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {groupedMessages.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: C.textLight, fontSize: "13px" }}>
                {mode === "group" ? "아직 메시지가 없어요. 먼저 인사해 보세요! 👋" : mode === "private" && isTeacher && !selectedStudent ? "학생을 선택하세요" : "선생님과 대화를 시작해 보세요!"}
              </div>
            )}
            {groupedMessages.map((item, idx) => {
              if (item.type === "day") return (
                React.createElement("div", { key: "day-" + idx, style: { textAlign: "center", margin: "10px 0 6px", fontSize: "11px", color: C.textLight } }, item.label)
              );
              const { msg } = item;
              const isMe = isTeacher ? msg.is_teacher : (msg.sender === user.name && !msg.is_teacher);
              const isTeacherMsg = msg.is_teacher;
              return (
                React.createElement("div", { key: msg.id, style: { display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: "6px" } },
                  React.createElement("div", { style: { fontSize: "10px", color: C.textLight, marginBottom: "3px", padding: "0 4px" } },
                    isTeacherMsg ? "👨🏫 Teacher Tom" : msg.sender, " · ",
                    new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                  ),
                  React.createElement("div", { style: { maxWidth: "80%", padding: "9px 13px", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isMe ? C.text : isTeacherMsg ? C.goldBg : C.bgSoft, color: isMe ? "#fff" : C.text, fontSize: "14px", lineHeight: 1.5, border: isTeacherMsg && !isMe ? `1px solid ${C.gold}` : "none", wordBreak: "break-word" } }, msg.content)
                )
              );
            })}
            {/* Typing indicator */}
            {typing.length > 0 && (
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", padding: "4px" } },
                React.createElement("div", { style: { background: C.bgSoft, borderRadius: "16px 16px 16px 4px", padding: "8px 12px", display: "flex", gap: "3px", alignItems: "center" } },
                  [0,1,2].map(i => React.createElement("div", { key: i, style: { width: "6px", height: "6px", borderRadius: "50%", background: C.textLight, animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` } }))
                ),
                React.createElement("span", { style: { fontSize: "11px", color: C.textLight } }, typing.join(", ") + " 입력 중…")
              )
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "8px", alignItems: "flex-end", flexShrink: 0, background: C.bg }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지 입력…"
              rows={1}
              style={{ flex: 1, padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "22px", fontSize: "15px", fontFamily: FONT, outline: "none", resize: "none", maxHeight: "100px", overflowY: "auto", lineHeight: 1.4, background: C.bgMid, WebkitAppearance: "none" }}
            />
            <button onClick={send} disabled={sending || !input.trim()} style={{ width: "42px", height: "42px", borderRadius: "50%", background: input.trim() ? C.text : C.bgMid, border: "none", color: "#fff", cursor: input.trim() ? "pointer" : "default", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "background 0.15s" }}>
              {sending ? "⋯" : "➤"}
            </button>
          </div>
        </div>
      )}

      {/* Bounce animation for typing dots */}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </React.Fragment>
  );
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}



// ── Teacher Screen ────────────────────────────────────────────────────────────
function TeacherScreen({ groups, setGroups, setScreen, onPreview }) {
  const [tab, setTab] = useState("groups");
  const [students, setStudents] = useState([]);
  const [phraseBank, setPhraseBank] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "success" });

  const showMsg = useCallback((text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "success" }), 4000); }, []);

  useEffect(() => {
    Promise.all([
      db.get("students", "select=*&order=created_at.asc").catch(() => []),
      db.get("phrase_bank", "order=english.asc").catch(() => []),
      db.get("groups", "order=created_at.asc").catch(() => []),
    ]).then(([s, p, g]) => { setStudents(s); setPhraseBank(p); setGroups(g); setLoading(false); });
  }, []);

  if (loading) return React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: "12px" } },
    React.createElement(Spinner),
    React.createElement("div", { style: { fontSize: "13px", color: C.textLight } }, "Loading dashboard…")
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ background: C.bgSoft, borderBottom: `1px solid ${C.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 10, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #C9A84C, #E8C56A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>🌊</div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: "18px", fontWeight: "400", letterSpacing: "2px", color: C.text }}>WAYVE</div>
              <div style={{ fontSize: "10px", color: C.gold, letterSpacing: "2px", textTransform: "uppercase", fontWeight: "600" }}>Teacher Dashboard</div>
            </div>
          </div>
          <button onClick={() => setScreen("login")} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textLight, padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontFamily: FONT }}>Log out</button>
        </div>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {[["groups", "Groups"], ["add", "Add Phrases"], ["students", "Students"], ["notes", "Notes"], ["myphrases", "Student Phrases"], ["cities", "🏙 City Groups"], ["qod", "💡 QoD Studio"]].map(([t, label]) =>
            React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "10px 16px", background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.gold}` : "2px solid transparent", color: tab === t ? C.gold : C.textLight, fontSize: "13px", fontWeight: tab === t ? "700" : "400", cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap", marginBottom: "-1px", transition: "color 0.15s" } }, label)
          )}
        </div>
      </div>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 16px" }}>
        <Msg text={msg.text} type={msg.type} />
        {tab === "groups" && React.createElement(GroupsTab, { groups, setGroups, students, setStudents, onPreview, showMsg })}
        {tab === "add" && React.createElement(AddPhrasesTab, { groups, phraseBank, setPhraseBank, showMsg })}
        {tab === "students" && React.createElement(StudentsTab, { students, setStudents, groups, showMsg })}
        {tab === "notes" && React.createElement(TeacherNotesTab, { groups, students, showMsg })}
        {tab === "myphrases" && React.createElement(TeacherMyPhrasesTab, { students, groups })}
        {tab === "cities" && React.createElement(CityGroupsTab, { groups, students, showMsg })}
        {tab === "qod" && React.createElement(QodStudioTab, { showMsg })}
      </div>
      {React.createElement(FloatingChat, { user: { id: "teacher", name: "Teacher Tom" }, group: groups[0], isPreview: false, isTeacher: true, groups, students })}
    </div>
  );
}

// ── Teacher Notes Tab ─────────────────────────────────────────────────────────
function TeacherNotesTab({ groups, students, showMsg }) {
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [sessionNum, setSessionNum] = useState(1);
  const [sessionContent, setSessionContent] = useState("");
  const [studentContent, setStudentContent] = useState("");
  const [sessionNotes, setSessionNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedGroup) return;
    db.get("session_notes", `group_id=eq.${selectedGroup.id}&order=session_number.desc`).then(setSessionNotes).catch(() => {});
  }, [selectedGroup]);

  useEffect(() => {
    if (!selectedStudent) return;
    db.get("student_notes", `student_id=eq.${selectedStudent.id}&order=created_at.desc&limit=1`)
      .then(rows => setStudentContent(rows[0]?.content || "")).catch(() => {});
  }, [selectedStudent]);

  const saveSessionNote = async () => {
    if (!sessionContent.trim() || !selectedGroup) return;
    setSaving(true);
    try {
      const existing = sessionNotes.find(n => n.session_number === sessionNum);
      if (existing) {
        await db.update("session_notes", `id=eq.${existing.id}`, { content: sessionContent.trim(), updated_at: new Date().toISOString() });
        setSessionNotes(prev => prev.map(n => n.id === existing.id ? { ...n, content: sessionContent.trim() } : n));
      } else {
        const r = await db.insert("session_notes", { group_id: selectedGroup.id, session_number: sessionNum, content: sessionContent.trim() });
        const note = Array.isArray(r) ? r[0] : r;
        setSessionNotes(prev => [note, ...prev]);
      }
      setSessionContent(""); showMsg("✓ Session note saved!");
    } catch(e) { showMsg("Error: " + e.message, "error"); }
    setSaving(false);
  };

  const saveStudentNote = async () => {
    if (!studentContent.trim() || !selectedStudent) return;
    setSaving(true);
    try {
      const existing = await db.get("student_notes", `student_id=eq.${selectedStudent.id}`);
      if (existing.length > 0) {
        await db.update("student_notes", `student_id=eq.${selectedStudent.id}`, { content: studentContent.trim(), updated_at: new Date().toISOString() });
      } else {
        await db.insert("student_notes", { student_id: selectedStudent.id, content: studentContent.trim() });
      }
      showMsg("✓ Note saved for " + selectedStudent.name + "!");
    } catch(e) { showMsg("Error: " + e.message, "error"); }
    setSaving(false);
  };

  const groupStudents = students.filter(s => s.group_id === selectedGroup?.id);

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {groups.map(g => React.createElement("button", { key: g.id, onClick: () => { setSelectedGroup(g); setSelectedStudent(null); setSessionContent(""); setStudentContent(""); }, style: { padding: "6px 14px", borderRadius: "20px", border: `1px solid ${selectedGroup?.id === g.id ? C.text : C.border}`, background: selectedGroup?.id === g.id ? C.text : C.bg, color: selectedGroup?.id === g.id ? "#fff" : C.textMid, fontSize: "13px", cursor: "pointer", fontFamily: FONT } }, g.name))}
      </div>

      <Card style={{ marginBottom: "16px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>📋 Session Note — visible to all students in {selectedGroup?.name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <span style={{ fontSize: "13px", color: C.textMid }}>Session:</span>
          <input type="number" min="1" value={sessionNum} onChange={e => { const n = parseInt(e.target.value) || 1; setSessionNum(n); const ex = sessionNotes.find(x => x.session_number === n); setSessionContent(ex?.content || ""); }} style={{ width: "64px", padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", fontWeight: "700", textAlign: "center", fontFamily: FONT, outline: "none" }} />
        </div>
        <textarea value={sessionContent} onChange={e => setSessionContent(e.target.value)} placeholder="Write session notes visible to the whole class…" style={{ width: "100%", minHeight: "100px", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", fontFamily: FONT, outline: "none", resize: "vertical", lineHeight: 1.6 }} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
          <Btn onClick={saveSessionNote} disabled={saving || !sessionContent.trim()} variant="gold">{saving ? React.createElement(Spinner) : "Save Note"}</Btn>
        </div>
        {sessionNotes.length > 0 && (
          <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Saved Notes</div>
            {sessionNotes.map(n => React.createElement("div", { key: n.id, style: { padding: "8px 0", borderBottom: `1px solid ${C.bgSoft}`, cursor: "pointer" }, onClick: () => { setSessionNum(n.session_number); setSessionContent(n.content); } },
              React.createElement("div", { style: { fontSize: "11px", fontWeight: "600", color: C.gold, marginBottom: "2px" } }, "Session " + n.session_number),
              React.createElement("div", { style: { fontSize: "13px", color: C.textMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, n.content)
            ))}
          </div>
        )}
      </Card>

      <Card style={{ borderLeft: `3px solid ${C.success}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>🔒 Personal Note — visible only to student</div>
        <select value={selectedStudent?.id || ""} onChange={e => setSelectedStudent(students.find(x => x.id === e.target.value) || null)} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", background: C.bg, color: C.text, fontFamily: FONT, outline: "none", marginBottom: "10px" }}>
          <option value="">Select a student…</option>
          {groupStudents.map(s => React.createElement("option", { key: s.id, value: s.id }, s.name))}
        </select>
        {selectedStudent && (
          <div>
            <textarea value={studentContent} onChange={e => setStudentContent(e.target.value)} placeholder={`Personal feedback for ${selectedStudent.name}…`} style={{ width: "100%", minHeight: "100px", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", fontFamily: FONT, outline: "none", resize: "vertical", lineHeight: 1.6 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
              <Btn onClick={saveStudentNote} disabled={saving || !studentContent.trim()} variant="success">{saving ? React.createElement(Spinner) : "Save Note"}</Btn>
            </div>
          </div>
        )}
        {/* Show existing notes with NoteCard for teacher to see replies */}
        {selectedStudent && (
          <TeacherStudentNoteView studentId={selectedStudent.id} />
        )}
      </Card>
    </div>
  );
}

function TeacherStudentNoteView({ studentId }) {
  const [note, setNote] = useState(null);
  useEffect(() => {
    db.get("student_notes", `student_id=eq.${studentId}&order=created_at.desc&limit=1`).then(rows => setNote(rows[0] || null)).catch(() => {});
  }, [studentId]);
  if (!note) return null;
  return React.createElement("div", { style: { marginTop: "12px", paddingTop: "12px", borderTop: `1px solid ${C.border}` } },
    React.createElement(NoteCard, { note, noteType: "student", user: { id: "teacher", name: "Teacher Tom" }, isTeacher: true })
  );
}

// ── Teacher: View Student Phrases ─────────────────────────────────────────────
function TeacherMyPhrasesTab({ students, groups }) {
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const [phrases, setPhrases] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedStudentId) return;
    setLoading(true);
    db.get("student_phrases", `student_id=eq.${selectedStudentId}&order=created_at.desc`)
      .then(setPhrases).catch(() => []).finally(() => setLoading(false));
  }, [selectedStudentId]);

  const student = students.find(s => s.id === selectedStudentId);
  const group = groups.find(g => g.id === student?.group_id);

  return (
    <div>
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Select Student</div>
        <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", background: C.bg, color: C.text, fontFamily: FONT, outline: "none" }}>
          {students.map(s => React.createElement("option", { key: s.id, value: s.id }, s.name + " — " + (groups.find(g => g.id === s.group_id)?.name || "")))}
        </select>
      </div>
      {student && (
        <div style={{ fontSize: "13px", color: C.textLight, marginBottom: "14px" }}>
          {student.name} · {group?.name} · {phrases.length} saved phrase{phrases.length !== 1 ? "s" : ""}
        </div>
      )}
      {loading ? React.createElement("div", { style: { textAlign: "center", padding: "30px" } }, React.createElement(Spinner))
        : phrases.length === 0
          ? React.createElement("div", { style: { textAlign: "center", color: C.textLight, padding: "40px", fontStyle: "italic" } }, "No saved phrases yet.")
          : phrases.map(p => React.createElement(Card, { key: p.id, style: { marginBottom: "8px", padding: "12px 16px" } },
            React.createElement("div", { style: { fontSize: "14px", fontStyle: "italic", marginBottom: "3px" } }, p.english),
            p.korean && React.createElement("div", { style: { fontSize: "12px", color: C.textMid } }, p.korean),
            p.context && React.createElement("div", { style: { fontSize: "11px", color: C.gold, marginTop: "2px" } }, p.context),
            p.hidden && React.createElement("div", { style: { fontSize: "11px", color: C.textLight, marginTop: "4px" } }, "🙈 Hidden by student")
          ))
      }
    </div>
  );
}

// ── Edit Phrase Modal ─────────────────────────────────────────────────────────
function EditPhraseModal({ phrase, onSave, onClose }) {
  const [english, setEnglish] = useState(phrase.english);
  const [korean, setKorean] = useState(phrase.korean || "");
  const [context, setContext] = useState(phrase.context || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!english.trim()) return;
    setSaving(true);
    try {
      await db.update("phrase_bank", `id=eq.${phrase.id}`, { english: english.trim(), korean: korean.trim(), context: context.trim() });
      onSave({ ...phrase, english: english.trim(), korean: korean.trim(), context: context.trim() });
    } catch(e) {}
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <Card style={{ maxWidth: "480px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ fontSize: "15px", fontWeight: "600" }}>Edit Phrase</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textLight, fontSize: "22px", cursor: "pointer" }}>×</button>
        </div>
        <div style={{ marginBottom: "8px" }}>
          <label style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>English</label>
          <Input value={english} onChange={e => setEnglish(e.target.value)} placeholder="English phrase" />
        </div>
        <div style={{ marginBottom: "8px" }}>
          <label style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Korean</label>
          <Input value={korean} onChange={e => setKorean(e.target.value)} placeholder="Korean translation" />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Context (Korean)</label>
          <Input value={context} onChange={e => setContext(e.target.value)} placeholder="Context in Korean" />
        </div>
        <div style={{ fontSize: "11px", color: C.textLight, marginBottom: "12px", fontStyle: "italic" }}>⚠️ Changes apply to all groups using this phrase.</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Btn onClick={handleSave} disabled={saving || !english.trim()} style={{ flex: 1 }}>{saving ? React.createElement(Spinner) : "Save Changes"}</Btn>
          <Btn onClick={onClose} variant="ghost">Cancel</Btn>
        </div>
      </Card>
    </div>
  );
}
// ── Student Row (inline delete confirm) ───────────────────────────────────────
function StudentRow({ s, localGroups, onRename, onUpdateGroup, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.bgSoft}`, gap: "8px" } },
    React.createElement("div", { style: { flex: 1, minWidth: 0 } },
      React.createElement("div", { style: { fontSize: "13px", fontWeight: "500" } }, React.createElement(InlineEdit, { value: s.name, onSave: onRename })),
      React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, "🔥 " + (s.streak || 0) + " streak")
    ),
    React.createElement("select", { value: s.group_id || "", onChange: e => onUpdateGroup(e.target.value), style: { padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "12px", background: C.bg, color: C.text, fontFamily: FONT, outline: "none", maxWidth: "150px" } },
      localGroups.map(grp => React.createElement("option", { key: grp.id, value: grp.id }, grp.name))
    ),
    confirmDelete
      ? React.createElement("div", { style: { display: "flex", gap: "3px" } },
        React.createElement("button", { onClick: () => { onDelete(); setConfirmDelete(false); }, style: { background: C.error, border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer", fontSize: "11px", padding: "3px 7px", fontFamily: FONT } }, "삭제"),
        React.createElement("button", { onClick: () => setConfirmDelete(false), style: { background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 6px", fontFamily: FONT } }, "✕")
      )
      : React.createElement("button", { onClick: () => setConfirmDelete(true), style: { background: "transparent", border: "none", color: C.error, cursor: "pointer", fontSize: "16px", padding: "0 4px", lineHeight: 1 } }, "×")
  );
}

function GroupsTab({ groups, setGroups, students, setStudents, onPreview, showMsg }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reassignGroupId, setReassignGroupId] = useState("");
  const [activeView, setActiveView] = useState("overview");

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
  const getActivity = s => { if (!s.last_practice) return "inactive"; if (s.last_practice === today) return "active"; if (s.last_practice >= sevenDaysAgo) return "recent"; return "inactive"; };
  const activityStyle = { active: { label: "🟢 Active Today", color: C.success, bg: "rgba(46,204,122,0.08)" }, recent: { label: "🟡 Active This Week", color: "#B7860B", bg: "#FEFCE8" }, inactive: { label: "🔴 Inactive (7+ days)", color: C.error, bg: C.errorBg } };

  const addGroup = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const result = await db.insert("groups", { name: newName.trim() });
      const g = Array.isArray(result) ? result[0] : result;
      setGroups(prev => [...prev, g]); setNewName(""); showMsg("✓ Group created: " + g.name);
    } catch(e) { showMsg("Error: " + e.message, "error"); }
    setAdding(false);
  };

  const renameGroup = async (id, name) => {
    try { await db.update("groups", `id=eq.${id}`, { name }); setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g)); showMsg("✓ Renamed"); }
    catch(e) { showMsg("Error renaming", "error"); }
  };

  const handleDelete = (group) => {
    const gs = students.filter(s => s.group_id === group.id);
    if (gs.length > 0) { setDeleteConfirm(group); setReassignGroupId(groups.find(g => g.id !== group.id)?.id || ""); }
    else { confirmDelete(group, null); }
  };

  const confirmDelete = async (group, targetId) => {
    try {
      if (targetId) { await db.update("students", `group_id=eq.${group.id}`, { group_id: targetId }); setStudents(prev => prev.map(s => s.group_id === group.id ? { ...s, group_id: targetId } : s)); }
      else { await db.delete("students", `group_id=eq.${group.id}`); setStudents(prev => prev.filter(s => s.group_id !== group.id)); }
      await db.delete("session_phrases", `group_id=eq.${group.id}`);
      await db.delete("groups", `id=eq.${group.id}`);
      setGroups(prev => prev.filter(g => g.id !== group.id)); setDeleteConfirm(null); showMsg("✓ Group deleted");
    } catch(e) { showMsg("Error: " + e.message, "error"); }
  };

  return (
    <div>
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <Card style={{ maxWidth: "400px", width: "100%" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px" }}>Delete "{deleteConfirm.name}"?</div>
            <div style={{ fontSize: "13px", color: C.textMid, marginBottom: "16px" }}>{students.filter(s => s.group_id === deleteConfirm.id).length} student(s) in this group.</div>
            <select value={reassignGroupId} onChange={e => setReassignGroupId(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", fontFamily: FONT, outline: "none", marginBottom: "12px" }}>
              {groups.filter(g => g.id !== deleteConfirm.id).map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))}
            </select>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={() => confirmDelete(deleteConfirm, reassignGroupId)} style={{ flex: 1 }}>Move Students &amp; Delete</Btn>
              <Btn onClick={() => confirmDelete(deleteConfirm, null)} variant="danger" style={{ flex: 1 }}>Delete All</Btn>
              <Btn onClick={() => setDeleteConfirm(null)} variant="ghost">Cancel</Btn>
            </div>
          </Card>
        </div>
      )}

      {/* View toggle */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[["overview", "📊 Overview"], ["activity", "🟢 Activity"]].map(([v, label]) =>
          React.createElement("button", { key: v, onClick: () => setActiveView(v), style: { padding: "7px 16px", borderRadius: "20px", border: `1px solid ${activeView === v ? C.gold : C.border}`, background: activeView === v ? C.bgMid : "transparent", color: activeView === v ? C.gold : C.textMid, fontSize: "13px", fontWeight: activeView === v ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, label)
        )}
      </div>

      {/* Activity View */}
      {activeView === "activity" && (
        <div>
          {["active", "recent", "inactive"].map(status => {
            const matching = students.filter(s => getActivity(s) === status);
            const style = activityStyle[status];
            return React.createElement("div", { key: status, style: { marginBottom: "14px" } },
              React.createElement("div", { style: { fontSize: "13px", fontWeight: "600", color: style.color, marginBottom: "8px" } }, style.label + " (" + matching.length + ")"),
              matching.length === 0
                ? React.createElement("div", { style: { fontSize: "12px", color: C.textLight, fontStyle: "italic", padding: "8px 0" } }, "None")
                : matching.map(s => {
                  const group = groups.find(g => g.id === s.group_id);
                  return React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: style.bg, borderRadius: "6px", marginBottom: "6px", border: `1px solid ${style.color}22` } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "13px", fontWeight: "500" } }, s.name),
                      React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, group?.name || "No group")
                    ),
                    React.createElement("div", { style: { fontSize: "11px", color: C.textMid, textAlign: "right" } },
                      React.createElement("div", null, "🔥 " + (s.streak || 0) + " streak"),
                      React.createElement("div", null, s.last_practice ? "Last: " + s.last_practice : "Never practiced")
                    )
                  );
                })
            );
          })}
        </div>
      )}

      {/* Overview */}
      {activeView === "overview" && (
        <div>
          {groups.length === 0 && <div style={{ textAlign: "center", color: C.textLight, padding: "30px", fontStyle: "italic" }}>No groups yet. Create one below.</div>}

      {groups.map(g => {
        const gs = students.filter(s => s.group_id === g.id);
        return React.createElement(Card, { key: g.id, style: { marginBottom: "12px", background: C.bgCard } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
            React.createElement("div", { style: { fontSize: "15px", fontWeight: "600", flex: 1 } }, React.createElement(InlineEdit, { value: g.name, onSave: n => renameGroup(g.id, n) })),
            React.createElement("div", { style: { display: "flex", gap: "6px" } },
              React.createElement(Btn, { onClick: () => onPreview(g), variant: "gold", style: { padding: "5px 12px", fontSize: "12px" } }, "👁 Preview"),
              React.createElement(Btn, { onClick: () => handleDelete(g), variant: "ghost", style: { padding: "5px 10px", fontSize: "12px", color: C.error, borderColor: C.error } }, "Delete")
            )
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: gs.length > 0 ? "12px" : "0" } },
            [["Students", gs.length], ["Avg Streak", gs.length ? Math.round(gs.reduce((a, b) => a + (b.streak || 0), 0) / gs.length) : 0], ["Today", gs.filter(s => s.last_practice === new Date().toISOString().split("T")[0]).length]].map(([label, val]) =>
              React.createElement("div", { key: label, style: { background: C.bgSoft, borderRadius: "6px", padding: "10px", textAlign: "center" } },
                React.createElement("div", { style: { fontSize: "18px", fontWeight: "700" } }, val),
                React.createElement("div", { style: { fontSize: "10px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" } }, label)
              )
            )
          ),
          gs.map(s => React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
            React.createElement("span", { style: { color: C.textMid } }, s.name),
            React.createElement("span", { style: { color: C.textLight } }, "🔥 " + (s.streak || 0))
          ))
        );
      })}

      <Card>
        <div style={{ fontSize: "12px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>Create New Group</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Tuesday Morning Group" />
          <Btn onClick={addGroup} disabled={adding || !newName.trim()} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{adding ? React.createElement(Spinner) : "Create"}</Btn>
        </div>
      </Card>
      </div>
      )}
    </div>
  );
}

// ── Add Phrases Tab ───────────────────────────────────────────────────────────
function AddPhrasesTab({ groups, phraseBank, setPhraseBank, showMsg }) {
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [sessionNum, setSessionNum] = useState(1);
  const [english, setEnglish] = useState("");
  const [korean, setKorean] = useState("");
  const [context, setContext] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [sessionPhrases, setSessionPhrases] = useState([]);
  const [loadingSP, setLoadingSP] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState(null);

  useEffect(() => {
    if (!selectedGroup) return;
    setLoadingSP(true);
    db.get("session_phrases", `group_id=eq.${selectedGroup.id}&select=*,phrase_bank(*)&order=session_number.asc,created_at.asc`)
      .then(data => { setSessionPhrases(data); const nums = [...new Set(data.map(d => d.session_number))]; if (nums.length > 0) setSessionNum(Math.max(...nums)); })
      .catch(() => {}).finally(() => setLoadingSP(false));
  }, [selectedGroup]);

  const sessionNums = [...new Set(sessionPhrases.map(sp => sp.session_number))].sort((a, b) => a - b);
  const bySession = {};
  sessionPhrases.forEach(sp => { if (!bySession[sp.session_number]) bySession[sp.session_number] = []; bySession[sp.session_number].push(sp); });

  const handleEnglishChange = val => {
    setEnglish(val);
    if (val.length > 2) { const m = phraseBank.filter(p => p.english.toLowerCase().includes(val.toLowerCase())); setSuggestions(m.slice(0, 6)); setShowSug(m.length > 0); }
    else setShowSug(false);
  };

  const selectSuggestion = p => {
    const dup = sessionPhrases.find(sp => sp.phrase_id === p.id);
    if (dup) { showMsg("Already in Session " + dup.session_number, "warn"); setShowSug(false); return; }
    setEnglish(p.english); setKorean(p.korean || ""); setContext(p.context || ""); setShowSug(false);
  };

  const handleEnglishBlur = async () => {
    setShowSug(false);
    if (english.trim().length > 4 && !korean) {
      setAutoFilling(true);
      const f = await autoFillKorean(english);
      setKorean(f.ko || ""); setContext(f.context || "");
      setAutoFilling(false);
    }
  };

  const addPhrase = async () => {
    if (!english.trim()) { showMsg("Please enter an English phrase", "error"); return; }
    try {
      const existing = await db.get("phrase_bank", `english=eq.${encodeURIComponent(english.trim())}`);
      let phrase;
      if (existing.length > 0) { phrase = existing[0]; if (korean.trim() || context.trim()) { await db.update("phrase_bank", `id=eq.${phrase.id}`, { korean: korean.trim() || phrase.korean, context: context.trim() || phrase.context }); phrase = { ...phrase, korean: korean.trim() || phrase.korean, context: context.trim() || phrase.context }; } }
      else { const r = await db.insert("phrase_bank", { english: english.trim(), korean: korean.trim(), context: context.trim() }); phrase = Array.isArray(r) ? r[0] : r; }
      const dup = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
      if (dup) { showMsg("Already in Session " + dup.session_number, "warn"); return; }
      const spR = await db.insert("session_phrases", { group_id: selectedGroup.id, phrase_id: phrase.id, session_number: sessionNum });
      const sp = Array.isArray(spR) ? spR[0] : spR;
      setPhraseBank(prev => [phrase, ...prev.filter(p => p.id !== phrase.id)]);
      setSessionPhrases(prev => [...prev, { ...sp, phrase_bank: phrase }]);
      setEnglish(""); setKorean(""); setContext("");
      showMsg("✓ Added to Session " + sessionNum + ": " + phrase.english);
    } catch(e) { showMsg("Error: " + e.message, "error"); }
  };

  const addGeneratedPhrase = async p => {
    if (!selectedGroup) return;
    try {
      const existing = await db.get("phrase_bank", `english=eq.${encodeURIComponent(p.english)}`);
      let phrase;
      if (existing.length > 0) { phrase = existing[0]; } else { const r = await db.insert("phrase_bank", { english: p.english, korean: p.korean, context: p.context }); phrase = Array.isArray(r) ? r[0] : r; }
      const dup = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
      if (dup) { showMsg("Already in Session " + dup.session_number + ": " + p.english, "warn"); return; }
      const spR = await db.insert("session_phrases", { group_id: selectedGroup.id, phrase_id: phrase.id, session_number: sessionNum });
      const sp = Array.isArray(spR) ? spR[0] : spR;
      setSessionPhrases(prev => [...prev, { ...sp, phrase_bank: phrase }]);
      setPhraseBank(prev => [phrase, ...prev.filter(x => x.id !== phrase.id)]);
      showMsg("✓ Added: " + p.english);
    } catch(e) { showMsg("Error: " + e.message, "error"); }
  };

  const deleteSessionPhrase = async id => {
    try { await db.delete("session_phrases", `id=eq.${id}`); setSessionPhrases(prev => prev.filter(sp => sp.id !== id)); showMsg("Removed"); }
    catch(e) { showMsg("Error", "error"); }
  };

  const deleteSession = async (n) => {
    try {
      // Delete all session_phrases for this session number in this group
      const toDelete = sessionPhrases.filter(sp => sp.session_number === n);
      for (const sp of toDelete) {
        await db.delete("session_phrases", `id=eq.${sp.id}`);
      }
      setSessionPhrases(prev => prev.filter(sp => sp.session_number !== n));
      showMsg("✓ Session " + n + " deleted");
    } catch(e) { showMsg("Error deleting session: " + e.message, "error"); }
  };

  return (
    <div>
      {editingPhrase && React.createElement(EditPhraseModal, { phrase: editingPhrase, onSave: updated => { setSessionPhrases(prev => prev.map(sp => sp.phrase_bank?.id === updated.id ? { ...sp, phrase_bank: updated } : sp)); setPhraseBank(prev => prev.map(p => p.id === updated.id ? updated : p)); setEditingPhrase(null); showMsg("✓ Phrase updated across all groups"); }, onClose: () => setEditingPhrase(null) })}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        {groups.map(g => React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "6px 14px", borderRadius: "20px", border: `1px solid ${selectedGroup?.id === g.id ? C.text : C.border}`, background: selectedGroup?.id === g.id ? C.text : C.bg, color: selectedGroup?.id === g.id ? "#fff" : C.textMid, fontSize: "13px", fontWeight: selectedGroup?.id === g.id ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, g.name))}
      </div>

      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Session Number</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: sessionNums.length > 0 ? "10px" : "0" }}>
          <input type="number" min="1" value={sessionNum} onChange={e => setSessionNum(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: "72px", padding: "8px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "16px", fontWeight: "700", textAlign: "center", fontFamily: FONT, outline: "none" }} />
          {sessionNums.length > 0 && <span style={{ fontSize: "12px", color: C.textLight }}>or pick existing:</span>}
        </div>
        {sessionNums.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {sessionNums.map(n => React.createElement("button", { key: n, onClick: () => setSessionNum(n), style: { padding: "4px 12px", borderRadius: "16px", border: `1px solid ${sessionNum === n ? C.gold : C.border}`, background: sessionNum === n ? C.goldBg : C.bg, color: sessionNum === n ? C.gold : C.textMid, fontSize: "12px", fontWeight: sessionNum === n ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, "Session " + n))}
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: "14px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: C.gold, marginBottom: "10px" }}>✨ AI Generate Phrases</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <Input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} placeholder="Topic (e.g. ordering coffee, making friends)" />
          <Btn onClick={async () => { setGenerating(true); setGenerated([]); try { setGenerated(await generateAIPhrases(generateTopic)); } catch(e) { showMsg("Error: " + e.message, "error"); } setGenerating(false); }} disabled={generating || !generateTopic.trim()} variant="secondary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{generating ? React.createElement(Spinner) : "Generate"}</Btn>
        </div>
        {generated.length > 0 && (
          <div>
            {generated.map((p, i) => React.createElement("div", { key: i, style: { padding: "8px 0", borderBottom: `1px solid ${C.bgSoft}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" } },
              React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: "13px", fontStyle: "italic" } }, p.english),
                React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, p.korean),
                p.context && React.createElement("div", { style: { fontSize: "11px", color: C.gold } }, p.context)
              ),
              React.createElement(Btn, { onClick: () => addGeneratedPhrase(p), variant: "secondary", style: { fontSize: "11px", padding: "5px 10px", flexShrink: 0 } }, "+ Add")
            ))}
            <Btn onClick={async () => { for (const p of generated) await addGeneratedPhrase(p); setGenerated([]); showMsg("✓ All added to Session " + sessionNum); }} style={{ width: "100%", marginTop: "10px" }}>+ Add All to Session {sessionNum}</Btn>
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>➕ Add Manually</div>
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <Input value={english} onChange={e => handleEnglishChange(e.target.value)} onBlur={handleEnglishBlur} placeholder="English phrase (Korean auto-fills on blur)" />
          {showSug && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: "0 0 6px 6px", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              {suggestions.map(p => React.createElement("div", { key: p.id, onMouseDown: () => selectSuggestion(p), style: { padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
                React.createElement("div", { style: { fontStyle: "italic" } }, p.english),
                React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, p.korean)
              ))}
            </div>
          )}
        </div>
        {autoFilling && <div style={{ fontSize: "11px", color: C.gold, marginBottom: "6px" }}>✨ Auto-filling Korean…</div>}
        <div style={{ marginBottom: "8px" }}><Input value={korean} onChange={e => setKorean(e.target.value)} placeholder="Korean translation" /></div>
        <div style={{ marginBottom: "12px" }}><Input value={context} onChange={e => setContext(e.target.value)} placeholder="Context in Korean — when to use this" /></div>
        <Btn onClick={addPhrase} style={{ width: "100%" }}>Add to {selectedGroup?.name} — Session {sessionNum}</Btn>
      </Card>

      {loadingSP ? React.createElement("div", { style: { textAlign: "center", padding: "20px" } }, React.createElement(Spinner))
        : sessionNums.length > 0 && (
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: C.textLight, marginBottom: "10px" }}>{selectedGroup?.name} — All Sessions</div>
            {sessionNums.map(n => React.createElement(SessionCard, { key: n, n, phrases: bySession[n], onEdit: setEditingPhrase, onDeletePhrase: deleteSessionPhrase, onDeleteSession: deleteSession }))}
          </div>
        )}
    </div>
  );
}

// ── Session Card (teacher dashboard phrase management) ────────────────────────
function SessionCard({ n, phrases, onEdit, onDeletePhrase, onDeleteSession }) {
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(false);
  const [confirmDeletePhrase, setConfirmDeletePhrase] = useState(null);

  return React.createElement(Card, { style: { marginBottom: "10px" } },
    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
      React.createElement("div", { style: { fontSize: "13px", fontWeight: "600", color: C.textMid } }, "Session " + n + " (" + phrases.length + " phrases)"),
      confirmDeleteSession
        ? React.createElement("div", { style: { display: "flex", gap: "6px", alignItems: "center" } },
          React.createElement("span", { style: { fontSize: "11px", color: C.error } }, "Delete entire session?"),
          React.createElement("button", { onClick: () => { onDeleteSession(n); setConfirmDeleteSession(false); }, style: { background: C.error, border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer", fontSize: "11px", padding: "3px 8px", fontFamily: FONT } }, "Delete"),
          React.createElement("button", { onClick: () => setConfirmDeleteSession(false), style: { background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 8px", fontFamily: FONT } }, "Cancel")
        )
        : React.createElement("button", { onClick: () => setConfirmDeleteSession(true), style: { background: "transparent", border: `1px solid ${C.error}`, borderRadius: "4px", color: C.error, cursor: "pointer", fontSize: "11px", padding: "3px 8px", fontFamily: FONT } }, "Delete Session")
    ),
    phrases.map(sp => React.createElement("div", { key: sp.id, style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderTop: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
      React.createElement("div", { style: { flex: 1 } },
        React.createElement("div", { style: { fontStyle: "italic" } }, sp.phrase_bank?.english),
        sp.phrase_bank?.korean && React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, sp.phrase_bank.korean),
        sp.phrase_bank?.context && React.createElement("div", { style: { fontSize: "11px", color: C.gold } }, sp.phrase_bank.context)
      ),
      confirmDeletePhrase === sp.id
        ? React.createElement("div", { style: { display: "flex", gap: "4px" } },
          React.createElement("button", { onClick: () => { onDeletePhrase(sp.id); setConfirmDeletePhrase(null); }, style: { background: C.error, border: "none", borderRadius: "4px", color: "#fff", cursor: "pointer", fontSize: "11px", padding: "3px 7px", fontFamily: FONT } }, "삭제"),
          React.createElement("button", { onClick: () => setConfirmDeletePhrase(null), style: { background: C.bgSoft, border: `1px solid ${C.border}`, borderRadius: "4px", cursor: "pointer", fontSize: "11px", padding: "3px 6px", fontFamily: FONT } }, "✕")
        )
        : React.createElement("div", { style: { display: "flex", gap: "4px", flexShrink: 0 } },
          React.createElement("button", { onClick: () => onEdit(sp.phrase_bank), style: { background: "transparent", border: `1px solid ${C.border}`, borderRadius: "4px", color: C.textMid, cursor: "pointer", fontSize: "11px", padding: "3px 8px", fontFamily: FONT } }, "Edit"),
          React.createElement("button", { onClick: () => setConfirmDeletePhrase(sp.id), style: { background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "18px", padding: "0 4px", lineHeight: 1 } }, "×")
        )
    ))
  );
}

// ── Students Tab ──────────────────────────────────────────────────────────────
function StudentsTab({ students, setStudents, groups, showMsg }) {
  const [newName, setNewName] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [localGroups, setLocalGroups] = useState(groups || []);

  useEffect(() => {
    db.get("groups", "order=created_at.asc").then(g => { setLocalGroups(g); if (g.length > 0 && !newGroupId) setNewGroupId(g[0].id); }).catch(() => {});
  }, [groups]);

  const addStudent = async () => {
    if (!newName.trim()) { showMsg("Please enter a name", "error"); return; }
    if (!newGroupId) { showMsg("Please select a group", "error"); return; }
    if (students.find(s => s.name.toLowerCase() === newName.trim().toLowerCase())) { showMsg("Name already exists", "error"); return; }
    try {
      const r = await db.insert("students", { name: newName.trim(), group_id: newGroupId, streak: 0, longest_streak: 0 });
      const s = Array.isArray(r) ? r[0] : r;
      setStudents(prev => [...prev, s]); setNewName(""); showMsg("✓ " + s.name + " registered!");
    } catch(e) { showMsg("Error: " + e.message, "error"); }
  };

  const updateGroup = async (id, groupId) => {
    try { await db.update("students", `id=eq.${id}`, { group_id: groupId }); setStudents(prev => prev.map(s => s.id === id ? { ...s, group_id: groupId } : s)); showMsg("✓ Group updated — history retained"); }
    catch(e) { showMsg("Error", "error"); }
  };

  const renameStudent = async (id, name) => {
    try { await db.update("students", `id=eq.${id}`, { name }); setStudents(prev => prev.map(s => s.id === id ? { ...s, name } : s)); showMsg("✓ Name updated"); }
    catch(e) { showMsg("Error", "error"); }
  };

  const deleteStudent = async (id, name) => {
    try {
      await db.delete("student_progress", `student_id=eq.${id}`);
      await db.delete("student_phrases", `student_id=eq.${id}`);
      await db.delete("students", `id=eq.${id}`);
      setStudents(prev => prev.filter(s => s.id !== id)); showMsg("✓ Student removed");
    } catch(e) { showMsg("Error: " + e.message, "error"); }
  };

  const byGroup = {};
  localGroups.forEach(g => { byGroup[g.id] = []; });
  students.forEach(s => { if (byGroup[s.group_id]) byGroup[s.group_id].push(s); });

  return (
    <div>
      <Card style={{ marginBottom: "20px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>+ Register New Student</div>
        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Student name" style={{ marginBottom: "8px" }} />
        <div style={{ marginBottom: "12px" }}>
          <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Assign to Group</div>
          <select value={newGroupId} onChange={e => setNewGroupId(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", background: C.bg, color: C.text, fontFamily: FONT, outline: "none" }}>
            <option value="" disabled>Select a group…</option>
            {localGroups.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))}
          </select>
        </div>
        <Btn onClick={addStudent} style={{ width: "100%" }}>Register Student</Btn>
      </Card>

      {localGroups.map(g => {
        const gs = byGroup[g.id] || [];
        return React.createElement(Card, { key: g.id, style: { marginBottom: "12px", background: C.bgCard } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: gs.length > 0 ? "10px" : "0" } },
            React.createElement("div", { style: { fontSize: "14px", fontWeight: "600" } }, g.name),
            React.createElement("span", { style: { fontSize: "12px", color: C.textLight } }, gs.length + " students")
          ),
          gs.length === 0
            ? React.createElement("div", { style: { fontSize: "12px", color: C.textLight, fontStyle: "italic" } }, "No students yet")
            : gs.map(s => React.createElement(StudentRow, { key: s.id, s, localGroups, onRename: n => renameStudent(s.id, n), onUpdateGroup: gid => updateGroup(s.id, gid), onDelete: () => deleteStudent(s.id, s.name) }))
        );
      })}
    </div>
  );
}

// ── City Groups Tab ───────────────────────────────────────────────────────────
const CITY_EMOJIS = ["🗼","🗽","🏰","🌉","🌃","🏙","🌆","🗺","⛩","🕌","🏛","🌁","🎡","🎪","🌊","🏔","🌴","🌺","🎭","🚂"];

function CityGroupsTab({ groups, students, showMsg }) {
  const [cities, setCities] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCityName, setNewCityName] = useState("");
  const [newCityEmoji, setNewCityEmoji] = useState("🏙");
  const [newCityDesc, setNewCityDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOverCity, setDragOverCity] = useState(null);
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    Promise.all([
      db.get("city_groups", "order=created_at.asc").catch(() => []),
      db.get("city_group_members", "order=created_at.asc").catch(() => []),
    ]).then(([c, m]) => { setCities(c); setMembers(m); setLoading(false); });
  }, []);

  const createCity = async () => {
    if (!newCityName.trim()) return;
    setSaving(true);
    try {
      const r = await db.insert("city_groups", { name: newCityName.trim(), emoji: newCityEmoji, description: newCityDesc.trim() });
      const city = Array.isArray(r) ? r[0] : r;
      setCities(prev => [...prev, city]);
      setNewCityName(""); setNewCityDesc(""); setNewCityEmoji("🏙");
      showMsg("✓ City created: " + city.emoji + " " + city.name);
    } catch(e) { showMsg("Error: " + e.message, "error"); }
    setSaving(false);
  };

  const deleteCity = async (cityId) => {
    try {
      await db.delete("city_group_members", `city_group_id=eq.${cityId}`);
      await db.delete("city_groups", `id=eq.${cityId}`);
      setCities(prev => prev.filter(c => c.id !== cityId));
      setMembers(prev => prev.filter(m => m.city_group_id !== cityId));
      showMsg("✓ City removed");
    } catch(e) { showMsg("Error", "error"); }
  };

  const assignGroup = async (groupId, cityId) => {
    const existing = members.find(m => m.group_id === groupId);
    if (existing) {
      try { await db.delete("city_group_members", `id=eq.${existing.id}`); } catch(e) {}
      setMembers(prev => prev.filter(m => m.group_id !== groupId));
    }
    if (!cityId) return;
    try {
      const r = await db.insert("city_group_members", { city_group_id: cityId, group_id: groupId });
      const mem = Array.isArray(r) ? r[0] : r;
      setMembers(prev => [...prev, mem]);
      showMsg("✓ Group assigned");
    } catch(e) { showMsg("Error: " + e.message, "error"); }
  };

  const getCityGroups = (cityId) => members.filter(m => m.city_group_id === cityId).map(m => groups.find(g => g.id === m.group_id)).filter(Boolean);
  const getCityStudentCount = (cityId) => {
    const gIds = members.filter(m => m.city_group_id === cityId).map(m => m.group_id);
    return students.filter(s => gIds.includes(s.group_id)).length;
  };
  const unassignedGroups = groups.filter(g => !members.find(m => m.group_id === g.id));

  const capacityColor = (n) => n === 0 ? C.textLight : n <= 15 ? C.success : n <= 25 ? C.gold : C.error;
  const capacityLabel = (n) => n === 0 ? "Empty" : n <= 15 ? "Great size" : n <= 25 ? "Ideal" : n <= 35 ? "Getting big" : "Too large";

  if (loading) return React.createElement("div", { style: { textAlign: "center", padding: "60px" } }, React.createElement(Spinner));

  return (
    <div>
      <style>{`
        @keyframes citySlideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .city-card { transition: box-shadow 0.2s, transform 0.15s; }
        .city-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.1); }
        .drop-zone { transition: background 0.15s, border-color 0.15s; }
        .drop-zone.drag-over { background: rgba(201,168,76,0.08) !important; border-color: #C9A84C !important; }
        .group-chip:hover { transform: translateY(-1px); }
      `}</style>

      {/* Hero header */}
      <div style={{ background: "linear-gradient(135deg, #0D1B2A 0%, #1A1035 60%, #0D1B2A 100%)", borderRadius: "16px", padding: "28px", marginBottom: "24px", position: "relative", overflow: "hidden", border: `1px solid ${C.border}` }}>
        <div style={{ position: "absolute", top: "-30px", right: "-20px", fontSize: "130px", opacity: 0.05, filter: "blur(2px)" }}>🌍</div>
        <div style={{ position: "absolute", bottom: "-20px", left: "30px", fontSize: "80px", opacity: 0.04 }}>✈️</div>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "4px", textTransform: "uppercase", color: C.gold, marginBottom: "6px", opacity: 0.8 }}>Community Architecture</div>
        <div style={{ fontSize: "26px", fontWeight: "800", letterSpacing: "-0.5px", marginBottom: "10px", color: C.text }}>🏙 City Groups</div>
        <div style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.7, maxWidth: "460px" }}>
          Cluster your practice groups into city communities for the Question of the Day. Keep cities between <strong style={{ color: C.gold }}>15–25 students</strong> for the most intimate experience.
        </div>
        <div style={{ display: "flex", gap: "24px", marginTop: "18px" }}>
          {[["🏙", cities.length, "Cities"], ["👥", groups.length, "Groups"], ["🎓", students.length, "Students"], ["📭", unassignedGroups.length, "Unassigned"]].map(([icon, val, label]) =>
            React.createElement("div", { key: label, style: { textAlign: "center" } },
              React.createElement("div", { style: { fontSize: "18px", fontWeight: "800", color: label === "Unassigned" && val > 0 ? C.retry : C.text } }, icon + " " + val),
              React.createElement("div", { style: { fontSize: "9px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1.5px", marginTop: "2px" } }, label)
            )
          )}
        </div>
      </div>

      {/* Unassigned */}
      {unassignedGroups.length > 0 && (
        <Card style={{ marginBottom: "20px", borderLeft: `3px solid ${C.retry}`, background: C.retryBg, border: `1px solid ${C.retryBorder}` }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: C.retry, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>
            📭 {unassignedGroups.length} Unassigned
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {unassignedGroups.map(g => {
              const sc = students.filter(s => s.group_id === g.id).length;
              return (
                <div key={g.id} className="group-chip" style={{ background: C.bgMid, border: `1px dashed ${C.border}`, borderRadius: "20px", padding: "6px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", transition: "all 0.15s" }}>
                  <span style={{ fontWeight: "500", color: C.text }}>{g.name}</span>
                  <span style={{ fontSize: "11px", color: C.textLight }}>({sc}명)</span>
                  <select onChange={e => e.target.value && assignGroup(g.id, e.target.value)} defaultValue=""
                    style={{ border: "none", background: "transparent", fontSize: "11px", color: C.gold, cursor: "pointer", fontFamily: FONT, outline: "none" }}>
                    <option value="">Assign →</option>
                    {cities.map(c => React.createElement("option", { key: c.id, value: c.id }, c.emoji + " " + c.name))}
                  </select>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* City cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "14px", marginBottom: "24px" }}>
        {cities.map((city, idx) => {
          const cityGroups = getCityGroups(city.id);
          const studentCount = getCityStudentCount(city.id);
          const isDragOver = dragOverCity === city.id;
          return (
            <div key={city.id} className={`city-card drop-zone${isDragOver ? " drag-over" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragOverCity(city.id); }}
              onDragLeave={() => setDragOverCity(null)}
              onDrop={e => { e.preventDefault(); if (dragging) { assignGroup(dragging, city.id); setDragging(null); } setDragOverCity(null); }}
              style={{ background: C.bgCard, border: `1px solid ${isDragOver ? C.gold : C.border}`, borderRadius: "14px", overflow: "hidden", animation: `citySlideIn 0.35s ease ${idx * 0.06}s both` }}>
              <div style={{ padding: "18px", background: "linear-gradient(145deg, rgba(255,255,255,0.03), transparent)", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "36px", lineHeight: 1, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>{city.emoji}</div>
                    <div>
                      <div style={{ fontSize: "17px", fontWeight: "800", color: C.text, letterSpacing: "-0.3px" }}>{city.name}</div>
                      {city.description && <div style={{ fontSize: "11px", color: C.textLight, marginTop: "2px" }}>{city.description}</div>}
                    </div>
                  </div>
                  <button onClick={() => deleteCity(city.id)} style={{ background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "18px", padding: "2px", lineHeight: 1, opacity: 0.5 }}>×</button>
                </div>
                <div style={{ marginTop: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontSize: "10px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>Community</span>
                    <span style={{ fontSize: "12px", fontWeight: "700", color: capacityColor(studentCount) }}>{studentCount} · {capacityLabel(studentCount)}</span>
                  </div>
                  <div style={{ height: "5px", background: C.bgMid, borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, (studentCount / 25) * 100)}%`, background: `linear-gradient(to right, ${C.success}, ${capacityColor(studentCount)})`, borderRadius: "3px", transition: "width 0.5s ease" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", color: C.textLight, marginTop: "3px" }}>
                    <span>0</span><span style={{ color: C.success }}>15</span><span style={{ color: C.gold }}>25</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 16px" }}>
                {cityGroups.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "14px", color: C.textLight, fontSize: "12px", fontStyle: "italic", border: `1px dashed ${C.border}`, borderRadius: "8px" }}>
                    Add groups below
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    {cityGroups.map(g => {
                      const sc = students.filter(s => s.group_id === g.id).length;
                      return (
                        <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bgMid, borderRadius: "8px", padding: "7px 12px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: "500", color: C.text }}>{g.name}</span>
                            <span style={{ fontSize: "10px", color: C.textLight, background: C.bgSoft, padding: "1px 7px", borderRadius: "10px" }}>{sc}명</span>
                          </div>
                          <button onClick={() => assignGroup(g.id, null)} style={{ background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "14px", opacity: 0.5 }}>×</button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {unassignedGroups.length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <select onChange={e => { if (e.target.value) { assignGroup(e.target.value, city.id); e.target.value = ""; } }} defaultValue=""
                      style={{ width: "100%", padding: "7px 10px", border: `1px dashed ${C.border}`, borderRadius: "8px", fontSize: "12px", color: C.textMid, fontFamily: FONT, outline: "none", background: C.bgMid, cursor: "pointer" }}>
                      <option value="">+ Add group…</option>
                      {unassignedGroups.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name + " (" + students.filter(s => s.group_id === g.id).length + " students)"))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create city */}
      <Card style={{ borderLeft: `4px solid ${C.gold}`, background: C.bgCard }}>
        <div style={{ fontSize: "12px", fontWeight: "700", color: C.gold, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "14px" }}>+ Create New City</div>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "10px", color: C.textLight, letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>Choose Emoji</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
            {CITY_EMOJIS.map(e => (
              <button key={e} onClick={() => setNewCityEmoji(e)}
                style={{ width: "36px", height: "36px", borderRadius: "8px", border: `2px solid ${newCityEmoji === e ? C.gold : C.border}`, background: newCityEmoji === e ? C.goldBg : C.bgMid, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.12s" }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <Input value={newCityName} onChange={e => setNewCityName(e.target.value)} placeholder="City name (e.g. Seoul, Barcelona)" />
          <div style={{ width: "42px", height: "42px", borderRadius: "8px", background: C.bgMid, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 }}>{newCityEmoji}</div>
        </div>
        <Input value={newCityDesc} onChange={e => setNewCityDesc(e.target.value)} placeholder="Optional tagline" style={{ marginBottom: "12px" }} />
        <Btn onClick={createCity} disabled={saving || !newCityName.trim()} variant="gold" style={{ width: "100%" }}>{saving ? React.createElement(Spinner) : "🏙 Create City"}</Btn>
      </Card>

      <div style={{ marginTop: "14px", padding: "12px 14px", background: C.bgSoft, borderRadius: "8px", fontSize: "11px", color: C.textLight, lineHeight: 1.8, border: `1px solid ${C.border}` }}>
        <strong style={{ color: C.textMid }}>Supabase tables needed:</strong><br />
        <code style={{ color: C.gold }}>city_groups</code>: id, name, emoji, description, created_at<br />
        <code style={{ color: C.gold }}>city_group_members</code>: id, city_group_id, group_id, created_at
      </div>
    </div>
  );
}

// ── QoD Studio Tab ────────────────────────────────────────────────────────────
const QOD_CATEGORIES = [
  { id: "personal", label: "🌱 Personal Growth", desc: "Self-reflection, goals, values", color: "#2ECC7A", bg: "rgba(46,204,122,0.08)" },
  { id: "culture", label: "🌏 Culture Bridge", desc: "Korean/western culture, customs", color: "#60A5FA", bg: "rgba(96,165,250,0.08)" },
  { id: "daily", label: "☀️ Daily Life", desc: "Work, routines, weekends", color: "#C9A84C", bg: "rgba(201,168,76,0.08)" },
  { id: "memory", label: "📸 Memory Lane", desc: "Stories, firsts, childhood", color: "#A78BFA", bg: "rgba(167,139,250,0.08)" },
  { id: "opinion", label: "💬 Hot Take", desc: "Light opinions, preferences, debates", color: "#F87171", bg: "rgba(248,113,113,0.08)" },
  { id: "imagine", label: "✨ What If?", desc: "Hypotheticals, dreams, scenarios", color: "#34D399", bg: "rgba(52,211,153,0.08)" },
  { id: "english", label: "🎯 English Journey", desc: "Learning goals, funny moments", color: "#FBBF24", bg: "rgba(251,191,36,0.08)" },
];

const QOD_DIFFICULTY = [
  { id: "easy", label: "🌿 Comfortable", desc: "Short, familiar, low stakes" },
  { id: "medium", label: "🔥 Stretching", desc: "Requires thought" },
  { id: "hard", label: "🚀 Challenge", desc: "Complex, personal, surprising" },
];

function QodStudioTab({ showMsg }) {
  const [selectedCategory, setSelectedCategory] = useState("personal");
  const [selectedDifficulty, setSelectedDifficulty] = useState("medium");
  const [customContext, setCustomContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [savedPrompts, setSavedPrompts] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [activeTab, setActiveTab] = useState("generate");
  const [scheduling, setScheduling] = useState(null);
  const [previewPrompt, setPreviewPrompt] = useState(null);

  useEffect(() => {
    db.get("qod_prompts", "order=created_at.desc&limit=50").catch(() => []).then(p => { setSavedPrompts(p); setLoadingSaved(false); });
  }, []);

  const generatePrompts = async () => {
    setGenerating(true); setSuggestions([]);
    const cat = QOD_CATEGORIES.find(c => c.id === selectedCategory);
    const diff = QOD_DIFFICULTY.find(d => d.id === selectedDifficulty);
    try {
      const text = await groqCall(`You are designing Question of the Day prompts for a Korean adult English learner community called WAYVE.
Context: Korean adults (20s-50s) learning conversational English. Voice messages 20-45 seconds. Intimate community of 15-25 students. Teacher is "Teacher Tom" — warm, encouraging.
Category: ${cat.label} — ${cat.desc}. Difficulty: ${diff.label} — ${diff.desc}.${customContext ? ` Extra: ${customContext}` : ""}

Generate exactly 5 engaging QoD prompts. Each must spark a real personal story, be answerable in 20-45 seconds, and make students curious to hear others' answers.

STRICT FORMAT — no other text:
PROMPT_1: [question]
TAG_1: [2-3 word tag]
SPARK_1: [one sentence: why this works]

PROMPT_2: [question]
TAG_2: [2-3 word tag]
SPARK_2: [one sentence]

PROMPT_3: [question]
TAG_3: [tag]
SPARK_3: [one sentence]

PROMPT_4: [question]
TAG_4: [tag]
SPARK_4: [one sentence]

PROMPT_5: [question]
TAG_5: [tag]
SPARK_5: [one sentence]`);

      const parsed = [];
      for (let i = 1; i <= 5; i++) {
        const pm = text.match(new RegExp(`PROMPT_${i}:\\s*(.+?)(?=TAG_${i}:|$)`, "s"));
        const tm = text.match(new RegExp(`TAG_${i}:\\s*(.+?)(?=SPARK_${i}:|$)`, "s"));
        const sm = text.match(new RegExp(`SPARK_${i}:\\s*(.+?)(?=PROMPT_${i+1}:|$)`, "s"));
        if (pm) parsed.push({ id: Date.now() + i, prompt: pm[1].trim(), tag: tm ? tm[1].trim() : cat.label, spark: sm ? sm[1].trim() : "", category: selectedCategory, difficulty: selectedDifficulty });
      }
      setSuggestions(parsed.length > 0 ? parsed : [{ id: Date.now(), prompt: text.trim(), tag: cat.label, spark: "", category: selectedCategory, difficulty: selectedDifficulty }]);
    } catch(e) { showMsg("Generation error: " + e.message, "error"); }
    setGenerating(false);
  };

  const savePrompt = async (p) => {
    try {
      const r = await db.insert("qod_prompts", { prompt: p.prompt, tag: p.tag, spark: p.spark, category: p.category, difficulty: p.difficulty });
      const saved = Array.isArray(r) ? r[0] : r;
      setSavedPrompts(prev => [saved, ...prev]);
      showMsg("✓ Saved to library!");
    } catch(e) { showMsg("Save error: " + e.message, "error"); }
  };

  const deletePrompt = async (id) => {
    try { await db.delete("qod_prompts", `id=eq.${id}`); setSavedPrompts(prev => prev.filter(p => p.id !== id)); showMsg("Removed"); }
    catch(e) { showMsg("Error", "error"); }
  };

  const schedulePrompt = async (promptId, date) => {
    try {
      await db.update("qod_prompts", `id=eq.${promptId}`, { scheduled_date: date });
      setSavedPrompts(prev => prev.map(p => p.id === promptId ? { ...p, scheduled_date: date } : p));
      showMsg("✓ Scheduled for " + date); setScheduling(null);
    } catch(e) { showMsg("Error", "error"); }
  };

  const cat = QOD_CATEGORIES.find(c => c.id === selectedCategory);
  const today = new Date().toISOString().split("T")[0];
  const upcoming = savedPrompts.filter(p => p.scheduled_date && p.scheduled_date >= today).sort((a,b) => a.scheduled_date.localeCompare(b.scheduled_date));
  const unscheduled = savedPrompts.filter(p => !p.scheduled_date);
  const past = savedPrompts.filter(p => p.scheduled_date && p.scheduled_date < today);

  return (
    <div>
      <style>{`
        @keyframes studioShimmer { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes qodFloat { 0%,100%{transform:translateY(0) rotate(-2deg)} 50%{transform:translateY(-8px) rotate(2deg)} }
        .qod-card { transition: box-shadow 0.2s, transform 0.15s; }
        .qod-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.4); transform: translateY(-2px); }
        .gen-skeleton { background: linear-gradient(90deg, #1E2535 0%, #2A3145 50%, #1E2535 100%); background-size: 400% 100%; animation: studioShimmer 1.5s ease infinite; }
      `}</style>

      {/* Studio hero */}
      <div style={{ background: "linear-gradient(135deg, #1a0f00 0%, #2D1F00 40%, #1a0f00 100%)", borderRadius: "16px", padding: "28px", marginBottom: "24px", position: "relative", overflow: "hidden", border: `1px solid ${C.goldBorder}`, boxShadow: `0 4px 32px rgba(201,168,76,0.1)` }}>
        <div style={{ position: "absolute", top: "-40px", right: "-30px", fontSize: "160px", opacity: 0.06, animation: "qodFloat 5s ease-in-out infinite" }}>💡</div>
        <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "4px", textTransform: "uppercase", color: C.gold, opacity: 0.8, marginBottom: "4px" }}>Teacher Tom's</div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: "28px", fontWeight: "400", letterSpacing: "-0.3px", marginBottom: "8px", color: C.text }}>Question of the Day Studio</div>
        <div style={{ fontSize: "13px", color: C.textMid, lineHeight: 1.7, maxWidth: "480px" }}>
          Generate prompts that make students <em style={{ color: C.goldBright }}>want</em> to speak. Schedule them, save favourites, and build a library.
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "16px", flexWrap: "wrap" }}>
          {[["generate", "✨ Generate"], ["saved", `📚 Library (${savedPrompts.length})`], ["schedule", `📅 Upcoming (${upcoming.length})`]].map(([t, label]) =>
            React.createElement("button", { key: t, onClick: () => setActiveTab(t),
              style: { padding: "7px 16px", borderRadius: "20px", border: `1px solid ${activeTab === t ? C.gold : C.goldBorder}`, background: activeTab === t ? C.goldBg : "transparent", color: activeTab === t ? C.gold : C.textMid, fontSize: "12px", fontWeight: activeTab === t ? "700" : "400", cursor: "pointer", fontFamily: FONT, transition: "all 0.15s" } }, label)
          )}
        </div>
      </div>

      {/* Generate */}
      {activeTab === "generate" && (
        <div>
          <div style={{ marginBottom: "18px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: C.textLight, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "10px" }}>Question Theme</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {QOD_CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", borderRadius: "10px", border: `1px solid ${selectedCategory === c.id ? c.color + "60" : C.border}`, background: selectedCategory === c.id ? c.bg : "transparent", cursor: "pointer", fontFamily: FONT, textAlign: "left", transition: "all 0.12s" }}>
                  <div style={{ fontSize: "18px", lineHeight: 1 }}>{c.label.split(" ")[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: selectedCategory === c.id ? "700" : "500", color: selectedCategory === c.id ? c.color : C.text }}>{c.label.slice(c.label.indexOf(" ") + 1)}</div>
                    <div style={{ fontSize: "11px", color: C.textLight }}>{c.desc}</div>
                  </div>
                  {selectedCategory === c.id && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: c.color, flexShrink: 0, boxShadow: `0 0 8px ${c.color}` }} />}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: C.textLight, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "10px" }}>Speaking Level</div>
            <div style={{ display: "flex", gap: "8px" }}>
              {QOD_DIFFICULTY.map(d => (
                <button key={d.id} onClick={() => setSelectedDifficulty(d.id)}
                  style={{ flex: 1, padding: "10px 6px", borderRadius: "10px", border: `1px solid ${selectedDifficulty === d.id ? C.gold : C.border}`, background: selectedDifficulty === d.id ? C.goldBg : "transparent", color: selectedDifficulty === d.id ? C.gold : C.textMid, fontSize: "11px", fontWeight: selectedDifficulty === d.id ? "700" : "400", cursor: "pointer", fontFamily: FONT, textAlign: "center", transition: "all 0.12s" }}>
                  <div style={{ fontSize: "16px", marginBottom: "3px" }}>{d.label.split(" ")[0]}</div>
                  <div style={{ fontWeight: "600", fontSize: "12px" }}>{d.label.slice(d.label.indexOf(" ") + 1)}</div>
                  <div style={{ fontSize: "10px", opacity: 0.6, marginTop: "2px" }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: C.textLight, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "6px" }}>Context <span style={{ fontWeight: "400", textTransform: "none", fontSize: "11px" }}>optional</span></div>
            <Input value={customContext} onChange={e => setCustomContext(e.target.value)} placeholder="e.g. 'After a long holiday' / 'Monday motivation'" />
          </div>
          <button onClick={generatePrompts} disabled={generating}
            style={{ width: "100%", padding: "14px", borderRadius: "12px", border: `1px solid ${generating ? C.border : C.goldBorder}`, background: generating ? C.bgMid : C.goldBg, color: generating ? C.textLight : C.gold, fontSize: "15px", fontWeight: "700", cursor: generating ? "not-allowed" : "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "20px", transition: "all 0.2s" }}>
            {generating ? React.createElement(React.Fragment, null, React.createElement(Spinner), React.createElement("span", null, "Crafting prompts…")) : "✨  Generate 5 Questions"}
          </button>
          {generating && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[1,2,3,4,5].map(i => <div key={i} className="gen-skeleton" style={{ height: "90px", borderRadius: "12px" }} />)}
            </div>
          )}
          {!generating && suggestions.length > 0 && (
            <div>
              <div style={{ fontSize: "10px", fontWeight: "700", color: C.textLight, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "12px" }}>{suggestions.length} Generated · {cat.label}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {suggestions.map((s, i) => <QodPromptCard key={s.id} prompt={s} index={i} catColor={cat.color} catBg={cat.bg} onSave={() => savePrompt(s)} onPreview={() => setPreviewPrompt(s)} isSaved={savedPrompts.some(sp => sp.prompt === s.prompt)} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved */}
      {activeTab === "saved" && (
        <div>
          {loadingSaved ? React.createElement("div", { style: { textAlign: "center", padding: "40px" } }, React.createElement(Spinner)) :
           savedPrompts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📚</div>
              <div style={{ fontSize: "16px", color: C.textMid, fontWeight: "600", marginBottom: "8px" }}>Library is empty</div>
              <div style={{ fontSize: "13px", color: C.textLight }}>Generate questions and save your favourites</div>
            </div>
          ) : (
            <div>
              {unscheduled.length > 0 && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: C.textLight, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "10px" }}>Unscheduled ({unscheduled.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {unscheduled.map((p, i) => { const c = QOD_CATEGORIES.find(c => c.id === p.category) || QOD_CATEGORIES[0]; return <QodPromptCard key={p.id} prompt={p} index={i} catColor={c.color} catBg={c.bg} isSaved={true} onDelete={() => deletePrompt(p.id)} onSchedule={() => setScheduling(p.id)} onPreview={() => setPreviewPrompt(p)} schedulingId={scheduling} onConfirmSchedule={(date) => schedulePrompt(p.id, date)} onCancelSchedule={() => setScheduling(null)} />; })}
                  </div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <div style={{ fontSize: "10px", fontWeight: "700", color: C.textLight, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "10px" }}>Past ({past.length})</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", opacity: 0.5 }}>
                    {past.map((p, i) => { const c = QOD_CATEGORIES.find(c => c.id === p.category) || QOD_CATEGORIES[0]; return <QodPromptCard key={p.id} prompt={p} index={i} catColor={c.color} catBg={c.bg} isSaved={true} onDelete={() => deletePrompt(p.id)} onPreview={() => setPreviewPrompt(p)} />; })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule */}
      {activeTab === "schedule" && (
        <div>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📅</div>
              <div style={{ fontSize: "16px", color: C.textMid, fontWeight: "600", marginBottom: "8px" }}>No upcoming questions</div>
              <div style={{ fontSize: "13px", color: C.textLight }}>Save prompts and schedule them from the Library</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {upcoming.map((p, i) => {
                const c = QOD_CATEGORIES.find(c => c.id === p.category) || QOD_CATEGORIES[0];
                const isToday = p.scheduled_date === today;
                return (
                  <div key={p.id} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ width: "48px", textAlign: "center", flexShrink: 0, paddingTop: "4px" }}>
                      <div style={{ fontSize: "10px", fontWeight: "700", color: isToday ? C.gold : C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>{isToday ? "TODAY" : new Date(p.scheduled_date + "T00:00").toLocaleDateString("en", { weekday: "short" })}</div>
                      <div style={{ fontSize: "22px", fontWeight: "800", color: isToday ? C.gold : C.text, lineHeight: 1.2 }}>{new Date(p.scheduled_date + "T00:00").getDate()}</div>
                      <div style={{ fontSize: "10px", color: C.textLight }}>{new Date(p.scheduled_date + "T00:00").toLocaleDateString("en", { month: "short" })}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <QodPromptCard prompt={p} index={i} catColor={c.color} catBg={c.bg} isSaved={true} isToday={isToday} onDelete={() => deletePrompt(p.id)} onPreview={() => setPreviewPrompt(p)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Preview modal */}
      {previewPrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setPreviewPrompt(null); }}>
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: "20px", padding: "28px", maxWidth: "480px", width: "100%", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", animation: "scaleIn 0.2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div style={{ fontSize: "10px", fontWeight: "700", color: C.gold, letterSpacing: "3px", textTransform: "uppercase" }}>Student Preview</div>
              <button onClick={() => setPreviewPrompt(null)} style={{ background: C.bgMid, border: "none", borderRadius: "50%", width: "28px", height: "28px", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", color: C.textMid }}>×</button>
            </div>
            <div style={{ background: "linear-gradient(135deg, #0D1B2A, #1A1035)", borderRadius: "14px", padding: "28px", marginBottom: "16px", textAlign: "center", border: `1px solid ${C.goldBorder}` }}>
              <div style={{ fontSize: "10px", color: C.gold, letterSpacing: "3px", textTransform: "uppercase", marginBottom: "14px", opacity: 0.8 }}>오늘의 질문</div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: "20px", fontWeight: "400", lineHeight: 1.6, color: C.text, fontStyle: "italic" }}>"{previewPrompt.prompt}"</div>
            </div>
            {previewPrompt.spark && (
              <div style={{ background: C.goldBg, borderLeft: `3px solid ${C.gold}`, padding: "10px 14px", borderRadius: "0 8px 8px 0", fontSize: "13px", color: C.textMid, fontStyle: "italic", marginBottom: "16px" }}>
                💡 {previewPrompt.spark}
              </div>
            )}
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={() => speak(previewPrompt.prompt)} variant="secondary" style={{ flex: 1, fontSize: "13px" }}>🔊 Hear it</Btn>
              <Btn onClick={() => setPreviewPrompt(null)} variant="ghost" style={{ fontSize: "13px" }}>Close</Btn>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: "20px", padding: "12px 14px", background: C.bgSoft, borderRadius: "8px", fontSize: "11px", color: C.textLight, lineHeight: 1.8, border: `1px solid ${C.border}` }}>
        <strong style={{ color: C.textMid }}>Supabase table needed:</strong> <code style={{ color: C.gold }}>qod_prompts</code>: id, prompt, tag, spark, category, difficulty, scheduled_date, created_at
      </div>
    </div>
  );
}

// ── QoD Prompt Card ───────────────────────────────────────────────────────────
function QodPromptCard({ prompt, index, catColor, catBg, onSave, onDelete, onPreview, onSchedule, isSaved, isToday, schedulingId, onConfirmSchedule, onCancelSchedule }) {
  const [schedDate, setSchedDate] = useState("");
  const isScheduling = schedulingId === prompt.id;
  const diff = QOD_DIFFICULTY.find(d => d.id === prompt.difficulty);

  return (
    <div className="qod-card" style={{ background: C.bgCard, border: `1px solid ${isToday ? catColor + "50" : C.border}`, borderRadius: "12px", overflow: "hidden", borderLeft: `3px solid ${catColor}`, ...(isToday ? { boxShadow: `0 0 0 1px ${catColor}20, 0 4px 20px ${catColor}15` } : {}) }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", background: catBg, color: catColor, padding: "3px 9px", borderRadius: "10px", letterSpacing: "0.5px", border: `1px solid ${catColor}30` }}>{prompt.tag}</span>
            {diff && <span style={{ fontSize: "10px", color: C.textLight, background: C.bgMid, padding: "3px 9px", borderRadius: "10px" }}>{diff.label.split(" ")[0]} {diff.label.slice(diff.label.indexOf(" ") + 1)}</span>}
            {isToday && <span style={{ fontSize: "10px", fontWeight: "700", background: C.goldBg, color: C.gold, padding: "3px 9px", borderRadius: "10px", border: `1px solid ${C.goldBorder}` }}>⭐ Today</span>}
          </div>
          <div style={{ display: "flex", gap: "4px" }}>
            {onPreview && <button onClick={onPreview} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: "6px", padding: "4px 8px", cursor: "pointer", fontSize: "11px", color: C.textMid, fontFamily: FONT }}>👁</button>}
            {!isSaved && onSave && <button onClick={onSave} style={{ background: catBg, border: `1px solid ${catColor}40`, borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "11px", color: catColor, fontFamily: FONT, fontWeight: "700" }}>Save ⭐</button>}
            {isSaved && onSchedule && <button onClick={onSchedule} style={{ background: C.goldBg, border: `1px solid ${C.goldBorder}`, borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontSize: "11px", color: C.gold, fontFamily: FONT, fontWeight: "600" }}>📅 Schedule</button>}
            {onDelete && <button onClick={onDelete} style={{ background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "16px", padding: "2px 4px", opacity: 0.5 }}>×</button>}
          </div>
        </div>
        <div style={{ fontSize: "15px", fontWeight: "600", color: C.text, lineHeight: 1.6, fontStyle: "italic", marginBottom: prompt.spark ? "10px" : "0" }}>
          "{prompt.prompt}"
        </div>
        {prompt.spark && (
          <div style={{ background: C.bgMid, borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: C.textMid, lineHeight: 1.5 }}>
            💡 {prompt.spark}
          </div>
        )}
        {isScheduling && (
          <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center" }}>
            <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} min={new Date().toISOString().split("T")[0]}
              style={{ flex: 1, padding: "8px 10px", border: `1px solid ${C.gold}`, borderRadius: "8px", fontSize: "13px", fontFamily: FONT, outline: "none", color: C.text, background: C.bgMid }} />
            <Btn onClick={() => { if (schedDate) onConfirmSchedule(schedDate); }} disabled={!schedDate} variant="gold" style={{ fontSize: "12px", padding: "7px 12px" }}>Confirm</Btn>
            <Btn onClick={onCancelSchedule} variant="ghost" style={{ fontSize: "12px", padding: "7px 10px" }}>✕</Btn>
          </div>
        )}
        {prompt.scheduled_date && !isScheduling && (
          <div style={{ marginTop: "8px", fontSize: "11px", color: C.textLight, display: "flex", alignItems: "center", gap: "4px" }}>
            📅 <strong style={{ color: prompt.scheduled_date === new Date().toISOString().split("T")[0] ? C.gold : C.textMid }}>{prompt.scheduled_date}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
