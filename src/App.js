import React, { useState, useRef, useEffect } from "react";

const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {} };
const load = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch(e) { return def; } };

const GROQ_API_KEY = process.env.REACT_APP_GROQ_KEY;

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

async function getFeedback(transcription, sentence, tip) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: "You are Tom, a warm and encouraging English speaking coach for Korean learners. You ONLY write in Korean and English. No Chinese, Japanese, Russian or any other script."
        },
        {
          role: "user",
          content: `A student just practiced saying this sentence: "${sentence}"
Native speaker tip: "${tip}"
What the student actually said: "${transcription}"

Give warm, bilingual feedback. Use ONLY Korean and English.

Format exactly like this:

🎯 문법 점수: X/10
[Korean sentence explaining the score]

✅ 잘한 점
[One encouraging Korean sentence]

📝 문법 피드백
[Korean explanation of any grammar issues]
→ 수정: [Corrected English if needed]

💡 더 자연스러운 표현
→ [More natural native English version]

💪 [One short motivating Korean sentence — pure Korean hangul only — examples: 잘하고 있어요! 화이팅! 계속 연습해요! 더 노력해봐요! — NO Japanese, NO Chinese]

Scoring: 10=perfect, 8-9=minor issues, 6-7=some mistakes, 4-5=several issues, 1-3=major issues
Under 150 words. Korean and English ONLY.`
        }
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateSentencesAI(topic) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Generate 5 natural English practice sentences for Korean learners around the topic: "${topic}". Return ONLY a JSON array with no extra text:
[{"text": "...", "tip": "one pronunciation/tone coaching tip in English"}]`
        }
      ]
    })
  });
  const data = await response.json();
  const text = data.choices[0].message.content;
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [isTeacher, setIsTeacher] = useState(false);
  const [students, setStudents] = useState(() => load("tt_students", []));
  const [homework, setHomework] = useState(() => load("tt_homework", SEED_HOMEWORK));

  useEffect(() => { save("tt_students", students); }, [students]);
  useEffect(() => { save("tt_homework", homework); }, [homework]);

  const updateStudent = (updated) => {
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    if (currentUser && currentUser.id === updated.id) setCurrentUser(updated);
  };

  if (screen === "login") return React.createElement(LoginScreen, { students, setStudents, setCurrentUser, setScreen, setIsTeacher, teacherPass: TEACHER_PASS });
  if (screen === "teacher") return React.createElement(TeacherScreen, { homework, setHomework, students, setScreen, generateSentencesAI });
  if (screen === "student") return React.createElement(StudentScreen, { user: currentUser, homework, updateStudent, setScreen });
  return null;
}

function LoginScreen({ students, setStudents, setCurrentUser, setScreen, setIsTeacher, teacherPass }) {
  const [mode, setMode] = useState("student");
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");

  const handleStudentLogin = () => {
    const found = students.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (!found) { setError("Name not found. Please register first."); return; }
    setCurrentUser(found); setScreen("student");
  };

  const handleRegister = () => {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (students.find(s => s.name.toLowerCase() === name.trim().toLowerCase())) { setError("This name is already taken."); return; }
    const newStudent = { id: Date.now(), name: name.trim(), joinDate: new Date().toLocaleDateString(), streak: 0, lastPractice: null, sessions: [], totalSessions: 0 };
    setStudents(prev => [...prev, newStudent]);
    setCurrentUser(newStudent); setScreen("student");
  };

  const handleTeacherLogin = () => {
    if (pass === teacherPass) { setIsTeacher(true); setScreen("teacher"); }
    else setError("Incorrect password.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f3ee", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", padding: "20px" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #e8734a, #f0a86b, #4a90d9)", zIndex: 10 }} />
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #e8734a, #4a90d9)", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", boxShadow: "0 8px 24px rgba(232,115,74,0.3)" }}>🎙</div>
          <div style={{ fontSize: "28px", color: "#2a2218" }}>Teacher Toms</div>
          <div style={{ fontSize: "14px", color: "#8a7e72", marginTop: "6px", fontStyle: "italic" }}>English Speaking Practice</div>
        </div>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.6)", borderRadius: "16px", padding: "4px", marginBottom: "24px", border: "1px solid rgba(0,0,0,0.08)" }}>
          {[["student", "Student Login"], ["register", "Register"], ["teacher", "Teacher"]].map(function(item) {
            return React.createElement("button", { key: item[0], onClick: function() { setMode(item[0]); setError(""); }, style: { flex: 1, padding: "10px", borderRadius: "12px", border: "none", background: mode === item[0] ? "#fff" : "transparent", color: mode === item[0] ? "#e8734a" : "#8a7e72", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", boxShadow: mode === item[0] ? "0 2px 8px rgba(0,0,0,0.1)" : "none" } }, item[1]);
          })}
        </div>
        <div style={{ background: "rgba(255,255,255,0.8)", borderRadius: "20px", padding: "32px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
          {(mode === "student" || mode === "register") && (
            <div>
              <label style={{ fontSize: "12px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Your Name</label>
              <input value={name} onChange={function(e) { setName(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") { if (mode === "student") handleStudentLogin(); else handleRegister(); } }} placeholder={mode === "student" ? "Enter your name" : "Choose a display name"} style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.12)", background: "#faf8f5", fontSize: "16px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {error && <div style={{ color: "#e8734a", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={mode === "student" ? handleStudentLogin : handleRegister} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #e8734a, #f0a86b)", color: "#fff", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                {mode === "student" ? "Enter Practice Room →" : "Create My Account →"}
              </button>
            </div>
          )}
          {mode === "teacher" && (
            <div>
              <label style={{ fontSize: "12px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>Teacher Password</label>
              <input type="password" value={pass} onChange={function(e) { setPass(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") handleTeacherLogin(); }} placeholder="Enter password" style={{ width: "100%", padding: "14px 16px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.12)", background: "#faf8f5", fontSize: "16px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "16px" }} />
              {error && <div style={{ color: "#e8734a", fontSize: "13px", marginBottom: "12px" }}>{error}</div>}
              <button onClick={handleTeacherLogin} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #4a90d9, #7ab3e8)", color: "#fff", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" }}>Enter Teacher Dashboard →</button>
              <div style={{ textAlign: "center", marginTop: "12px", fontSize: "12px", color: "#8a7e72" }}>Default password: toms2024</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentScreen({ user, homework, updateStudent, setScreen }) {
  const [tab, setTab] = useState("homework");
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
      mr.ondataavailable = function(e) { chunksRef.current.push(e.data); };
      mr.onstop = function() { setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach(function(t) { t.stop(); }); };
      mr.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(function() { setRecordingTime(function(t) { return t + 1; }); }, 1000);
    } catch(e) { console.log(e); }
  };

  const stopRecording = () => {
    if (mediaRef.current) { mediaRef.current.stop(); }
    setIsRecording(false);
    clearInterval(timerRef.current);
  };

  const getFeedbackFromGroq = async () => {
    if (!selectedSentence || !audioBlob) return;
    setIsLoading(true);
    setFeedback(null);
    try {
      // Convert blob to base64 and send to Groq Whisper for transcription
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-large-v3");
      formData.append("language", "en");
      formData.append("response_format", "text");

      const transcribeRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
        body: formData
      });
      const transcription = await transcribeRes.text();

      const feedbackText = await getFeedback(transcription, selectedSentence.text, selectedSentence.tip);
      setFeedback({ text: feedbackText, transcription });

      const today = new Date().toDateString();
      const isNewDay = user.lastPractice !== today;
      const newSession = { date: new Date().toLocaleDateString(), sentence: selectedSentence.text, score: 8, hw: activeHW.title };
      const updated = { ...user, lastPractice: today, streak: isNewDay ? (user.streak || 0) + 1 : user.streak, totalSessions: (user.totalSessions || 0) + 1, sessions: [newSession].concat((user.sessions || []).slice(0, 49)) };
      updateStudent(updated);
    } catch(e) {
      console.log(e);
      setFeedback({ error: "Couldn't load feedback. Try again!" });
    }
    setIsLoading(false);
  };

  const speakFeedback = () => {
    if (!feedback || !feedback.text) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(feedback.text.replace(/[🎯✅📝💡💪→]/g, ""));
    u.lang = "en-US"; u.rate = 0.9;
    u.onstart = function() { setIsSpeaking(true); };
    u.onend = function() { setIsSpeaking(false); };
    window.speechSynthesis.speak(u);
  };

  const avgScore = user.sessions && user.sessions.length > 0 ? (user.sessions.reduce(function(a, b) { return a + b.score; }, 0) / user.sessions.length).toFixed(1) : null;
  const bestScore = user.sessions && user.sessions.length > 0 ? Math.max.apply(null, user.sessions.map(function(s) { return s.score; })) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f3ee", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #e8734a, #f0a86b, #4a90d9)", zIndex: 10 }} />
      <div style={{ background: "rgba(255,255,255,0.9)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 9 }}>
        <div>
          <div style={{ fontSize: "18px", color: "#2a2218" }}>Hi, {user.name}! 👋</div>
          <div style={{ fontSize: "12px", color: "#8a7e72", marginTop: "2px" }}>🔥 {user.streak || 0} day streak</div>
        </div>
        <button onClick={function() { setScreen("login"); }} style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.12)", color: "#8a7e72", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>Log out</button>
      </div>
      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {[["homework", "📚 Homework"], ["progress", "📊 My Progress"]].map(function(item) {
            return React.createElement("button", { key: item[0], onClick: function() { setTab(item[0]); }, style: { padding: "10px 20px", borderRadius: "20px", border: "none", background: tab === item[0] ? "linear-gradient(135deg, #e8734a, #f0a86b)" : "rgba(255,255,255,0.7)", color: tab === item[0] ? "#fff" : "#8a7e72", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif", boxShadow: tab === item[0] ? "0 4px 12px rgba(232,115,74,0.3)" : "none" } }, item[1]);
          })}
        </div>

        {tab === "homework" && (
          <div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
              {homework.map(function(hw) {
                return React.createElement("button", { key: hw.id, onClick: function() { setSelectedHW(hw); setSelectedSentence(null); setFeedback(null); setAudioBlob(null); }, style: { padding: "8px 16px", borderRadius: "20px", border: "1px solid " + (activeHW && activeHW.id === hw.id ? "#e8734a" : "rgba(0,0,0,0.12)"), background: activeHW && activeHW.id === hw.id ? "rgba(232,115,74,0.1)" : "rgba(255,255,255,0.7)", color: activeHW && activeHW.id === hw.id ? "#e8734a" : "#8a7e72", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" } }, hw.week + " — " + hw.title);
              })}
            </div>
            {activeHW && (
              <div>
                <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "12px" }}>Select a sentence to practice</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                  {activeHW.sentences.map(function(s, i) {
                    return React.createElement("button", { key: s.id, onClick: function() { setSelectedSentence(s); setFeedback(null); setAudioBlob(null); }, style: { textAlign: "left", padding: "16px 20px", borderRadius: "14px", border: "1px solid " + (selectedSentence && selectedSentence.id === s.id ? "#e8734a" : "rgba(0,0,0,0.08)"), background: selectedSentence && selectedSentence.id === s.id ? "rgba(232,115,74,0.08)" : "rgba(255,255,255,0.8)", cursor: "pointer", fontFamily: "Georgia, serif" } },
                      React.createElement("div", { style: { fontSize: "11px", color: "#8a7e72", marginBottom: "4px" } }, "#" + (i + 1)),
                      React.createElement("div", { style: { fontSize: "17px", color: "#2a2218", fontStyle: "italic" } }, '"' + s.text + '"')
                    );
                  })}
                </div>
              </div>
            )}
            {selectedSentence && (
              <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "20px", padding: "28px", border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: "22px", fontStyle: "italic", color: "#2a2218", marginBottom: "12px", textAlign: "center" }}>"{selectedSentence.text}"</div>
                <div style={{ background: "rgba(74,144,217,0.08)", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", color: "#4a6fa5", fontStyle: "italic", marginBottom: "24px" }}>💡 {selectedSentence.tip}</div>
                <div style={{ textAlign: "center" }}>
                  {!isRecording && !audioBlob && (
                    <button onClick={startRecording} style={{ background: "linear-gradient(135deg, #e8734a, #f0a86b)", border: "none", color: "#fff", padding: "16px 36px", borderRadius: "30px", cursor: "pointer", fontSize: "16px", fontFamily: "Georgia, serif", boxShadow: "0 8px 20px rgba(232,115,74,0.35)" }}>🎙 Start Recording</button>
                  )}
                  {isRecording && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "16px" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#e8734a", animation: "pulse 1s infinite" }} />
                        <span style={{ color: "#e8734a", fontSize: "14px" }}>Recording… {recordingTime}s</span>
                      </div>
                      <button onClick={stopRecording} style={{ background: "rgba(232,115,74,0.1)", border: "2px solid #e8734a", color: "#e8734a", padding: "14px 32px", borderRadius: "30px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif" }}>⏹ Stop</button>
                    </div>
                  )}
                  {audioBlob && !isRecording && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
                      <audio src={URL.createObjectURL(audioBlob)} controls style={{ width: "100%", maxWidth: "280px" }} />
                      <div style={{ display: "flex", gap: "10px" }}>
                        <button onClick={getFeedbackFromGroq} disabled={isLoading} style={{ background: isLoading ? "rgba(74,144,217,0.2)" : "linear-gradient(135deg, #4a90d9, #7ab3e8)", border: "none", color: "#fff", padding: "14px 28px", borderRadius: "24px", cursor: isLoading ? "not-allowed" : "pointer", fontSize: "15px", fontFamily: "Georgia, serif" }}>
                          {isLoading ? "Analyzing…" : "✨ Get Feedback"}
                        </button>
                        <button onClick={function() { setAudioBlob(null); setFeedback(null); }} style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.12)", color: "#8a7e72", padding: "14px 20px", borderRadius: "24px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>Re-record</button>
                      </div>
                    </div>
                  )}
                </div>
                {feedback && !feedback.error && (
                  <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
                    {feedback.transcription && (
                      <div style={{ background: "rgba(74,144,217,0.06)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#4a6fa5", fontStyle: "italic" }}>
                        🎙 "{feedback.transcription}"
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                      <div style={{ fontSize: "16px", color: "#2a2218" }}>Tom의 피드백</div>
                      <button onClick={speakFeedback} style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", color: isSpeaking ? "#4a90d9" : "#8a7e72", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>{isSpeaking ? "🔊 듣는 중…" : "🔊 듣기"}</button>
                    </div>
                    <div style={{ fontSize: "14px", color: "#4a4238", lineHeight: 1.8, whiteSpace: "pre-line" }}>{feedback.text}</div>
                  </div>
                )}
                {feedback && feedback.error && <div style={{ color: "#e8734a", textAlign: "center", marginTop: "16px" }}>{feedback.error}</div>}
              </div>
            )}
          </div>
        )}

        {tab === "progress" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "24px" }}>
              {[["🔥", user.streak || 0, "Day Streak"], ["⭐", avgScore ? avgScore + "/10" : "—", "Avg Score"], ["🎯", user.totalSessions || 0, "Sessions"]].map(function(item) {
                return React.createElement("div", { key: item[2], style: { background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "20px 12px", textAlign: "center", border: "1px solid rgba(0,0,0,0.08)" } },
                  React.createElement("div", { style: { fontSize: "24px", marginBottom: "6px" } }, item[0]),
                  React.createElement("div", { style: { fontSize: "22px", color: "#2a2218", marginBottom: "4px" } }, item[1]),
                  React.createElement("div", { style: { fontSize: "11px", color: "#8a7e72", textTransform: "uppercase", letterSpacing: "1px" } }, item[2])
                );
              })}
            </div>
            {bestScore && (
              <div style={{ background: "linear-gradient(135deg, rgba(232,115,74,0.1), rgba(74,144,217,0.1))", borderRadius: "16px", padding: "20px", marginBottom: "24px", textAlign: "center" }}>
                <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "8px" }}>Best Score</div>
                <div style={{ fontSize: "36px", color: "#e8734a" }}>{bestScore}/10</div>
              </div>
            )}
            <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "12px" }}>Recent Practice</div>
            {(!user.sessions || user.sessions.length === 0) ? (
              <div style={{ textAlign: "center", color: "#8a7e72", padding: "40px", fontStyle: "italic" }}>No sessions yet — start practicing!</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {user.sessions.map(function(s, i) {
                  return React.createElement("div", { key: i, style: { background: "rgba(255,255,255,0.8)", borderRadius: "14px", padding: "16px 20px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "15px", fontStyle: "italic", color: "#2a2218", marginBottom: "4px" } }, '"' + s.sentence + '"'),
                      React.createElement("div", { style: { fontSize: "12px", color: "#8a7e72" } }, s.hw + " · " + s.date)
                    ),
                    React.createElement("div", { style: { padding: "6px 12px", borderRadius: "12px", background: "rgba(74,180,100,0.12)", color: "#3a9a5c", fontSize: "14px" } }, s.score + "/10")
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }`}</style>
    </div>
  );
}

