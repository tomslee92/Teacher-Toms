import React, { useState, useRef, useEffect } from "react";

const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} };
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } };
const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;

// ── Wayve Brand Colors (matching wayve.tiiny.site) ────────────────────────────
const C = {
  bg: "#F7F4F0",
  bgDark: "#EEEAE4",
  text: "#1A1A1A",
  textMuted: "#6B6560",
  textLight: "#9E9790",
  accent: "#1A1A1A",
  accentLight: "#333",
  gold: "#C9A84C",
  goldLight: "#F0D896",
  border: "#DDD8D2",
  borderDark: "#C8C2BA",
  white: "#FFFFFF",
  success: "#4A7C59",
  error: "#B85450",
  card: "#FFFFFF",
  cardHover: "#F2EDE8",
};

const FONT = "'Georgia', 'Times New Roman', serif";

const LEVELS = [
  { level: 1, name: "First Words", emoji: "🌱", milestone: "You can introduce yourself!", xpRequired: 0 },
  { level: 2, name: "Ice Breaker", emoji: "👋", milestone: "You can start a conversation!", xpRequired: 100 },
  { level: 3, name: "Connector", emoji: "🗣", milestone: "You can keep a conversation going!", xpRequired: 250 },
  { level: 4, name: "Traveler", emoji: "✈️", milestone: "You can navigate an airport!", xpRequired: 450 },
  { level: 5, name: "Explorer", emoji: "🏨", milestone: "You can check into a hotel!", xpRequired: 700 },
  { level: 6, name: "Local", emoji: "🍽", milestone: "You can order food anywhere!", xpRequired: 1000 },
  { level: 7, name: "Navigator", emoji: "🗺", milestone: "You can get around any city!", xpRequired: 1350 },
  { level: 8, name: "Adventurer", emoji: "🌍", milestone: "You can travel solo with confidence!", xpRequired: 1750 },
  { level: 9, name: "Conversationalist", emoji: "💬", milestone: "You can hold a real conversation!", xpRequired: 2200 },
  { level: 10, name: "Ready to Speak to a Foreigner", emoji: "🏆", milestone: "You're ready to speak to anyone in the world!", xpRequired: 2700 },
];

const getLevel = (xp) => { let c = LEVELS[0]; for (let i = LEVELS.length - 1; i >= 0; i--) { if (xp >= LEVELS[i].xpRequired) { c = LEVELS[i]; break; } } return c; };
const getNextLevel = (xp) => { for (let i = 0; i < LEVELS.length; i++) { if (xp < LEVELS[i].xpRequired) return LEVELS[i]; } return null; };

const SEED_GROUPS = [
  { id: "g1", name: "Group 1 — High School Boys" },
  { id: "g2", name: "Group 2 — Young Women (19-25)" },
  { id: "g3", name: "Group 3 — Adult Men (40s)" },
];

const TEACHER_PASS = "wayve2024";

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.82; u.pitch = 1.08;
  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = ["Samantha", "Karen", "Moira", "Tessa", "Allison", "Ava", "Victoria"];
    let chosen = null;
    for (const name of preferred) { chosen = voices.find(v => v.name.includes(name) && v.lang.startsWith("en")); if (chosen) break; }
    if (!chosen) chosen = voices.find(v => v.lang === "en-US" && v.localService && !v.name.toLowerCase().includes("google"));
    if (!chosen) chosen = voices.find(v => v.lang === "en-US");
    if (chosen) u.voice = chosen;
    if (onEnd) u.onend = onEnd;
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length === 0) { window.speechSynthesis.onvoiceschanged = trySpeak; } else { trySpeak(); }
}

// ── Highlight missed words ────────────────────────────────────────────────────
function highlightMissedWords(target, spoken) {
  if (!target || !spoken) return React.createElement("span", null, target);
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const targetWords = target.split(" ");
  const spokenNorm = normalize(spoken);
  return React.createElement("span", null,
    targetWords.map((word, i) => {
      const cleanWord = normalize(word);
      const found = spokenNorm.includes(cleanWord);
      return React.createElement("span", { key: i, style: { color: found ? C.text : C.error, textDecoration: found ? "none" : "underline", fontWeight: found ? "normal" : "600" } }, word + (i < targetWords.length - 1 ? " " : ""));
    })
  );
}

// ── Strip non Korean/English chars ───────────────────────────────────────────
function cleanText(text) {
  if (!text) return text;
  return text.split("").filter(c => {
    const code = c.charCodeAt(0);
    const isKorean = (code >= 0xAC00 && code <= 0xD7A3) || (code >= 0x1100 && code <= 0x11FF) || (code >= 0x3130 && code <= 0x318F);
    const isLatin = (code >= 0x0020 && code <= 0x007E);
    const isEmoji = (code >= 0x1F300 && code <= 0x1FAFF) || (code >= 0x2600 && code <= 0x27BF) || (code >= 0xFE00 && code <= 0xFE0F);
    return isKorean || isLatin || isEmoji || c === "\n";
  }).join("");
}

// ── API ───────────────────────────────────────────────────────────────────────
async function transcribeAudio(blob) {
  const fd = new FormData();
  fd.append("file", blob, "rec.webm");
  fd.append("model", "whisper-large-v3");
  fd.append("response_format", "text");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { "Authorization": `Bearer ${GROQ_KEY}` }, body: fd });
  return await res.text();
}

async function groq(prompt, system) {
  const messages = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 600, messages })
  });
  const d = await res.json();
  return cleanText(d.choices[0].message.content);
}

const SYSTEM_STRICT = `You are Tom, a warm English coach for Korean learners at Wayve.
ABSOLUTE RULE: Every single character you write must be either:
1. Korean hangul (가-힣, ㄱ-ㅎ, ㅏ-ㅣ)
2. English letters (a-z, A-Z)
3. Numbers (0-9)
4. Basic punctuation (. , ! ? : → " ' ( ) / - _)
5. Emoji
DO NOT USE: Chinese characters (漢字), Japanese kana (ひらがな/カタカナ), Russian (Кириллица), or any other script.
If you are tempted to write a Chinese character like 練, 習, 努, 力, 繼, 續 — write the Korean hangul equivalent instead.
The motivational line at the end must be ONLY Korean hangul: examples are 잘하고 있어요! 화이팅! 계속 연습해요! 정말 잘했어요! 조금만 더 연습해요! 멋지게 하고 있어요!`;

