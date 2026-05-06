import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ulpnmewvejvpancvqnrp.supabase.co";
const SUPABASE_KEY = "sb_publishable_sDP-kuCv5E2LmpDMPp8Y4A_n1ryWhNO";
const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;
const TEACHER_PASS = "wayve2026";
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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
};

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg: "#FFFFFF", bgSoft: "#F5F5F5", bgMid: "#EEEEEE",
  text: "#111111", textMid: "#555555", textLight: "#999999",
  border: "#E5E5E5", borderDark: "#CCCCCC",
  gold: "#B8973A", goldBg: "#FBF6E9",
  success: "#1A7A45", successBg: "#EBF7F0",
  error: "#C0392B", errorBg: "#FCECEA",
  retry: "#E67E22", retryBg: "#FEF5EC",
};

// ── Font + Animations ─────────────────────────────────────────────────────────
const GlobalStyle = () => React.createElement("style", null, `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:${FONT};background:${C.bg};color:${C.text};}
  input,button,select,textarea{font-family:${FONT};}
  @keyframes spin{to{transform:rotate(360deg);}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
  .fade-in{animation:fadeIn 0.2s ease;}
`);

// ── Helpers ───────────────────────────────────────────────────────────────────
const cleanText = t => {
  if (!t) return t;
  return t.split("").filter(c => {
    const code = c.charCodeAt(0);
    return (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F) || (code >= 0x0020 && code <= 0x007E) || (code >= 0x1F300 && code <= 0x1FAFF) || (code >= 0x2600 && code <= 0x27BF) || c === "\n";
  }).join("");
};

function highlightMissed(target, spoken) {
  if (!target || !spoken) return React.createElement("span", null, target);
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const spokenNorm = norm(spoken);
  return React.createElement("span", null,
    target.split(" ").map((word, i, arr) => React.createElement("span", { key: i, style: { color: spokenNorm.includes(norm(word)) ? C.text : C.error, textDecoration: spokenNorm.includes(norm(word)) ? "none" : "underline", fontWeight: spokenNorm.includes(norm(word)) ? "400" : "600" } }, word + (i < arr.length - 1 ? " " : "")))
  );
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(text, slow = false) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = slow ? 0.5 : 0.9;
  u.pitch = 1.05;
  const go = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = ["Samantha", "Karen", "Moira", "Tessa", "Allison", "Ava"];
    let v = voices.find(x => preferred.some(n => x.name.includes(n)) && x.lang.startsWith("en"));
    if (!v) v = voices.find(x => x.lang === "en-US" && x.localService);
    if (!v) v = voices.find(x => x.lang === "en-US");
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length === 0) { window.speechSynthesis.onvoiceschanged = go; } else { go(); }
}

// ── Groq API ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are Tom, a warm English coach for Korean learners at Wayve.
STRICT: Write ONLY Korean hangul (가-힣) and English (a-z A-Z 0-9 punctuation emoji).
NEVER use Chinese characters, Japanese kana, Russian, or any other script.
Motivation lines must be pure Korean hangul: 잘하고 있어요! 화이팅! 계속 연습해요! 정말 잘했어요!`;

async function groqCall(prompt) {
  if (!GROQ_KEY) throw new Error("GROQ_KEY not set in environment variables");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 700, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }] })
  });
  if (!res.ok) { const err = await res.text(); throw new Error("Groq error: " + err); }
  const d = await res.json();
  return cleanText(d.choices[0].message.content);
}

async function transcribe(blob) {
  if (!GROQ_KEY) throw new Error("GROQ_KEY not set");
  const fd = new FormData();
  fd.append("file", blob, "rec.webm");
  fd.append("model", "whisper-large-v3");
  fd.append("response_format", "text");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { "Authorization": `Bearer ${GROQ_KEY}` }, body: fd });
  if (!res.ok) { const err = await res.text(); throw new Error("Transcription error: " + err); }
  return (await res.text()).trim();
}

async function getPhraseFeedback(said, phrase) {
  const text = await groqCall(`Target phrase: "${phrase.english}"
Student said: "${said}"

Respond ONLY in Korean hangul and English.

🎯 점수: X/10
[Korean explanation of score]

✅ 잘한 점
[Korean encouragement]

📝 문법 피드백
[Korean explanation of any issues]
❌ ${said}
✅ [Corrected English]
📌 [Korean explanation of WHY it is wrong]

💡 이렇게도 말할 수 있어요
→ [Alternative natural English]

💪 [Pure Korean hangul motivation only — no Chinese]

If grammar was perfect, replace 문법 피드백 section with: 완벽해요!
Under 150 words. Korean hangul and English ONLY.`);
  const match = text.match(/점수.*?(\d+)\/10/);
  return { text, score: match ? parseInt(match[1]) : 7 };
}

async function getFreeTalkFeedback(said) {
  const text = await groqCall(`Student said in English (free practice): "${said}"

Respond ONLY in Korean hangul and English.

🎯 점수: X/10
[Korean explanation]

✅ 잘한 점
[Korean encouragement]

📝 문법 피드백
[Korean explanation]
❌ ${said}
✅ [Corrected English]
📌 [Korean: WHY it is wrong — grammar rule explained simply]

💡 이렇게도 말할 수 있어요
→ [More natural English]

💪 [Pure Korean hangul motivation — no Chinese characters]

If perfect grammar, replace 문법 피드백 with: 완벽해요!
Under 150 words. Korean hangul and English ONLY.`);
  const match = text.match(/점수.*?(\d+)\/10/);
  return { text, score: match ? parseInt(match[1]) : 7 };
}

async function getKoreanTranslation(input) {
  const text = await groqCall(`Korean learner wants to know how to say this in English: "${input}"

Respond ONLY in Korean hangul and English. No Chinese characters.

🇰🇷 한국어 표현
${input}

🗣 영어 표현
[The English translation]

📌 예문
1. [English example sentence]
→ [Korean hangul translation]

2. [English example sentence]
→ [Korean hangul translation]

💡 사용 팁
[One short Korean hangul tip]

💪 [Pure Korean hangul encouragement — no Chinese]

Under 130 words.`);
  // Extract the English translation robustly
  const lines = text.split("\n");
  let englishLine = "";
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("영어 표현") || lines[i].includes("이렇게 말해요")) {
      const next = lines[i + 1]?.trim();
      if (next && next.match(/[a-zA-Z]/)) { englishLine = next.replace(/^[→\-\*]\s*/, "").trim(); break; }
    }
  }
  return { text, englishPhrase: englishLine };
}

async function generateAIPhrases(topic) {
  if (!GROQ_KEY) throw new Error("GROQ_KEY not set");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 800,
      messages: [{ role: "user", content: `Generate 5 English phrases for Korean learners about: "${topic}".
