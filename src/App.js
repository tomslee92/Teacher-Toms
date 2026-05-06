import React, { useState, useEffect, useRef, useCallback } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://ulpnmewvejvpancvqnrp.supabase.co";
const SUPABASE_KEY = "sb_publishable_sDP-kuCv5E2LmpDMPp8Y4A_n1ryWhNO";
const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": opts.prefer || "return=representation",
      ...opts.headers
    },
    ...opts
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const db = {
  get: (table, query = "") => sb(`${table}?${query}`),
  insert: (table, data) => sb(table, { method: "POST", body: JSON.stringify(data) }),
  update: (table, query, data) => sb(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(data) }),
  upsert: (table, data) => sb(table, { method: "POST", body: JSON.stringify(data), prefer: "return=representation", headers: { "Prefer": "resolution=merge-duplicates,return=representation" } }),
  delete: (table, query) => sb(`${table}?${query}`, { method: "DELETE", headers: { "Prefer": "return=representation" } }),
};

// ── Design System (Inter + Wayve brand) ──────────────────────────────────────
const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const C = {
  bg: "#FFFFFF",
  bgSoft: "#F5F5F5",
  bgMid: "#EEEEEE",
  text: "#111111",
  textMid: "#555555",
  textLight: "#999999",
  border: "#E5E5E5",
  borderDark: "#CCCCCC",
  accent: "#111111",
  gold: "#B8973A",
  goldBg: "#FBF6E9",
  success: "#1A7A45",
  successBg: "#EBF7F0",
  error: "#C0392B",
  errorBg: "#FCECEA",
  retry: "#E67E22",
  retryBg: "#FEF5EC",
};

// ── Inter Font ────────────────────────────────────────────────────────────────
const InterFont = () => React.createElement("style", null, `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${FONT}; background: ${C.bg}; color: ${C.text}; }
  input, button, select, textarea { font-family: ${FONT}; }
  button { cursor: pointer; }
  audio { width: 100%; height: 32px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.2s ease; }
`);

// ── Helpers ───────────────────────────────────────────────────────────────────
const cleanText = (text) => {
  if (!text) return text;
  return text.split("").filter(c => {
    const code = c.charCodeAt(0);
    const isKorean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F);
    const isLatin = code >= 0x0020 && code <= 0x007E;
    const isEmoji = (code >= 0x1F300 && code <= 0x1FAFF) || (code >= 0x2600 && code <= 0x27BF);
    return isKorean || isLatin || isEmoji || c === "\n";
  }).join("");
};

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

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(text, rate = 1) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = rate; u.pitch = 1.05;
  const go = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = ["Samantha", "Karen", "Moira", "Tessa", "Allison", "Ava"];
    let v = null;
    for (const name of preferred) { v = voices.find(x => x.name.includes(name) && x.lang.startsWith("en")); if (v) break; }
    if (!v) v = voices.find(x => x.lang === "en-US" && x.localService);
    if (!v) v = voices.find(x => x.lang === "en-US");
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length === 0) { window.speechSynthesis.onvoiceschanged = go; } else { go(); }
}

// ── Groq API ──────────────────────────────────────────────────────────────────
const SYSTEM = `You are Tom, a warm English coach for Korean learners at Wayve.
STRICT RULE: Write ONLY Korean hangul (가-힣) and English (a-z A-Z). 
NEVER use Chinese characters (練習努力繼續 etc), Japanese kana, or any other script.
For motivation lines, ONLY use pure Korean hangul like: 잘하고 있어요! 화이팅! 계속 연습해요! 정말 잘했어요!`;

async function groq(prompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 700, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: prompt }] })
  });
  const d = await res.json();
  return cleanText(d.choices[0].message.content);
}

async function transcribe(blob) {
  const fd = new FormData();
  fd.append("file", blob, "rec.webm");
  fd.append("model", "whisper-large-v3");
  fd.append("response_format", "text");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { "Authorization": `Bearer ${GROQ_KEY}` }, body: fd });
  return (await res.text()).trim();
}

async function getPhraseFeedback(said, phrase) {
  const text = await groq(`Target phrase: "${phrase.english}"
Student said: "${said}"

Respond in Korean hangul and English ONLY. Be warm and encouraging.

🎯 점수: X/10
[Korean explanation of the score]

✅ 잘한 점
[Korean sentence about what they did well]

📝 문법 피드백
[Korean explanation of what was wrong, if anything]
❌ ${said}
✅ [Corrected English version]
📌 [Korean explanation of WHY it is wrong — e.g. 과거형을 써야 해요 because you are talking about the past]

💡 이렇게도 말할 수 있어요
→ [Alternative natural English phrasing]

💪 [ONE short motivating sentence in PURE Korean hangul only — absolutely no Chinese characters]

Rules:
- If grammar was perfect, skip the 문법 피드백 section and write 완벽해요! instead
- Keep total response under 150 words
- KOREAN HANGUL and ENGLISH only — no Chinese, no Japanese`);
  const match = text.match(/점수.*?(\d+)\/10/);
  return { text, score: match ? parseInt(match[1]) : 7 };
}

async function getFreeTalkFeedback(said) {
  const text = await groq(`Student said in English (free practice): "${said}"

Give grammar feedback in Korean hangul and English ONLY.

🎯 점수: X/10
[Korean explanation]

✅ 잘한 점
[Korean encouragement]

📝 문법 피드백
[Korean explanation of issues]
❌ ${said}
✅ [Corrected English]
📌 [Korean explanation of WHY — grammar rule in plain Korean]

💡 이렇게도 말할 수 있어요
→ [More natural English version]

💪 [ONE short motivating sentence — PURE Korean hangul only, no Chinese characters]

- If perfect grammar, skip 문법 피드백, write 완벽해요! instead
- Under 150 words
- KOREAN HANGUL and ENGLISH only`);
  const match = text.match(/점수.*?(\d+)\/10/);
  return { text, score: match ? parseInt(match[1]) : 7 };
}