function TeacherScreen({ homework, setHomework, students, setScreen, generateSentencesAI }) {
  const [tab, setTab] = useState("assign");
  const [newWeek, setNewWeek] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [sentences, setSentences] = useState([{ text: "", tip: "" }]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateTopic, setGenerateTopic] = useState("");
  const [success, setSuccess] = useState("");

  const addSentenceRow = () => setSentences(function(prev) { return prev.concat([{ text: "", tip: "" }]); });
  const updateSentence = (i, field, val) => setSentences(function(prev) { return prev.map(function(s, idx) { return idx === i ? Object.assign({}, s, { [field]: val }) : s; }); });
  const removeSentence = (i) => setSentences(function(prev) { return prev.filter(function(_, idx) { return idx !== i; }); });

  const saveHomework = () => {
    const valid = sentences.filter(function(s) { return s.text.trim(); });
    if (!newWeek.trim() || !newTitle.trim() || valid.length === 0) return;
    const hw = { id: Date.now(), week: newWeek, title: newTitle, sentences: valid.map(function(s, i) { return { id: Date.now() + i, text: s.text, tip: s.tip || "Focus on natural rhythm and tone." }; }) };
    setHomework(function(prev) { return prev.concat([hw]); });
    setNewWeek(""); setNewTitle(""); setSentences([{ text: "", tip: "" }]);
    setSuccess("Homework assigned! Students can see it now.");
    setTimeout(function() { setSuccess(""); }, 3000);
  };

  const generateSentences = async () => {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    try {
      const parsed = await generateSentencesAI(generateTopic);
      setSentences(parsed);
      setGenerateTopic("");
    } catch(e) { console.log(e); }
    setIsGenerating(false);
  };

  const deleteHomework = (id) => setHomework(function(prev) { return prev.filter(function(h) { return h.id !== id; }); });

  const avgScore = function(student) {
    if (!student.sessions || !student.sessions.length) return null;
    return (student.sessions.reduce(function(a, b) { return a + b.score; }, 0) / student.sessions.length).toFixed(1);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8", fontFamily: "Georgia, serif" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, #4a90d9, #7ab3e8, #e8734a)", zIndex: 10 }} />
      <div style={{ background: "rgba(255,255,255,0.95)", borderBottom: "1px solid rgba(0,0,0,0.08)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 9 }}>
        <div>
          <div style={{ fontSize: "18px", color: "#2a2218" }}>Teacher Toms — Dashboard</div>
          <div style={{ fontSize: "12px", color: "#8a7e72", marginTop: "2px" }}>{students.length} students registered</div>
        </div>
        <button onClick={function() { setScreen("login"); }} style={{ background: "transparent", border: "1px solid rgba(0,0,0,0.12)", color: "#8a7e72", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>Log out</button>
      </div>
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {[["assign", "📚 Assign Homework"], ["students", "👥 Students"]].map(function(item) {
            return React.createElement("button", { key: item[0], onClick: function() { setTab(item[0]); }, style: { padding: "10px 20px", borderRadius: "20px", border: "none", background: tab === item[0] ? "linear-gradient(135deg, #4a90d9, #7ab3e8)" : "rgba(255,255,255,0.7)", color: tab === item[0] ? "#fff" : "#8a7e72", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif", boxShadow: tab === item[0] ? "0 4px 12px rgba(74,144,217,0.3)" : "none" } }, item[1]);
          })}
        </div>

        {tab === "assign" && (
          <div>
            {success && <div style={{ background: "rgba(74,180,100,0.1)", border: "1px solid #4ab464", color: "#2a7a44", padding: "12px 16px", borderRadius: "12px", marginBottom: "16px", fontSize: "14px" }}>{success}</div>}
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "24px", marginBottom: "16px", border: "1px solid rgba(74,144,217,0.2)" }}>
              <div style={{ fontSize: "15px", color: "#2a2218", marginBottom: "14px" }}>✨ AI로 문장 생성하기</div>
              <div style={{ display: "flex", gap: "10px" }}>
                <input value={generateTopic} onChange={function(e) { setGenerateTopic(e.target.value); }} onKeyDown={function(e) { if (e.key === "Enter") generateSentences(); }} placeholder="Topic (e.g. giving compliments, apologizing)" style={{ flex: 1, padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)", background: "#faf8f5", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none" }} />
                <button onClick={generateSentences} disabled={isGenerating} style={{ background: isGenerating ? "rgba(74,144,217,0.2)" : "linear-gradient(135deg, #4a90d9, #7ab3e8)", border: "none", color: "#fff", padding: "12px 20px", borderRadius: "10px", cursor: isGenerating ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>{isGenerating ? "생성 중…" : "Generate"}</button>
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ fontSize: "15px", color: "#2a2218", marginBottom: "20px" }}>새 숙제 만들기</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Week</label>
                  <input value={newWeek} onChange={function(e) { setNewWeek(e.target.value); }} placeholder="e.g. Week 3" style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)", background: "#faf8f5", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: "11px", letterSpacing: "1.5px", color: "#8a7e72", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>Topic Title</label>
                  <input value={newTitle} onChange={function(e) { setNewTitle(e.target.value); }} placeholder="e.g. Giving Compliments" style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(0,0,0,0.1)", background: "#faf8f5", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ fontSize: "12px", letterSpacing: "1.5px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "10px" }}>Sentences</div>
              {sentences.map(function(s, i) {
                return React.createElement("div", { key: i, style: { background: "#faf8f5", borderRadius: "12px", padding: "14px", marginBottom: "10px", border: "1px solid rgba(0,0,0,0.07)" } },
                  React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" } },
                    React.createElement("span", { style: { fontSize: "12px", color: "#8a7e72" } }, "#" + (i + 1)),
                    sentences.length > 1 && React.createElement("button", { onClick: function() { removeSentence(i); }, style: { background: "transparent", border: "none", color: "#c0a090", cursor: "pointer", fontSize: "18px", padding: "0 4px" } }, "×")
                  ),
                  React.createElement("input", { value: s.text, onChange: function(e) { updateSentence(i, "text", e.target.value); }, placeholder: "Practice sentence", style: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: "15px", fontFamily: "Georgia, serif", outline: "none", marginBottom: "8px", boxSizing: "border-box", fontStyle: "italic" } }),
                  React.createElement("input", { value: s.tip, onChange: function(e) { updateSentence(i, "tip", e.target.value); }, placeholder: "Pronunciation tip (optional)", style: { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none", color: "#4a6fa5", boxSizing: "border-box" } })
                );
              })}
              <button onClick={addSentenceRow} style={{ background: "transparent", border: "1px dashed rgba(0,0,0,0.2)", color: "#8a7e72", padding: "10px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "14px", fontFamily: "Georgia, serif", marginBottom: "16px" }}>+ Add Sentence</button>
              <button onClick={saveHomework} style={{ background: "linear-gradient(135deg, #e8734a, #f0a86b)", border: "none", color: "#fff", padding: "14px", borderRadius: "12px", cursor: "pointer", width: "100%", fontSize: "16px", fontFamily: "Georgia, serif", boxShadow: "0 6px 16px rgba(232,115,74,0.3)" }}>📤 Assign to Students</button>
            </div>
            {homework.length > 0 && (
              <div style={{ marginTop: "20px" }}>
                <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#8a7e72", textTransform: "uppercase", marginBottom: "12px" }}>Assigned Homework</div>
                {homework.map(function(hw) {
                  return React.createElement("div", { key: hw.id, style: { background: "rgba(255,255,255,0.8)", borderRadius: "14px", padding: "16px 20px", marginBottom: "10px", border: "1px solid rgba(0,0,0,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "15px", color: "#2a2218" } }, hw.week + " — " + hw.title),
                      React.createElement("div", { style: { fontSize: "12px", color: "#8a7e72", marginTop: "2px" } }, hw.sentences.length + " sentences")
                    ),
                    React.createElement("button", { onClick: function() { deleteHomework(hw.id); }, style: { background: "rgba(232,115,74,0.1)", border: "1px solid rgba(232,115,74,0.3)", color: "#e8734a", padding: "6px 14px", borderRadius: "12px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" } }, "Delete")
                  );
                })}
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
                {students.map(function(s) {
                  return React.createElement("div", { key: s.id, style: { background: "rgba(255,255,255,0.9)", borderRadius: "16px", padding: "20px 24px", border: "1px solid rgba(0,0,0,0.08)" } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" } },
                      React.createElement("div", null,
                        React.createElement("div", { style: { fontSize: "18px", color: "#2a2218" } }, s.name),
                        React.createElement("div", { style: { fontSize: "12px", color: "#8a7e72", marginTop: "2px" } }, "Joined " + s.joinDate)
                      ),
                      React.createElement("div", { style: { padding: "6px 12px", borderRadius: "12px", background: "rgba(232,115,74,0.1)", color: "#e8734a", fontSize: "13px" } }, "🔥 " + (s.streak || 0) + " streak")
                    ),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" } },
                      [["Sessions", s.totalSessions || 0], ["Avg Score", avgScore(s) ? avgScore(s) + "/10" : "—"], ["Best", s.sessions && s.sessions.length ? Math.max.apply(null, s.sessions.map(function(x) { return x.score; })) + "/10" : "—"]].map(function(item) {
                        return React.createElement("div", { key: item[0], style: { background: "#faf8f5", borderRadius: "10px", padding: "12px", textAlign: "center" } },
                          React.createElement("div", { style: { fontSize: "18px", color: "#2a2218" } }, item[1]),
                          React.createElement("div", { style: { fontSize: "11px", color: "#8a7e72", textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" } }, item[0])
                        );
                      })
                    ),
                    s.sessions && s.sessions.length > 0 && React.createElement("div", { style: { marginTop: "12px", fontSize: "12px", color: "#8a7e72", fontStyle: "italic" } }, "Last practice: \"" + s.sessions[0].sentence + "\" — " + s.sessions[0].date)
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
