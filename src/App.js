import { useState, useRef, useEffect } from "react";

// ── Persistent storage helpers ──────────────────────────────────────────────
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };

// ── Seed data ────────────────────────────────────────────────────────────────
const SEED_HOMEWORK = [
  { id: 1, week: "Week 1", title: "Reaction Phrases", sentences: [
    { id: 101, text: "No way! Are you serious?", tip: "Let your voice rise naturally on 'serious' — it should sound like a genuine question." },
    { id: 102, text: "That's insane. I can't believe it!", tip: "Slow down on 'insane' — draw it out. Then speed up on 'can't believe it' for contrast." },
    { id: 103, text: "Oh my gosh, that's so wild!", tip: "Put energy into 'gosh' and 'wild' — these are the emotional peaks of the sentence." },
    { id: 104, text: "Seriously though, for real.", tip: "Lower your voice slightly — this phrase signals you're being sincere." },
    { id: 105, text: "Stop it! You're kidding me.", tip: "Playful and light — almost like you're laughing while you say it." },
  ]},
  { id: 2, week: "Week 2", title: "Daily Conversations", sentences: [
    { id: 201, text: "How's everything going with you?", tip: "Natural and warm — stress 'everything' slightly to show genuine interest." },
    { id: 202, text: "I've been really busy lately.", tip: "The 've' in 'I've' should be very light — almost silent in natural speech." },
    { id: 203, text: "That makes total sense to me.", tip: "Connect 'makes' and 'total' smoothly — no pause between them." },
    { id: 204, text: "Let me think about that for a second.", tip: "This is a thinking phrase — say it slowly and naturally, not rushed." },
  ]},
];

const TEACHER_PASS = "toms2024";

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login"); // login | student | teacher
  const [currentUser, setCurrentUser] = useState(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [students, setStudents] = useState(() => load("tt_students", []));
  const [homework, setHomework] = useState(() => load("tt_homework", SEED_HOMEWORK));

  useEffect(() => { save("tt_students", students); }, [students]);
  useEffect(() => { save("tt_homework", homework); }, [homework]);

  const updateStudent = (updated) => {
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (currentUser?.id === updated.id) setCurrentUser(updated);
  };

  if (screen === "login") return <LoginScreen students={students} setStudents={setStudents} setCurrentUser={setCurrentUser} setScreen={setScreen} setIsTeacher={setIsTeacher} teacherPass={TEACHER_PASS} />;
  if (screen === "teacher") return <TeacherScreen homework={homework} setHomework={setHomework} students={students} setScreen={setScreen} />;
  if (screen === "student") return <StudentScreen user={currentUser} homework={homework} updateStudent={updateStudent} setScreen={setScreen} />;
  return null;
}