async function getKoreanTranslation(input) {
  return await groq(`Korean learner wants to know how to say this in English: "${input}"

Korean hangul and English ONLY. No Chinese characters.

🇰🇷 한국어 표현
${input}

🗣 영어로는 이렇게 말해요!
[The English translation — clear and natural]

📌 예문
1. "[English example]"
→ [Korean hangul translation]

2. "[English example]"  
→ [Korean hangul translation]

💡 사용 팁
[One short Korean hangul tip about when to use this]

💪 [ONE encouraging sentence — PURE Korean hangul only, no Chinese characters]

Under 130 words.`);
}

async function autoFillKorean(english) {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 200, messages: [{ role: "user", content: `For this English phrase: "${english}"\nReturn ONLY valid JSON, no extra text:\n{"ko": "Korean hangul translation", "context": "Korean hangul explanation of when to use this"}` }] })
    });
    const d = await res.json();
    const text = d.choices[0].message.content.replace(/```json|```/g, "").trim();
    const start = text.indexOf("{"); const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1) return JSON.parse(text.slice(start, end + 1));
  } catch(e) {}
  return { ko: "", context: "" };
}

async function generateAIPhrases(topic) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 700, messages: [{ role: "user", content: `Generate 5 English phrases for Korean learners about: "${topic}".\nReturn ONLY valid JSON array:\n[{"english":"...","korean":"Korean hangul translation","context":"Korean hangul explanation of when to use"}]` }] })
  });
  const d = await res.json();
  const text = d.choices[0].message.content.replace(/```json|```/g, "").trim();
  const start = text.indexOf("["); const end = text.lastIndexOf("]");
  return JSON.parse(text.slice(start, end + 1));
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
    } catch(e) { alert("마이크 접근이 필요합니다."); }
  };
  const stop = () => { mediaRef.current?.stop(); setIsRec(false); clearInterval(timerRef.current); };
  const reset = () => { setBlob(null); };
  return { isRec, blob, time, start, stop, reset };
}

// ── Shared UI Components ──────────────────────────────────────────────────────
const Btn = ({ onClick, children, variant = "primary", disabled, style = {} }) => {
  const base = { padding: "10px 20px", border: "none", borderRadius: "6px", fontSize: "14px", fontWeight: "500", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "opacity 0.15s", fontFamily: FONT, ...style };
  const variants = {
    primary: { background: C.text, color: "#fff" },
    secondary: { background: C.bgSoft, color: C.text, border: `1px solid ${C.border}` },
    gold: { background: C.gold, color: "#fff" },
    danger: { background: C.error, color: "#fff" },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
    success: { background: C.success, color: "#fff" },
  };
  return React.createElement("button", { onClick, disabled, style: { ...base, ...variants[variant] } }, children);
};

