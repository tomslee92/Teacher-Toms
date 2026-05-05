import React, { useState, useRef, useEffect } from "react";

// ── Storage ───────────────────────────────────────────────────────────────────
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} };
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } };
const GROQ_KEY = process.env.REACT_APP_GROQ_KEY;

// ── Level System ──────────────────────────────────────────────────────────────
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

const getLevel = (xp) => {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) { current = LEVELS[i]; break; }
  }
  return current;
};

const getNextLevel = (xp) => {
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp < LEVELS[i].xpRequired) return LEVELS[i];
  }
  return null;
};

const SEED_GROUPS = [
  { id: "g1", name: "Group 1 — High School Boys" },
  { id: "g2", name: "Group 2 — Young Women (19-25)" },
  { id: "g3", name: "Group 3 — Adult Men (40s)" },
];

const TEACHER_PASS = "wayve2024";

// ── TTS — most natural free voice ─────────────────────────────────────────────
function speak(text, onEnd) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.88;
  u.pitch = 1.05;
  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const preferred = ["Samantha", "Karen", "Moira", "Tessa", "Fiona", "Allison", "Ava"];
    let chosen = null;
    for (const name of preferred) {
      chosen = voices.find(v => v.name.includes(name) && v.lang.startsWith("en"));
      if (chosen) break;
    }
    if (!chosen) chosen = voices.find(v => v.lang === "en-US" && !v.name.includes("Google"));
    if (chosen) u.voice = chosen;
    if (onEnd) u.onend = onEnd;
    window.speechSynthesis.speak(u);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = trySpeak;
  } else {
    trySpeak();
  }
}

// ── API ───────────────────────────────────────────────────────────────────────
async function transcribeAudio(blob) {
  const fd = new FormData();
  fd.append("file", blob, "rec.webm");
  fd.append("model", "whisper-large-v3");
  fd.append("response_format", "text");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST", headers: { "Authorization": `Bearer ${GROQ_KEY}` }, body: fd
  });
  return await res.text();
}

async function getPhraseFeedback(transcription, phrase) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 500,
      messages: [
        { role: "system", content: "You are Tom, a warm English coach for Korean learners at Wayve. Write ONLY in Korean and English — never Chinese, Japanese or any other script. The final motivational line must be pure Korean hangul only." },
        { role: "user", content: `Target phrase: "${phrase.en}"\nContext: "${phrase.context || "Practice this phrase naturally"}"\nStudent said: "${transcription}"\n\nGive warm bilingual feedback. Extract the score clearly.\n\n🎯 점수: X/10\n[Korean explanation of score]\n\n✅ 잘한 점\n[Korean encouragement]\n\n📝 피드백\n[Korean explanation of any issues]\n→ [Corrected English if needed, or "완벽해요!" if correct]\n\n💡 더 자연스럽게\n→ [Natural native English version]\n\n💪 [Short pure Korean hangul motivation — NO Chinese characters]\n\nUnder 130 words. Korean and English ONLY.` }
      ]
    })
  });
  const d = await res.json();
  const text = d.choices[0].message.content;
  const scoreMatch = text.match(/점수.*?(\d+)\/10/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
  return { text, score };
}

async function getFreeTalkFeedback(transcription) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 500,
      messages: [
        { role: "system", content: "You are Tom, a warm English coach for Korean learners at Wayve. Write ONLY in Korean and English — never Chinese, Japanese or any other script. The final motivational line must be pure Korean hangul only." },
        { role: "user", content: `A student said this in English (free talk practice): "${transcription}"\n\nGive warm grammar and naturalness feedback:\n\n🎯 점수: X/10\n[Korean explanation]\n\n✅ 잘한 점\n[Korean encouragement]\n\n📝 문법 피드백\n[Korean explanation of any grammar issues]\n→ [Corrected version if needed]\n\n💡 더 자연스럽게\n→ [How a native speaker would say this]\n\n💪 [Short pure Korean hangul motivation]\n\nUnder 130 words. Korean and English ONLY.` }
      ]
    })
  });
  const d = await res.json();
  const text = d.choices[0].message.content;
  const scoreMatch = text.match(/점수.*?(\d+)\/10/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 7;
  return { text, score };
}