// ── Login Screen ─────────────────────────────────────────────────────────────
function LoginScreen({ students, setStudents, setCurrentUser, setScreen, setIsTeacher, teacherPass }) {
  const [mode, setMode] = useState("student"); // student | teacher | register
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleStudentLogin = () => {
    const found = students.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (!found) { setError("Name not found. Ask Teacher Toms to register you, or register below."); return; }
    setCurrentUser(found);
    setScreen("student");
  };

  const handleRegister = () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (students.find(s => s.name.toLowerCase() === name.trim().toLowerCase())) { setError("This name is already taken."); return; }
    const newStudent = { id: Date.now(), name: name.trim(), joinDate: new Date().toLocaleDateString(), streak: 0, lastPractice: null, sessions: [], totalSessions: 0 };
    setStudents(prev => [...prev, newStudent]);
    setCurrentUser(newStudent);
    setScreen("student");
  };

  const handleTeacherLogin = () => {
    if (pass === teacherPass) { setIsTeacher(true); setScreen("teacher"); }
    else setError("Incorrect password.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f3ee", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif", padding: "20px" }}>
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(135deg, #f7f3ee 0%, #ede8e0 100%)", zIndex: 0 }} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #e8734a, #f0a86b, #4a90d9)", zIndex: 10 }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #e8734a, #4a90d9)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", boxShadow: "0 8px 24px rgba(232,115,74,0.3)" }}>🎙</div>
          <div style={{ fontSize: "28px", color: "#2a2218", letterSpacing: "-0.5px" }}>Teacher Toms</div>
          <div style={{ fontSize: "14px", color: "#8a7e72", marginTop: "6px", fontStyle: "italic" }}>English Speaking Practice</div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: "flex", background: "rgba(255,255,255,0.6)", borderRadius: "16px", padding: "4px", marginBottom: "24px", border: "1px solid rgba(0,0,0,0.08)" }}>
          {[["student", "Student Login"], ["register", "Register"], ["teacher", "Teacher"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: mode === m ? "#fff" : "transparent", color: mode === m ? "#e8734a" : "#8a7e72", cursor: "pointer", fontSize: "13px", fontFamily: "inherit", boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.1)" : "none", transition: "all 0.2s" }}>{label}</button>
          ))}
        </div>

        <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: "20px", padding: "32px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          {(mode === "student" || mode === "register") && (
            <>
              <label style={{ fontSize: "12px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && (mode === "student" ? handleStudentLogin() : handleRegister())} placeholder={mode === "student" ? "Enter your name" : "Choose a display name"} style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.12)", background: "#faf8f5", fontSize: "16px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {error && <div style={{ color: "#e8734a", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={mode === "student" ? handleStudentLogin : handleRegister} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #e8734a, #f0a86b)", color: "#fff", fontSize: "16px", cursor: "pointer", fontFamily: "inherit" }}>
                {mode === "student" ? "Enter Practice Room →" : "Create My Account →"}
              </button>
            </>
          )}

          {mode === "teacher" && (
            <>
              <label style={{ fontSize: "12px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Teacher Password</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTeacherLogin()} placeholder="Enter password" style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.12)", background: "#faf8f5", fontSize: "16px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {error && <div style={{ color: "#e8734a", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={handleTeacherLogin} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #4a90d9, #7ab3e8)", color: "#fff", fontSize: "16px", cursor: "pointer", fontFamily: "inherit" }}>
                Enter Teacher Dashboard →
              </button>
              <div style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: "#8a7e72" }}>Default password: toms2024</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({ user, homework, updateStudent, setScreen }) {
  const [tab, setTab] = useState("homework"); // homework | progress
  const [selectedHW, setSelectedHW] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const latestHW = homework[homework.length - 1];
  const activeHW = selectedHW || latestHW;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => { setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach(t => t.stop()); };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {}
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const getFeedback = async () => {
    if (!selectedSentence) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `You are Teacher Toms, a warm and encouraging English speaking coach for Korean learners. Your feedback is bilingual — give Korean explanations with English examples. Be like a supportive teacher, not a robot.

The student just practiced this sentence: "${selectedSentence.text}"
Native speaker tip: "${selectedSentence.tip}"

Give feedback AS IF you heard them. Be warm, specific, and encouraging. Return ONLY JSON:
{
  "score": (1-10),
  "praise_ko": "(칭찬 — 한국어로, 1문장)",
  "pronunciation_ko": "(발음 팁 — 한국어 설명)",
  "pronunciation_en": "(English example of correct pronunciation)",
  "grammar_ko": "(문법 팁 — 한국어 설명, if any)",
  "grammar_en": "(English example of correct grammar, if any)",
  "native_tip": "(How a native speaker says this naturally — English)",
  "encouragement_ko": "(마지막 응원 한마디 — 한국어)"
}` }]
        })
      });
      const data = await res.json();
      const text = data.content.map(i => i.text || "").join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setFeedback(parsed);

      // Update student record
      const today = new Date().toDateString();
      const isNewDay = user.lastPractice !== today;
      const newSession = { date: new Date().toLocaleDateString(), sentence: selectedSentence.text, score: parsed.score, hw: activeHW.title };
      const updated = {
        ...user,
        lastPractice: today,
        streak: isNewDay ? (user.streak || 0) + 1 : user.streak,
        totalSessions: (user.totalSessions || 0) + 1,
        sessions: [newSession, ...(user.sessions || []).slice(0, 49)]
      };
      updateStudent(updated);
    } catch (e) {
      setFeedback({ error: "Couldn't load feedback. Try again!" });
    }
    setIsLoading(false);
  };

  const speakFeedback = () => {
    if (!feedback) return;
    window.speechSynthesis.cancel();
    const script = `Great work! ${feedback.pronunciation_en}. ${feedback.native_tip}`;
    const u = new SpeechSynthesisUtterance(script);
    u.lang = "en-US"; u.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang === "en-US" && (v.name.includes("Samantha") || v.name.includes("Karen")));
    if (v) u.voice = v;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const avgScore = user.sessions?.length > 0 ? (user.sessions.reduce((a, b) => a + b.score, 0) / user.sessions.length).toFixed(1) : null;
  const bestScore = user.sessions?.length > 0 ? Math.max(...user.sessions.map(s => s.score)) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f3ee", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #e8734a, #f0a86b, #4a90d9)", zIndex: 10 }} />

      {/* Header */}
      <div style={{ background: "rgba(255,255,255,0.9)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 9 }}>
        <div>
          <div style={{ fontSize: "18px", color: "#2a2218" }}>Hi, {user.name}! 👋</div>
          <div style={{ fontSize: "12px", color: "#8a7e72", marginTop: "2px" }}>🔥 {user.streak || 0} day streak</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.12)", color: "#8a7e72", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>Log out</button>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {[["homework", "📚 Homework"], ["progress", "📊 My Progress"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", borderRadius: "20px", border: "none", background: tab === t ? "linear-gradient(135deg, #e8734a, #f0a86b)" : "rgba(255,255,255,0.7)", color: tab === t ? "#fff" : "#8a7e72", cursor: "pointer", fontSize: "14px", fontFamily: "inherit", boxShadow: tab === t ? "0 4px 12px rgba(232,115,74,0.3)" : "none" }}>{label}</button>
          ))}
        </div>

        {/* HOMEWORK TAB */}
        {tab === "homework" && (
          <div>
            {/* HW selector */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              {homework.map(hw => (
                <button key={hw.id} onClick={() => { setSelectedHW(hw); setSelectedSentence(null); setFeedback(null); setAudioBlob(null); }} style={{ padding: "8px 16px", borderRadius: "20px", border: `1px solid ${activeHW?.id === hw.id ? "#e8734a" : "rgba(0,0,0,0.12)"}`, background: activeHW?.id === hw.id ? "rgba(232,115,74,0.1)" : "rgba(255,255,255,0.7)", color: activeHW?.id === hw.id ? "#e8734a" : "#8a7e72", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>
                  {hw.week} — {hw.title}
                </button>
              ))}
            </div>

            {activeHW && (
              <>
                <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "12px" }}>Select a sentence to practice</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                  {activeHW.sentences.map((s, i) => (
                    <button key={s.id} onClick={() => { setSelectedSentence(s); setFeedback(null); setAudioBlob(null); }} style={{ textAlign: "left", padding: "16px 20px", borderRadius: "14px", border: `1px solid ${selectedSentence?.id === s.id ? "#e8734a" : "rgba(0,0,0,0.08)"}`, background: selectedSentence?.id === s.id ? "rgba(232,115,74,0.08)" : "rgba(255,255,255,0.8)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
                      <div style={{ fontSize: "11px", color: "#8a7e72", marginBottom: "4px" }}>#{i + 1}</div>
                      <div style={{ fontSize: "17px", color: "#2a2218", fontStyle: "italic" }}>"{s.text}"</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Selected sentence practice */}
            {selectedSentence && (
              <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "20px", padding: "28px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "22px", fontStyle: "italic", color: "#2a2218", marginBottom: "12px", textAlign: "center" }}>
                  "{selectedSentence.text}"
                </div>
                <div style={{ background: "rgba(74,144,217,0.08)", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#4a6fa5", fontStyle: "italic", marginBottom: "24px" }}>
                  💡 {selectedSentence.tip}
                </div>

                {/* Recording */}
                <div style={{ textAlign: "center" }}>
                  {!isRecording && !audioBlob && (
                    <button onClick={startRecording} style={{ background: "linear-gradient(135deg, #e8734a, #f0a86b)", border: "none", color: "#fff", padding: "16px 36px", borderRadius: "30px", cursor: "pointer", fontSize: "16px", fontFamily: "inherit", boxShadow: "0 8px 20px rgba(232,115,74,0.35)" }}>
                      🎙 Start Recording
                    </button>
                  )}
                  {isRecording && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e8734a", animation: "pulse 1s infinite" }} />
                        <span style={{ color: "#e8734a", fontSize: "14px" }}>Recording… {recordingTime}s</span>
                      </div>
                      <button onClick={stopRecording} style={{ background: "rgba(232,115,74,0.1)", border: "2px solid #e8734a", color: "#e8734a", padding: "14px 32px", borderRadius: "30px", cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}>⏹ Stop</button>
                    </div>
                  )}
                  {audioBlob && !isRecording && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                      <audio src={URL.createObjectURL(audioBlob)} controls style={{ width: "100%", maxWidth: "280px" }} />
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={getFeedback} disabled={isLoading} style={{ background: isLoading ? "rgba(74,144,217,0.2)" : "linear-gradient(135deg, #4a90d9, #7ab3e8)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: "24px", cursor: isLoading ? "not-allowed" : "pointer", fontSize: "15px", fontFamily: "inherit", boxShadow: isLoading ? "none" : "0 6px 16px rgba(74,144,217,0.3)" }}>
                          {isLoading ? "Analyzing…" : "✨ Get Feedback"}
                        </button>
                        <button onClick={() => { setAudioBlob(null); setFeedback(null); }} style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.12)", color: "#8a7e72", padding: "14px 20px", borderRadius: "24px", cursor: "pointer", fontSize: "14px", fontFamily: "inherit" }}>Re-record</button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feedback */}
                {feedback && !feedback.error && (
                  <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(0,0,0,0.08)", animation: "fadeIn 0.4s ease" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                      <div style={{ fontSize: "16px", color: "#2a2218" }}>Teacher Toms의 피드백</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ padding: "6px 14px", borderRadius: "16px", background: feedback.score >= 8 ? "rgba(74,180,100,0.15)" : feedback.score >= 6 ? "rgba(240,168,107,0.15)" : "rgba(232,115,74,0.15)", color: feedback.score >= 8 ? "#3a9a5c" : feedback.score >= 6 ? "#c07820" : "#e8734a", fontSize: "14px" }}>{feedback.score}/10</div>
                        <button onClick={speakFeedback} style={{ background: isSpeaking ? "rgba(74,144,217,0.15)" : "rgba(0,0,0,0.05)", border: `1px solid ${isSpeaking ? "#4a90d9" : "rgba(0,0,0,0.1)"}`, color: isSpeaking ? "#4a90d9" : "#8a7e72", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>{isSpeaking ? "🔊 듣는 중…" : "🔊 듣기"}</button>
                      </div>
                    </div>

                    {[
                      ["✅ 잘한 점", feedback.praise_ko, null],
                      ["🗣 발음 (Pronunciation)", feedback.pronunciation_ko, feedback.pronunciation_en],
                      ["📝 문법 (Grammar)", feedback.grammar_ko, feedback.grammar_en],
                      ["🌟 Native Speaker Tip", null, feedback.native_tip],
                    ].map(([label, ko, en]) => ko || en ? (
                      <div key={label} style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#e8734a", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
                        {ko && <div style={{ fontSize: "14px", color: "#4a4238", marginBottom: "4px", lineHeight: 1.6 }}>{ko}</div>}
                        {en && <div style={{ fontSize: "14px", color: "#2a5a8a", fontStyle: "italic", lineHeight: 1.6 }}>"{en}"</div>}
                      </div>
                    ) : null)}

                    <div style={{ marginTop: "16px", padding: "14px 16px", background: "rgba(232,115,74,0.06)", borderRadius: "12px", fontSize: "14px", color: "#8a5a3a", fontStyle: "italic" }}>
                      💪 {feedback.encouragement_ko}
                    </div>
                  </div>
                )}
                {feedback?.error && <div style={{ color: "#e8734a", textAlign: "center", marginTop: "16px" }}>{feedback.error}</div>}
              </div>
            )}
          </div>
        )}

        {/* PROGRESS TAB */}
        {tab === "progress" && (
          <div>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              {[
                ["🔥", user.streak || 0, "Day Streak"],
                ["⭐", avgScore ? `${avgScore}/10` : "—", "Avg Score"],
                ["🎯", user.totalSessions || 0, "Sessions"],
              ].map(([icon, val, label]) => (
                <div key={label} style={{ background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "20px 12px", textAlign: "center", border: "1px solid rgba(0,0,0,0.08)" }}>
                  <div style={{ fontSize: "24px", marginBottom: "6px" }}>{icon}</div>
                  <div style={{ fontSize: "22px", color: "#2a2218", marginBottom: "4px" }}>{val}</div>
                  <div style={{ fontSize: "11px", color: "#8a7e72", textTransform: "uppercase", letterSpacing: "1px" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Best score */}
            {bestScore && (
              <div style={{ background: "linear-gradient(135deg, rgba(232,115,74,0.1), rgba(74,144,217,0.1))", borderRadius: "16px", padding: "20px", marginBottom: "24px", border: "1px solid rgba(232,115,74,0.2)", textAlign: "center" }}>
                <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "8px" }}>Best Score</div>
                <div style={{ fontSize: "36px", color: "#e8734a" }}>{bestScore}/10</div>
              </div>
            )}

            {/* Session history */}
            <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "12px" }}>Recent Practice</div>
            {(user.sessions || []).length === 0 ? (
              <div style={{ textAlign: "center", color: "#8a7e72", padding: "40px", fontStyle: "italic" }}>No sessions yet — start practicing!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(user.sessions || []).map((s, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.8)", borderRadius: "14px", padding: "16px 20px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "15px", fontStyle: "italic", color: "#2a2218", marginBottom: "4px" }}>"{s.sentence}"</div>
                      <div style={{ fontSize: "12px", color: "#8a7e72" }}>{s.hw} · {s.date}</div>
                    </div>
                    <div style={{ padding: "6px 12px", borderRadius: "12px", background: s.score >= 8 ? "rgba(74,180,100,0.12)" : s.score >= 6 ? "rgba(240,168,107,0.12)" : "rgba(232,115,74,0.12)", color: s.score >= 8 ? "#3a9a5c" : s.score >= 6 ? "#c07820" : "#e8734a", fontSize: "14px", whiteSpace: "nowrap" }}>{s.score}/10</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} } @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

// ── Teacher Screen ────────────────────────────────────────────────────────────
function TeacherScreen({ homework, setHomework, students, setScreen }) {
  const [tab, setTab] = useState("assign"); // assign | students
  const [newWeek, setNewWeek] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [sentences, setSentences] = useState([{ text: "", tip: "" }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [success, setSuccess] = useState("");

  const addSentenceRow = () => setSentences(prev => [...prev, { text: "", tip: "" }]);
  const updateSentence = (i, field, val) => setSentences(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const removeSentence = (i) => setSentences(prev => prev.filter((_, idx) => idx !== i));

  const saveHomework = () => {
    const valid = sentences.filter(s => s.text.trim());
    if (!newWeek.trim() || !newTitle.trim() || valid.length === 0) return;
    const hw = { id: Date.now(), week: newWeek, title: newTitle, sentences: valid.map((s, i) => ({ id: Date.now() + i, text: s.text, tip: s.tip || "Focus on natural rhythm and tone." })) };
    setHomework(prev => [...prev, hw]);
    setNewWeek(""); setNewTitle(""); setSentences([{ text: "", tip: "" }]);
    setSuccess("Homework assigned! Students can see it now.");
    setTimeout(() => setSuccess(""), 3000);
  };

  const generateSentences = async () => {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: `Generate 5 natural English practice sentences for Korean learners around the topic: "${generateTopic}". Return ONLY JSON array:
[{"text": "...", "tip": "one pronunciation/tone coaching tip in English"}]` }]
        })
      });
      const data = await res.json();
      const text = data.content.map(i => i.text || "").join("");
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setSentences(parsed);
      setGenerateTopic("");
    } catch {}
    setIsGenerating(false);
  };

  const deleteHomework = (id) => setHomework(prev => prev.filter(h => h.id !== id));

  const avgScore = (student) => {
    if (!student.sessions?.length) return null;
    return (student.sessions.reduce((a, b) => a + b.score, 0) / student.sessions.length).toFixed(1);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #4a90d9, #7ab3e8, #e8734a)", zIndex: 10 }} />

      <div style={{ background: "rgba(255,255,255,0.95)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 9 }}>
        <div>
          <div style={{ fontSize: "18px", color: "#2a2218" }}>Teacher Toms — Dashboard</div>
          <div style={{ fontSize: "12px", color: "#8a7e72", marginTop: "2px" }}>{students.length} students registered</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.12)", color: "#8a7e72", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>Log out</button>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {[["assign", "📚 Assign Homework"], ["students", "👥 Students"]].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", borderRadius: "20px", border: "none", background: tab === t ? "linear-gradient(135deg, #4a90d9, #7ab3e8)" : "rgba(255,255,255,0.7)", color: tab === t ? "#fff" : "#8a7e72", cursor: "pointer", fontSize: "14px", fontFamily: "inherit", boxShadow: tab === t ? "0 4px 12px rgba(74,144,217,0.3)" : "none" }}>{label}</button>
          ))}
        </div>

        {tab === "assign" && (
          <div>
            {success && <div style={{ background: "rgba(74,180,100,0.1)", border: "1px solid #4ab464", color: "#2a7a44", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px" }}>{success}</div>}

            {/* AI Generate */}
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "24px", marginBottom: "16px", border: "1px solid rgba(74,144,217,0.2)" }}>
              <div style={{ fontSize: "15px", color: "#2a2218", marginBottom: "14px" }}>✨ AI로 문장 생성하기</div>
              <div style={{ display: "flex", gap: "10px" }}>
                <input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generateSentences()} placeholder="Topic (e.g. giving compliments, apologizing, small talk)" style={{ flex: 1, padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)", background: "#faf8f5", fontSize: "14px", fontFamily: "inherit", outline: "none" }} />
                <button onClick={generateSentences} disabled={isGenerating} style={{ background: isGenerating ? "rgba(74,144,217,0.2)" : "linear-gradient(135deg, #4a90d9, #7ab3e8)", border: "none", color: "#fff", padding: "12px 20px", borderRadius: "10px", cursor: isGenerating ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "inherit", whiteSpace: "nowrap" }}>{isGenerating ? "생성 중…" : "Generate"}</button>
              </div>
            </div>

            {/* Manual form */}
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: "15px", color: "#2a2218", marginBottom: "20px" }}>새 숙제 만들기</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Week</label>
                  <input value={newWeek} onChange={e => setNewWeek(e.target.value)} placeholder="e.g. Week 3" style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)", background: "#faf8f5", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Topic Title</label>
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Giving Compliments" style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)", background: "#faf8f5", fontSize: "14px", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ fontSize: "12px", letterSpacing: "1.5px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "10px" }}>Sentences</div>
              {sentences.map((s, i) => (
                <div key={i} style={{ background: "#faf8f5", borderRadius: "12px", padding: "14px", marginBottom: "10px", border: "1px solid rgba(0,0,0,0.07)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#8a7e72" }}>#{i + 1}</span>
                    {sentences.length > 1 && <button onClick={() => removeSentence(i)} style={{ background: "transparent", border: "none", color: "#c0a090", cursor: "pointer", fontSize: "18px", padding: "0 4px" }}>×</button>}
                  </div>
                  <input value={s.text} onChange={e => updateSentence(i, "text", e.target.value)} placeholder="Practice sentence" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: "15px", fontFamily: "inherit", outline: "none", marginBottom: "8px", boxSizing: "border-box", fontStyle: "italic" }} />
                  <input value={s.tip} onChange={e => updateSentence(i, "tip", e.target.value)} placeholder="Pronunciation tip (optional)" style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: "13px", fontFamily: "inherit", outline: "none", color: "#4a6fa5", boxSizing: "border-box" }} />
                </div>
              ))}

              <button onClick={addSentenceRow} style={{ background: "transparent", border: "1px dashed rgba(0,0,0,0.2)", color: "#8a7e72", padding: "10px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "14px", fontFamily: "inherit", marginBottom: "16px" }}>+ Add Sentence</button>
              <button onClick={saveHomework} style={{ background: "linear-gradient(135deg, #e8734a, #f0a86b)", border: "none", color: "#fff", padding: "14px", borderRadius: "12px", cursor: "pointer", width: "100%", fontSize: "16px", fontFamily: "inherit", boxShadow: "0 6px 16px rgba(232,115,74,0.3)" }}>📤 Assign to Students</button>
            </div>

            {/* Existing homework */}
            {homework.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "12px" }}>Assigned Homework</div>
                {homework.map(hw => (
                  <div key={hw.id} style={{ background: "rgba(255,255,255,0.8)", borderRadius: "14px", padding: "16px 20px", marginBottom: "10px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "15px", color: "#2a2218" }}>{hw.week} — {hw.title}</div>
                      <div style={{ fontSize: "12px", color: "#8a7e72", marginTop: "2px" }}>{hw.sentences.length} sentences</div>
                    </div>
                    <button onClick={() => deleteHomework(hw.id)} style={{ background: "rgba(232,115,74,0.1)", border: "1px solid rgba(232,115,74,0.3)", color: "#e8734a", padding: "6px 14px", borderRadius: "12px", cursor: "pointer", fontSize: "13px", fontFamily: "inherit" }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "students" && (
          <div>
            {students.length === 0 ? (
              <div style={{ textAlign: "center", color: "#8a7e72", padding: "60px 20px", fontStyle: "italic" }}>No students registered yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {students.map(s => (
                  <div key={s.id} style={{ background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "20px 24px", border: "1px solid rgba(0,0,0,0.08)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div>
                        <div style={{ fontSize: "18px", color: "#2a2218" }}>{s.name}</div>
                        <div style={{ fontSize: "12px", color: "#8a7e72", marginTop: "2px" }}>Joined {s.joinDate}</div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{ padding: "6px 12px", borderRadius: "12px", background: "rgba(232,115,74,0.1)", color: "#e8734a", fontSize: "13px" }}>🔥 {s.streak || 0} streak</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                      {[["Sessions", s.totalSessions || 0], ["Avg Score", avgScore(s) ? `${avgScore(s)}/10` : "—"], ["Best", s.sessions?.length ? Math.max(...s.sessions.map(x => x.score)) + "/10" : "—"]].map(([label, val]) => (
                        <div key={label} style={{ background: "#faf8f5", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                          <div style={{ fontSize: "18px", color: "#2a2218" }}>{val}</div>
                          <div style={{ fontSize: "11px", color: "#8a7e72", textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    {s.sessions?.length > 0 && (
                      <div style={{ marginTop: "12px", fontSize: "12px", color: "#8a7e72", fontStyle: "italic" }}>
                        Last practice: "{s.sessions[0].sentence}" — {s.sessions[0].date}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}