Return ONLY a valid JSON array. Each object MUST have all three fields.
The "context" field MUST be written in Korean hangul.
[{"english":"natural English phrase","korean":"Korean hangul translation","context":"Korean hangul explanation of when to use this phrase"}]
No extra text, no markdown, just the JSON array.` }]
    })
  });
  const d = await res.json();
  const text = d.choices[0].message.content.replace(/```json|```/g, "").trim();
  const start = text.indexOf("["); const end = text.lastIndexOf("]");
  return JSON.parse(text.slice(start, end + 1));
}

async function autoFillKorean(english) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 200, messages: [{ role: "user", content: `For English phrase: "${english}"\nReturn ONLY valid JSON:\n{"ko":"Korean hangul translation","context":"Korean hangul explanation of when to use this"}` }] })
    });
    const d = await res.json();
    const text = d.choices[0].message.content.replace(/```json|```/g, "").trim();
    const s = text.indexOf("{"); const e = text.lastIndexOf("}");
    if (s !== -1 && e !== -1) return JSON.parse(text.slice(s, e + 1));
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

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlob(b); stream.getTracks().forEach(t => t.stop());
        if (onDoneRef.current) onDoneRef.current(b);
      };
      mr.start(); setIsRec(true); setTime(0); setBlob(null);
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
    primary: { background: C.text, color: "#fff", border: "none" },
    secondary: { background: C.bgSoft, color: C.text, border: `1px solid ${C.border}` },
    gold: { background: C.gold, color: "#fff", border: "none" },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    danger: { background: C.error, color: "#fff", border: "none" },
    success: { background: C.success, color: "#fff", border: "none" },
  };
  return React.createElement("button", { onClick, disabled, style: { padding: "9px 18px", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s", fontFamily: FONT, ...variants[variant], ...style } }, children);
};

const Input = ({ value, onChange, onBlur, placeholder, type = "text", style = {} }) =>
  React.createElement("input", { value, onChange, onBlur, placeholder, type, style: { width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", outline: "none", background: C.bg, color: C.text, fontFamily: FONT, ...style } });

const Card = ({ children, style = {} }) =>
  React.createElement("div", { style: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "18px", ...style } }, children);

const Spinner = () => React.createElement("span", { style: { display: "inline-block", width: "16px", height: "16px", border: `2px solid ${C.border}`, borderTop: `2px solid ${C.text}`, borderRadius: "50%", animation: "spin 0.6s linear infinite", verticalAlign: "middle" } });

const Msg = ({ text, type = "success" }) => {
  if (!text) return null;
  const styles = {
    success: { background: C.successBg, border: `1px solid #A8D5B5`, color: C.success },
    error: { background: C.errorBg, border: `1px solid #F0A8A5`, color: C.error },
    warn: { background: C.retryBg, border: `1px solid #F0C090`, color: C.retry },
  };
  return React.createElement("div", { style: { ...styles[type], padding: "10px 14px", borderRadius: "6px", marginBottom: "14px", fontSize: "13px", fontWeight: "500" } }, text);
};