async function getKoreanTranslation(koreanText) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 400,
      messages: [
        { role: "system", content: "You are Tom, a warm English teacher for Korean learners at Wayve. Write ONLY in Korean and English — never Chinese, Japanese or any other script." },
        { role: "user", content: `A Korean learner asked: "${koreanText}"\n\nThey want to know how to say something in English. Respond primarily in Korean.\n\n🇰🇷 한국어 표현\n${koreanText}\n\n🗣 영어로는 이렇게 말해요!\n[The English translation — clear and natural]\n\n📌 예문\n1. "[English sentence]"\n→ [Korean translation]\n\n2. "[English sentence]"\n→ [Korean translation]\n\n💡 사용 팁\n[One short Korean tip about when to use this naturally]\n\n💪 [One short encouraging Korean sentence — pure hangul only]\n\nKorean and English ONLY. Under 130 words.` }
      ]
    })
  });
  const d = await res.json();
  return d.choices[0].message.content;
}

async function generatePhrases(topic) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 600,
      messages: [{ role: "user", content: `Generate 5 natural English phrases for Korean learners about: "${topic}". Return ONLY JSON:\n[{"en":"...","ko":"...","context":"..."}]` }]
    })
  });
  const d = await res.json();
  return JSON.parse(d.choices[0].message.content.replace(/```json|```/g, "").trim());
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
  const [groupId, setGroupId] = useState(groups[0]?.id || "");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const login = () => {
    const found = students.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (!found) { setError("Name not found. Please register first."); return; }
    setCurrentUser(found); setScreen("student");
  };

  const register = () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (students.find(s => s.name.toLowerCase() === name.trim().toLowerCase())) { setError("Name already taken."); return; }
    const s = { id: Date.now(), name: name.trim(), groupId, xp: 0, streak: 0, lastPractice: null, sessions: [], completedPhrases: [] };
    setStudents(p => [...p, s]);
    setCurrentUser(s); setScreen("student");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: "24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%, rgba(99,179,237,0.12) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(252,211,77,0.08) 0%, transparent 50%)" }} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ fontSize: "42px", fontWeight: "bold", color: "#fff", letterSpacing: "-2px", marginBottom: "8px" }}>WAYVE</div>
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
              <label style={{ fontSize: "11px", letterSpacing: "2px", color: "#718096", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && (mode === "login" ? login() : register())} placeholder="Enter your name" style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "16px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {mode === "register" && (
                <div>
                  <label style={{ fontSize: "11px", letterSpacing: "2px", color: "#718096", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Your Group</label>
                  <select value={groupId} onChange={e => setGroupId(e.target.value)} style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "#1a2332", color: "#fff", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none", marginBottom: "16px" }}>
                    {groups.map(g => React.createElement("option", { key: g.id, value: g.id }, g.name))}
                  </select>
                </div>
              )}
              {error && <div style={{ color: "#fc8181", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={mode === "login" ? login : register} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #63b3ed, #4299e1)", color: "#fff", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {mode === "login" ? "Enter →" : "Join Wayve →"}
              </button>
            </div>
          )}
          {mode === "teacher" && (
            <div>
              <label style={{ fontSize: "11px", letterSpacing: "2px", color: "#718096", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && (pass === TEACHER_PASS ? setScreen("teacher") : setError("Wrong password"))} placeholder="Teacher password" style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: "16px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {error && <div style={{ color: "#fc8181", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={() => pass === TEACHER_PASS ? setScreen("teacher") : setError("Wrong password")} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #fcd34d, #f59e0b)", color: "#1a1a1a", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Teacher Dashboard →</button>
              <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "#4a5568" }}>Password: wayve2024</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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
      mr.start();
      setIsRecording(true); setRecordingTime(0); setAudioBlob(null);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch(e) { alert("Microphone access needed. Please allow microphone in your browser settings."); }
  };

  const stop = () => { mediaRef.current?.stop(); setIsRecording(false); clearInterval(timerRef.current); };
  const reset = () => { setAudioBlob(null); };

  return { isRecording, audioBlob, recordingTime, start, stop, reset };
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({ user, groups, students, updateStudent, setScreen, getPhrases, levelUp, setLevelUp }) {
  const [tab, setTab] = useState("practice");

  const group = groups.find(g => g.id === user.groupId);
  const currentLevel = getLevel(user.xp || 0);
  const nextLevel = getNextLevel(user.xp || 0);
  const xpProgress = nextLevel ? ((user.xp || 0) - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired) * 100 : 100;
  const groupStudents = students.filter(s => s.groupId === user.groupId).sort((a, b) => (b.xp || 0) - (a.xp || 0));
  const phrases = getPhrases(user.groupId);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Georgia, serif", color: "#e2e8f0" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #63b3ed, #fcd34d)", zIndex: 20 }} />

      {levelUp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }} onClick={() => setLevelUp(null)}>
          <div style={{ background: "linear-gradient(135deg, #1a2332, #0d1117)", border: "1px solid rgba(252,211,77,0.4)", borderRadius: "24px", padding: "48px 36px", textAlign: "center", maxWidth: "320px" }}>
            <div style={{ fontSize: "64px", marginBottom: "16px" }}>{levelUp.emoji}</div>
            <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#63b3ed", textTransform: "uppercase", marginBottom: "8px" }}>레벨 업!</div>
            <div style={{ fontSize: "22px", color: "#fcd34d", marginBottom: "10px" }}>{levelUp.name}</div>
            <div style={{ fontSize: "15px", color: "#a0aec0", marginBottom: "24px" }}>{levelUp.milestone}</div>
            <button onClick={() => setLevelUp(null)} style={{ background: "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "12px 28px", borderRadius: "20px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif" }}>계속 가자! 🚀</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background: "rgba(13,17,23,0.96)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 18px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "17px", color: "#fff" }}>Hi, {user.name}! 👋</div>
            <div style={{ fontSize: "11px", color: "#718096" }}>🔥 {user.streak || 0}일 연속 · {currentLevel.emoji} {currentLevel.name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ background: "rgba(252,211,77,0.12)", border: "1px solid rgba(252,211,77,0.25)", borderRadius: "18px", padding: "5px 11px", fontSize: "13px", color: "#fcd34d" }}>⚡ {user.xp || 0}</div>
            <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", padding: "5px 11px", borderRadius: "18px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>나가기</button>
          </div>
        </div>
        {nextLevel && (
          <div>
            <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${xpProgress}%`, background: "linear-gradient(90deg, #63b3ed, #fcd34d)", borderRadius: "2px", transition: "width 0.5s" }} />
            </div>
            <div style={{ fontSize: "10px", color: "#4a5568", marginTop: "3px", textAlign: "right" }}>→ {nextLevel.emoji} {nextLevel.name}</div>
          </div>
        )}
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
            {groupStudents.length === 0 ? (
              <div style={{ textAlign: "center", color: "#4a5568", padding: "40px", fontStyle: "italic" }}>아직 그룹원이 없어요.</div>
            ) : groupStudents.map((s, i) => {
              const lv = getLevel(s.xp || 0);
              const isMe = s.id === user.id;
              return React.createElement("div", { key: s.id, style: { background: isMe ? "rgba(99,179,237,0.07)" : "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "13px 16px", marginBottom: "8px", border: "1px solid " + (isMe ? "rgba(99,179,237,0.22)" : "rgba(255,255,255,0.05)"), display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement("div", { style: { fontSize: "17px", width: "26px", textAlign: "center" } }, i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`),
                React.createElement("div", { style: { flex: 1 } },
                  React.createElement("div", { style: { fontSize: "14px", color: isMe ? "#63b3ed" : "#e2e8f0" } }, s.name + (isMe ? " (나)" : "")),
                  React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, lv.emoji + " " + lv.name)
                ),
                React.createElement("div", { style: { fontSize: "13px", color: "#fcd34d" } }, "⚡ " + (s.xp || 0))
              );
            })}
          </div>
        )}

        {tab === "progress" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[["🔥", user.streak || 0, "연속"], ["⚡", user.xp || 0, "XP"], ["✅", (user.completedPhrases || []).length, "완료"]].map(([emoji, val, label]) =>
                React.createElement("div", { key: label, style: { background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px 10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" } },
                  React.createElement("div", { style: { fontSize: "20px", marginBottom: "4px" } }, emoji),
                  React.createElement("div", { style: { fontSize: "20px", color: "#fff", marginBottom: "2px" } }, val),
                  React.createElement("div", { style: { fontSize: "10px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px" } }, label)
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
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [needsRetry, setNeedsRetry] = useState(false);
  const rec = useRecorder();

  const submit = async () => {
    if (!rec.audioBlob || !selectedPhrase) return;
    setIsLoading(true); setFeedback(null); setNeedsRetry(false);
    try {
      const transcription = await transcribeAudio(rec.audioBlob);
      const { text, score } = await getPhraseFeedback(transcription, selectedPhrase);
      setFeedback({ text, transcription, score });
      if (score >= 8) {
        const already = (user.completedPhrases || []).includes(selectedPhrase.id);
        const xpGain = already ? 5 : 25;
        const today = new Date().toDateString();
        const isNewDay = user.lastPractice !== today;
        updateStudent({ ...user, xp: (user.xp || 0) + xpGain, streak: isNewDay ? (user.streak || 0) + 1 : user.streak, lastPractice: today, totalSessions: (user.totalSessions || 0) + 1, completedPhrases: already ? (user.completedPhrases || []) : [...(user.completedPhrases || []), selectedPhrase.id], sessions: [{ date: new Date().toLocaleDateString(), phrase: selectedPhrase.en, xp: xpGain }, ...(user.sessions || []).slice(0, 49)] });
      } else {
        setNeedsRetry(true);
      }
    } catch(e) { setFeedback({ error: "Couldn't load feedback. Try again!" }); }
    setIsLoading(false);
  };

  if (phrases.length === 0) {
    return React.createElement("div", { style: { textAlign: "center", padding: "60px 20px" } },
      React.createElement("div", { style: { fontSize: "40px", marginBottom: "16px" } }, "📭"),
      React.createElement("div", { style: { fontSize: "16px", color: "#718096", fontStyle: "italic" } }, "No phrases assigned yet."),
      React.createElement("div", { style: { fontSize: "13px", color: "#4a5568", marginTop: "8px" } }, "Teacher Toms will add this week's phrases after class!")
    );
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
        {phrases.map(p => {
          const done = (user.completedPhrases || []).includes(p.id);
          return React.createElement("button", { key: p.id, onClick: () => { setSelectedPhrase(p); setFeedback(null); rec.reset(); setNeedsRetry(false); }, style: { textAlign: "left", padding: "14px 16px", borderRadius: "12px", border: "1px solid " + (selectedPhrase?.id === p.id ? "#63b3ed" : "rgba(255,255,255,0.06)"), background: selectedPhrase?.id === p.id ? "rgba(99,179,237,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", fontFamily: "Georgia, serif", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" } },
            React.createElement("div", null,
              React.createElement("div", { style: { fontSize: "15px", color: "#e2e8f0", fontStyle: "italic", marginBottom: "3px" } }, '"' + p.en + '"'),
              React.createElement("div", { style: { fontSize: "12px", color: "#718096" } }, p.ko)
            ),
            done ? React.createElement("span", { style: { fontSize: "16px", flexShrink: 0 } }, "✅") : React.createElement("span", { style: { fontSize: "11px", color: "#4a5568", flexShrink: 0 } }, "+25 XP")
          );
        })}
      </div>

      {selectedPhrase && (
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "16px", padding: "22px", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize: "20px", fontStyle: "italic", color: "#fff", marginBottom: "6px", textAlign: "center" }}>"{selectedPhrase.en}"</div>
          <div style={{ fontSize: "13px", color: "#718096", textAlign: "center", marginBottom: "6px" }}>{selectedPhrase.ko}</div>
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
              {feedback.transcription && <div style={{ background: "rgba(99,179,237,0.06)", borderRadius: "8px", padding: "9px 12px", marginBottom: "12px", fontSize: "13px", color: "#63b3ed", fontStyle: "italic" }}>🎙 "{feedback.transcription}"</div>}
              <div style={{ fontSize: "14px", color: "#a0aec0", lineHeight: 1.85, whiteSpace: "pre-line" }}>{feedback.text}</div>
              {feedback.score >= 8 ? (
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(252,211,77,0.07)", borderRadius: "8px", fontSize: "13px", color: "#fcd34d" }}>⚡ +25 XP 획득! 잘했어요!</div>
              ) : (
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(245,101,101,0.08)", border: "1px solid rgba(245,101,101,0.2)", borderRadius: "8px", fontSize: "13px", color: "#fc8181" }}>
                  점수가 8점 이상이어야 XP를 얻을 수 있어요. 다시 도전해 보세요! 💪
                  <div style={{ marginTop: "8px" }}>
                    <button onClick={() => { rec.reset(); setFeedback(null); setNeedsRetry(false); }} style={{ background: "rgba(245,101,101,0.15)", border: "1px solid rgba(245,101,101,0.3)", color: "#fc8181", padding: "7px 16px", borderRadius: "14px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>🔄 다시 시도</button>
                  </div>
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
  const [mode, setMode] = useState("speak"); // speak | ask
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [koreanText, setKoreanText] = useState("");
  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const rec = useRecorder();

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
        updateStudent({ ...user, xp: (user.xp || 0) + 15, streak: isNewDay ? (user.streak || 0) + 1 : user.streak, lastPractice: today, totalSessions: (user.totalSessions || 0) + 1, sessions: [{ date: new Date().toLocaleDateString(), phrase: "Free Talk", xp: 15 }, ...(user.sessions || []).slice(0, 49)] });
      }
    } catch(e) { setFeedback({ error: "Couldn't load feedback. Try again!" }); }
    setIsLoading(false);
  };

  const askTranslation = async () => {
    if (!koreanText.trim()) return;
    setIsTranslating(true); setTranslation(null);
    try {
      const result = await getKoreanTranslation(koreanText);
      setTranslation(result);
    } catch(e) { setTranslation("Error loading translation. Try again!"); }
    setIsTranslating(false);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {[["speak", "🎙 영어로 말하기"], ["ask", "🇰🇷 영어로 어떻게?"]].map(([m, label]) =>
          React.createElement("button", { key: m, onClick: () => { setMode(m); setFeedback(null); setTranslation(null); rec.reset(); }, style: { flex: 1, padding: "10px", borderRadius: "16px", border: "1px solid " + (mode === m ? "rgba(99,179,237,0.3)" : "rgba(255,255,255,0.06)"), background: mode === m ? "rgba(99,179,237,0.12)" : "transparent", color: mode === m ? "#63b3ed" : "#718096", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" } }, label)
        )}
      </div>

      {mode === "speak" && (
        <div>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "20px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
            <div style={{ fontSize: "15px", color: "#e2e8f0", marginBottom: "8px" }}>자유롭게 영어로 말해보세요!</div>
            <div style={{ fontSize: "13px", color: "#718096" }}>어떤 주제든 괜찮아요 — 오늘 있었던 일, 여행 계획, 꿈 등 무엇이든 영어로 말해보세요. 문법 피드백을 드릴게요!</div>
          </div>

          <div style={{ textAlign: "center" }}>
            {!rec.isRecording && !rec.audioBlob && (
              <button onClick={rec.start} style={{ background: "linear-gradient(135deg, #fc8181, #f56565)", border: "none", color: "#fff", padding: "13px 30px", borderRadius: "26px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif", boxShadow: "0 6px 16px rgba(245,101,101,0.28)" }}>🎙 말하기 시작</button>
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
                  <button onClick={submitFreeTalk} disabled={isLoading} style={{ background: isLoading ? "rgba(99,179,237,0.14)" : "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "12px 24px", borderRadius: "20px", cursor: isLoading ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>
                    {isLoading ? "분석 중…" : "✨ 피드백 받기"}
                  </button>
                  <button onClick={rec.reset} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#718096", padding: "12px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>↺</button>
                </div>
              </div>
            )}
          </div>

          {feedback && !feedback.error && (
            <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              {feedback.transcription && <div style={{ background: "rgba(99,179,237,0.06)", borderRadius: "8px", padding: "9px 12px", marginBottom: "12px", fontSize: "13px", color: "#63b3ed", fontStyle: "italic" }}>🎙 "{feedback.transcription}"</div>}
              <div style={{ fontSize: "14px", color: "#a0aec0", lineHeight: 1.85, whiteSpace: "pre-line" }}>{feedback.text}</div>
              {feedback.score >= 8 ? (
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(252,211,77,0.07)", borderRadius: "8px", fontSize: "13px", color: "#fcd34d" }}>⚡ +15 XP 획득!</div>
              ) : (
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(99,179,237,0.06)", borderRadius: "8px", fontSize: "13px", color: "#63b3ed" }}>계속 연습하면 더 좋아질 거예요! 다시 말해보세요 💪</div>
              )}
            </div>
          )}
          {feedback?.error && <div style={{ color: "#fc8181", textAlign: "center", marginTop: "14px", fontSize: "13px" }}>{feedback.error}</div>}
        </div>
      )}

      {mode === "ask" && (
        <div>
          <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "20px", border: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
            <div style={{ fontSize: "15px", color: "#e2e8f0", marginBottom: "8px" }}>영어로 어떻게 말하는지 물어보세요!</div>
            <div style={{ fontSize: "13px", color: "#718096" }}>한국어로 표현을 입력하면 영어로 어떻게 말하는지 알려드릴게요.</div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input value={koreanText} onChange={e => setKoreanText(e.target.value)} onKeyDown={e => e.key === "Enter" && askTranslation()} placeholder="예: 오늘 날씨 정말 좋다, 배고파 죽겠어..." style={{ flex: 1, padding: "12px 14px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none" }} />
            <button onClick={askTranslation} disabled={isTranslating} style={{ background: isTranslating ? "rgba(99,179,237,0.12)" : "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "12px 18px", borderRadius: "12px", cursor: isTranslating ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>{isTranslating ? "…" : "물어보기"}</button>
          </div>
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
  const [generateTopic, setGenerateTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPhrases, setGeneratedPhrases] = useState([]);
  const [success, setSuccess] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const groupStudents = (gid) => students.filter(s => s.groupId === gid);

  const addPhrase = () => {
    if (!newPhrase.en.trim() || !selectedGroup) return;
    const current = getPhrases(selectedGroup.id);
    setPhrases(selectedGroup.id, [...current, { id: "p" + Date.now(), ...newPhrase }]);
    setNewPhrase({ en: "", ko: "", context: "" });
    showSuccess("Phrase added to " + selectedGroup.name + "!");
  };

  const deletePhrase = (groupId, phraseId) => {
    const current = getPhrases(groupId);
    setPhrases(groupId, current.filter(p => p.id !== phraseId));
  };

  const addGenerated = () => {
    if (!generatedPhrases.length || !selectedGroup) return;
    const current = getPhrases(selectedGroup.id);
    const newOnes = generatedPhrases.map((p, i) => ({ id: "gp" + Date.now() + i, ...p }));
    setPhrases(selectedGroup.id, [...current, ...newOnes]);
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
    const g = { id: "g" + Date.now(), name: newGroupName };
    setGroups(prev => [...prev, g]);
    setNewGroupName(""); showSuccess("Group created!");
  };

  const avgXP = (gid) => {
    const gs = groupStudents(gid);
    if (!gs.length) return 0;
    return Math.round(gs.reduce((a, b) => a + (b.xp || 0), 0) / gs.length);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Georgia, serif", color: "#e2e8f0" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #fcd34d, #f59e0b)", zIndex: 20 }} />
      <div style={{ background: "rgba(13,17,23,0.96)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: "18px", color: "#fcd34d", letterSpacing: "-0.5px" }}>WAYVE</div>
          <div style={{ fontSize: "11px", color: "#718096" }}>Teacher Dashboard</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", padding: "6px 14px", borderRadius: "18px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>Log out</button>
      </div>

      <div style={{ display: "flex", gap: "6px", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {[["groups", "👥 Groups"], ["phrases", "📚 Phrases"], ["add", "✨ Add"]].map(([t, label]) =>
          React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "7px 13px", borderRadius: "18px", border: "1px solid " + (tab === t ? "rgba(252,211,77,0.3)" : "transparent"), background: tab === t ? "rgba(252,211,77,0.1)" : "transparent", color: tab === t ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, label)
        )}
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px" }}>
        {success && <div style={{ background: "rgba(72,187,120,0.1)", border: "1px solid #48bb78", color: "#48bb78", padding: "10px 14px", borderRadius: "10px", marginBottom: "12px", fontSize: "13px" }}>{success}</div>}

        {tab === "groups" && (
          <div>
            {groups.map(g => {
              const gs = groupStudents(g.id);
              const phraseCount = getPhrases(g.id).length;
              return React.createElement("div", { key: g.id, style: { background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", marginBottom: "10px", border: "1px solid rgba(255,255,255,0.05)" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" } },
                  React.createElement("div", null,
                    React.createElement("div", { style: { fontSize: "15px", color: "#fff" } }, g.name),
                    React.createElement("div", { style: { fontSize: "11px", color: "#718096", marginTop: "3px" } }, phraseCount + " phrases assigned")
                  )
                ),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: gs.length > 0 ? "12px" : "0" } },
                  [["Students", gs.length], ["Avg XP", avgXP(g.id)], ["Today", gs.filter(s => s.lastPractice === new Date().toDateString()).length + " active"]].map(([label, val]) =>
                    React.createElement("div", { key: label, style: { background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "9px", textAlign: "center" } },
                      React.createElement("div", { style: { fontSize: "16px", color: "#fcd34d" } }, val),
                      React.createElement("div", { style: { fontSize: "10px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px" } }, label)
                    )
                  )
                ),
                gs.length > 0 && gs.sort((a, b) => (b.xp || 0) - (a.xp || 0)).map(s =>
                  React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: "12px" } },
                    React.createElement("span", { style: { color: "#a0aec0" } }, s.name),
                    React.createElement("span", { style: { color: "#fcd34d" } }, "⚡ " + (s.xp || 0) + "  " + getLevel(s.xp || 0).emoji)
                  )
                )
              );
            })}
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "16px", border: "1px solid rgba(255,255,255,0.04)", marginTop: "12px" }}>
              <div style={{ fontSize: "12px", color: "#718096", marginBottom: "10px" }}>+ 새 그룹 만들기</div>
              <div style={{ display: "flex", gap: "8px" }}>
                <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && addGroup()} placeholder="Group name" style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none" }} />
                <button onClick={addGroup} style={{ background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.22)", color: "#fcd34d", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>만들기</button>
              </div>
            </div>
          </div>
        )}

        {tab === "phrases" && (
          <div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
              {groups.map(g =>
                React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "6px 12px", borderRadius: "16px", border: "1px solid " + (selectedGroup?.id === g.id ? "#fcd34d" : "rgba(255,255,255,0.07)"), background: selectedGroup?.id === g.id ? "rgba(252,211,77,0.1)" : "transparent", color: selectedGroup?.id === g.id ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, g.name)
              )}
            </div>
            {selectedGroup && (
              <div>
                <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "10px" }}>{getPhrases(selectedGroup.id).length} phrases — {selectedGroup.name}</div>
                {getPhrases(selectedGroup.id).length === 0 ? (
                  <div style={{ textAlign: "center", color: "#4a5568", padding: "30px", fontStyle: "italic", fontSize: "13px" }}>No phrases assigned yet. Use the Add tab!</div>
                ) : getPhrases(selectedGroup.id).map(p =>
                  React.createElement("div", { key: p.id, style: { background: "rgba(255,255,255,0.02)", borderRadius: "10px", padding: "12px 14px", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "14px", color: "#e2e8f0", fontStyle: "italic" } }, p.en),
                      React.createElement("div", { style: { fontSize: "11px", color: "#718096", marginTop: "2px" } }, p.ko)
                    ),
                    React.createElement("button", { onClick: () => deletePhrase(selectedGroup.id, p.id), style: { background: "transparent", border: "none", color: "#4a5568", cursor: "pointer", fontSize: "18px", padding: "0 4px", flexShrink: 0 } }, "×")
                  )
                )}
              </div>
            )}
          </div>
        )}

        {tab === "add" && (
          <div>
            <div style={{ fontSize: "11px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "10px" }}>그룹 선택</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "18px" }}>
              {groups.map(g =>
                React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "6px 12px", borderRadius: "16px", border: "1px solid " + (selectedGroup?.id === g.id ? "#fcd34d" : "rgba(255,255,255,0.07)"), background: selectedGroup?.id === g.id ? "rgba(252,211,77,0.1)" : "transparent", color: selectedGroup?.id === g.id ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, g.name)
              )}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", marginBottom: "12px", border: "1px solid rgba(99,179,237,0.1)" }}>
              <div style={{ fontSize: "13px", color: "#63b3ed", marginBottom: "10px" }}>✨ AI로 문장 생성</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                <input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="주제 (예: at the coffee shop, making plans)" style={{ flex: 1, padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none" }} />
                <button onClick={generate} disabled={isGenerating} style={{ background: "rgba(99,179,237,0.14)", border: "1px solid rgba(99,179,237,0.22)", color: "#63b3ed", padding: "10px 14px", borderRadius: "10px", cursor: isGenerating ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>{isGenerating ? "…" : "생성"}</button>
              </div>
              {generatedPhrases.length > 0 && (
                <div>
                  {generatedPhrases.map((p, i) =>
                    React.createElement("div", { key: i, style: { padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" } },
                      React.createElement("div", { style: { fontSize: "13px", color: "#e2e8f0", fontStyle: "italic" } }, p.en),
                      React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, p.ko)
                    )
                  )}
                  <button onClick={addGenerated} style={{ background: "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "10px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "13px", fontFamily: "Georgia, serif", marginTop: "10px" }}>
                    📤 {selectedGroup?.name}에 추가
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "16px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "13px", color: "#e2e8f0", marginBottom: "10px" }}>➕ 직접 추가</div>
              {[["en", "English phrase (required)"], ["ko", "Korean translation"], ["context", "Context — when to use this"]].map(([field, placeholder]) =>
                React.createElement("input", { key: field, value: newPhrase[field], onChange: e => setNewPhrase(p => ({ ...p, [field]: e.target.value })), placeholder, style: { width: "100%", padding: "10px 12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "8px" } })
              )}
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
