import React, { useState, useRef, useEffect } from "react";

const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} };
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } };
const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;

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
      return React.createElement("span", { key: i, style: { color: found ? "#e2e8f0" : "#fc8181", textDecoration: found ? "none" : "underline", fontWeight: found ? "normal" : "bold" } }, word + (i < targetWords.length - 1 ? " " : ""));
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

async function getPhraseFeedback(transcription, phrase) {
  const system = `You are Tom, a warm English coach for Korean learners at Wayve. 
CRITICAL LANGUAGE RULE: Write ONLY in Korean (한글) and English (Latin alphabet). 
NEVER use Chinese characters (漢字/汉字), Japanese (かな), Russian (Кириллица), or ANY other script.
Every single character must be either Korean hangul, English letters, numbers, spaces, punctuation, or emoji.
The motivational line must use ONLY pure Korean hangul — common examples: 잘하고 있어요! 화이팅! 계속 연습해요! 정말 잘했어요! 조금만 더 연습해요!`;

  const text = await groq(`Target phrase: "${phrase.en}"
Context: "${phrase.context || "Practice this phrase naturally"}"
Student said: "${transcription}"

Give warm bilingual feedback in KOREAN and ENGLISH only:

🎯 점수: X/10
[Korean explanation — hangul only]

✅ 잘한 점
[Korean encouragement — hangul only]

📝 피드백
[Korean explanation of any issues — hangul only]
→ [Corrected English if needed, or write: 완벽해요!]

💡 이렇게도 말할 수 있어요
→ [Alternative natural English expression]

💪 [Short Korean motivation — pure hangul ONLY, NO Chinese characters]

Under 130 words. KOREAN HANGUL and ENGLISH ONLY — absolutely no other scripts.`, system);

  const scoreMatch = text.match(/점수.*?(\d+)\/10/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
  return { text, score };
}

async function getFreeTalkFeedback(transcription) {
  const system = `You are Tom, a warm English coach for Korean learners at Wayve.
CRITICAL LANGUAGE RULE: Write ONLY in Korean (한글) and English (Latin alphabet).
NEVER use Chinese characters, Japanese, Russian, or any other script.
Motivational line must be pure Korean hangul only.`;

  const text = await groq(`Student said in English (free talk): "${transcription}"

Give warm grammar feedback in KOREAN and ENGLISH only:

🎯 점수: X/10
[Korean explanation — hangul only]

✅ 잘한 점
[Korean encouragement — hangul only]

📝 문법 피드백
[Korean explanation — hangul only]
→ [Corrected English if needed]

💡 이렇게도 말할 수 있어요
→ [More natural English version]

💪 [Short Korean motivation — pure hangul ONLY — NO Chinese characters]

Under 130 words. KOREAN HANGUL and ENGLISH ONLY.`, system);

  const scoreMatch = text.match(/점수.*?(\d+)\/10/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
  return { text, score };
}

async function getKoreanTranslation(input, isVoice) {
  const system = `You are Tom, a warm English teacher for Korean learners at Wayve.
CRITICAL: Write ONLY in Korean hangul and English. NO Chinese, Japanese, Russian or other scripts.`;

  return await groq(`A student ${isVoice ? "said" : "asked"} in Korean: "${input}"
They want to know how to say this in English.

Respond in KOREAN HANGUL and ENGLISH only:

🇰🇷 한국어 표현
${input}

🗣 영어로는 이렇게 말해요!
[The English translation — clear and natural]

📌 예문
1. "[English sentence]"
→ [Korean translation — hangul only]

2. "[English sentence]"
→ [Korean translation — hangul only]

💡 사용 팁
[One short Korean tip — hangul only]

💪 [Encouraging Korean sentence — pure hangul ONLY, no Chinese]

Korean hangul and English ONLY. Under 130 words.`, system);
}

async function autoFillPhrase(en) {
  const system = "You are a helpful assistant. Respond ONLY with valid JSON. No extra text.";
  const text = await groq(`For this English phrase: "${en}"
Provide a Korean translation and usage context.
Return ONLY this JSON:
{"ko": "Korean translation here", "context": "When to use this phrase in English"}`, system);
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); } catch(e) { return { ko: "", context: "" }; }
}