async function getPhraseFeedback(transcription, phrase) {
  const text = await groq(`Target phrase: "${phrase.en}"
Context: "${phrase.context || "Practice this phrase naturally"}"
Student said: "${transcription}"

Respond in Korean hangul and English ONLY:

🎯 점수: X/10
[Korean hangul explanation of score]

✅ 잘한 점
[Korean hangul encouragement]

📝 피드백
[Korean hangul explanation of any issues]
→ [Corrected English, or write: 완벽해요!]

💡 이렇게도 말할 수 있어요
→ [Alternative natural English expression]

💪 [Motivational sentence in PURE Korean hangul ONLY — absolutely no Chinese characters]

Under 130 words.`, SYSTEM_STRICT);
  const scoreMatch = text.match(/점수.*?(\d+)\/10/);
  return { text, score: scoreMatch ? parseInt(scoreMatch[1]) : 7 };
}

async function getFreeTalkFeedback(transcription) {
  const text = await groq(`Student said in English (free talk): "${transcription}"

Give grammar feedback in Korean hangul and English ONLY:

🎯 점수: X/10
[Korean hangul explanation]

✅ 잘한 점
[Korean hangul encouragement]

📝 문법 피드백
[Korean hangul explanation]
→ [Corrected English if needed]

💡 이렇게도 말할 수 있어요
→ [More natural English version]

💪 [Motivational sentence in PURE Korean hangul ONLY — no Chinese characters at all]

Under 130 words.`, SYSTEM_STRICT);
  const scoreMatch = text.match(/점수.*?(\d+)\/10/);
  return { text, score: scoreMatch ? parseInt(scoreMatch[1]) : 7 };
}

async function getKoreanTranslation(input) {
  return await groq(`A Korean learner wants to know how to say this in English: "${input}"

Respond in Korean hangul and English ONLY. Use ONLY pure Korean hangul for all Korean text — no Chinese characters:

🇰🇷 한국어 표현
${input}

🗣 영어로는 이렇게 말해요!
[The English translation]

📌 예문
1. "[English example sentence]"
→ [Korean hangul translation]

2. "[English example sentence]"
→ [Korean hangul translation]

💡 사용 팁
[One short Korean hangul tip]

💪 [Encouraging sentence in PURE Korean hangul ONLY]

Under 130 words. No Chinese characters.`, SYSTEM_STRICT);
}

async function autoFillPhrase(en) {
  try {
    const text = await groq(`For this English phrase: "${en}"
Return ONLY valid JSON with no extra text, no markdown, no explanation:
{"ko": "Korean translation in hangul", "context": "When to use this phrase in one sentence"}`, "You are a JSON generator. Output only valid JSON, nothing else.");
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
    return { ko: "", context: "" };
  } catch(e) { return { ko: "", context: "" }; }
}

async function generatePhrases(topic) {
  const text = await groq(`Generate 5 natural English phrases for Korean learners about: "${topic}".
Return ONLY a valid JSON array, nothing else:
[{"en":"...","ko":"Korean hangul translation","context":"When to use this"}]`, "You are a JSON generator. Output only valid JSON array, nothing else.");
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  return JSON.parse(cleaned.slice(start, end + 1));
}

// ── Recording Hook ────────────────────────────────────────────────────────────
function useRecorder(onStop) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const onStopRef = useRef(onStop);
  useEffect(() => { onStopRef.current = onStop; }, [onStop]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        if (onStopRef.current) onStopRef.current(blob);
      };
      mr.start(); setIsRecording(true); setRecordingTime(0); setAudioBlob(null);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch(e) { alert("마이크 접근이 필요합니다."); }
  };

  const stop = () => { mediaRef.current?.stop(); setIsRecording(false); clearInterval(timerRef.current); };
  const reset = () => { setAudioBlob(null); };
  return { isRecording, audioBlob, recordingTime, start, stop, reset };
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState(() => load("wayve_groups", SEED_GROUPS));
  const [students, setStudents] = useState(() => load("wayve_students", []));
  const [groupPhrases, setGroupPhrases] = useState(() => load("wayve_phrases", {}));
  const [levelUp, setLevelUp] = useState(null);
  const [previewGroupId, setPreviewGroupId] = useState(null);

  useEffect(() => { save("wayve_groups", groups); }, [groups]);
  useEffect(() => { save("wayve_students", students); }, [students]);
  useEffect(() => { save("wayve_phrases", groupPhrases); }, [groupPhrases]);

  const updateStudent = (updated) => {
    const prev = students.find(s => s.id === updated.id);
    if (prev) {
      const prevLevel = getLevel(prev.xp || 0);
      const newLevel = getLevel(updated.xp || 0);
      if (newLevel.level > prevLevel.level) setLevelUp(newLevel);
    }
    setStudents(p => p.map(s => s.id === updated.id ? updated : s));
    if (currentUser?.id === updated.id) setCurrentUser(updated);
  };

  const getPhrases = (groupId) => groupPhrases[groupId] || [];
  const setPhrases = (groupId, phrases) => setGroupPhrases(prev => ({ ...prev, [groupId]: phrases }));

  if (screen === "login") return React.createElement(LoginScreen, { students, setStudents, groups, setCurrentUser, setScreen });
  if (screen === "teacher") return React.createElement(TeacherScreen, { groups, setGroups, students, setStudents, getPhrases, setPhrases, setScreen, previewGroupId, setPreviewGroupId });
  if (screen === "preview") {
    const previewUser = { id: "preview", name: "Preview Mode", groupId: previewGroupId, xp: 0, streak: 0, longestStreak: 0, lastPractice: null, sessions: [], completedPhrases: [] };
    return React.createElement(StudentScreen, { user: previewUser, groups, students, updateStudent: () => {}, setScreen: () => setScreen("teacher"), getPhrases, levelUp: null, setLevelUp: () => {}, isPreview: true });
  }
  if (screen === "student") return React.createElement(StudentScreen, { user: currentUser, groups, students, updateStudent, setScreen, getPhrases, levelUp, setLevelUp, isPreview: false });
  return null;
}

// ── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ students, setStudents, groups, setCurrentUser, setScreen }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const login = () => {
    const found = students.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (!found) { setError("이름을 찾을 수 없어요. 먼저 등록해 주세요."); return; }
    setCurrentUser(found); setScreen("student");
  };

  const register = () => {
    if (!name.trim()) { setError("이름을 입력해 주세요."); return; }
    if (students.find(s => s.name.toLowerCase() === name.trim().toLowerCase())) { setError("이미 사용 중인 이름이에요."); return; }
    const s = { id: Date.now(), name: name.trim(), groupId: groups[0]?.id || "g1", xp: 0, streak: 0, longestStreak: 0, lastPractice: null, sessions: [], completedPhrases: [] };
    setStudents(p => [...p, s]);
    setCurrentUser(s); setScreen("student");
  };

  const inputStyle = { width: "100%", padding: "14px 16px", borderRadius: "4px", border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: "16px", fontFamily: FONT, outline: "none", boxSizing: "border-box", marginBottom: "16px" };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: FONT, padding: "24px" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <div style={{ fontSize: "52px", fontWeight: "400", color: C.text, letterSpacing: "8px", marginBottom: "8px", textTransform: "uppercase" }}>WAYVE</div>
          <div style={{ fontSize: "13px", color: C.textMuted, letterSpacing: "3px", textTransform: "uppercase" }}>English Confidence</div>
        </div>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "32px" }}>
          {[["login", "Login"], ["register", "Register"], ["teacher", "Teacher"]].map(([m, label]) =>
            React.createElement("button", { key: m, onClick: () => { setMode(m); setError(""); }, style: { flex: 1, padding: "12px", border: "none", borderBottom: mode === m ? `2px solid ${C.text}` : "2px solid transparent", background: "transparent", color: mode === m ? C.text : C.textLight, cursor: "pointer", fontSize: "13px", fontFamily: FONT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "-1px" } }, label)
          )}
        </div>
        <div>
          {(mode === "login" || mode === "register") && (
            <div>
              <label style={{ fontSize: "11px", letterSpacing: "2px", color: C.textMuted, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>이름 / Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && (mode === "login" ? login() : register())} placeholder="Enter your name" style={inputStyle} />
              {error && <div style={{ color: C.error, fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={mode === "login" ? login : register} style={{ width: "100%", padding: "14px", border: `1px solid ${C.text}`, background: C.text, color: C.white, fontSize: "14px", cursor: "pointer", fontFamily: FONT, letterSpacing: "2px", textTransform: "uppercase" }}>
                {mode === "login" ? "입장하기" : "Wayve 참여하기"}
              </button>
            </div>
          )}
          {mode === "teacher" && (
            <div>
              <label style={{ fontSize: "11px", letterSpacing: "2px", color: C.textMuted, textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && (pass === TEACHER_PASS ? setScreen("teacher") : setError("Wrong password"))} placeholder="Teacher password" style={inputStyle} />
              {error && <div style={{ color: C.error, fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={() => pass === TEACHER_PASS ? setScreen("teacher") : setError("Wrong password")} style={{ width: "100%", padding: "14px", border: `1px solid ${C.gold}`, background: C.gold, color: C.white, fontSize: "14px", cursor: "pointer", fontFamily: FONT, letterSpacing: "2px", textTransform: "uppercase" }}>Teacher Dashboard</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({ user, groups, students, updateStudent, setScreen, getPhrases, levelUp, setLevelUp, isPreview }) {
  const [tab, setTab] = useState("practice");
  const currentLevel = getLevel(user.xp || 0);
  const nextLevel = getNextLevel(user.xp || 0);
  const xpProgress = nextLevel ? ((user.xp || 0) - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired) * 100 : 100;
  const group = groups.find(g => g.id === user.groupId);
  const groupStudents = students.filter(s => s.groupId === user.groupId).sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const phrases = getPhrases(user.groupId);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.text }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${C.text}, ${C.gold})`, zIndex: 20 }} />

      {levelUp && !isPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setLevelUp(null)}>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "2px", padding: "48px 36px", textAlign: "center", maxWidth: "320px", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>{levelUp.emoji}</div>
            <div style={{ fontSize: "11px", letterSpacing: "4px", color: C.gold, textTransform: "uppercase", marginBottom: "8px" }}>레벨 업!</div>
            <div style={{ fontSize: "22px", color: C.text, marginBottom: "10px", fontWeight: "400" }}>{levelUp.name}</div>
            <div style={{ fontSize: "14px", color: C.textMuted, marginBottom: "24px" }}>{levelUp.milestone}</div>
            <button onClick={() => setLevelUp(null)} style={{ background: C.text, border: "none", color: C.white, padding: "12px 28px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, letterSpacing: "2px", textTransform: "uppercase" }}>계속 가자! 🚀</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "16px 24px", position: "sticky", top: 0, zIndex: 10 }}>
        {isPreview && (
          <div style={{ background: C.gold, color: C.white, padding: "6px 12px", fontSize: "12px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>👁 Preview Mode — {group?.name}</span>
            <button onClick={() => setScreen("teacher")} style={{ background: "transparent", border: `1px solid ${C.white}`, color: C.white, padding: "4px 10px", cursor: "pointer", fontSize: "11px", fontFamily: FONT }}>← Back to Dashboard</button>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            {/* Streak display */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: (user.streak || 0) > 0 ? "#E07B39" : C.textLight, lineHeight: 1 }}>🔥 {user.streak || 0}</div>
                <div style={{ fontSize: "9px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" }}>연속</div>
              </div>
              {(user.longestStreak || 0) > 0 && (
                <div style={{ textAlign: "center", borderLeft: `1px solid ${C.border}`, paddingLeft: "12px" }}>
                  <div style={{ fontSize: "18px", color: C.gold, fontWeight: "bold", lineHeight: 1 }}>🏅 {user.longestStreak || 0}</div>
                  <div style={{ fontSize: "9px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" }}>최고</div>
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: "16px", color: C.text }}>{isPreview ? "Preview Student" : `Hi, ${user.name}!`} 👋</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ border: `1px solid ${C.gold}`, borderRadius: "2px", padding: "5px 12px", fontSize: "13px", color: C.gold }}>⚡ {user.xp || 0} XP</div>
            {!isPreview && <button onClick={() => setScreen("login")} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, padding: "5px 12px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>나가기</button>}
          </div>
        </div>
        {/* XP bar */}
        <div style={{ height: "3px", background: C.bgDark, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${xpProgress}%`, background: `linear-gradient(90deg, ${C.text}, ${C.gold})`, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.white, padding: "0 20px", overflowX: "auto" }}>
        {[["practice", "🎙 Practice"], ["freetalk", "💬 Free Talk"], ["leaderboard", "🏆 순위"]].map(([t, label]) =>
          React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "14px 16px", border: "none", borderBottom: tab === t ? `2px solid ${C.text}` : "2px solid transparent", background: "transparent", color: tab === t ? C.text : C.textLight, cursor: "pointer", fontSize: "13px", fontFamily: FONT, letterSpacing: "1px", whiteSpace: "nowrap", marginBottom: "-1px" } }, label)
        )}
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 16px" }}>
        {tab === "practice" && React.createElement(PracticeTab, { user, phrases, updateStudent, isPreview })}
        {tab === "freetalk" && React.createElement(FreeTalkTab, { user, updateStudent, isPreview })}
        {tab === "leaderboard" && (
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, textTransform: "uppercase", marginBottom: "16px" }}>{group?.name}</div>
            {groupStudents.length === 0
              ? React.createElement("div", { style: { textAlign: "center", color: C.textLight, padding: "40px", fontStyle: "italic" } }, "아직 그룹원이 없어요.")
              : groupStudents.map((s, i) => {
                const lv = getLevel(s.xp || 0);
                const isMe = s.id === user.id;
                return React.createElement("div", { key: s.id, style: { background: isMe ? C.bgDark : C.white, borderRadius: "2px", padding: "14px 18px", marginBottom: "8px", border: `1px solid ${isMe ? C.borderDark : C.border}`, display: "flex", alignItems: "center", gap: "14px" } },
                  React.createElement("div", { style: { fontSize: "18px", width: "28px", textAlign: "center" } }, i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`),
                  React.createElement("div", { style: { flex: 1 } },
                    React.createElement("div", { style: { fontSize: "14px", color: C.text, fontWeight: isMe ? "600" : "400" } }, s.name + (isMe ? " (나)" : "")),
                    React.createElement("div", { style: { fontSize: "11px", color: C.textMuted } }, lv.emoji + " " + lv.name + "  🔥" + (s.streak || 0))
                  ),
                  React.createElement("div", { style: { fontSize: "13px", color: C.gold, fontWeight: "600" } }, "⚡ " + (s.xp || 0))
                );
              })
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Practice Tab ──────────────────────────────────────────────────────────────
function PracticeTab({ user, phrases, updateStudent, isPreview }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transcription, setTranscription] = useState(null);

  const selectedPhrase = phrases[phraseIndex] || null;

  const handleStop = async (blob) => {
    if (!selectedPhrase || isPreview) return;
    setIsLoading(true); setFeedback(null); setTranscription(null);
    try {
      const t = await transcribeAudio(blob);
      setTranscription(t);
      const { text, score } = await getPhraseFeedback(t, selectedPhrase);
      setFeedback({ text, score });
      if (score >= 8) {
        const already = (user.completedPhrases || []).includes(selectedPhrase.id);
        const xpGain = already ? 5 : 25;
        const today = new Date().toDateString();
        const isNewDay = user.lastPractice !== today;
        const newStreak = isNewDay ? (user.streak || 0) + 1 : (user.streak || 0);
        updateStudent({ ...user, xp: (user.xp || 0) + xpGain, streak: newStreak, longestStreak: Math.max(newStreak, user.longestStreak || 0), lastPractice: today, totalSessions: (user.totalSessions || 0) + 1, completedPhrases: already ? (user.completedPhrases || []) : [...(user.completedPhrases || []), selectedPhrase.id], sessions: [{ date: new Date().toLocaleDateString(), phrase: selectedPhrase.en, xp: xpGain }, ...(user.sessions || []).slice(0, 49)] });
      }
    } catch(e) { setFeedback({ error: "피드백을 불러올 수 없어요. 다시 시도해 주세요!" }); }
    setIsLoading(false);
  };

  const rec = useRecorder(handleStop);

  const nextPhrase = () => { if (phraseIndex < phrases.length - 1) { setPhraseIndex(i => i + 1); setFeedback(null); setTranscription(null); rec.reset(); } };
  const prevPhrase = () => { if (phraseIndex > 0) { setPhraseIndex(i => i - 1); setFeedback(null); setTranscription(null); rec.reset(); } };

  const btnBase = { border: `1px solid ${C.border}`, background: C.white, color: C.textMuted, padding: "8px 16px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, letterSpacing: "1px" };

  if (phrases.length === 0) {
    return React.createElement("div", { style: { textAlign: "center", padding: "60px 20px" } },
      React.createElement("div", { style: { fontSize: "40px", marginBottom: "16px" } }, "📭"),
      React.createElement("div", { style: { fontSize: "16px", color: C.textMuted, fontStyle: "italic" } }, "아직 배정된 문장이 없어요."),
      React.createElement("div", { style: { fontSize: "13px", color: C.textLight, marginTop: "8px" } }, "수업 후에 선생님이 이번 주 문장을 추가해 드릴게요!")
    );
  }

  return (
    <div>
      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <button onClick={prevPhrase} disabled={phraseIndex === 0} style={{ ...btnBase, opacity: phraseIndex === 0 ? 0.3 : 1 }}>← 이전</button>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {phrases.map((p, i) => {
            const done = (user.completedPhrases || []).includes(p.id);
            return React.createElement("div", { key: p.id, onClick: () => { setPhraseIndex(i); setFeedback(null); setTranscription(null); rec.reset(); }, style: { width: "24px", height: "24px", borderRadius: "50%", border: `2px solid ${i === phraseIndex ? C.text : done ? C.success : C.border}`, background: i === phraseIndex ? C.text : done ? "rgba(74,124,89,0.1)" : "transparent", color: i === phraseIndex ? C.white : done ? C.success : C.textLight, cursor: "pointer", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT } }, done ? "✓" : i + 1);
          })}
        </div>
        <button onClick={nextPhrase} disabled={phraseIndex === phrases.length - 1} style={{ ...btnBase, background: phraseIndex < phrases.length - 1 ? C.text : C.white, color: phraseIndex < phrases.length - 1 ? C.white : C.textMuted, borderColor: phraseIndex < phrases.length - 1 ? C.text : C.border, opacity: phraseIndex === phrases.length - 1 ? 0.3 : 1 }}>다음 →</button>
      </div>

      {selectedPhrase && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "28px", marginBottom: "16px" }}>
          <div style={{ fontSize: "24px", fontStyle: "italic", color: C.text, marginBottom: "8px", textAlign: "center" }}>"{selectedPhrase.en}"</div>
          {selectedPhrase.ko && <div style={{ fontSize: "15px", color: C.textMuted, textAlign: "center", marginBottom: "8px" }}>{selectedPhrase.ko}</div>}
          {selectedPhrase.context && <div style={{ background: C.bgDark, padding: "10px 14px", fontSize: "12px", color: C.textMuted, fontStyle: "italic", marginBottom: "20px", textAlign: "center", borderLeft: `3px solid ${C.gold}` }}>{selectedPhrase.context}</div>}

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
            <button onClick={() => speak(selectedPhrase.en)} style={{ background: C.bgDark, border: `1px solid ${C.border}`, color: C.textMuted, padding: "8px 20px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, letterSpacing: "1px" }}>🔊 들어보기</button>
          </div>

          <div style={{ textAlign: "center" }}>
            {!rec.isRecording && !rec.audioBlob && !isLoading && (
              <button onClick={rec.start} style={{ background: C.text, border: "none", color: C.white, padding: "14px 36px", cursor: "pointer", fontSize: "15px", fontFamily: FONT, letterSpacing: "2px", textTransform: "uppercase" }}>🎙 녹음 시작</button>
            )}
            {rec.isRecording && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "14px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.error }} />
                  <span style={{ color: C.error, fontSize: "14px" }}>녹음 중… {rec.recordingTime}초</span>
                </div>
                <button onClick={rec.stop} style={{ background: C.white, border: `2px solid ${C.error}`, color: C.error, padding: "12px 28px", cursor: "pointer", fontSize: "14px", fontFamily: FONT, letterSpacing: "1px" }}>⏹ 멈추기 (자동 분석)</button>
              </div>
            )}
            {isLoading && (
              <div style={{ padding: "20px", color: C.textMuted, fontSize: "14px" }}>✨ 분석 중…</div>
            )}
            {rec.audioBlob && !rec.isRecording && !isLoading && !feedback && (
              <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                <button onClick={rec.reset} style={{ background: C.white, border: `1px solid ${C.border}`, color: C.textMuted, padding: "10px 18px", cursor: "pointer", fontSize: "13px", fontFamily: FONT }}>↺ 다시 녹음</button>
              </div>
            )}
          </div>

          {feedback && !feedback.error && (
            <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: `1px solid ${C.border}` }}>
              {transcription && (
                <div style={{ background: C.bgDark, padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: C.textMuted, borderLeft: `3px solid ${C.text}` }}>
                  🎙 {highlightMissedWords(selectedPhrase.en, transcription)}
                </div>
              )}
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line" }}>{feedback.text}</div>
              {feedback.score >= 8 ? (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ padding: "10px 14px", background: "rgba(201,168,76,0.1)", border: `1px solid ${C.gold}`, fontSize: "13px", color: C.gold, marginBottom: "12px" }}>⚡ +25 XP 획득! 잘했어요! 🎉</div>
                  {phraseIndex < phrases.length - 1 && (
                    <button onClick={nextPhrase} style={{ background: C.text, border: "none", color: C.white, padding: "10px 20px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, letterSpacing: "1px", width: "100%" }}>다음 문장 →</button>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "16px", padding: "12px 14px", background: "rgba(184,84,80,0.06)", border: `1px solid ${C.error}` }}>
                  <div style={{ fontSize: "13px", color: C.error, marginBottom: "8px" }}>8점 이상이어야 XP를 얻을 수 있어요. 다시 도전해 보세요! 💪</div>
                  <button onClick={() => { rec.reset(); setFeedback(null); setTranscription(null); }} style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, padding: "7px 16px", cursor: "pointer", fontSize: "12px", fontFamily: FONT }}>🔄 다시 시도</button>
                </div>
              )}
            </div>
          )}
          {feedback?.error && <div style={{ color: C.error, textAlign: "center", marginTop: "14px", fontSize: "13px" }}>{feedback.error}</div>}
        </div>
      )}
    </div>
  );
}

// ── Free Talk Tab ─────────────────────────────────────────────────────────────
function FreeTalkTab({ user, updateStudent, isPreview }) {
  const [mode, setMode] = useState("speak");
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [speakTranscription, setSpeakTranscription] = useState(null);
  const [koreanText, setKoreanText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const handleSpeakStop = async (blob) => {
    if (isPreview) return;
    setIsLoading(true); setFeedback(null); setSpeakTranscription(null);
    try {
      const t = await transcribeAudio(blob);
      setSpeakTranscription(t);
      const { text, score } = await getFreeTalkFeedback(t);
      setFeedback({ text, score });
      if (score >= 8) {
        const today = new Date().toDateString();
        const isNewDay = user.lastPractice !== today;
        const newStreak = isNewDay ? (user.streak || 0) + 1 : (user.streak || 0);
        updateStudent({ ...user, xp: (user.xp || 0) + 15, streak: newStreak, longestStreak: Math.max(newStreak, user.longestStreak || 0), lastPractice: today, totalSessions: (user.totalSessions || 0) + 1, sessions: [{ date: new Date().toLocaleDateString(), phrase: "Free Talk", xp: 15 }, ...(user.sessions || []).slice(0, 49)] });
      }
    } catch(e) { setFeedback({ error: "피드백을 불러올 수 없어요." }); }
    setIsLoading(false);
  };

  const handleAskStop = async (blob) => {
    setIsTranslating(true); setTranslation(null);
    try {
      const t = await transcribeAudio(blob);
      setKoreanText(t);
      setTranslation(await getKoreanTranslation(t));
    } catch(e) { setTranslation("번역을 불러올 수 없어요."); }
    setIsTranslating(false);
  };

  const speakRec = useRecorder(handleSpeakStop);
  const askRec = useRecorder(handleAskStop);

  const askByText = async () => {
    if (!koreanText.trim()) return;
    setIsTranslating(true); setTranslation(null);
    try { setTranslation(await getKoreanTranslation(koreanText)); } catch(e) { setTranslation("번역을 불러올 수 없어요."); }
    setIsTranslating(false);
  };

  const tabBtnStyle = (active) => ({ flex: 1, padding: "12px", border: "none", borderBottom: active ? `2px solid ${C.text}` : `2px solid transparent`, background: "transparent", color: active ? C.text : C.textLight, cursor: "pointer", fontSize: "13px", fontFamily: FONT, letterSpacing: "1px", marginBottom: "-1px" });

  return (
    <div>
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: "20px" }}>
        {[["speak", "🎙 영어로 말하기"], ["ask", "🇰🇷 영어로 어떻게?"]].map(([m, label]) =>
          React.createElement("button", { key: m, onClick: () => { setMode(m); setFeedback(null); setTranslation(null); speakRec.reset(); askRec.reset(); }, style: tabBtnStyle(mode === m) }, label)
        )}
      </div>

      {mode === "speak" && (
        <div>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: "20px", borderLeft: `3px solid ${C.gold}` }}>
            <div style={{ fontSize: "15px", color: C.text, marginBottom: "6px" }}>자유롭게 영어로 말해보세요!</div>
            <div style={{ fontSize: "12px", color: C.textMuted }}>오늘 있었던 일, 여행 계획, 꿈 등 무엇이든 영어로 말해보세요.</div>
          </div>
          <div style={{ textAlign: "center" }}>
            {!speakRec.isRecording && !isLoading && (
              <button onClick={speakRec.start} style={{ background: C.text, border: "none", color: C.white, padding: "14px 36px", cursor: "pointer", fontSize: "15px", fontFamily: FONT, letterSpacing: "2px", textTransform: "uppercase" }}>🎙 말하기 시작</button>
            )}
            {speakRec.isRecording && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "14px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.error }} />
                  <span style={{ color: C.error, fontSize: "14px" }}>녹음 중… {speakRec.recordingTime}초</span>
                </div>
                <button onClick={speakRec.stop} style={{ background: C.white, border: `2px solid ${C.error}`, color: C.error, padding: "12px 28px", cursor: "pointer", fontSize: "14px", fontFamily: FONT }}>⏹ 멈추기 (자동 분석)</button>
              </div>
            )}
            {isLoading && <div style={{ padding: "20px", color: C.textMuted, fontSize: "14px" }}>✨ 분석 중…</div>}
          </div>
          {feedback && !feedback.error && (
            <div style={{ marginTop: "20px", background: C.white, border: `1px solid ${C.border}`, padding: "20px" }}>
              {speakTranscription && <div style={{ background: C.bgDark, padding: "10px 14px", marginBottom: "14px", fontSize: "13px", color: C.textMuted, fontStyle: "italic", borderLeft: `3px solid ${C.text}` }}>🎙 "{speakTranscription}"</div>}
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line" }}>{feedback.text}</div>
              <div style={{ marginTop: "12px", padding: "10px 14px", background: feedback.score >= 8 ? "rgba(201,168,76,0.1)" : C.bgDark, border: `1px solid ${feedback.score >= 8 ? C.gold : C.border}`, fontSize: "13px", color: feedback.score >= 8 ? C.gold : C.textMuted }}>
                {feedback.score >= 8 ? "⚡ +15 XP 획득!" : "계속 연습하면 더 좋아질 거예요! 💪"}
              </div>
            </div>
          )}
          {feedback?.error && <div style={{ color: C.error, textAlign: "center", marginTop: "14px", fontSize: "13px" }}>{feedback.error}</div>}
        </div>
      )}

      {mode === "ask" && (
        <div>
          <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "16px 20px", marginBottom: "20px", borderLeft: `3px solid ${C.gold}` }}>
            <div style={{ fontSize: "15px", color: C.text, marginBottom: "6px" }}>영어로 어떻게 말하는지 물어보세요!</div>
            <div style={{ fontSize: "12px", color: C.textMuted }}>한국어로 타이핑하거나 말하면 영어 표현을 알려드릴게요.</div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input value={koreanText} onChange={e => setKoreanText(e.target.value)} onKeyDown={e => e.key === "Enter" && askByText()} placeholder="한국어로 입력하세요… (예: 배고파 죽겠어)" style={{ flex: 1, padding: "12px 14px", border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: "14px", fontFamily: FONT, outline: "none" }} />
            <button onClick={askByText} disabled={isTranslating || !koreanText.trim()} style={{ background: C.text, border: "none", color: C.white, padding: "12px 16px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, whiteSpace: "nowrap", letterSpacing: "1px", opacity: isTranslating || !koreanText.trim() ? 0.5 : 1 }}>타이핑으로 묻기</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
            <div style={{ fontSize: "11px", color: C.textLight, letterSpacing: "1px" }}>또는</div>
            <div style={{ flex: 1, height: "1px", background: C.border }} />
          </div>

          <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "16px", marginBottom: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: C.textMuted, marginBottom: "12px", letterSpacing: "1px" }}>한국어로 말하기 🎙</div>
            {!askRec.isRecording && !isTranslating && (
              <button onClick={askRec.start} style={{ background: C.bgDark, border: `1px solid ${C.border}`, color: C.textMuted, padding: "9px 20px", cursor: "pointer", fontSize: "13px", fontFamily: FONT }}>🎙 말하기 시작</button>
            )}
            {askRec.isRecording && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.error }} />
                  <span style={{ color: C.error, fontSize: "13px" }}>녹음 중… {askRec.recordingTime}초</span>
                </div>
                <button onClick={askRec.stop} style={{ background: C.white, border: `1px solid ${C.error}`, color: C.error, padding: "8px 20px", cursor: "pointer", fontSize: "13px", fontFamily: FONT }}>⏹ 멈추기 (자동 번역)</button>
              </div>
            )}
            {isTranslating && <div style={{ padding: "12px", color: C.textMuted, fontSize: "13px" }}>번역 중…</div>}
          </div>

          {translation && (
            <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "20px" }}>
              <div style={{ fontSize: "14px", color: C.text, lineHeight: 1.9, whiteSpace: "pre-line" }}>{translation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Teacher Screen ────────────────────────────────────────────────────────────
function TeacherScreen({ groups, setGroups, students, setStudents, getPhrases, setPhrases, setScreen, previewGroupId, setPreviewGroupId }) {
  const [tab, setTab] = useState("groups");
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [newPhrase, setNewPhrase] = useState({ en: "", ko: "", context: "" });
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPhrases, setGeneratedPhrases] = useState([]);
  const [success, setSuccess] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };
  const groupStudents = (gid) => students.filter(s => s.groupId === gid);
  const avgXP = (gid) => { const gs = groupStudents(gid); if (!gs.length) return 0; return Math.round(gs.reduce((a, b) => a + (b.xp || 0), 0) / gs.length); };

  const handleEnBlur = async (en) => {
    if (en.trim().length < 4) return;
    setIsAutoFilling(true);
    try {
      const filled = await autoFillPhrase(en);
      setNewPhrase(p => ({ ...p, ko: filled.ko || p.ko, context: filled.context || p.context }));
    } catch(e) {}
    setIsAutoFilling(false);
  };

  const addPhrase = () => {
    if (!newPhrase.en.trim() || !selectedGroup) return;
    const current = getPhrases(selectedGroup.id);
    setPhrases(selectedGroup.id, [...current, { id: "p" + Date.now(), ...newPhrase }]);
    setNewPhrase({ en: "", ko: "", context: "" });
    showSuccess("Phrase added to " + selectedGroup.name + "!");
  };

  const deletePhrase = (groupId, phraseId) => setPhrases(groupId, getPhrases(groupId).filter(p => p.id !== phraseId));

  const addGenerated = () => {
    if (!generatedPhrases.length || !selectedGroup) return;
    const current = getPhrases(selectedGroup.id);
    setPhrases(selectedGroup.id, [...current, ...generatedPhrases.map((p, i) => ({ id: "gp" + Date.now() + i, ...p }))]);
    setGeneratedPhrases([]); setGenerateTopic("");
    showSuccess("Phrases added!");
  };

  const generate = async () => {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    try { setGeneratedPhrases(await generatePhrases(generateTopic)); } catch(e) {}
    setIsGenerating(false);
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    setGroups(prev => [...prev, { id: "g" + Date.now(), name: newGroupName }]);
    setNewGroupName(""); showSuccess("Group created!");
  };

  const updateStudentGroup = (studentId, newGroupId) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, groupId: newGroupId } : s));
    showSuccess("Student group updated!");
  };

  const inputStyle = { width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: "13px", fontFamily: FONT, outline: "none", boxSizing: "border-box" };
  const tabBtn = (active) => ({ padding: "12px 16px", border: "none", borderBottom: active ? `2px solid ${C.text}` : "2px solid transparent", background: "transparent", color: active ? C.text : C.textLight, cursor: "pointer", fontSize: "12px", fontFamily: FONT, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "-1px", whiteSpace: "nowrap" });

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.text }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, ${C.gold}, ${C.text})`, zIndex: 20 }} />
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: "20px", color: C.text, letterSpacing: "4px", textTransform: "uppercase" }}>WAYVE</div>
          <div style={{ fontSize: "11px", color: C.textMuted, letterSpacing: "2px", textTransform: "uppercase" }}>Teacher Dashboard</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, padding: "6px 14px", cursor: "pointer", fontSize: "12px", fontFamily: FONT, letterSpacing: "1px" }}>Log out</button>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.white, padding: "0 20px", overflowX: "auto" }}>
        {[["groups", "Groups"], ["phrases", "Phrases"], ["add", "Add Phrases"], ["students", "Students"]].map(([t, label]) =>
          React.createElement("button", { key: t, onClick: () => setTab(t), style: tabBtn(tab === t) }, label)
        )}
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 16px" }}>
        {success && <div style={{ background: "rgba(74,124,89,0.1)", border: `1px solid ${C.success}`, color: C.success, padding: "10px 16px", marginBottom: "16px", fontSize: "13px" }}>{success}</div>}

        {tab === "groups" && (
          <div>
            {groups.map(g => {
              const gs = groupStudents(g.id);
              return React.createElement("div", { key: g.id, style: { background: C.white, border: `1px solid ${C.border}`, padding: "20px", marginBottom: "12px" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" } },
                  React.createElement("div", { style: { fontSize: "15px", color: C.text, fontWeight: "400" } }, g.name),
                  React.createElement("button", {
                    onClick: () => { setPreviewGroupId(g.id); setScreen("preview"); },
                    style: { background: C.gold, border: "none", color: C.white, padding: "6px 14px", cursor: "pointer", fontSize: "11px", fontFamily: FONT, letterSpacing: "1px", textTransform: "uppercase" }
                  }, "👁 Preview")
                ),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: gs.length > 0 ? "14px" : "0" } },
                  [["Students", gs.length], ["Avg XP", avgXP(g.id)], ["Phrases", getPhrases(g.id).length]].map(([label, val]) =>
                    React.createElement("div", { key: label, style: { background: C.bgDark, padding: "10px", textAlign: "center", border: `1px solid ${C.border}` } },
                      React.createElement("div", { style: { fontSize: "18px", color: C.gold, fontWeight: "600" } }, val),
                      React.createElement("div", { style: { fontSize: "10px", color: C.textLight, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" } }, label)
                    )
                  )
                ),
                gs.sort((a, b) => (b.xp || 0) - (a.xp || 0)).map(s =>
                  React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.bgDark}`, fontSize: "12px" } },
                    React.createElement("span", { style: { color: C.textMuted } }, s.name),
                    React.createElement("span", { style: { color: C.gold } }, "⚡" + (s.xp || 0) + "  🔥" + (s.streak || 0) + "일  " + getLevel(s.xp || 0).emoji)
                  )
                )
              );
            })}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "16px", marginTop: "12px" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: C.textLight, textTransform: "uppercase", marginBottom: "10px" }}>New Group</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && addGroup()} placeholder="Group name" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={addGroup} style={{ background: C.text, border: "none", color: C.white, padding: "10px 16px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, whiteSpace: "nowrap", letterSpacing: "1px" }}>만들기</button>
              </div>
            </div>
          </div>
        )}

        {tab === "students" && (
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "3px", color: C.textLight, textTransform: "uppercase", marginBottom: "14px" }}>Assign Students to Groups</div>
            {students.length === 0
              ? React.createElement("div", { style: { textAlign: "center", color: C.textLight, padding: "40px", fontStyle: "italic" } }, "No students registered yet.")
              : students.map(s => {
                const [editing, setEditing] = useState(false);
                const [tmpGroup, setTmpGroup] = useState(s.groupId);
                return React.createElement("div", { key: s.id, style: { background: C.white, border: `1px solid ${C.border}`, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" } },
                  React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: "14px", color: C.text } }, s.name),
                    React.createElement("div", { style: { fontSize: "11px", color: C.textMuted, marginTop: "2px" } }, groups.find(g => g.id === s.groupId)?.name || "No group")
                  ),
                  editing
                    ? React.createElement("div", { style: { display: "flex", gap: "6px", alignItems: "center" } },
                      React.createElement("select", { value: tmpGroup, onChange: e => setTmpGroup(e.target.value), style: { padding: "6px 10px", border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: "12px", fontFamily: FONT, outline: "none" } },
                        groups.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))
                      ),
                      React.createElement("button", { onClick: () => { updateStudentGroup(s.id, tmpGroup); setEditing(false); }, style: { background: C.success, border: "none", color: C.white, padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontFamily: FONT } }, "저장"),
                      React.createElement("button", { onClick: () => setEditing(false), style: { background: "transparent", border: `1px solid ${C.border}`, color: C.textMuted, padding: "6px 10px", cursor: "pointer", fontSize: "12px" } }, "✕")
                    )
                    : React.createElement("button", { onClick: () => setEditing(true), style: { background: C.bgDark, border: `1px solid ${C.border}`, color: C.textMuted, padding: "6px 12px", cursor: "pointer", fontSize: "12px", fontFamily: FONT } }, "그룹 변경")
                );
              })
            }
          </div>
        )}

        {tab === "phrases" && (
          <div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {groups.map(g => React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "7px 14px", border: `1px solid ${selectedGroup?.id === g.id ? C.text : C.border}`, background: selectedGroup?.id === g.id ? C.text : C.white, color: selectedGroup?.id === g.id ? C.white : C.textMuted, cursor: "pointer", fontSize: "12px", fontFamily: FONT, letterSpacing: "1px" } }, g.name))}
            </div>
            {selectedGroup && (
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "2px", color: C.textLight, textTransform: "uppercase", marginBottom: "10px" }}>{getPhrases(selectedGroup.id).length} phrases — {selectedGroup.name}</div>
                {getPhrases(selectedGroup.id).length === 0
                  ? React.createElement("div", { style: { textAlign: "center", color: C.textLight, padding: "30px", fontStyle: "italic", fontSize: "13px" } }, "No phrases yet. Use the Add Phrases tab!")
                  : getPhrases(selectedGroup.id).map(p => React.createElement("div", { key: p.id, style: { background: C.white, border: `1px solid ${C.border}`, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "14px", color: C.text, fontStyle: "italic" } }, p.en),
                      p.ko && React.createElement("div", { style: { fontSize: "11px", color: C.textMuted, marginTop: "2px" } }, p.ko)
                    ),
                    React.createElement("button", { onClick: () => deletePhrase(selectedGroup.id, p.id), style: { background: "transparent", border: "none", color: C.textLight, cursor: "pointer", fontSize: "18px" } }, "×")
                  ))
                }
              </div>
            )}
          </div>
        )}

        {tab === "add" && (
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: C.textLight, textTransform: "uppercase", marginBottom: "10px" }}>Select Group</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              {groups.map(g => React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "7px 14px", border: `1px solid ${selectedGroup?.id === g.id ? C.gold : C.border}`, background: selectedGroup?.id === g.id ? C.gold : C.white, color: selectedGroup?.id === g.id ? C.white : C.textMuted, cursor: "pointer", fontSize: "12px", fontFamily: FONT, letterSpacing: "1px" } }, g.name))}
            </div>

            {/* AI Generate */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "20px", marginBottom: "16px", borderLeft: `3px solid ${C.gold}` }}>
              <div style={{ fontSize: "13px", color: C.gold, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>✨ AI Generate</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="Topic (e.g. at the coffee shop, making plans)" style={{ ...inputStyle, flex: 1 }} />
                <button onClick={generate} disabled={isGenerating} style={{ background: isGenerating ? C.bgDark : C.text, border: "none", color: C.white, padding: "10px 14px", cursor: "pointer", fontSize: "13px", fontFamily: FONT, whiteSpace: "nowrap", letterSpacing: "1px", opacity: isGenerating ? 0.6 : 1 }}>{isGenerating ? "생성 중…" : "생성"}</button>
              </div>
              {generatedPhrases.length > 0 && (
                <div>
                  {generatedPhrases.map((p, i) => React.createElement("div", { key: i, style: { padding: "8px 0", borderBottom: `1px solid ${C.bgDark}` } },
                    React.createElement("div", { style: { fontSize: "13px", color: C.text, fontStyle: "italic" } }, p.en),
                    React.createElement("div", { style: { fontSize: "11px", color: C.textMuted } }, p.ko)
                  ))}
                  <button onClick={addGenerated} style={{ background: C.text, border: "none", color: C.white, padding: "10px", cursor: "pointer", width: "100%", fontSize: "13px", fontFamily: FONT, marginTop: "12px", letterSpacing: "1px" }}>📤 {selectedGroup?.name}에 추가</button>
                </div>
              )}
            </div>

            {/* Manual Add */}
            <div style={{ background: C.white, border: `1px solid ${C.border}`, padding: "20px" }}>
              <div style={{ fontSize: "13px", color: C.text, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "14px" }}>➕ Add Manually</div>
              <div style={{ marginBottom: "8px" }}>
                <label style={{ fontSize: "10px", letterSpacing: "2px", color: C.textLight, textTransform: "uppercase", display: "block", marginBottom: "4px" }}>English Phrase *</label>
                <input value={newPhrase.en} onChange={e => setNewPhrase(p => ({ ...p, en: e.target.value }))} onBlur={e => handleEnBlur(e.target.value)} placeholder="Type English phrase — Korean & context auto-fill on tab" style={inputStyle} />
              </div>
              {isAutoFilling && <div style={{ fontSize: "11px", color: C.gold, marginBottom: "6px", letterSpacing: "1px" }}>✨ Auto-filling…</div>}
              <div style={{ marginBottom: "8px" }}>
                <label style={{ fontSize: "10px", letterSpacing: "2px", color: C.textLight, textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Korean Translation (auto-filled)</label>
                <input value={newPhrase.ko} onChange={e => setNewPhrase(p => ({ ...p, ko: e.target.value }))} placeholder="Korean translation" style={inputStyle} />
              </div>
              <div style={{ marginBottom: "14px" }}>
                <label style={{ fontSize: "10px", letterSpacing: "2px", color: C.textLight, textTransform: "uppercase", display: "block", marginBottom: "4px" }}>Context (auto-filled)</label>
                <input value={newPhrase.context} onChange={e => setNewPhrase(p => ({ ...p, context: e.target.value }))} placeholder="When to use this phrase" style={inputStyle} />
              </div>
              <button onClick={addPhrase} style={{ background: C.text, border: "none", color: C.white, padding: "12px", cursor: "pointer", width: "100%", fontSize: "13px", fontFamily: FONT, letterSpacing: "2px", textTransform: "uppercase" }}>
                Add to {selectedGroup?.name}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