const Input = ({ value, onChange, onBlur, placeholder, type = "text", style = {} }) =>
  React.createElement("input", { value, onChange, onBlur, placeholder, type, style: { width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", outline: "none", background: C.bg, color: C.text, fontFamily: FONT, ...style } });

const Card = ({ children, style = {} }) =>
  React.createElement("div", { style: { background: C.bg, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "20px", ...style } }, children);

const Spinner = () => React.createElement("div", { style: { width: "18px", height: "18px", border: `2px solid ${C.border}`, borderTop: `2px solid ${C.text}`, borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" } });

const Tag = ({ children, color = C.text, bg = C.bgSoft }) =>
  React.createElement("span", { style: { display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "500", color, background: bg, letterSpacing: "0.3px" } }, children);

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [user, setUser] = useState(null);
  const [preview, setPreview] = useState(null);
  const [groups, setGroups] = useState([]);
  const [levelUp] = useState(null);

  useEffect(() => {
    db.get("groups", "order=created_at.asc").then(setGroups).catch(() => {});
  }, []);

  const handleLogin = async (name) => {
    try {
      const rows = await db.get("students", `name=eq.${encodeURIComponent(name)}&select=*,groups(name)`);
      if (rows.length === 0) return "이름을 찾을 수 없어요. Teacher Toms에게 등록을 요청해 주세요.";
      setUser(rows[0]); setScreen("student"); return null;
    } catch(e) { return "오류가 발생했어요. 다시 시도해 주세요."; }
  };

  const handleTeacher = (pass) => {
    if (pass === "wayve2024") { setScreen("teacher"); return null; }
    return "Wrong password";
  };

  if (screen === "login") return React.createElement(React.Fragment, null, React.createElement(InterFont), React.createElement(LoginScreen, { onLogin: handleLogin, onTeacher: handleTeacher }));
  if (screen === "teacher") return React.createElement(React.Fragment, null, React.createElement(InterFont), React.createElement(TeacherScreen, { groups, setGroups, setScreen, onPreview: (g) => { setPreview(g); setScreen("preview"); } }));
  if (screen === "preview") return React.createElement(React.Fragment, null, React.createElement(InterFont), React.createElement(StudentScreen, { user: { id: "preview", name: "Preview", group_id: preview.id, streak: 3, longest_streak: 7 }, group: preview, isPreview: true, onBack: () => setScreen("teacher") }));
  if (screen === "student") return React.createElement(React.Fragment, null, React.createElement(InterFont), React.createElement(StudentScreen, { user, group: groups.find(g => g.id === user.group_id), isPreview: false, onBack: () => setScreen("login") }));
  return null;
}

// ── Login Screen ──────────────────────────────────────────────────────────────
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

  const handleTeacher = () => {
    const err = onTeacher(pass);
    if (err) setError(err);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "380px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "36px", fontWeight: "700", letterSpacing: "-1px", color: C.text, marginBottom: "6px" }}>WAYVE</div>
          <div style={{ fontSize: "13px", color: C.textLight, letterSpacing: "2px", textTransform: "uppercase" }}>English Confidence</div>
        </div>

        <div style={{ display: "flex", borderBottom: `2px solid ${C.border}`, marginBottom: "28px" }}>
          {[["student", "Student"], ["teacher", "Teacher"]].map(([m, label]) =>
            React.createElement("button", { key: m, onClick: () => { setMode(m); setError(""); }, style: { flex: 1, padding: "10px", background: "transparent", border: "none", borderBottom: mode === m ? `2px solid ${C.text}` : "2px solid transparent", color: mode === m ? C.text : C.textLight, fontSize: "14px", fontWeight: mode === m ? "600" : "400", cursor: "pointer", marginBottom: "-2px", fontFamily: FONT } }, label)
          )}
        </div>

        {mode === "student" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>이름 입력</div>
            <Input value={name} onChange={e => setName(e.target.value)} onBlur={() => {}} placeholder="Your name" style={{ marginBottom: "16px", fontSize: "16px", padding: "12px 14px" }} />
            {error && <div style={{ color: C.error, fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
            <Btn onClick={handleStudent} disabled={loading || !name.trim()} style={{ width: "100%", padding: "13px" }}>
              {loading ? React.createElement(Spinner) : "입장하기 →"}
            </Btn>
          </div>
        )}

        {mode === "teacher" && (
          <div>
            <div style={{ fontSize: "12px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "8px" }}>Password</div>
            <Input type="password" value={pass} onChange={e => setPass(e.target.value)} onBlur={() => {}} placeholder="Teacher password" style={{ marginBottom: "16px", fontSize: "16px", padding: "12px 14px" }} />
            {error && <div style={{ color: C.error, fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
            <Btn onClick={handleTeacher} variant="gold" style={{ width: "100%", padding: "13px" }}>Teacher Dashboard →</Btn>
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
  const [longestStreak, setLongestStreak] = useState(user.longest_streak || 0);

  const updateStreak = async () => {
    if (isPreview) return;
    const today = new Date().toISOString().split("T")[0];
    if (user.last_practice === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const newStreak = user.last_practice === yesterday ? streak + 1 : 1;
    const newLongest = Math.max(newStreak, longestStreak);
    setStreak(newStreak); setLongestStreak(newLongest);
    await db.update("students", `id=eq.${user.id}`, { streak: newStreak, longest_streak: newLongest, last_practice: today });
    user.last_practice = today;
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      {/* Header */}
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 10 }}>
        {isPreview && (
          <div style={{ background: C.gold, color: "#fff", padding: "6px 16px", margin: "0 -20px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", fontWeight: "500" }}>
            <span>👁 Preview — {group?.name}</span>
            <button onClick={onBack} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.5)", color: "#fff", padding: "3px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontFamily: FONT }}>← Dashboard</button>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "26px", fontWeight: "700", color: streak > 0 ? "#E07B39" : C.textLight, lineHeight: 1 }}>🔥 {streak}</div>
                <div style={{ fontSize: "9px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" }}>연속</div>
              </div>
              {longestStreak > 0 && (
                <div style={{ textAlign: "center", paddingLeft: "12px", borderLeft: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: "18px", fontWeight: "600", color: C.gold, lineHeight: 1 }}>🏅 {longestStreak}</div>
                  <div style={{ fontSize: "9px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" }}>최고</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: "15px", fontWeight: "600", color: C.text }}>Hi, {user.name}! 👋</div>
              <div style={{ fontSize: "11px", color: C.textLight }}>{group?.name || ""}</div>
            </div>
          </div>
          <button onClick={onBack} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textLight, padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontFamily: FONT }}>나가기</button>
        </div>
        {/* Tabs */}
        <div style={{ display: "flex", marginTop: "2px" }}>
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
  const [showRandom, setShowRandom] = useState(false);

  const loadData = useCallback(async () => {
    if (!group) return;
    setLoading(true);
    try {
      // Load session phrases for this group
      const sp = await db.get("session_phrases", `group_id=eq.${group.id}&select=*,phrase_bank(*)&order=session_number.asc,created_at.asc`);
      // Group by session number
      const bySession = {};
      sp.forEach(row => {
        const s = row.session_number;
        if (!bySession[s]) bySession[s] = [];
        bySession[s].push({ ...row.phrase_bank, session_phrase_id: row.id });
      });
      setSessions(bySession);
      const nums = Object.keys(bySession).map(Number).sort((a, b) => b - a);
      if (nums.length > 0) setActiveSession(nums[0]);

      // Load student progress
      if (!isPreview) {
        const prog = await db.get("student_progress", `student_id=eq.${user.id}`);
        const progMap = {};
        prog.forEach(p => { progMap[p.phrase_id] = p; });
        setProgress(progMap);
      }
    } catch(e) {}
    setLoading(false);
  }, [group, user, isPreview]);

  useEffect(() => { loadData(); }, [loadData]);

  const pickRandom = () => {
    const allPhrases = Object.values(sessions).flat();
    if (allPhrases.length === 0) return;
    // Prefer unpassed phrases
    const unpassed = allPhrases.filter(p => !progress[p.id]?.passed);
    const pool = unpassed.length > 0 ? unpassed : allPhrases;
    const phrase = pool[Math.floor(Math.random() * pool.length)];
    setRandomPhrase(phrase);
    setShowRandom(true);
  };

  if (loading) return React.createElement("div", { style: { textAlign: "center", padding: "60px", color: C.textLight } }, React.createElement(Spinner));

  const sessionNums = Object.keys(sessions).map(Number).sort((a, b) => b - a);

  if (sessionNums.length === 0) return (
    React.createElement("div", { style: { textAlign: "center", padding: "60px 20px" } },
      React.createElement("div", { style: { fontSize: "40px", marginBottom: "16px" } }, "📭"),
      React.createElement("div", { style: { fontSize: "16px", color: C.textMid } }, "아직 배정된 문장이 없어요."),
      React.createElement("div", { style: { fontSize: "13px", color: C.textLight, marginTop: "8px" } }, "수업 후 선생님이 이번 주 문장을 추가해 드릴게요!")
    )
  );

  const currentPhrases = sessions[activeSession] || [];
  // Put retry phrases first
  const retryPhrases = currentPhrases.filter(p => progress[p.id]?.needs_retry);
  const otherPhrases = currentPhrases.filter(p => !progress[p.id]?.needs_retry);
  const orderedPhrases = [...retryPhrases, ...otherPhrases];

  return (
    <div>
      {/* Random phrase button */}
      <div style={{ marginBottom: "20px" }}>
        <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600", color: C.text }}>🎲 Random Practice</div>
            <div style={{ fontSize: "12px", color: C.textLight, marginTop: "2px" }}>모든 세션에서 랜덤 문장 연습</div>
          </div>
          <Btn onClick={pickRandom} variant="secondary">연습하기</Btn>
        </Card>
      </div>

      {/* Random phrase modal */}
      {showRandom && randomPhrase && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: C.bg, borderRadius: "12px", padding: "24px", maxWidth: "500px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: C.textMid }}>🎲 Random Phrase</div>
              <button onClick={() => { setShowRandom(false); setRandomPhrase(null); }} style={{ background: "transparent", border: "none", color: C.textLight, fontSize: "20px", cursor: "pointer" }}>×</button>
            </div>
            <PhraseCard phrase={randomPhrase} user={user} progress={progress} isPreview={isPreview} onProgressUpdate={(phraseId, prog) => setProgress(p => ({ ...p, [phraseId]: prog }))} onPracticed={onPracticed} />
          </div>
        </div>
      )}

      {/* Session tabs */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {sessionNums.map(n =>
          React.createElement("button", { key: n, onClick: () => setActiveSession(n), style: { padding: "6px 14px", borderRadius: "20px", border: `1px solid ${activeSession === n ? C.text : C.border}`, background: activeSession === n ? C.text : C.bg, color: activeSession === n ? "#fff" : C.textMid, fontSize: "13px", fontWeight: activeSession === n ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, `Session ${n}`)
        )}
      </div>

      {/* Phrases */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {orderedPhrases.map(phrase => {
          const prog = progress[phrase.id];
          const passed = prog?.passed;
          const needsRetry = prog?.needs_retry;
          const tried = prog?.attempts > 0;
          return React.createElement(ExpandablePhraseRow, { key: phrase.id, phrase, passed, needsRetry, tried, user, progress: prog, isPreview, onProgressUpdate: (id, p) => setProgress(prev => ({ ...prev, [id]: p })), onPracticed: onPracticed });
        })}
      </div>
    </div>
  );
}

// ── Expandable Phrase Row ─────────────────────────────────────────────────────
function ExpandablePhraseRow({ phrase, passed, needsRetry, tried, user, progress, isPreview, onProgressUpdate, onPracticed }) {
  const [open, setOpen] = useState(false);

  let rowBg = C.bg;
  let rowBorder = C.border;
  let statusIcon = null;
  if (passed) { rowBg = C.successBg; rowBorder = "#A8D5B5"; statusIcon = "✅"; }
  else if (needsRetry) { rowBg = C.retryBg; rowBorder = "#F0C090"; statusIcon = "🔄"; }
  else if (tried) { rowBg = C.errorBg; rowBorder = "#F0A8A5"; statusIcon = "❌"; }

  return (
    <div style={{ borderRadius: "8px", border: `1px solid ${rowBorder}`, background: rowBg, overflow: "hidden", transition: "box-shadow 0.15s" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "15px", color: C.text, fontStyle: "italic", marginBottom: "3px" }}>"{phrase.english}"</div>
          {phrase.korean && <div style={{ fontSize: "12px", color: C.textMid }}>{phrase.korean}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {statusIcon && <span style={{ fontSize: "16px" }}>{statusIcon}</span>}
          {progress?.best_score > 0 && <Tag color={C.textMid} bg={C.bgMid}>{progress.best_score}/10</Tag>}
          <span style={{ color: C.textLight, fontSize: "18px", lineHeight: 1, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>⌄</span>
        </div>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${rowBorder}`, padding: "16px" }} className="fade-in">
          <PhraseCard phrase={phrase} user={user} progress={progress} isPreview={isPreview} onProgressUpdate={onProgressUpdate} onPracticed={onPracticed} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

// ── Phrase Card (recording + feedback) ───────────────────────────────────────
function PhraseCard({ phrase, user, progress, isPreview, onProgressUpdate, onPracticed, onClose }) {
  const [feedback, setFeedback] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStop = async (blob) => {
    if (isPreview) return;
    setLoading(true); setFeedback(null); setTranscription(null);
    try {
      const said = await transcribe(blob);
      setTranscription(said);
      const { text, score } = await getPhraseFeedback(said, phrase);
      setFeedback({ text, score });
      await onPracticed();
      const passed = score >= 8;
      const newProg = {
        student_id: user.id, phrase_id: phrase.id,
        passed: passed || progress?.passed || false,
        attempts: (progress?.attempts || 0) + 1,
        best_score: Math.max(score, progress?.best_score || 0),
        needs_retry: !passed,
        updated_at: new Date().toISOString()
      };
      await db.upsert("student_progress", newProg);
      onProgressUpdate(phrase.id, newProg);
    } catch(e) { setFeedback({ error: "피드백을 불러올 수 없어요. 다시 시도해 주세요!" }); }
    setLoading(false);
  };

  const rec = useRecorder(handleStop);

  return (
    <div>
      {phrase.context && (
        <div style={{ background: C.goldBg, borderLeft: `3px solid ${C.gold}`, padding: "8px 12px", borderRadius: "0 4px 4px 0", marginBottom: "16px", fontSize: "13px", color: C.textMid }}>
          {phrase.context}
        </div>
      )}

      <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "16px", flexWrap: "wrap" }}>
        <Btn onClick={() => speak(phrase.english, 1)} variant="secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>🔊 듣기</Btn>
        <Btn onClick={() => speak(phrase.english, 0.65)} variant="secondary" style={{ padding: "8px 16px", fontSize: "13px" }}>🐢 천천히</Btn>
      </div>

      <div style={{ textAlign: "center", marginBottom: "16px" }}>
        {!rec.isRec && !loading && (
          <Btn onClick={rec.start} style={{ padding: "12px 32px", fontSize: "15px" }}>🎙 녹음 시작</Btn>
        )}
        {rec.isRec && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.error }} />
              <span style={{ color: C.error, fontSize: "14px", fontWeight: "500" }}>녹음 중… {rec.time}초</span>
            </div>
            <Btn onClick={rec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error }}>⏹ 멈추기 (자동 분석)</Btn>
          </div>
        )}
        {loading && <div style={{ padding: "16px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>분석 중…</span></div>}
      </div>

      {feedback && !feedback.error && (
        <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: `1px solid ${C.border}` }} className="fade-in">
          {transcription && (
            <div style={{ background: C.bgSoft, padding: "10px 12px", borderRadius: "6px", marginBottom: "14px", fontSize: "13px", color: C.textMid, borderLeft: `3px solid ${C.text}` }}>
              🎙 {highlightMissed(phrase.english, transcription)}
            </div>
          )}
          <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line" }}>{feedback.text}</div>
          {feedback.score >= 8 ? (
            <div style={{ marginTop: "14px" }}>
              <div style={{ padding: "10px 14px", background: C.successBg, border: `1px solid #A8D5B5`, borderRadius: "6px", fontSize: "13px", color: C.success, fontWeight: "500", marginBottom: "10px" }}>🎉 잘했어요! 8점 이상 달성!</div>
              {onClose && <Btn onClick={onClose} variant="secondary" style={{ width: "100%" }}>닫기</Btn>}
            </div>
          ) : (
            <div style={{ marginTop: "14px", padding: "12px 14px", background: C.retryBg, border: `1px solid #F0C090`, borderRadius: "6px" }}>
              <div style={{ fontSize: "13px", color: C.retry, fontWeight: "500", marginBottom: "8px" }}>8점 이상이 될 때까지 계속 연습해 보세요! 💪</div>
              <Btn onClick={() => { rec.reset(); setFeedback(null); setTranscription(null); }} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🔄 다시 시도</Btn>
            </div>
          )}
        </div>
      )}
      {feedback?.error && <div style={{ color: C.error, textAlign: "center", marginTop: "12px", fontSize: "13px" }}>{feedback.error}</div>}
    </div>
  );
}

// ── Free Talk Tab ─────────────────────────────────────────────────────────────
function FreeTalkTab({ user, isPreview, onPracticed }) {
  const [mode, setMode] = useState("speak");
  const [feedback, setFeedback] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(false);
  const [koreanText, setKoreanText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [translating, setTranslating] = useState(false);
  const [translationEnglish, setTranslationEnglish] = useState("");

  const handleSpeakStop = async (blob) => {
    if (isPreview) return;
    setLoading(true); setFeedback(null); setTranscription(null);
    try {
      const said = await transcribe(blob);
      setTranscription(said);
      const { text, score } = await getFreeTalkFeedback(said);
      setFeedback({ text, score });
      if (score >= 8) await onPracticed();
    } catch(e) { setFeedback({ error: "피드백을 불러올 수 없어요." }); }
    setLoading(false);
  };

  const handleAskStop = async (blob) => {
    setTranslating(true); setTranslation(null);
    try {
      const said = await transcribe(blob);
      setKoreanText(said);
      const result = await getKoreanTranslation(said);
      setTranslation(result);
      // Extract English for TTS
      const match = result.match(/영어로는 이렇게 말해요!\s*\n([^\n]+)/);
      if (match) setTranslationEnglish(match[1].trim());
    } catch(e) { setTranslation("번역을 불러올 수 없어요."); }
    setTranslating(false);
  };

  const askRec = useRecorder(handleAskStop);
  const speakRec = useRecorder(handleSpeakStop);

  const askByText = async () => {
    if (!koreanText.trim()) return;
    setTranslating(true); setTranslation(null); setTranslationEnglish("");
    try {
      const result = await getKoreanTranslation(koreanText);
      setTranslation(result);
      const match = result.match(/영어로는 이렇게 말해요!\s*\n([^\n]+)/);
      if (match) setTranslationEnglish(match[1].trim());
    } catch(e) { setTranslation("번역을 불러올 수 없어요."); }
    setTranslating(false);
  };

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "20px", background: C.bg, borderRadius: "8px 8px 0 0", overflow: "hidden" }}>
        {[["speak", "🎙 영어로 말하기"], ["ask", "🇰🇷 영어로 어떻게?"]].map(([m, label]) =>
          React.createElement("button", { key: m, onClick: () => { setMode(m); setFeedback(null); setTranslation(null); speakRec.reset(); askRec.reset(); }, style: { flex: 1, padding: "12px", background: mode === m ? C.bg : C.bgSoft, border: "none", borderBottom: mode === m ? `2px solid ${C.text}` : "2px solid transparent", color: mode === m ? C.text : C.textLight, fontSize: "13px", fontWeight: mode === m ? "600" : "400", cursor: "pointer", fontFamily: FONT, marginBottom: "-1px" } }, label)
        )}
      </div>

      {mode === "speak" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: "18px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: C.text, marginBottom: "4px" }}>자유롭게 영어로 말해보세요!</div>
            <div style={{ fontSize: "12px", color: C.textLight }}>오늘 있었던 일, 여행 계획, 하고 싶은 말 — 무엇이든 영어로!</div>
          </Card>
          <div style={{ textAlign: "center" }}>
            {!speakRec.isRec && !loading && <Btn onClick={speakRec.start} style={{ padding: "12px 32px", fontSize: "15px" }}>🎙 말하기 시작</Btn>}
            {speakRec.isRec && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.error }} />
                  <span style={{ color: C.error, fontSize: "14px", fontWeight: "500" }}>녹음 중… {speakRec.time}초</span>
                </div>
                <Btn onClick={speakRec.stop} variant="ghost" style={{ borderColor: C.error, color: C.error }}>⏹ 멈추기 (자동 분석)</Btn>
              </div>
            )}
            {loading && <div style={{ padding: "16px", color: C.textMid, display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}><Spinner /><span>분석 중…</span></div>}
          </div>
          {feedback && !feedback.error && (
            <Card style={{ marginTop: "16px" }} className="fade-in">
              {transcription && <div style={{ background: C.bgSoft, padding: "10px 12px", borderRadius: "6px", marginBottom: "12px", fontSize: "13px", color: C.textMid, fontStyle: "italic", borderLeft: `3px solid ${C.text}` }}>🎙 "{transcription}"</div>}
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line" }}>{feedback.text}</div>
              <div style={{ marginTop: "12px", padding: "10px 14px", background: feedback.score >= 8 ? C.successBg : C.retryBg, borderRadius: "6px", fontSize: "13px", color: feedback.score >= 8 ? C.success : C.retry, fontWeight: "500" }}>
                {feedback.score >= 8 ? "🎉 잘했어요!" : "계속 연습하면 더 좋아질 거예요! 💪"}
              </div>
            </Card>
          )}
          {feedback?.error && <div style={{ color: C.error, textAlign: "center", marginTop: "12px", fontSize: "13px" }}>{feedback.error}</div>}
        </div>
      )}

      {mode === "ask" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${C.gold}`, marginBottom: "18px" }}>
            <div style={{ fontSize: "14px", fontWeight: "600", color: C.text, marginBottom: "4px" }}>영어로 어떻게 말하는지 물어보세요!</div>
            <div style={{ fontSize: "12px", color: C.textLight }}>한국어로 타이핑하거나 말하면 영어 표현을 알려드릴게요.</div>
          </Card>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <Input value={koreanText} onChange={e => setKoreanText(e.target.value)} onBlur={() => {}} placeholder="한국어로 입력… (예: 배고파 죽겠어)" style={{ fontSize: "14px" }} />
            <Btn onClick={askByText} disabled={translating || !koreanText.trim()} variant="secondary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>묻기</Btn>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
            <span style={{ fontSize: "11px", color: C.textLight }}>또는</span>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
          </div>

          <Card style={{ marginBottom: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: C.textLight, marginBottom: "10px" }}>한국어로 말하기</div>
            {!askRec.isRec && !translating && <Btn onClick={askRec.start} variant="secondary" style={{ fontSize: "13px" }}>🎙 말하기</Btn>}
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
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line", marginBottom: translationEnglish ? "14px" : "0" }}>{translation}</div>
              {translationEnglish && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: "12px", display: "flex", gap: "8px" }}>
                  <Btn onClick={() => speak(translationEnglish, 1)} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🔊 듣기</Btn>
                  <Btn onClick={() => speak(translationEnglish, 0.65)} variant="secondary" style={{ fontSize: "12px", padding: "7px 14px" }}>🐢 천천히</Btn>
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

  useEffect(() => {
    Promise.all([
      db.get("students", "select=*,groups(name)&order=created_at.asc"),
      db.get("phrase_bank", "order=created_at.desc"),
    ]).then(([s, p]) => { setStudents(s); setPhraseBank(p); setLoading(false); });
  }, []);

  if (loading) return React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" } }, React.createElement(Spinner));

  return (
    <div style={{ minHeight: "100vh", background: C.bgSoft }}>
      <div style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0" }}>
          <div>
            <div style={{ fontSize: "18px", fontWeight: "700", color: C.text, letterSpacing: "-0.5px" }}>WAYVE</div>
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
        {tab === "groups" && React.createElement(GroupsTab, { groups, setGroups, students, onPreview })}
        {tab === "add" && React.createElement(AddPhrasesTab, { groups, phraseBank, setPhraseBank })}
        {tab === "students" && React.createElement(StudentsTab, { students, setStudents, groups })}
      </div>
    </div>
  );
}

// ── Groups Tab ────────────────────────────────────────────────────────────────
function GroupsTab({ groups, setGroups, students, onPreview }) {
  const [newName, setNewName] = useState("");
  const [success, setSuccess] = useState("");

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const addGroup = async () => {
    if (!newName.trim()) return;
    try {
      const [g] = await db.insert("groups", { name: newName.trim() });
      setGroups(prev => [...prev, g]);
      setNewName(""); showSuccess("Group created!");
    } catch(e) {}
  };

  return (
    <div>
      {success && <div style={{ background: C.successBg, border: `1px solid #A8D5B5`, color: C.success, padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", fontWeight: "500" }}>{success}</div>}
      {groups.map(g => {
        const gs = students.filter(s => s.group_id === g.id);
        return React.createElement(Card, { key: g.id, style: { marginBottom: "12px" } },
          React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" } },
            React.createElement("div", { style: { fontSize: "15px", fontWeight: "600" } }, g.name),
            React.createElement(Btn, { onClick: () => onPreview(g), variant: "gold", style: { padding: "6px 14px", fontSize: "12px" } }, "👁 Preview")
          ),
          React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: gs.length > 0 ? "14px" : "0" } },
            [["Students", gs.length], ["Avg Streak", gs.length ? Math.round(gs.reduce((a, b) => a + (b.streak || 0), 0) / gs.length) : 0]].map(([label, val]) =>
              React.createElement("div", { key: label, style: { background: C.bgSoft, borderRadius: "6px", padding: "10px", textAlign: "center", border: `1px solid ${C.border}` } },
                React.createElement("div", { style: { fontSize: "20px", fontWeight: "700", color: C.text } }, val),
                React.createElement("div", { style: { fontSize: "11px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" } }, label)
              )
            )
          ),
          gs.length > 0 && gs.map(s =>
            React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
              React.createElement("span", { style: { color: C.textMid } }, s.name),
              React.createElement("span", { style: { color: C.textLight } }, "🔥 " + (s.streak || 0) + "일 연속")
            )
          )
        );
      })}
      <Card>
        <div style={{ fontSize: "12px", color: C.textLight, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "10px" }}>New Group</div>
        <div style={{ display: "flex", gap: "8px" }}>
          <Input value={newName} onChange={e => setNewName(e.target.value)} onBlur={() => {}} placeholder="Group name" />
          <Btn onClick={addGroup} variant="primary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>만들기</Btn>
        </div>
      </Card>
    </div>
  );
}

// ── Add Phrases Tab ───────────────────────────────────────────────────────────
function AddPhrasesTab({ groups, phraseBank, setPhraseBank }) {
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [sessionNum, setSessionNum] = useState(1);
  const [english, setEnglish] = useState("");
  const [korean, setKorean] = useState("");
  const [context, setContext] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState([]);
  const [success, setSuccess] = useState("");
  const [sessionPhrases, setSessionPhrases] = useState([]);
  const [loadingSP, setLoadingSP] = useState(false);

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  useEffect(() => {
    if (!selectedGroup) return;
    setLoadingSP(true);
    db.get("session_phrases", `group_id=eq.${selectedGroup.id}&select=*,phrase_bank(*)&order=session_number.asc,created_at.asc`)
      .then(data => {
        setSessionPhrases(data);
        // Auto set session number to latest + 1 or 1
        const nums = [...new Set(data.map(d => d.session_number))];
        if (nums.length > 0) setSessionNum(Math.max(...nums));
      })
      .catch(() => {})
      .finally(() => setLoadingSP(false));
  }, [selectedGroup]);

  const handleEnglishChange = (val) => {
    setEnglish(val);
    if (val.length > 2) {
      const matches = phraseBank.filter(p => p.english.toLowerCase().includes(val.toLowerCase()));
      setSuggestions(matches.slice(0, 6));
      setShowSuggestions(matches.length > 0);
    } else { setShowSuggestions(false); }
  };

  const selectSuggestion = async (phrase) => {
    // Check if already in this group
    const alreadyInGroup = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
    if (alreadyInGroup) {
      setSuccess("⚠️ This phrase is already in Session " + alreadyInGroup.session_number + " of this group.");
      setTimeout(() => setSuccess(""), 4000);
      setShowSuggestions(false);
      return;
    }
    setEnglish(phrase.english); setKorean(phrase.korean || ""); setContext(phrase.context || "");
    setShowSuggestions(false);
  };

  const handleEnglishBlur = async () => {
    setShowSuggestions(false);
    if (english.trim().length > 4 && !korean) {
      setAutoFilling(true);
      const filled = await autoFillKorean(english);
      setKorean(filled.ko || ""); setContext(filled.context || "");
      setAutoFilling(false);
    }
  };

  const addPhrase = async () => {
    if (!english.trim() || !selectedGroup) return;
    try {
      // Upsert to phrase bank
      const [phrase] = await db.upsert("phrase_bank", { english: english.trim(), korean: korean.trim(), context: context.trim() });
      // Check for duplicate in this group
      const existing = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
      if (existing) {
        showSuccess("⚠️ Already in Session " + existing.session_number);
        return;
      }
      // Add to session
      await db.insert("session_phrases", { group_id: selectedGroup.id, phrase_id: phrase.id, session_number: sessionNum });
      setPhraseBank(prev => [phrase, ...prev.filter(p => p.id !== phrase.id)]);
      setSessionPhrases(prev => [...prev, { phrase_id: phrase.id, session_number: sessionNum, phrase_bank: phrase }]);
      setEnglish(""); setKorean(""); setContext("");
      showSuccess("Phrase added to Session " + sessionNum + "!");
    } catch(e) { showSuccess("Error adding phrase. Try again."); }
  };

  const addGeneratedPhrase = async (p) => {
    if (!selectedGroup) return;
    try {
      const [phrase] = await db.upsert("phrase_bank", { english: p.english, korean: p.korean, context: p.context });
      const existing = sessionPhrases.find(sp => sp.phrase_id === phrase.id);
      if (existing) { showSuccess("⚠️ '" + p.english + "' already in Session " + existing.session_number); return; }
      await db.insert("session_phrases", { group_id: selectedGroup.id, phrase_id: phrase.id, session_number: sessionNum });
      setSessionPhrases(prev => [...prev, { phrase_id: phrase.id, session_number: sessionNum, phrase_bank: phrase }]);
      setPhraseBank(prev => [phrase, ...prev.filter(x => x.id !== phrase.id)]);
      showSuccess("Added: " + p.english);
    } catch(e) {}
  };

  const deleteSessionPhrase = async (spId) => {
    try {
      await db.delete("session_phrases", `id=eq.${spId}`);
      setSessionPhrases(prev => prev.filter(sp => sp.id !== spId));
    } catch(e) {}
  };

  const bySession = {};
  sessionPhrases.forEach(sp => {
    if (!bySession[sp.session_number]) bySession[sp.session_number] = [];
    bySession[sp.session_number].push(sp);
  });
  const sessionNums = Object.keys(bySession).map(Number).sort((a, b) => a - b);

  return (
    <div>
      {success && <div style={{ background: success.includes("⚠️") ? C.retryBg : C.successBg, border: `1px solid ${success.includes("⚠️") ? "#F0C090" : "#A8D5B5"}`, color: success.includes("⚠️") ? C.retry : C.success, padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", fontWeight: "500" }}>{success}</div>}

      {/* Group selector */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {groups.map(g => React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "6px 14px", borderRadius: "20px", border: `1px solid ${selectedGroup?.id === g.id ? C.text : C.border}`, background: selectedGroup?.id === g.id ? C.text : C.bg, color: selectedGroup?.id === g.id ? "#fff" : C.textMid, fontSize: "13px", fontWeight: selectedGroup?.id === g.id ? "600" : "400", cursor: "pointer", fontFamily: FONT } }, g.name))}
      </div>

      {/* Session number picker */}
      <Card style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>Session Number</div>
            <div style={{ fontSize: "12px", color: C.textLight, marginTop: "2px" }}>Adding to: Session {sessionNum}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button onClick={() => setSessionNum(n => Math.max(1, n - 1))} style={{ width: "32px", height: "32px", border: `1px solid ${C.border}`, borderRadius: "6px", background: C.bg, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
            <span style={{ fontSize: "20px", fontWeight: "700", minWidth: "32px", textAlign: "center" }}>{sessionNum}</span>
            <button onClick={() => setSessionNum(n => n + 1)} style={{ width: "32px", height: "32px", border: `1px solid ${C.border}`, borderRadius: "6px", background: C.bg, fontSize: "18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", marginTop: "10px", flexWrap: "wrap" }}>
          {sessionNums.map(n => React.createElement("button", { key: n, onClick: () => setSessionNum(n), style: { padding: "4px 10px", borderRadius: "16px", border: `1px solid ${sessionNum === n ? C.gold : C.border}`, background: sessionNum === n ? C.goldBg : C.bg, color: sessionNum === n ? C.gold : C.textMid, fontSize: "12px", cursor: "pointer", fontFamily: FONT } }, "Session " + n))}
        </div>
      </Card>

      {/* AI Generate */}
      <Card style={{ marginBottom: "16px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: C.gold, marginBottom: "10px" }}>✨ AI Generate</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          <Input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} onBlur={() => {}} placeholder="Topic (e.g. ordering coffee, making plans)" />
          <Btn onClick={async () => { setGenerating(true); try { setGenerated(await generateAIPhrases(generateTopic)); } catch(e) {} setGenerating(false); }} disabled={generating || !generateTopic.trim()} variant="secondary" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>{generating ? React.createElement(Spinner) : "생성"}</Btn>
        </div>
        {generated.map((p, i) => React.createElement("div", { key: i, style: { padding: "8px 0", borderBottom: `1px solid ${C.bgSoft}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "13px", color: C.text, fontStyle: "italic" } }, p.english),
            React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, p.korean)
          ),
          React.createElement(Btn, { onClick: () => addGeneratedPhrase(p), variant: "secondary", style: { fontSize: "11px", padding: "5px 10px", flexShrink: 0 } }, "+ Add")
        ))}
      </Card>

      {/* Manual add */}
      <Card style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>➕ Add Manually</div>
        <div style={{ position: "relative", marginBottom: "8px" }}>
          <Input value={english} onChange={e => handleEnglishChange(e.target.value)} onBlur={handleEnglishBlur} placeholder="English phrase (Korean auto-fills on tab)" style={{ marginBottom: "0" }} />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.bg, border: `1px solid ${C.border}`, borderRadius: "0 0 6px 6px", zIndex: 20, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
              {suggestions.map(p => React.createElement("div", { key: p.id, onMouseDown: () => selectSuggestion(p), style: { padding: "10px 12px", cursor: "pointer", borderBottom: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
                React.createElement("div", { style: { color: C.text, fontStyle: "italic" } }, p.english),
                React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, p.korean)
              ))}
            </div>
          )}
        </div>
        {autoFilling && <div style={{ fontSize: "11px", color: C.gold, marginBottom: "6px" }}>✨ Auto-filling Korean…</div>}
        <Input value={korean} onChange={e => setKorean(e.target.value)} onBlur={() => {}} placeholder="Korean translation" style={{ marginBottom: "8px" }} />
        <Input value={context} onChange={e => setContext(e.target.value)} onBlur={() => {}} placeholder="Context — when to use (Korean)" style={{ marginBottom: "12px" }} />
        <Btn onClick={addPhrase} style={{ width: "100%" }}>Add to {selectedGroup?.name} — Session {sessionNum}</Btn>
      </Card>

      {/* Current sessions view */}
      {loadingSP ? React.createElement("div", { style: { textAlign: "center", padding: "20px" } }, React.createElement(Spinner)) : sessionNums.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: C.textLight, marginBottom: "12px" }}>{selectedGroup?.name} — All Sessions</div>
          {sessionNums.map(n =>
            React.createElement(Card, { key: n, style: { marginBottom: "10px" } },
              React.createElement("div", { style: { fontSize: "13px", fontWeight: "600", marginBottom: "10px", color: C.textMid } }, "Session " + n),
              bySession[n].map(sp => React.createElement("div", { key: sp.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.bgSoft}`, fontSize: "13px" } },
                React.createElement("div", null,
                  React.createElement("div", { style: { color: C.text, fontStyle: "italic" } }, sp.phrase_bank?.english),
                  sp.phrase_bank?.korean && React.createElement("div", { style: { fontSize: "11px", color: C.textLight } }, sp.phrase_bank.korean)
                ),
                React.createElement("button", { onClick: () => deleteSessionPhrase(sp.id), style: { background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "16px", padding: "0 4px" } }, "×")
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}

// ── Students Tab ──────────────────────────────────────────────────────────────
function StudentsTab({ students, setStudents, groups }) {
  const [newName, setNewName] = useState("");
  const [newGroupId, setNewGroupId] = useState(groups[0]?.id || "");
  const [success, setSuccess] = useState("");
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const addStudent = async () => {
    if (!newName.trim()) return;
    if (students.find(s => s.name.toLowerCase() === newName.trim().toLowerCase())) { setSuccess("⚠️ Name already exists."); setTimeout(() => setSuccess(""), 3000); return; }
    try {
      const [s] = await db.insert("students", { name: newName.trim(), group_id: newGroupId, streak: 0, longest_streak: 0 });
      setStudents(prev => [...prev, { ...s, groups: groups.find(g => g.id === newGroupId) }]);
      setNewName(""); showSuccess("Student added!");
    } catch(e) { setSuccess("Error — name may already exist."); setTimeout(() => setSuccess(""), 3000); }
  };

  const updateGroup = async (studentId, groupId) => {
    try {
      await db.update("students", `id=eq.${studentId}`, { group_id: groupId });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, group_id: groupId, groups: groups.find(g => g.id === groupId) } : s));
      showSuccess("Group updated!");
    } catch(e) {}
  };

  return (
    <div>
      {success && <div style={{ background: success.includes("⚠️") ? C.retryBg : C.successBg, border: `1px solid ${success.includes("⚠️") ? "#F0C090" : "#A8D5B5"}`, color: success.includes("⚠️") ? C.retry : C.success, padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "13px", fontWeight: "500" }}>{success}</div>}

      <Card style={{ marginBottom: "20px", borderLeft: `3px solid ${C.gold}` }}>
        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "12px" }}>+ Register New Student</div>
        <Input value={newName} onChange={e => setNewName(e.target.value)} onBlur={() => {}} placeholder="Student name" style={{ marginBottom: "8px" }} />
        <select value={newGroupId} onChange={e => setNewGroupId(e.target.value)} style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "14px", background: C.bg, color: C.text, fontFamily: FONT, outline: "none", marginBottom: "12px" }}>
          {groups.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))}
        </select>
        <Btn onClick={addStudent} style={{ width: "100%" }}>Register Student</Btn>
      </Card>

      <div style={{ fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase", color: C.textLight, marginBottom: "12px" }}>{students.length} Students</div>
      {students.length === 0
        ? React.createElement("div", { style: { textAlign: "center", color: C.textLight, padding: "40px", fontStyle: "italic" } }, "No students yet.")
        : students.map(s => React.createElement(Card, { key: s.id, style: { marginBottom: "8px", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "14px", fontWeight: "500" } }, s.name),
            React.createElement("div", { style: { fontSize: "11px", color: C.textLight, marginTop: "2px" } }, "🔥 " + (s.streak || 0) + " streak")
          ),
          React.createElement("select", { value: s.group_id || "", onChange: e => updateGroup(s.id, e.target.value), style: { padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "12px", background: C.bg, color: C.text, fontFamily: FONT, outline: "none" } },
            groups.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))
          )
        ))
      }
    </div>
  );
}