async function generatePhrases(topic) {
  const system = "You are a helpful assistant. Respond ONLY with valid JSON. No extra text.";
  const text = await groq(`Generate 5 natural English phrases for Korean learners about: "${topic}".
Return ONLY this JSON array:
[{"en":"...","ko":"...","context":"..."}]`, system);
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── Recording Hook ────────────────────────────────────────────────────────────
function useRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => { setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach(t => t.stop()); };
      mr.start(); setIsRecording(true); setRecordingTime(0); setAudioBlob(null);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch(e) { alert("마이크 접근이 필요합니다. 브라우저 설정에서 마이크를 허용해 주세요."); }
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
  if (screen === "teacher") return React.createElement(TeacherScreen, { groups, setGroups, students, getPhrases, setPhrases, setScreen });
  if (screen === "student") return React.createElement(StudentScreen, { user: currentUser, groups, students, updateStudent, setScreen, getPhrases, levelUp, setLevelUp });
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
    // Assign to first group by default — teacher can change on backend
    const s = { id: Date.now(), name: name.trim(), groupId: groups[0]?.id || "g1", xp: 0, streak: 0, longestStreak: 0, lastPractice: null, sessions: [], completedPhrases: [] };
    setStudents(p => [...p, s]);
    setCurrentUser(s); setScreen("student");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%, rgba(99,179,237,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(252,211,77,0.08) 0%, transparent 50%)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "48px", fontWeight: "bold", color: "#fff", letterSpacing: "-2px", marginBottom: "6px" }}>WAYVE</div>
          <div style={{ fontSize: "13px", color: "#63b3ed", letterSpacing: "4px", textTransform: "uppercase" }}>English Confidence</div>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "4px", marginBottom: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
          {[["login", "Login"], ["register", "Register"], ["teacher", "Teacher"]].map(([m, label]) =>
            React.createElement("button", { key: m, onClick: () => { setMode(m); setError(""); }, style: { flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: mode === m ? "rgba(99,179,237,0.2)" : "transparent", color: mode === m ? "#63b3ed" : "#718096", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" } }, label)
          )}
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "20px", padding: "28px", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(mode === "login" || mode === "register") && (
            <div>
              <label style={{ fontSize: "11px", letterSpacing: "2px", color: "#718096", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>이름 / Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && (mode === "login" ? login() : register())} placeholder="Enter your name" style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "16px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {error && <div style={{ color: "#fc8181", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={mode === "login" ? login : register} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #63b3ed, #4299e1)", color: "#fff", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {mode === "login" ? "입장하기 →" : "Wayve 참여하기 →"}
              </button>
            </div>
          )}
          {mode === "teacher" && (
            <div>
              <label style={{ fontSize: "11px", letterSpacing: "2px", color: "#718096", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && (pass === TEACHER_PASS ? setScreen("teacher") : setError("Wrong password"))} placeholder="Enter teacher password" style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "16px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {error && <div style={{ color: "#fc8181", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={() => pass === TEACHER_PASS ? setScreen("teacher") : setError("Wrong password")} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #fcd34d, #f59e0b)", color: "#1a1a1a", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Teacher Dashboard →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({ user, groups, students, updateStudent, setScreen, getPhrases, levelUp, setLevelUp }) {
  const [tab, setTab] = useState("practice");
  const currentLevel = getLevel(user.xp || 0);
  const nextLevel = getNextLevel(user.xp || 0);
  const xpProgress = nextLevel ? ((user.xp || 0) - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired) * 100 : 100;
  const group = groups.find(g => g.id === user.groupId);
  const groupStudents = students.filter(s => s.groupId === user.groupId).sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const phrases = getPhrases(user.groupId);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Georgia, serif", color: "#e2e8f0" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #63b3ed, #fcd34d)", zIndex: 20 }} />

      {levelUp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setLevelUp(null)}>
          <div style={{ background: "linear-gradient(135deg, #1a2332, #0d1117)", border: "2px solid rgba(252,211,77,0.5)", borderRadius: "24px", padding: "48px 36px", textAlign: "center", maxWidth: "320px" }}>
            <div style={{ fontSize: "72px", marginBottom: "16px" }}>{levelUp.emoji}</div>
            <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#63b3ed", textTransform: "uppercase", marginBottom: "8px" }}>레벨 업! 🎉</div>
            <div style={{ fontSize: "22px", color: "#fcd34d", marginBottom: "10px" }}>{levelUp.name}</div>
            <div style={{ fontSize: "15px", color: "#a0aec0", marginBottom: "24px" }}>{levelUp.milestone}</div>
            <button onClick={() => setLevelUp(null)} style={{ background: "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "12px 28px", borderRadius: "20px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif" }}>계속 가자! 🚀</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "rgba(13,17,23,0.96)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 18px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            {/* Big streak display */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "32px", fontWeight: "bold", color: (user.streak || 0) > 0 ? "#f6ad55" : "#4a5568", lineHeight: 1 }}>🔥{user.streak || 0}</div>
              <div style={{ fontSize: "9px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px" }}>연속</div>
              {(user.longestStreak || 0) > 0 && <div style={{ fontSize: "9px", color: "#4a5568" }}>최고 {user.longestStreak || 0}일</div>}
            </div>
            <div>
              <div style={{ fontSize: "17px", color: "#fff" }}>Hi, {user.name}! 👋</div>
              <div style={{ fontSize: "11px", color: "#718096" }}>{currentLevel.emoji} {currentLevel.name}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.25)", borderRadius: "18px", padding: "5px 11px", fontSize: "13px", color: "#fcd34d" }}>⚡ {user.xp || 0}</div>
            <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", padding: "5px 11px", borderRadius: "18px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>나가기</button>
          </div>
        </div>
        {/* XP bar only — no level names */}
        <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${xpProgress}%`, background: "linear-gradient(90deg, #63b3ed, #fcd34d)", borderRadius: "2px", transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "6px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", overflowX: "auto" }}>
        {[["practice", "🎙 Practice"], ["freetalk", "💬 Free Talk"], ["leaderboard", "🏆 순위"], ["progress", "📊 Progress"]].map(([t, label]) =>
          React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "7px 13px", borderRadius: "18px", border: "1px solid " + (tab === t ? "rgba(99,179,237,0.3)" : "transparent"), background: tab === t ? "rgba(99,179,237,0.14)" : "transparent", color: tab === t ? "#63b3ed" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" } }, label)
        )}
      </div>

      <div style={{ maxWidth: "660px", margin: "0 auto", padding: "16px" }}>
        {tab === "practice" && React.createElement(PracticeTab, { user, phrases, updateStudent })}
        {tab === "freetalk" && React.createElement(FreeTalkTab, { user, updateStudent })}
        {tab === "leaderboard" && (
          <div>
            <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "14px" }}>{group?.name}</div>
            {groupStudents.length === 0
              ? React.createElement("div", { style: { textAlign: "center", color: "#4a5568", padding: "40px", fontStyle: "italic" } }, "아직 그룹원이 없어요.")
              : groupStudents.map((s, i) => {
                const lv = getLevel(s.xp || 0);
                const isMe = s.id === user.id;
                return React.createElement("div", { key: s.id, style: { background: isMe ? "rgba(99,179,237,0.07)" : "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "13px 16px", marginBottom: "8px", border: "1px solid " + (isMe ? "rgba(99,179,237,0.22)" : "rgba(255,255,255,0.05)"), display: "flex", alignItems: "center", gap: "12px" } },
                  React.createElement("div", { style: { fontSize: "17px", width: "26px", textAlign: "center" } }, i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`),
                  React.createElement("div", { style: { flex: 1 } },
                    React.createElement("div", { style: { fontSize: "14px", color: isMe ? "#63b3ed" : "#e2e8f0" } }, s.name + (isMe ? " (나)" : "")),
                    React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, lv.emoji + " " + lv.name + "  🔥" + (s.streak || 0))
                  ),
                  React.createElement("div", { style: { fontSize: "13px", color: "#fcd34d" } }, "⚡ " + (s.xp || 0))
                );
              })
            }
          </div>
        )}
        {tab === "progress" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[["🔥", user.streak || 0, "현재 연속", "최고 " + (user.longestStreak || 0) + "일"], ["⚡", user.xp || 0, "XP", ""], ["✅", (user.completedPhrases || []).length, "완료", ""]].map(([emoji, val, label, sub]) =>
                React.createElement("div", { key: label, style: { background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px 10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" } },
                  React.createElement("div", { style: { fontSize: "20px", marginBottom: "4px" } }, emoji),
                  React.createElement("div", { style: { fontSize: "22px", color: "#fff", marginBottom: "2px" } }, val),
                  React.createElement("div", { style: { fontSize: "10px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px" } }, label),
                  sub ? React.createElement("div", { style: { fontSize: "10px", color: "#4a5568", marginTop: "2px" } }, sub) : null
                )
              )}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "12px" }}>레벨 여정</div>
              {LEVELS.map(lv => {
                const unlocked = (user.xp || 0) >= lv.xpRequired;
                const current = currentLevel.level === lv.level;
                return React.createElement("div", { key: lv.level, style: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", opacity: unlocked ? 1 : 0.3 } },
                  React.createElement("div", { style: { fontSize: "16px" } }, lv.emoji),
                  React.createElement("div", { style: { flex: 1 } },
                    React.createElement("div", { style: { fontSize: "13px", color: current ? "#fcd34d" : unlocked ? "#e2e8f0" : "#4a5568" } }, lv.name + (current ? " ← 현재" : "")),
                    React.createElement("div", { style: { fontSize: "10px", color: "#718096" } }, lv.milestone)
                  ),
                  unlocked && React.createElement("div", { style: { fontSize: "14px" } }, "✅")
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Practice Tab ──────────────────────────────────────────────────────────────
function PracticeTab({ user, phrases, updateStudent }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const rec = useRecorder();

  const selectedPhrase = phrases[phraseIndex] || null;

  const nextPhrase = () => {
    if (phraseIndex < phrases.length - 1) {
      setPhraseIndex(i => i + 1);
      setFeedback(null);
      rec.reset();
    }
  };

  const prevPhrase = () => {
    if (phraseIndex > 0) {
      setPhraseIndex(i => i - 1);
      setFeedback(null);
      rec.reset();
    }
  };

  const submit = async () => {
    if (!rec.audioBlob || !selectedPhrase) return;
    setIsLoading(true); setFeedback(null);
    try {
      const transcription = await transcribeAudio(rec.audioBlob);
      const { text, score } = await getPhraseFeedback(transcription, selectedPhrase);
      setFeedback({ text, transcription, score });
      if (score >= 8) {
        const already = (user.completedPhrases || []).includes(selectedPhrase.id);
        const xpGain = already ? 5 : 25;
        const today = new Date().toDateString();
        const isNewDay = user.lastPractice !== today;
        const newStreak = isNewDay ? (user.streak || 0) + 1 : (user.streak || 0);
        const newLongest = Math.max(newStreak, user.longestStreak || 0);
        updateStudent({ ...user, xp: (user.xp || 0) + xpGain, streak: newStreak, longestStreak: newLongest, lastPractice: today, totalSessions: (user.totalSessions || 0) + 1, completedPhrases: already ? (user.completedPhrases || []) : [...(user.completedPhrases || []), selectedPhrase.id], sessions: [{ date: new Date().toLocaleDateString(), phrase: selectedPhrase.en, xp: xpGain }, ...(user.sessions || []).slice(0, 49)] });
      }
    } catch(e) { setFeedback({ error: "피드백을 불러올 수 없어요. 다시 시도해 주세요!" }); }
    setIsLoading(false);
  };

  if (phrases.length === 0) {
    return React.createElement("div", { style: { textAlign: "center", padding: "60px 20px" } },
      React.createElement("div", { style: { fontSize: "40px", marginBottom: "16px" } }, "📭"),
      React.createElement("div", { style: { fontSize: "16px", color: "#718096", fontStyle: "italic" } }, "아직 배정된 문장이 없어요."),
      React.createElement("div", { style: { fontSize: "13px", color: "#4a5568", marginTop: "8px" } }, "수업 후에 선생님이 이번 주 문장을 추가해 드릴게요!")
    );
  }

  return (
    <div>
      {/* Phrase navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <button onClick={prevPhrase} disabled={phraseIndex === 0} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: phraseIndex === 0 ? "#2d3748" : "#718096", padding: "7px 14px", borderRadius: "16px", cursor: phraseIndex === 0 ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>← 이전</button>
        <div style={{ fontSize: "12px", color: "#718096" }}>{phraseIndex + 1} / {phrases.length}</div>
        <button onClick={nextPhrase} disabled={phraseIndex === phrases.length - 1} style={{ background: phraseIndex === phrases.length - 1 ? "transparent" : "rgba(99,179,237,0.14)", border: "1px solid " + (phraseIndex === phrases.length - 1 ? "rgba(255,255,255,0.08)" : "rgba(99,179,237,0.3)"), color: phraseIndex === phrases.length - 1 ? "#2d3748" : "#63b3ed", padding: "7px 14px", borderRadius: "16px", cursor: phraseIndex === phrases.length - 1 ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>다음 →</button>
      </div>

      {/* Phrase mini list */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
        {phrases.map((p, i) => {
          const done = (user.completedPhrases || []).includes(p.id);
          return React.createElement("button", { key: p.id, onClick: () => { setPhraseIndex(i); setFeedback(null); rec.reset(); }, style: { width: "28px", height: "28px", borderRadius: "50%", border: "2px solid " + (i === phraseIndex ? "#63b3ed" : done ? "#48bb78" : "rgba(255,255,255,0.1)"), background: i === phraseIndex ? "rgba(99,179,237,0.2)" : done ? "rgba(72,187,120,0.15)" : "transparent", color: i === phraseIndex ? "#63b3ed" : done ? "#48bb78" : "#718096", cursor: "pointer", fontSize: "11px", fontFamily: "Georgia, serif", display: "flex", alignItems: "center", justifyContent: "center" } }, done ? "✓" : i + 1);
        })}
      </div>

      {selectedPhrase && (
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "16px", padding: "22px", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: "22px", fontStyle: "italic", color: "#fff", marginBottom: "6px", textAlign: "center" }}>"{selectedPhrase.en}"</div>
          {selectedPhrase.ko && <div style={{ fontSize: "14px", color: "#718096", textAlign: "center", marginBottom: "6px" }}>{selectedPhrase.ko}</div>}
          {selectedPhrase.context && <div style={{ background: "rgba(99,179,237,0.07)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#63b3ed", marginBottom: "16px", textAlign: "center" }}>{selectedPhrase.context}</div>}

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
            <button onClick={() => speak(selectedPhrase.en)} style={{ background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.2)", color: "#63b3ed", padding: "8px 18px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>🔊 들어보기</button>
          </div>

          <div style={{ textAlign: "center" }}>
            {!rec.isRecording && !rec.audioBlob && (
              <button onClick={rec.start} style={{ background: "linear-gradient(135deg, #fc8181, #f56565)", border: "none", color: "#fff", padding: "13px 30px", borderRadius: "26px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif", boxShadow: "0 6px 16px rgba(245,101,101,0.28)" }}>🎙 녹음 시작</button>
            )}
            {rec.isRecording && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fc8181" }} />
                  <span style={{ color: "#fc8181", fontSize: "14px" }}>녹음 중… {rec.recordingTime}초</span>
                </div>
                <button onClick={rec.stop} style={{ background: "rgba(245,101,101,0.12)", border: "2px solid #fc8181", color: "#fc8181", padding: "11px 26px", borderRadius: "26px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>⏹ 멈추기</button>
              </div>
            )}
            {rec.audioBlob && !rec.isRecording && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <audio src={URL.createObjectURL(rec.audioBlob)} controls style={{ width: "100%", maxWidth: "260px", height: "36px" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={submit} disabled={isLoading} style={{ background: isLoading ? "rgba(99,179,237,0.14)" : "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "20px", cursor: isLoading ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>
                    {isLoading ? "분석 중…" : "✨ 피드백 받기"}
                  </button>
                  <button onClick={rec.reset} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#718096", padding: "12px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>↺</button>
                </div>
              </div>
            )}
          </div>

          {feedback && !feedback.error && (
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {feedback.transcription && (
                <div style={{ background: "rgba(99,179,237,0.06)", borderRadius: "8px", padding: "9px 12px", marginBottom: "12px", fontSize: "13px", color: "#63b3ed" }}>
                  🎙 {highlightMissedWords(selectedPhrase.en, feedback.transcription)}
                </div>
              )}
              <div style={{ fontSize: "14px", color: "#a0aec0", lineHeight: 1.85, whiteSpace: "pre-line" }}>{feedback.text}</div>
              {feedback.score >= 8 ? (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ padding: "10px 12px", background: "rgba(252,211,77,0.07)", borderRadius: "8px", fontSize: "13px", color: "#fcd34d", marginBottom: "10px" }}>⚡ +25 XP 획득! 잘했어요! 🎉</div>
                  {phraseIndex < phrases.length - 1 && (
                    <button onClick={nextPhrase} style={{ background: "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "10px 20px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", width: "100%" }}>다음 문장 →</button>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "12px", padding: "12px", background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.2)", borderRadius: "8px" }}>
                  <div style={{ fontSize: "13px", color: "#fc8181", marginBottom: "8px" }}>8점 이상이어야 XP를 얻을 수 있어요. 다시 도전해 보세요! 💪</div>
                  <button onClick={() => { rec.reset(); setFeedback(null); }} style={{ background: "rgba(245,101,101,0.15)", border: "1px solid rgba(245,101,101,0.3)", color: "#fc8181", padding: "7px 16px", borderRadius: "14px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>🔄 다시 시도</button>
                </div>
              )}
            </div>
          )}
          {feedback?.error && <div style={{ color: "#fc8181", textAlign: "center", marginTop: "14px", fontSize: "13px" }}>{feedback.error}</div>}
        </div>
      )}
    </div>
  );
}

// ── Free Talk Tab ─────────────────────────────────────────────────────────────
function FreeTalkTab({ user, updateStudent }) {
  const [mode, setMode] = useState("speak");
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [koreanText, setKoreanText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const rec = useRecorder();
  const askRec = useRecorder();

  const submitFreeTalk = async () => {
    if (!rec.audioBlob) return;
    setIsLoading(true); setFeedback(null);
    try {
      const transcription = await transcribeAudio(rec.audioBlob);
      const { text, score } = await getFreeTalkFeedback(transcription);
      setFeedback({ text, transcription, score });
      if (score >= 8) {
        const today = new Date().toDateString();
        const isNewDay = user.lastPractice !== today;
        const newStreak = isNewDay ? (user.streak || 0) + 1 : (user.streak || 0);
        const newLongest = Math.max(newStreak, user.longestStreak || 0);
        updateStudent({ ...user, xp: (user.xp || 0) + 15, streak: newStreak, longestStreak: newLongest, lastPractice: today, totalSessions: (user.totalSessions || 0) + 1, sessions: [{ date: new Date().toLocaleDateString(), phrase: "Free Talk", xp: 15 }, ...(user.sessions || []).slice(0, 49)] });
      }
    } catch(e) { setFeedback({ error: "피드백을 불러올 수 없어요." }); }
    setIsLoading(false);
  };

  const askByText = async () => {
    if (!koreanText.trim()) return;
    setIsTranslating(true); setTranslation(null);
    try { setTranslation(await getKoreanTranslation(koreanText, false)); } catch(e) { setTranslation("번역을 불러올 수 없어요. 다시 시도해 주세요."); }
    setIsTranslating(false);
  };

  const askByVoice = async () => {
    if (!askRec.audioBlob) return;
    setIsTranslating(true); setTranslation(null);
    try {
      const transcription = await transcribeAudio(askRec.audioBlob);
      setKoreanText(transcription);
      setTranslation(await getKoreanTranslation(transcription, true));
    } catch(e) { setTranslation("번역을 불러올 수 없어요."); }
    setIsTranslating(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {[["speak", "🎙 영어로 말하기"], ["ask", "🇰🇷 영어로 어떻게?"]].map(([m, label]) =>
          React.createElement("button", { key: m, onClick: () => { setMode(m); setFeedback(null); setTranslation(null); rec.reset(); askRec.reset(); }, style: { flex: 1, padding: "10px", borderRadius: "16px", border: "1px solid " + (mode === m ? "rgba(99,179,237,0.3)" : "rgba(255,255,255,0.06)"), background: mode === m ? "rgba(99,179,237,0.12)" : "transparent", color: mode === m ? "#63b3ed" : "#718096", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" } }, label)
        )}
      </div>

      {mode === "speak" && (
        <div>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
            <div style={{ fontSize: "15px", color: "#e2e8f0", marginBottom: "6px" }}>자유롭게 영어로 말해보세요!</div>
            <div style={{ fontSize: "12px", color: "#718096" }}>오늘 있었던 일, 여행 계획, 꿈 등 무엇이든 영어로 말해보세요.</div>
          </div>
          <div style={{ textAlign: "center" }}>
            {!rec.isRecording && !rec.audioBlob && <button onClick={rec.start} style={{ background: "linear-gradient(135deg, #fc8181, #f56565)", border: "none", color: "#fff", padding: "13px 30px", borderRadius: "26px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif", boxShadow: "0 6px 16px rgba(245,101,101,0.28)" }}>🎙 말하기 시작</button>}
            {rec.isRecording && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fc8181" }} />
                  <span style={{ color: "#fc8181", fontSize: "14px" }}>녹음 중… {rec.recordingTime}초</span>
                </div>
                <button onClick={rec.stop} style={{ background: "rgba(245,101,101,0.12)", border: "2px solid #fc8181", color: "#fc8181", padding: "11px 26px", borderRadius: "26px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>⏹ 멈추기</button>
              </div>
            )}
            {rec.audioBlob && !rec.isRecording && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <audio src={URL.createObjectURL(rec.audioBlob)} controls style={{ width: "100%", maxWidth: "260px", height: "36px" }} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={submitFreeTalk} disabled={isLoading} style={{ background: isLoading ? "rgba(99,179,237,0.14)" : "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "20px", cursor: isLoading ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>{isLoading ? "분석 중…" : "✨ 피드백 받기"}</button>
                  <button onClick={rec.reset} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#718096", padding: "12px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>↺</button>
                </div>
              </div>
            )}
          </div>
          {feedback && !feedback.error && (
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {feedback.transcription && <div style={{ background: "rgba(99,179,237,0.06)", borderRadius: "8px", padding: "9px 12px", marginBottom: "12px", fontSize: "13px", color: "#63b3ed", fontStyle: "italic" }}>🎙 "{feedback.transcription}"</div>}
              <div style={{ fontSize: "14px", color: "#a0aec0", lineHeight: 1.85, whiteSpace: "pre-line" }}>{feedback.text}</div>
              <div style={{ marginTop: "12px", padding: "10px 12px", background: feedback.score >= 8 ? "rgba(252,211,77,0.07)" : "rgba(99,179,237,0.06)", borderRadius: "8px", fontSize: "13px", color: feedback.score >= 8 ? "#fcd34d" : "#63b3ed" }}>
                {feedback.score >= 8 ? "⚡ +15 XP 획득!" : "계속 연습하면 더 좋아질 거예요! 💪"}
              </div>
            </div>
          )}
          {feedback?.error && <div style={{ color: "#fc8181", textAlign: "center", marginTop: "14px", fontSize: "13px" }}>{feedback.error}</div>}
        </div>
      )}

      {mode === "ask" && (
        <div>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
            <div style={{ fontSize: "15px", color: "#e2e8f0", marginBottom: "6px" }}>영어로 어떻게 말하는지 물어보세요!</div>
            <div style={{ fontSize: "12px", color: "#718096" }}>한국어로 타이핑하거나 말하면 영어 표현을 알려드릴게요.</div>
          </div>

          {/* Text input */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input value={koreanText} onChange={e => setKoreanText(e.target.value)} onKeyDown={e => e.key === "Enter" && askByText()} placeholder="한국어로 입력하세요... (예: 배고파 죽겠어)" style={{ flex: 1, padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none" }} />
            <button onClick={askByText} disabled={isTranslating || !koreanText.trim()} style={{ background: "rgba(99,179,237,0.14)", border: "1px solid rgba(99,179,237,0.22)", color: "#63b3ed", padding: "12px 14px", borderRadius: "12px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>타이핑으로 묻기</button>
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
            <div style={{ fontSize: "11px", color: "#4a5568" }}>또는</div>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
          </div>

          {/* Voice input */}
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "14px", border: "1px solid rgba(255,255,255,0.05)", marginBottom: "14px", textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#718096", marginBottom: "10px" }}>한국어로 말하기 🎙</div>
            {!askRec.isRecording && !askRec.audioBlob && <button onClick={askRec.start} style={{ background: "rgba(99,179,237,0.14)", border: "1px solid rgba(99,179,237,0.22)", color: "#63b3ed", padding: "9px 20px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>🎙 말하기 시작</button>}
            {askRec.isRecording && (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "10px" }}>
                  <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#fc8181" }} />
                  <span style={{ color: "#fc8181", fontSize: "13px" }}>녹음 중… {askRec.recordingTime}초</span>
                </div>
                <button onClick={askRec.stop} style={{ background: "rgba(245,101,101,0.12)", border: "1px solid #fc8181", color: "#fc8181", padding: "8px 20px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>⏹ 멈추기</button>
              </div>
            )}
            {askRec.audioBlob && !askRec.isRecording && (
              <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                <button onClick={askByVoice} disabled={isTranslating} style={{ background: "rgba(99,179,237,0.14)", border: "1px solid rgba(99,179,237,0.22)", color: "#63b3ed", padding: "9px 18px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>{isTranslating ? "번역 중…" : "🔍 번역 받기"}</button>
                <button onClick={askRec.reset} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", padding: "9px 14px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>↺</button>
              </div>
            )}
          </div>

          {isTranslating && !translation && <div style={{ textAlign: "center", color: "#718096", fontSize: "13px", padding: "20px" }}>번역 중…</div>}

          {translation && (
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", border: "1px solid rgba(99,179,237,0.12)" }}>
              <div style={{ fontSize: "14px", color: "#a0aec0", lineHeight: 1.9, whiteSpace: "pre-line" }}>{translation}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Teacher Screen ────────────────────────────────────────────────────────────
function TeacherScreen({ groups, setGroups, students, getPhrases, setPhrases, setScreen }) {
  const [tab, setTab] = useState("groups");
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [newPhrase, setNewPhrase] = useState({ en: "", ko: "", context: "" });
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPhrases, setGeneratedPhrases] = useState([]);
  const [success, setSuccess] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [editStudent, setEditStudent] = useState(null);
  const [editGroupId, setEditGroupId] = useState("");

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };
  const groupStudents = (gid) => students.filter(s => s.groupId === gid);

  const handleEnFilled = async (en) => {
    setNewPhrase(p => ({ ...p, en }));
    if (en.trim().length > 5 && !newPhrase.ko) {
      setIsAutoFilling(true);
      try {
        const filled = await autoFillPhrase(en);
        setNewPhrase(p => ({ ...p, ko: filled.ko || p.ko, context: filled.context || p.context }));
      } catch(e) {}
      setIsAutoFilling(false);
    }
  };

  const addPhrase = () => {
    if (!newPhrase.en.trim() || !selectedGroup) return;
    const current = getPhrases(selectedGroup.id);
    setPhrases(selectedGroup.id, [...current, { id: "p" + Date.now(), ...newPhrase }]);
    setNewPhrase({ en: "", ko: "", context: "" });
    showSuccess("Phrase added!");
  };

  const deletePhrase = (groupId, phraseId) => setPhrases(groupId, getPhrases(groupId).filter(p => p.id !== phraseId));

  const addGenerated = () => {
    if (!generatedPhrases.length || !selectedGroup) return;
    const current = getPhrases(selectedGroup.id);
    setPhrases(selectedGroup.id, [...current, ...generatedPhrases.map((p, i) => ({ id: "gp" + Date.now() + i, ...p }))]);
    setGeneratedPhrases([]); setGenerateTopic("");
    showSuccess("Phrases added to " + selectedGroup.name + "!");
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

  const avgXP = (gid) => { const gs = groupStudents(gid); if (!gs.length) return 0; return Math.round(gs.reduce((a, b) => a + (b.xp || 0), 0) / gs.length); };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Georgia, serif", color: "#e2e8f0" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #fcd34d, #f59e0b)", zIndex: 20 }} />
      <div style={{ background: "rgba(13,17,23,0.96)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: "18px", color: "#fcd34d" }}>WAYVE</div>
          <div style={{ fontSize: "11px", color: "#718096" }}>Teacher Dashboard</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", padding: "6px 14px", borderRadius: "18px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>Log out</button>
      </div>

      <div style={{ display: "flex", gap: "6px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {[["groups", "👥 Groups"], ["phrases", "📚 Phrases"], ["add", "✨ Add"], ["students", "🎓 Students"]].map(([t, label]) =>
          React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "7px 13px", borderRadius: "18px", border: "1px solid " + (tab === t ? "rgba(252,211,77,0.3)" : "transparent"), background: tab === t ? "rgba(252,211,77,0.1)" : "transparent", color: tab === t ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, label)
        )}
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px" }}>
        {success && <div style={{ background: "rgba(72,187,120,0.1)", border: "1px solid #48bb78", color: "#48bb78", padding: "10px 14px", borderRadius: "10px", marginBottom: "12px", fontSize: "13px" }}>{success}</div>}

        {tab === "groups" && (
          <div>
            {groups.map(g => {
              const gs = groupStudents(g.id);
              return React.createElement("div", { key: g.id, style: { background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", marginBottom: "10px", border: "1px solid rgba(255,255,255,0.05)" } },
                React.createElement("div", { style: { fontSize: "15px", color: "#fff", marginBottom: "12px" } }, g.name),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: gs.length > 0 ? "12px" : "0" } },
                  [["Students", gs.length], ["Avg XP", avgXP(g.id)], ["Phrases", getPhrases(g.id).length]].map(([label, val]) =>
                    React.createElement("div", { key: label, style: { background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "9px", textAlign: "center" } },
                      React.createElement("div", { style: { fontSize: "16px", color: "#fcd34d" } }, val),
                      React.createElement("div", { style: { fontSize: "10px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px" } }, label)
                    )
                  )
                ),
                gs.sort((a, b) => (b.xp || 0) - (a.xp || 0)).map(s =>
                  React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: "12px" } },
                    React.createElement("span", { style: { color: "#a0aec0" } }, s.name),
                    React.createElement("span", { style: { color: "#fcd34d" } }, "⚡" + (s.xp || 0) + "  🔥" + (s.streak || 0) + "일  " + getLevel(s.xp || 0).emoji)
                  )
                )
              );
            })}
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.04)", marginTop: "12px" }}>
              <div style={{ fontSize: "12px", color: "#718096", marginBottom: "10px" }}>+ 새 그룹</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && addGroup()} placeholder="Group name" style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none" }} />
                <button onClick={addGroup} style={{ background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.22)", color: "#fcd34d", padding: "10px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>만들기</button>
              </div>
            </div>
          </div>
        )}

        {tab === "students" && (
          <div>
            <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "12px" }}>Assign students to groups</div>
            {students.length === 0
              ? React.createElement("div", { style: { textAlign: "center", color: "#4a5568", padding: "40px", fontStyle: "italic" } }, "No students registered yet.")
              : students.map(s => React.createElement("div", { key: s.id, style: { background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "12px 16px", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" } },
                React.createElement("div", null,
                  React.createElement("div", { style: { fontSize: "14px", color: "#e2e8f0" } }, s.name),
                  React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, groups.find(g => g.id === s.groupId)?.name || "No group")
                ),
                editStudent === s.id
                  ? React.createElement("div", { style: { display: "flex", gap: "6px" } },
                    React.createElement("select", { value: editGroupId, onChange: e => setEditGroupId(e.target.value), style: { padding: "6px 10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "#1a2332", color: "#fff", fontSize: "12px", fontFamily: "Georgia, serif", outline: "none" } },
                      groups.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))
                    ),
                    React.createElement("button", { onClick: () => { students.find(st => st.id === s.id) && (s.groupId = editGroupId); setEditStudent(null); showSuccess("Group updated!"); }, style: { background: "rgba(72,187,120,0.15)", border: "1px solid #48bb78", color: "#48bb78", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, "저장"),
                    React.createElement("button", { onClick: () => setEditStudent(null), style: { background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", padding: "6px 10px", borderRadius: "8px", cursor: "pointer", fontSize: "12px" } }, "✕")
                  )
                  : React.createElement("button", { onClick: () => { setEditStudent(s.id); setEditGroupId(s.groupId); }, style: { background: "rgba(252,211,77,0.08)", border: "1px solid rgba(252,211,77,0.2)", color: "#fcd34d", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, "그룹 변경")
              ))
            }
          </div>
        )}

        {tab === "phrases" && (
          <div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
              {groups.map(g => React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "6px 12px", borderRadius: "16px", border: "1px solid " + (selectedGroup?.id === g.id ? "#fcd34d" : "rgba(255,255,255,0.07)"), background: selectedGroup?.id === g.id ? "rgba(252,211,77,0.1)" : "transparent", color: selectedGroup?.id === g.id ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, g.name))}
            </div>
            {selectedGroup && (
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "10px" }}>{getPhrases(selectedGroup.id).length} phrases</div>
                {getPhrases(selectedGroup.id).length === 0
                  ? React.createElement("div", { style: { textAlign: "center", color: "#4a5568", padding: "30px", fontStyle: "italic", fontSize: "13px" } }, "No phrases yet. Use the Add tab!")
                  : getPhrases(selectedGroup.id).map(p => React.createElement("div", { key: p.id, style: { background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "14px", color: "#e2e8f0", fontStyle: "italic" } }, p.en),
                      p.ko && React.createElement("div", { style: { fontSize: "11px", color: "#718096", marginTop: "2px" } }, p.ko)
                    ),
                    React.createElement("button", { onClick: () => deletePhrase(selectedGroup.id, p.id), style: { background: "transparent", border: "none", color: "#4a5568", cursor: "pointer", fontSize: "18px", padding: "0 4px", flexShrink: 0 } }, "×")
                  ))
                }
              </div>
            )}
          </div>
        )}

        {tab === "add" && (
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "10px" }}>그룹 선택</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
              {groups.map(g => React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "6px 12px", borderRadius: "16px", border: "1px solid " + (selectedGroup?.id === g.id ? "#fcd34d" : "rgba(255,255,255,0.07)"), background: selectedGroup?.id === g.id ? "rgba(252,211,77,0.1)" : "transparent", color: selectedGroup?.id === g.id ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, g.name))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", marginBottom: "12px", border: "1px solid rgba(99,179,237,0.1)" }}>
              <div style={{ fontSize: "13px", color: "#63b3ed", marginBottom: "10px" }}>✨ AI로 문장 생성</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="주제 (예: at the coffee shop)" style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none" }} />
                <button onClick={generate} disabled={isGenerating} style={{ background: "rgba(99,179,237,0.14)", border: "1px solid rgba(99,179,237,0.22)", color: "#63b3ed", padding: "10px 14px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>{isGenerating ? "…" : "생성"}</button>
              </div>
              {generatedPhrases.length > 0 && (
                <div>
                  {generatedPhrases.map((p, i) => React.createElement("div", { key: i, style: { padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" } },
                    React.createElement("div", { style: { fontSize: "13px", color: "#e2e8f0", fontStyle: "italic" } }, p.en),
                    React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, p.ko)
                  ))}
                  <button onClick={addGenerated} style={{ background: "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "10px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "13px", fontFamily: "Georgia, serif", marginTop: "10px" }}>📤 {selectedGroup?.name}에 추가</button>
                </div>
              )}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "13px", color: "#e2e8f0", marginBottom: "10px" }}>➕ 직접 추가</div>
              <div style={{ marginBottom: "8px" }}>
                <input
                  value={newPhrase.en}
                  onChange={e => setNewPhrase(p => ({ ...p, en: e.target.value }))}
                  onBlur={e => handleEnFilled(e.target.value)}
                  placeholder="English phrase (required — Korean & context auto-fill!)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              {isAutoFilling && <div style={{ fontSize: "11px", color: "#63b3ed", marginBottom: "6px" }}>✨ Auto-filling Korean & context…</div>}
              <input value={newPhrase.ko} onChange={e => setNewPhrase(p => ({ ...p, ko: e.target.value }))} placeholder="Korean translation (auto-filled or edit)" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "8px" }} />
              <input value={newPhrase.context} onChange={e => setNewPhrase(p => ({ ...p, context: e.target.value }))} placeholder="Context (auto-filled or edit)" style={{ width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "10px" }} />
              <button onClick={addPhrase} style={{ background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.22)", color: "#fcd34d", padding: "10px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "13px", fontFamily: "Georgia, serif" }}>
                {selectedGroup?.name}에 추가
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