// ── Inline Edit ───────────────────────────────────────────────────────────────
function InlineEdit({ value, onSave, style = {} }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const ref = useRef(null);
  useEffect(() => { if (editing && ref.current) ref.current.focus(); }, [editing]);
  const save = () => { if (val.trim() && val.trim() !== value) onSave(val.trim()); setEditing(false); };
  if (!editing) return React.createElement("span", { onClick: () => { setVal(value); setEditing(true); }, style: { cursor: "text", borderBottom: `1px dashed ${C.border}`, paddingBottom: "1px", ...style }, title: "Click to edit" }, value);
  return React.createElement("input", { ref, value: val, onChange: e => setVal(e.target.value), onBlur: save, onKeyDown: e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }, style: { border: `1px solid ${C.gold}`, borderRadius: "4px", padding: "2px 6px", fontSize: "inherit", fontFamily: FONT, outline: "none", fontWeight: "inherit", ...style } });
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [groups, setGroups] = useState([]);

  useEffect(() => { db.get("groups", "order=created_at.asc").then(setGroups).catch(() => {}); }, []);

  const handleLogin = async (name) => {
    try {
      const rows = await db.get("students", `name=eq.${encodeURIComponent(name)}&select=*,groups(name,id)`);
      if (!rows.length) return "이름을 찾을 수 없어요. Teacher Toms에게 등록을 요청해 주세요.";
      setUser(rows[0]); setScreen("student"); return null;
    } catch(e) { return "오류가 발생했어요: " + e.message; }
  };

  if (screen === "login") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(LoginScreen, { onLogin: handleLogin, onTeacher: p => { if (p === TEACHER_PASS) { setScreen("teacher"); return null; } return "Wrong password"; } }));
  if (screen === "teacher") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(TeacherScreen, { groups, setGroups, setScreen, onPreview: g => { setPreview(g); setScreen("preview"); } }));
  if (screen === "preview") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(StudentScreen, { user: { id: "preview", name: "Preview Mode", group_id: preview?.id, streak: 3, longest_streak: 7 }, group: preview, isPreview: true, onBack: () => setScreen("teacher") }));
  if (screen === "student") return React.createElement(React.Fragment, null, React.createElement(GlobalStyle), React.createElement(StudentScreen, { user, group: groups.find(g => g.id === user?.group_id) || user?.groups, isPreview: false, onBack: () => setScreen("login") }));
  return null;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onTeacher }) {
  const [mode, setMode] = useState("student");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStudent = async () => {
    if (!name.trim()) return;
    setLoading(true); setError("");
    const err = await onLogin(name.trim());
    if (err) setError(err);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "36px", fontWeight: "700", letterSpacing: "-1px", color: C.text, marginBottom: "6px" }}>WAYVE</div>
          <div style={{ fontSize: "12px", color: C.textLight, letterSpacing: "3px", textTransform: "uppercase" }}>English Confidence</div>
        </div>
        <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: "28px" }}>
          {[["student", "Student"], ["teacher", "Teacher"]].map(([m, label]) =>
            React.createElement("button", { key: m, onClick: () => { setMode(m); setError(""); }, style: { flex: 1, padding: "10px", background: "transparent", border: "none", borderBottom: mode === m ? `2px solid ${C.text}` : "2px solid transparent", color: mode === m ? C.text : C.textLight, fontSize: "14px", fontWeight: mode === m ? "600" : "400", cursor: "pointer", marginBottom: "-2px", fontFamily: FONT } }, label)
          )}
        </div>
        {mode === "student" && (
          <div>
            <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>이름 입력 / Your Name</div>
            <Input value={name} onChange={e => setName(e.target.value)} onBlur={() => {}} placeholder="Enter your name" style={{ marginBottom: "14px", fontSize: "16px", padding: "12px 14px" }} />
            {error && <Msg text={error} type="error" />}
            <Btn onClick={handleStudent} disabled={loading || !name.trim()} style={{ width: "100%", padding: "13px" }}>{loading ? React.createElement(Spinner) : "입장하기 →"}</Btn>
          </div>
        )}
        {mode === "teacher" && (
          <div>
            <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Password</div>
            <Input type="password" value={pass} onChange={e => setPass(e.target.value)} onBlur={() => {}} placeholder="Teacher password" style={{ marginBottom: "14px", fontSize: "16px", padding: "12px 14px" }} />
            {error && <Msg text={error} type="error" />}
            <Btn onClick={() => { const err = onTeacher(pass); if (err) setError(err); }} variant="gold" style={{ width: "100%", padding: "13px" }}>Teacher Dashboard →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({ user, group, isPreview, onBack }) {
  const [tab, setTab] = useState("practice");
  const [streak, setStreak] = useState(user.streak || 0);
  const [longest, setLongest] = useState(user.longest_streak || 0);

  const updateStreak = useCallback(async () => {
    if (isPreview) return;
    const today = new Date().toISOString().split("T")[0];
    if (user.last_practice === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const ns = user.last_practice === yesterday ? streak + 1 : 1;
    const nl = Math.max(ns, longest);
    setStreak(ns); setLongest(nl);
    user.last_practice = today;
    await db.update("students", `id=eq.${user.id}`, { streak: ns, longest_streak: nl, last_practice: today });
  }, [isPreview, streak, longest, user]);

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, zIndex: 10 }}>
        {isPreview && (
          <div style={{ background: C.gold, color: "#fff", padding: "6px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "500" }}>
            <span>👁 Preview — {group?.name}</span>
            <button onClick={onBack} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "3px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontFamily: FONT }}>← Dashboard</button>
          </div>
        )}
        <div style={{ padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "24px", fontWeight: "700", color: streak > 0 ? "#E07B39" : C.textLight, lineHeight: 1 }}>🔥 {streak}</div>
                <div style={{ fontSize: "9px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>streak</div>
              </div>
              {longest > 0 && (
                <div style={{ textAlign: "center", paddingLeft: "10px", borderLeft: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: C.gold, lineHeight: 1 }}>🏅 {longest}</div>
                  <div style={{ fontSize: "9px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px" }}>best</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "600" }}>Hi, {user.name}! 👋</div>
              <div style={{ fontSize: "11px", color: C.textLight }}>{group?.name || ""}</div>
            </div>
          </div>
          <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textLight, padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: FONT }}>Exit</button>
        </div>
        <div style={{ display: "flex", padding: "0 20px" }}>
          {[["practice", "🎙 Practice"], ["freetalk", "💬 Free Talk"]].map(([t, label]) =>
            React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "10px 16px", background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.text}` : "2px solid transparent", color: tab === t ? C.text : C.textLight, fontSize: "13px", fontWeight: tab === t ? "600" : "400", cursor: "pointer", fontFamily: FONT, marginBottom: "-1px" } }, label)
          )}
        </div>
      </div>
      <div style={{ maxWidth: "700px", margin: "0 auto", padding: "20px 16px" }}>
        {tab === "practice" && React.createElement(PracticeTab, { user, group, isPreview, onPracticed: updateStreak })}
        {tab === "freetalk" && React.createElement(FreeTalkTab, { user, isPreview, onPracticed: updateStreak })}
      </div>
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

  const loadData = useCallback(async () => {
    if (!group?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const sp = await db.get("session_phrases", `group_id=eq.${group.id}&select=*,phrase_bank(*)&order=session_number.asc,created_at.asc`);
      const bySession = {};
      sp.forEach(row => {
        const s = row.session_number;
        if (!bySession[s]) bySession[s] = [];
        if (row.phrase_bank) bySession[s].push({ ...row.phrase_bank, sp_id: row.id });
      });
      setSessions(bySession);
      const nums = Object.keys(bySession).map(Number).sort((a, b) => b - a);
      if (nums.length > 0) setActiveSession(nums[0]);
      if (!isPreview) {
        const prog = await db.get("student_progress", `student_id=eq.${user.id}`);
        const map = {};
        prog.forEach(p => { map[p.phrase_id] = p; });
        setProgress(map);
      }
    } catch(e) {}
    setLoading(false);
  }, [group, user, isPreview]);

  useEffect(() => { loadData(); }, [loadData]);

  const allPhrases = Object.values(sessions).flat();

  const pickRandom = () => {
    if (!allPhrases.length) return;
    const unpassed = allPhrases.filter(p => !progress[p.id]?.passed);
    const pool = unpassed.length > 0 ? unpassed : allPhrases;
    setRandomPhrase(pool[Math.floor(Math.random() * pool.length)]);
  };

  if (loading) return React.createElement("div", { style: { textAlign: "center", padding: "60px" } }, React.createElement(Spinner));

  const sessionNums = Object.keys(sessions).map(Number).sort((a, b) => b - a);

  if (!sessionNums.length) return (
    React.createElement("div", { style: { textAlign: "center", padding: "60px 20px" } },
      React.createElement("div", { style: { fontSize: "40px", marginBottom: "16px" } }, "📭"),
      React.createElement("div", { style: { fontSize: "15px", color: C.textMid } }, "No phrases assigned yet."),
      React.createElement("div", { style: { fontSize: "13px", color: C.textLight, marginTop: "8px" } }, "Teacher Toms will add phrases after class!")
    )
  );

  const currentPhrases = sessions[activeSession] || [];
  const retry = currentPhrases.filter(p => progress[p.id]?.needs_retry && !progress[p.id]?.passed);
  const others = currentPhrases.filter(p => !progress[p.id]?.needs_retry || progress[p.id]?.passed);
  const ordered = [...retry, ...others];

  return (
    <div>
      {/* Random practice */}
      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "600" }}>🎲 Random Practice</div>
          <div style={{ fontSize: "12px", color: C.textLight, marginTop: "2px" }}>Practice any phrase from all sessions</div>
        </div>
        <Btn onClick={pickRandom} variant="secondary" style={{ flexShrink: 0 }}>Pick One</Btn>
      </Card>

      {/* Random phrase modal */}
      {randomPhrase && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={e => { if (e.target === e.currentTarget) setRandomPhrase(null); }}>
          <div style={{ background: C.bg, borderRadius: "12px", padding: "24px", maxWidth: "520px", width: "100%", maxHeight: "88vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", fontWeight: "600", color: C.textMid }}>🎲 Random Phrase</div>
              <button onClick={() => setRandomPhrase(null)} style={{ background: "transparent", border: "none", color: C.textLight, fontSize: "22px", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ fontSize: "20px", fontStyle: "italic", color: C.text, marginBottom: "6px" }}>"{randomPhrase.english}"</div>
            {randomPhrase.korean && <div style={{ fontSize: "14px", color: C.textMid, marginBottom: "12px" }}>{randomPhrase.korean}</div>}
            <PhraseCard phrase={randomPhrase} user={user} prog={progress[randomPhrase.id]} isPreview={isPreview} onUpdate={p => setProgress(prev => ({ ...prev, [randomPhrase.id]: p }))} onPracticed={onPracticed} />
          </div>
        </div>
      )}

      {/* Session tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        {sessionNums.map(n =>
          React.createElement("button", { key: n, onClick: () => setActiveSession(n), style: { padding: "6px 14px", borderRadius: "20px", border: `1px solid ${activeSession === n ? C.text : C.border}`, background: activeSession === n ? C.text : C.bg, color: activeSession === n ? "#fff" : C.textMid, fontSize: "13px", fontWeight: activeSession === n ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, `Session ${n}`)
        )}
      </div>

      {/* Phrase list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {ordered.map(phrase => {
          const prog = progress[phrase.id];
          return React.createElement(ExpandableRow, { key: phrase.id, phrase, prog, user, isPreview, onUpdate: p => setProgress(prev => ({ ...prev, [phrase.id]: p })), onPracticed });
        })}
      </div>
    </div>
  );
}

// ── Expandable Row ────────────────────────────────────────────────────────────
function ExpandableRow({ phrase, prog, user, isPreview, onUpdate, onPracticed }) {
  const [open, setOpen] = useState(false);
  const passed = prog?.passed;
  const needsRetry = prog?.needs_retry && !passed;
  const tried = prog?.attempts > 0 && !passed && !needsRetry;

  let bg = C.bg, border = C.border;
  if (passed) { bg = C.successBg; border = "#A8D5B5"; }
  else if (needsRetry) { bg = C.retryBg; border = "#F0C090"; }
  else if (tried) { bg = C.errorBg; border = "#F0A8A5"; }

  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${border}`, background: bg, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontStyle: "italic", color: C.text, marginBottom: "2px" }}>"{phrase.english}"</div>
          {phrase.korean && <div style={{ fontSize: "12px", color: C.textMid }}>{phrase.korean}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {passed && <span style={{ fontSize: "15px" }}>✅</span>}
          {needsRetry && <span style={{ fontSize: "15px" }}>🔄</span>}
          {prog?.best_score > 0 && <span style={{ fontSize: "11px", color: C.textLight, background: C.bgMid, padding: "2px 7px", borderRadius: "10px" }}>{prog.best_score}/10</span>}
          <span style={{ color: C.textLight, fontSize: "16px", transform: open ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>⌄</span>
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
function PhraseCard({ phrase, user, prog, isPreview, onUpdate, onPracticed, onClose }) {
  const [feedback, setFeedback] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const handleStop = async (blob) => {
    if (isPreview) return;
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
        if (existing.length > 0) { await db.update("student_progress", `student_id=eq.${user.id}&phrase_id=eq.${phrase.id}`, newProg); }
        else { await db.insert("student_progress", newProg); }
      } catch(e) {}
      onUpdate(newProg);
    } catch(e) {
      setErrMsg("피드백 오류: " + e.message);
    }
    setLoading(false);
  };

  const rec = useRecorder(handleStop);

  return (
    <div>
      {phrase.context && <div style={{ background: C.goldBg, borderLeft: `3px solid ${C.gold}`, padding: "8px 12px", borderRadius: "0 4px 4px 0", marginBottom: "14px", fontSize: "13px", color: C.textMid }}>{phrase.context}</div>}
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "14px", flexWrap: "wrap" }}>
        <Btn onClick={() => speak(phrase.english, false)} variant="secondary" style={{ fontSize: "13px", padding: "7px 14px" }}>🔊 Listen</Btn>
        <Btn onClick={() => speak(phrase.english, true)} variant="secondary" style={{ fontSize: "13px", padding: "7px 14px" }}>🐢 Slow</Btn>
      </div>
      <div style={{ textAlign: "center" }}>
        {!rec.isRec && !loading && <Btn onClick={rec.start} style={{ padding: "12px 32px", fontSize: "15px" }}>🎙 Start Recording</Btn>}
        {rec.isRec && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.error }} />
              <span style={{ color: C.error, fontSize: "14px", fontWeight: "500" }}>Recording… {rec.time}s</span>
            </div>
            <Btn onClick={rec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error }}>⏹ Stop (auto-analyze)</Btn>
          </div>
        )}
        {loading && <div style={{ padding: "16px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>Analyzing…</span></div>}
      </div>
      {errMsg && <Msg text={errMsg} type="error" />}
      {feedback && (
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${C.border}` }} className="fade-in">
          {transcription && (
            <div style={{ background: C.bgSoft, padding: "9px 12px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: C.textMid, borderLeft: `3px solid ${C.text}` }}>
              🎙 {highlightMissed(phrase.english, transcription)}
            </div>
          )}
          <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line" }}>{feedback.text}</div>
          {feedback.score >= 8 ? (
            <div style={{ marginTop: "12px" }}>
              <Msg text="🎉 Great job! 8/10 or above!" type="success" />
              {onClose && <Btn onClick={onClose} variant="secondary" style={{ width: "100%" }}>Close ✓</Btn>}
            </div>
          ) : (
            <div style={{ marginTop: "12px", padding: "12px", background: C.retryBg, border: `1px solid #F0C090`, borderRadius: "6px" }}>
              <div style={{ fontSize: "13px", color: C.retry, fontWeight: "500", marginBottom: "8px" }}>Keep practicing until you reach 8/10! 💪</div>
              <Btn onClick={() => { rec.reset(); setFeedback(null); setTranscription(null); }} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🔄 Try Again</Btn>
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

  const handleSpeakStop = async (blob) => {
    if (isPreview) return;
    setLoading(true); setFeedback(null); setTranscription(null); setErrMsg("");
    try {
      const said = await transcribe(blob);
      setTranscription(said);
      const { text, score } = await getFreeTalkFeedback(said);
      setFeedback({ text, score });
      if (score >= 8) await onPracticed();
    } catch(e) { setErrMsg("Feedback error: " + e.message); }
    setLoading(false);
  };

  const handleAskStop = async (blob) => {
    setTranslating(true); setTranslation(null); setEnglishPhrase("");
    try {
      const said = await transcribe(blob);
      setKoreanText(said);
      const { text, englishPhrase: ep } = await getKoreanTranslation(said);
      setTranslation(text); setEnglishPhrase(ep);
    } catch(e) { setTranslation("Translation error: " + e.message); }
    setTranslating(false);
  };

  const askByText = async () => {
    if (!koreanText.trim()) return;
    setTranslating(true); setTranslation(null); setEnglishPhrase("");
    try {
      const { text, englishPhrase: ep } = await getKoreanTranslation(koreanText);
      setTranslation(text); setEnglishPhrase(ep);
    } catch(e) { setTranslation("Translation error: " + e.message); }
    setTranslating(false);
  };

  const speakRec = useRecorder(handleSpeakStop);
  const askRec = useRecorder(handleAskStop);

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "20px", background: C.bg, borderRadius: "8px 8px 0 0" }}>
        {[["speak", "🎙 Speak English"], ["ask", "🇰🇷 How do I say this?"]].map(([m, label]) =>
          React.createElement("button", { key: m, onClick: () => { setMode(m); setFeedback(null); setTranslation(null); speakRec.reset(); askRec.reset(); setErrMsg(""); }, style: { flex: 1, padding: "12px", background: mode === m ? C.bg : C.bgSoft, border: "none", borderBottom: mode === m ? `2px solid ${C.text}` : "2px solid transparent", color: mode === m ? C.text : C.textLight, fontSize: "13px", fontWeight: mode === m ? "600" : "400", cursor: "pointer", fontFamily: FONT, marginBottom: "-1px" } }, label)
        )}
      </div>

      {mode === "speak" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>Speak freely in English!</div>
            <div style={{ fontSize: "12px", color: C.textLight }}>Talk about your day, travel plans, anything — get grammar feedback.</div>
          </Card>
          <div style={{ textAlign: "center" }}>
            {!speakRec.isRec && !loading && <Btn onClick={speakRec.start} style={{ padding: "12px 32px", fontSize: "15px" }}>🎙 Start Speaking</Btn>}
            {speakRec.isRec && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.error }} />
                  <span style={{ color: C.error, fontSize: "14px", fontWeight: "500" }}>Recording… {speakRec.time}s</span>
                </div>
                <Btn onClick={speakRec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error }}>⏹ Stop (auto-analyze)</Btn>
              </div>
            )}
            {loading && <div style={{ padding: "16px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>Analyzing…</span></div>}
          </div>
          {errMsg && <Msg text={errMsg} type="error" />}
          {feedback && (
            <Card style={{ marginTop: "16px" }} className="fade-in">
              {transcription && <div style={{ background: C.bgSoft, padding: "9px 12px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: C.textMid, fontStyle: "italic", borderLeft: `3px solid ${C.text}` }}>🎙 "{transcription}"</div>}
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line" }}>{feedback.text}</div>
              <div style={{ marginTop: "10px", padding: "10px 12px", background: feedback.score >= 8 ? C.successBg : C.retryBg, borderRadius: "6px", fontSize: "13px", color: feedback.score >= 8 ? C.success : C.retry, fontWeight: "500" }}>
                {feedback.score >= 8 ? "🎉 Great job!" : "Keep practicing — you're improving! 💪"}
              </div>
            </Card>
          )}
        </div>
      )}

      {mode === "ask" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: "16px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>How do I say this in English?</div>
            <div style={{ fontSize: "12px", color: C.textLight }}>Type or speak in Korean — get the English expression!</div>
          </Card>
          <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
            <Input value={koreanText} onChange={e => setKoreanText(e.target.value)} onBlur={() => {}} placeholder="한국어로 입력… (예: 배고파 죽겠어)" style={{ fontSize: "14px" }} />
            <Btn onClick={askByText} disabled={translating || !koreanText.trim()} variant="secondary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>Ask</Btn>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
            <span style={{ fontSize: "11px", color: C.textLight }}>or speak</span>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
          </div>
          <Card style={{ marginBottom: "12px", textAlign: "center" }}>
            {!askRec.isRec && !translating && <Btn onClick={askRec.start} variant="secondary" style={{ fontSize: "13px" }}>🎙 Speak Korean</Btn>}
            {askRec.isRec && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.error }} />
                  <span style={{ color: C.error, fontSize: "13px" }}>Recording… {askRec.time}s</span>
                </div>
                <Btn onClick={askRec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error, fontSize: "13px" }}>⏹ Stop (auto-translate)</Btn>
              </div>
            )}
            {translating && <div style={{ padding: "10px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>Translating…</span></div>}
          </Card>
          {translation && (
            <Card className="fade-in">
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line", marginBottom: englishPhrase ? "14px" : "0" }}>{translation}</div>
              {englishPhrase && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <Btn onClick={() => speak(englishPhrase, false)} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🔊 Listen</Btn>
                  <Btn onClick={() => speak(englishPhrase, true)} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🐢 Slow</Btn>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
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
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", letterSpacing: "-0.5px" }}>WAYVE</div>
            <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase" }}>Teacher Dashboard</div>
          </div>
          <button onClick={() => setScreen("login")} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textLight, padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontFamily: FONT }}>Log out</button>
        </div>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {[["groups", "Groups"], ["add", "Add Phrases"], ["students", "Students"]].map(([t, label]) =>
            React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "10px 16px", background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.text}` : "2px solid transparent", color: tab === t ? C.text : C.textLight, fontSize: "13px", fontWeight: tab === t ? "600" : "400", cursor: "pointer", fontFamily: FONT, whiteSpace: "nowrap", marginBottom: "-1px" } }, label)
          )}
        </div>
      </div>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 16px" }}>
        <Msg text={msg.text} type={msg.type} />
        {tab === "groups" && React.createElement(GroupsTab, { groups, setGroups, students, setStudents, onPreview, showMsg })}
        {tab === "add" && React.createElement(AddPhrasesTab, { groups, phraseBank, setPhraseBank, showMsg })}
        {tab === "students" && React.createElement(StudentsTab, { students, setStudents, groups, setGroups, showMsg })}
      </div>
    </div>
  );
}

// ── Groups Tab ────────────────────────────────────────────────────────────────
function GroupsTab({ groups, setGroups, students, setStudents, onPreview, showMsg }) {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [reassignGroupId, setReassignGroupId] = useState("");

  const addGroup = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const result = await db.insert("groups", { name: newName.trim() });
      const g = Array.isArray(result) ? result[0] : result;
      setGroups(prev => [...prev, g]);
      setNewName(""); showMsg("✓ Group created: " + g.name);
    } catch(e) { showMsg("Error creating group: " + e.message, "error"); }
    setAdding(false);
  };

  const renameGroup = async (groupId, newGroupName) => {
    try {
      await db.update("groups", `id=eq.${groupId}`, { name: newGroupName });
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name: newGroupName } : g));
      showMsg("✓ Group renamed");
    } catch(e) { showMsg("Error renaming group", "error"); }
  };

  const handleDeleteGroup = async (group) => {
    const gs = students.filter(s => s.group_id === group.id);
    if (gs.length > 0) { setDeleteConfirm(group); setReassignGroupId(groups.find(g => g.id !== group.id)?.id || ""); }
    else { await confirmDeleteGroup(group, null); }
  };

  const confirmDeleteGroup = async (group, targetGroupId) => {
    try {
      if (targetGroupId) {
        await db.update("students", `group_id=eq.${group.id}`, { group_id: targetGroupId });
        setStudents(prev => prev.map(s => s.group_id === group.id ? { ...s, group_id: targetGroupId } : s));
      } else {
        await db.delete("students", `group_id=eq.${group.id}`);
        setStudents(prev => prev.filter(s => s.group_id !== group.id));
      }
      await db.delete("session_phrases", `group_id=eq.${group.id}`);
      await db.delete("groups", `id=eq.${group.id}`);
      setGroups(prev => prev.filter(g => g.id !== group.id));
      setDeleteConfirm(null);
      showMsg("✓ Group deleted");
    } catch(e) { showMsg("Error deleting group: " + e.message, "error"); }
  };

  return (
    <div>
      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <Card style={{ maxWidth: "400px", width: "100%" }}>
            <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "10px" }}>Delete "{deleteConfirm.name}"?</div>
            <div style={{ fontSize: "13px", color: C.textMid, marginBottom: "16px" }}>
              This group has {students.filter(s => s.group_id === deleteConfirm.id).length} student(s). What should happen to them?
            </div>
            <div style={{ marginBottom: "12px" }}>
              <div style={{ fontSize: "12px", color: C.textLight, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "1px" }}>Move students to:</div>
              <select value={reassignGroupId} onChange={e => setReassignGroupId(e.target.value)} style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", fontFamily: FONT, outline: "none" }}>
                {groups.filter(g => g.id !== deleteConfirm.id).map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))}
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Btn onClick={() => confirmDeleteGroup(deleteConfirm, reassignGroupId)} variant="primary" style={{ flex: 1 }}>Move &amp; Delete Group</Btn>
              <Btn onClick={() => confirmDeleteGroup(deleteConfirm, null)} variant="danger" style={{ flex: 1 }}>Delete Students Too</Btn>
              <Btn onClick={() => setDeleteConfirm(null)} variant="ghost" style={{ flexShrink: 0 }}>Cancel</Btn>
            </div>
          </Card>
        </div>
      )}

      {groups.length === 0 && <div style={{ textAlign: "center", color: C.textLight, padding: "30px", fontStyle: "italic" }}>No groups yet. Create one below.</div>}

      {groups.map(g => {
        const gs = students.filter(s => s.group_id === g.id);
        return React.createElement(Card, { key: g.id, style: { marginBottom: "12px" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" } },
            React.createElement("div", { style: { fontSize: "15px", fontWeight: "600", flex: 1 } },
              React.createElement(InlineEdit, { value: g.name, onSave: name => renameGroup(g.id, name) })
            ),
            React.createElement("div", { style: { display: "flex", gap: "6px" } },
              React.createElement(Btn, { onClick: () => onPreview(g), variant: "gold", style: { padding: "5px 12px", fontSize: "12px" } }, "👁 Preview"),
              React.createElement(Btn, { onClick: () => handleDeleteGroup(g), variant: "ghost", style: { padding: "5px 10px", fontSize: "12px", color: C.error, borderColor: C.error } }, "Delete")
            )
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: gs.length > 0 ? "12px" : "0" } },
            [["Students", gs.length], ["Avg Streak", gs.length ? Math.round(gs.reduce((a, b) => a + (b.streak || 0), 0) / gs.length) : 0], ["Active Today", gs.filter(s => s.last_practice === new Date().toISOString().split("T")[0]).length]].map(([label, val]) =>
              React.createElement("div", { key: label, style: { background: C.bgSoft, borderRadius: "6px", padding: "10px", textAlign: "center" } },
                React.createElement("div", { style: { fontSize: "18px", fontWeight: "700" } }, val),
                React.createElement("div", { style: { fontSize: "10px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" } }, label)
              )
            )
          ),
          gs.map(s =>
            React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
              React.createElement("span", { style: { color: C.textMid } }, s.name),
              React.createElement("span", { style: { color: C.textLight } }, "🔥 " + (s.streak || 0))
            )
          )
        );
      })}

      <Card>
        <div style={{ fontSize: "12px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>Create New Group</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Input value={newName} onChange={e => setNewName(e.target.value)} onBlur={() => {}} placeholder="e.g. Tuesday Morning Group" />
          <Btn onClick={addGroup} disabled={adding || !newName.trim()} style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{adding ? React.createElement(Spinner) : "Create"}</Btn>
        </div>
      </Card>
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

  useEffect(() => {
    if (!selectedGroup) return;
    setLoadingSP(true);
    db.get("session_phrases", `group_id=eq.${selectedGroup.id}&select=*,phrase_bank(*)&order=session_number.asc,created_at.asc`)
      .then(data => {
        setSessionPhrases(data);
        const nums = [...new Set(data.map(d => d.session_number))];
        if (nums.length > 0) setSessionNum(Math.max(...nums));
      }).catch(() => {}).finally(() => setLoadingSP(false));
  }, [selectedGroup]);

  const sessionNums = [...new Set(sessionPhrases.map(sp => sp.session_number))].sort((a, b) => a - b);

  const bySession = {};
  sessionPhrases.forEach(sp => {
    if (!bySession[sp.session_number]) bySession[sp.session_number] = [];
    bySession[sp.session_number].push(sp);
  });

  const handleEnglishChange = val => {
    setEnglish(val);
    if (val.length > 2) {
      const matches = phraseBank.filter(p => p.english.toLowerCase().includes(val.toLowerCase()));
      setSuggestions(matches.slice(0, 6)); setShowSug(matches.length > 0);
    } else setShowSug(false);
  };

  const selectSuggestion = phrase => {
    const dup = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
    if (dup) { showMsg("Already in Session " + dup.session_number + " of this group", "warn"); setShowSug(false); return; }
    setEnglish(phrase.english); setKorean(phrase.korean || ""); setContext(phrase.context || ""); setShowSug(false);
  };

  const handleEnglishBlur = async () => {
    setShowSug(false);
    if (english.trim().length > 4 && !korean) {
      setAutoFilling(true);
      const filled = await autoFillKorean(english);
      setKorean(filled.ko || ""); setContext(filled.context || "");
      setAutoFilling(false);
    }
  };

  const addPhrase = async () => {
    if (!english.trim()) { showMsg("Please enter an English phrase", "error"); return; }
    if (!selectedGroup) { showMsg("Please select a group", "error"); return; }
    try {
      const existing = await db.get("phrase_bank", `english=eq.${encodeURIComponent(english.trim())}`);
      let phrase;
      if (existing.length > 0) {
        phrase = existing[0];
        if (korean.trim() || context.trim()) {
          await db.update("phrase_bank", `id=eq.${phrase.id}`, { korean: korean.trim() || phrase.korean, context: context.trim() || phrase.context });
          phrase = { ...phrase, korean: korean.trim() || phrase.korean, context: context.trim() || phrase.context };
        }
      } else {
        const r = await db.insert("phrase_bank", { english: english.trim(), korean: korean.trim(), context: context.trim() });
        phrase = Array.isArray(r) ? r[0] : r;
      }
      const dup = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
      if (dup) { showMsg("Already in Session " + dup.session_number + " of this group", "warn"); return; }
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
      if (existing.length > 0) { phrase = existing[0]; }
      else { const r = await db.insert("phrase_bank", { english: p.english, korean: p.korean, context: p.context }); phrase = Array.isArray(r) ? r[0] : r; }
      const dup = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
      if (dup) { showMsg("Already in Session " + dup.session_number + ": " + p.english, "warn"); return; }
      const spR = await db.insert("session_phrases", { group_id: selectedGroup.id, phrase_id: phrase.id, session_number: sessionNum });
      const sp = Array.isArray(spR) ? spR[0] : spR;
      setSessionPhrases(prev => [...prev, { ...sp, phrase_bank: phrase }]);
      setPhraseBank(prev => [phrase, ...prev.filter(x => x.id !== phrase.id)]);
      showMsg("✓ Added: " + p.english);
    } catch(e) { showMsg("Error adding phrase: " + e.message, "error"); }
  };

  const deleteSessionPhrase = async spId => {
    try { await db.delete("session_phrases", `id=eq.${spId}`); setSessionPhrases(prev => prev.filter(sp => sp.id !== spId)); showMsg("Phrase removed"); }
    catch(e) { showMsg("Error removing phrase", "error"); }
  };

  return (
    <div>
      {/* Group selector */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
        {groups.map(g => React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "6px 14px", borderRadius: "20px", border: `1px solid ${selectedGroup?.id === g.id ? C.text : C.border}`, background: selectedGroup?.id === g.id ? C.text : C.bg, color: selectedGroup?.id === g.id ? "#fff" : C.textMid, fontSize: "13px", fontWeight: selectedGroup?.id === g.id ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, g.name))}
      </div>

      {/* Session number */}
      <Card style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "8px" }}>Session Number</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: sessionNums.length > 0 ? "10px" : "0" }}>
          <input type="number" min="1" value={sessionNum} onChange={e => setSessionNum(Math.max(1, parseInt(e.target.value) || 1))} style={{ width: "72px", padding: "8px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "16px", fontWeight: "700", textAlign: "center", fontFamily: FONT, outline: "none" }} />
          <span style={{ fontSize: "12px", color: C.textLight }}>or click an existing session:</span>
        </div>
        {sessionNums.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {sessionNums.map(n => React.createElement("button", { key: n, onClick: () => setSessionNum(n), style: { padding: "4px 12px", borderRadius: "16px", border: `1px solid ${sessionNum === n ? C.gold : C.border}`, background: sessionNum === n ? C.goldBg : C.bg, color: sessionNum === n ? C.gold : C.textMid, fontSize: "12px", fontWeight: sessionNum === n ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, "Session " + n))}
          </div>
        )}
      </Card>

      {/* AI Generate */}
      <Card style={{ marginBottom: "14px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: C.gold, marginBottom: "10px" }}>✨ AI Generate Phrases</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <Input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} onBlur={() => {}} placeholder="Topic (e.g. ordering coffee, making friends)" />
          <Btn onClick={async () => { setGenerating(true); setGenerated([]); try { setGenerated(await generateAIPhrases(generateTopic)); } catch(e) { showMsg("Error: " + e.message, "error"); } setGenerating(false); }} disabled={generating || !generateTopic.trim()} variant="secondary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{generating ? React.createElement(Spinner) : "Generate"}</Btn>
        </div>
        {generated.length > 0 && (
          <div>
            {generated.map((p, i) => React.createElement("div", { key: i, style: { padding: "8px 0", borderBottom: `1px solid ${C.bgSoft}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" } },
              React.createElement("div", { style: { flex: 1 } },
                React.createElement("div", { style: { fontSize: "13px", color: C.text, fontStyle: "italic" } }, p.english),
                React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, p.korean),
                p.context && React.createElement("div", { style: { fontSize: "11px", color: C.gold, marginTop: "2px" } }, p.context)
              ),
              React.createElement(Btn, { onClick: () => addGeneratedPhrase(p), variant: "secondary", style: { fontSize: "11px", padding: "5px 10px", flexShrink: 0 } }, "+ Add")
            ))}
            <Btn onClick={async () => { for (const p of generated) await addGeneratedPhrase(p); setGenerated([]); showMsg("✓ All phrases added to Session " + sessionNum); }} style={{ width: "100%", marginTop: "10px" }}>+ Add All to Session {sessionNum}</Btn>
          </div>
        )}
      </Card>

      {/* Manual add */}
      <Card style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>➕ Add Manually</div>
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <Input value={english} onChange={e => handleEnglishChange(e.target.value)} onBlur={handleEnglishBlur} placeholder="English phrase (Korean auto-fills on blur)" />
          {showSug && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: "0 0 6px 6px", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              {suggestions.map(p => React.createElement("div", { key: p.id, onMouseDown: () => selectSuggestion(p), style: { padding: "9px 12px", cursor: "pointer", borderBottom: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
                React.createElement("div", { style: { color: C.text, fontStyle: "italic" } }, p.english),
                React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, p.korean)
              ))}
            </div>
          )}
        </div>
        {autoFilling && <div style={{ fontSize: "11px", color: C.gold, marginBottom: "6px" }}>✨ Auto-filling Korean…</div>}
        <div style={{ marginBottom: "8px" }}><Input value={korean} onChange={e => setKorean(e.target.value)} onBlur={() => {}} placeholder="Korean translation (auto-filled)" /></div>
        <div style={{ marginBottom: "12px" }}><Input value={context} onChange={e => setContext(e.target.value)} onBlur={() => {}} placeholder="Context in Korean — when to use this" /></div>
        <Btn onClick={addPhrase} style={{ width: "100%" }}>Add to {selectedGroup?.name} — Session {sessionNum}</Btn>
      </Card>

      {/* Sessions view */}
      {loadingSP ? React.createElement("div", { style: { textAlign: "center", padding: "20px" } }, React.createElement(Spinner))
        : sessionNums.length > 0 && (
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "1px", textTransform: "uppercase", color: C.textLight, marginBottom: "10px" }}>{selectedGroup?.name} — All Sessions</div>
            {sessionNums.map(n =>
              React.createElement(Card, { key: n, style: { marginBottom: "10px" } },
                React.createElement("div", { style: { fontSize: "13px", fontWeight: "600", color: C.textMid, marginBottom: "8px" } }, "Session " + n + " (" + bySession[n].length + " phrases)"),
                bySession[n].map(sp => React.createElement("div", { key: sp.id, style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderTop: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
                  React.createElement("div", null,
                    React.createElement("div", { style: { color: C.text, fontStyle: "italic" } }, sp.phrase_bank?.english),
                    sp.phrase_bank?.korean && React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, sp.phrase_bank.korean),
                    sp.phrase_bank?.context && React.createElement("div", { style: { fontSize: "11px", color: C.gold } }, sp.phrase_bank.context)
                  ),
                  React.createElement("button", { onClick: () => deleteSessionPhrase(sp.id), style: { background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "18px", padding: "0 4px", flexShrink: 0 } }, "×")
                ))
              )
            )}
          </div>
        )}
    </div>
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
    if (students.find(s => s.name.toLowerCase() === newName.trim().toLowerCase())) { showMsg("A student with this name already exists", "error"); return; }
    try {
      const r = await db.insert("students", { name: newName.trim(), group_id: newGroupId, streak: 0, longest_streak: 0 });
      const s = Array.isArray(r) ? r[0] : r;
      setStudents(prev => [...prev, s]);
      setNewName(""); showMsg("✓ " + s.name + " registered!");
    } catch(e) { showMsg("Error registering student: " + e.message, "error"); }
  };

  const updateStudentGroup = async (studentId, groupId) => {
    try {
      await db.update("students", `id=eq.${studentId}`, { group_id: groupId });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, group_id: groupId } : s));
      showMsg("✓ Group updated — all history retained");
    } catch(e) { showMsg("Error updating group", "error"); }
  };

  const renameStudent = async (studentId, newStudentName) => {
    try {
      await db.update("students", `id=eq.${studentId}`, { name: newStudentName });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, name: newStudentName } : s));
      showMsg("✓ Name updated");
    } catch(e) { showMsg("Error updating name", "error"); }
  };

  const deleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Delete ${studentName}? This cannot be undone.`)) return;
    try {
      await db.delete("student_progress", `student_id=eq.${studentId}`);
      await db.delete("students", `id=eq.${studentId}`);
      setStudents(prev => prev.filter(s => s.id !== studentId));
      showMsg("✓ Student removed");
    } catch(e) { showMsg("Error deleting student: " + e.message, "error"); }
  };

  // Group students by group
  const byGroup = {};
  localGroups.forEach(g => { byGroup[g.id] = []; });
  students.forEach(s => { if (byGroup[s.group_id]) byGroup[s.group_id].push(s); else byGroup["unassigned"] = [...(byGroup["unassigned"] || []), s]; });

  return (
    <div>
      <Card style={{ marginBottom: "20px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>+ Register New Student</div>
        <Input value={newName} onChange={e => setNewName(e.target.value)} onBlur={() => {}} placeholder="Student name" style={{ marginBottom: "8px" }} />
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
        return React.createElement(Card, { key: g.id, style: { marginBottom: "12px" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: gs.length > 0 ? "10px" : "0" } },
            React.createElement("div", { style: { fontSize: "14px", fontWeight: "600" } }, g.name),
            React.createElement("span", { style: { fontSize: "12px", color: C.textLight } }, gs.length + " students")
          ),
          gs.length === 0
            ? React.createElement("div", { style: { fontSize: "12px", color: C.textLight, fontStyle: "italic" } }, "No students yet")
            : gs.map(s => React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderTop: `1px solid ${C.bgSoft}`, gap: "8px" } },
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: "13px", fontWeight: "500" } },
                  React.createElement(InlineEdit, { value: s.name, onSave: name => renameStudent(s.id, name) })
                ),
                React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, "🔥 " + (s.streak || 0) + " streak")
              ),
              React.createElement("select", { value: s.group_id || "", onChange: e => updateStudentGroup(s.id, e.target.value), style: { padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "12px", background: C.bg, color: C.text, fontFamily: FONT, outline: "none", maxWidth: "160px" } },
                localGroups.map(grp => React.createElement("option", { key: grp.id, value: grp.id }, grp.name))
              ),
              React.createElement("button", { onClick: () => deleteStudent(s.id, s.name), style: { background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "16px", padding: "0 4px", flexShrink: 0 }, title: "Remove student" }, "×")
            ))
        );
      })}
    </div>
  );
}
