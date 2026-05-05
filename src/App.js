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

// ── 12-Week Curriculum ────────────────────────────────────────────────────────
const CURRICULUM = [
  { id: "w1", week: 1, topic: "Introductions", phrases: [
    { id: "w1p1", en: "Hi, my name is ___. Nice to meet you!", ko: "안녕하세요, 저는 ___입니다. 만나서 반가워요!", context: "Introducing yourself for the first time" },
    { id: "w1p2", en: "Where are you from?", ko: "어디서 오셨어요?", context: "Starting a conversation with someone new" },
    { id: "w1p3", en: "I'm from Korea. How about you?", ko: "저는 한국에서 왔어요. 당신은요?", context: "Responding to where you're from" },
    { id: "w1p4", en: "It's so nice to meet you!", ko: "만나서 정말 반가워요!", context: "Warm greeting when meeting someone" },
    { id: "w1p5", en: "Can you speak slowly, please?", ko: "천천히 말씀해 주시겠어요?", context: "Asking someone to slow down" },
  ]},
  { id: "w2", week: 2, topic: "Reaction Phrases", phrases: [
    { id: "w2p1", en: "No way! Are you serious?", ko: "말도 안돼! 진짜요?", context: "Reacting with surprise to something unexpected" },
    { id: "w2p2", en: "That's so cool!", ko: "정말 멋지다!", context: "Expressing admiration or excitement" },
    { id: "w2p3", en: "Oh my gosh, that's amazing!", ko: "세상에, 정말 대단해요!", context: "Reacting to something impressive" },
    { id: "w2p4", en: "That makes total sense.", ko: "완전히 이해돼요.", context: "Agreeing or showing understanding" },
    { id: "w2p5", en: "I can relate to that.", ko: "저도 공감이 가네요.", context: "Expressing that you understand their feeling" },
  ]},
  { id: "w3", week: 3, topic: "Keeping a Conversation Going", phrases: [
    { id: "w3p1", en: "That's really interesting!", ko: "그거 정말 흥미롭네요!", context: "Showing genuine interest in what someone said" },
    { id: "w3p2", en: "What was that like?", ko: "그건 어떤 기분이었나요?", context: "Asking someone to share more about their experience" },
    { id: "w3p3", en: "Can you tell me more?", ko: "조금 더 자세히 말해줄 수 있나요?", context: "Showing you want to hear more" },
    { id: "w3p4", en: "How long have you been doing that?", ko: "얼마나 오래 그걸 하셨어요?", context: "Asking about someone's experience or background" },
    { id: "w3p5", en: "That must have been incredible.", ko: "정말 대단한 경험이었겠어요.", context: "Responding warmly to someone's story" },
  ]},
  { id: "w4", week: 4, topic: "Small Talk", phrases: [
    { id: "w4p1", en: "How's everything going with you?", ko: "요즘 어떻게 지내세요?", context: "Checking in on someone casually" },
    { id: "w4p2", en: "I've been really busy lately.", ko: "요즘 정말 바빴어요.", context: "Sharing what's been going on in your life" },
    { id: "w4p3", en: "What do you do for fun?", ko: "취미가 뭐예요?", context: "Getting to know someone better" },
    { id: "w4p4", en: "Have you been to Korea?", ko: "한국에 가본 적 있어요?", context: "Starting a conversation about travel" },
    { id: "w4p5", en: "The weather is beautiful today, isn't it?", ko: "오늘 날씨 정말 좋죠?", context: "Classic small talk opener" },
  ]},
  { id: "w5", week: 5, topic: "At the Airport", phrases: [
    { id: "w5p1", en: "Where is the check-in counter?", ko: "체크인 카운터가 어디에 있나요?", context: "Finding your way at the airport" },
    { id: "w5p2", en: "I have one carry-on and one checked bag.", ko: "기내 수하물 하나와 위탁 수하물 하나 있습니다.", context: "Checking in your luggage" },
    { id: "w5p3", en: "Could I have a window seat, please?", ko: "창가 자리로 부탁드려도 될까요?", context: "Requesting your seat preference" },
    { id: "w5p4", en: "Is this the gate for my flight?", ko: "이곳이 제 항공편 탑승구인가요?", context: "Confirming you're at the right gate" },
    { id: "w5p5", en: "My flight was delayed. What should I do?", ko: "항공편이 지연됐어요. 어떻게 해야 하나요?", context: "Handling a delayed flight" },
  ]},
  { id: "w6", week: 6, topic: "Hotel Check-in", phrases: [
    { id: "w6p1", en: "I have a reservation under my name.", ko: "제 이름으로 예약이 되어 있습니다.", context: "Checking into your hotel" },
    { id: "w6p2", en: "Could I get a room with a nice view?", ko: "전망이 좋은 방으로 부탁드릴 수 있을까요?", context: "Making a room request" },
    { id: "w6p3", en: "What time is checkout?", ko: "체크아웃은 몇 시인가요?", context: "Asking about hotel policies" },
    { id: "w6p4", en: "Could you recommend a good restaurant nearby?", ko: "근처에 좋은 식당을 추천해 주실 수 있나요?", context: "Getting local recommendations" },
    { id: "w6p5", en: "The air conditioning isn't working properly.", ko: "에어컨이 제대로 작동하지 않아요.", context: "Reporting a problem in your room" },
  ]},
  { id: "w7", week: 7, topic: "Ordering Food", phrases: [
    { id: "w7p1", en: "Could I see the menu, please?", ko: "메뉴판 좀 볼 수 있을까요?", context: "Asking for the menu at a restaurant" },
    { id: "w7p2", en: "What do you recommend?", ko: "무엇을 추천하시나요?", context: "Asking the server for their suggestion" },
    { id: "w7p3", en: "I'll have the same as them.", ko: "저도 같은 걸로 할게요.", context: "Ordering what someone else ordered" },
    { id: "w7p4", en: "Could I get this to go?", ko: "포장해 주실 수 있을까요?", context: "Asking for your food to be packed" },
    { id: "w7p5", en: "Could we get the bill, please?", ko: "계산서 부탁드려요.", context: "Asking for the check at a restaurant" },
  ]},
  { id: "w8", week: 8, topic: "Getting Around", phrases: [
    { id: "w8p1", en: "How do I get to ___?", ko: "___에 어떻게 가나요?", context: "Asking for directions" },
    { id: "w8p2", en: "Is it within walking distance?", ko: "걸어갈 수 있는 거리인가요?", context: "Asking if a place is nearby" },
    { id: "w8p3", en: "Could you take me to this address?", ko: "이 주소로 데려다 주시겠어요?", context: "Giving directions to a taxi driver" },
    { id: "w8p4", en: "How long does it take to get there?", ko: "거기까지 얼마나 걸려요?", context: "Asking about travel time" },
    { id: "w8p5", en: "I think I'm lost. Can you help me?", ko: "길을 잃은 것 같아요. 도와주실 수 있나요?", context: "Asking for help when lost" },
  ]},
  { id: "w9", week: 9, topic: "Shopping", phrases: [
    { id: "w9p1", en: "How much does this cost?", ko: "이거 얼마예요?", context: "Asking the price of something" },
    { id: "w9p2", en: "Do you have this in a different size?", ko: "다른 사이즈로 있나요?", context: "Looking for a different size while shopping" },
    { id: "w9p3", en: "I'm just looking, thank you.", ko: "그냥 구경하는 거예요, 감사해요.", context: "Politely declining help from a salesperson" },
    { id: "w9p4", en: "Can I pay by card?", ko: "카드로 결제할 수 있나요?", context: "Asking about payment methods" },
    { id: "w9p5", en: "Could I get a receipt, please?", ko: "영수증 주시겠어요?", context: "Asking for a receipt after purchase" },
  ]},
  { id: "w10", week: 10, topic: "Making Friends", phrases: [
    { id: "w10p1", en: "Would you like to grab coffee sometime?", ko: "언제 커피 한잔 하실래요?", context: "Suggesting a casual meetup" },
    { id: "w10p2", en: "It was so great talking with you!", ko: "이야기 나눠서 정말 좋았어요!", context: "Wrapping up a great conversation" },
    { id: "w10p3", en: "Let's stay in touch!", ko: "계속 연락해요!", context: "Saying goodbye and keeping the connection" },
    { id: "w10p4", en: "You should visit Korea sometime!", ko: "언제 한국에 꼭 오세요!", context: "Inviting someone to visit Korea" },
    { id: "w10p5", en: "I had such a great time with you.", ko: "함께해서 정말 즐거웠어요.", context: "Expressing that you enjoyed spending time together" },
  ]},
  { id: "w11", week: 11, topic: "Handling Unexpected Situations", phrases: [
    { id: "w11p1", en: "I'm sorry, I don't understand. Could you repeat that?", ko: "죄송한데, 이해가 안 됐어요. 다시 말씀해 주시겠어요?", context: "Asking someone to repeat themselves" },
    { id: "w11p2", en: "Is there anyone here who speaks Korean?", ko: "혹시 여기 한국어 하시는 분 계신가요?", context: "Looking for a Korean speaker in an emergency" },
    { id: "w11p3", en: "I think there's been a misunderstanding.", ko: "오해가 있는 것 같아요.", context: "Addressing a miscommunication calmly" },
    { id: "w11p4", en: "Could you write that down for me?", ko: "그것을 적어 주실 수 있나요?", context: "Asking someone to write something down" },
    { id: "w11p5", en: "I need help. Is there anyone available?", ko: "도움이 필요해요. 도와주실 분 계신가요?", context: "Asking for help in an urgent situation" },
  ]},
  { id: "w12", week: 12, topic: "Confidence & Final Expressions", phrases: [
    { id: "w12p1", en: "Excuse me, do you have a moment?", ko: "실례합니다, 잠깐 시간 있으세요?", context: "Politely getting someone's attention" },
    { id: "w12p2", en: "I'm still learning English, but I'm trying my best!", ko: "아직 영어를 배우고 있지만, 최선을 다하고 있어요!", context: "Being honest and confident about your language journey" },
    { id: "w12p3", en: "Thank you for your patience with me.", ko: "기다려 주셔서 감사해요.", context: "Appreciating someone's understanding" },
    { id: "w12p4", en: "I'm so glad we got to talk!", ko: "이야기 나눌 수 있어서 정말 기뻐요!", context: "Expressing genuine joy from a conversation" },
    { id: "w12p5", en: "You've made my day!", ko: "덕분에 하루가 기분 좋아졌어요!", context: "Telling someone they made you happy" },
  ]},
];

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_GROUPS = [
  { id: "g1", name: "Group 1 — High School Boys", currentWeek: 1 },
  { id: "g2", name: "Group 2 — Young Women (19-25)", currentWeek: 1 },
  { id: "g3", name: "Group 3 — Adult Men (40s)", currentWeek: 1 },
];

const TEACHER_PASS = "wayve2024";

// ── API Calls ─────────────────────────────────────────────────────────────────
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

async function getAIFeedback(transcription, phrase) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", max_tokens: 500,
      messages: [
        { role: "system", content: "You are Tom, a warm English coach for Korean learners at Wayve. Write ONLY in Korean and English. Never use Chinese, Japanese or any other script. The final motivational line must be pure Korean hangul only — examples: 잘하고 있어요! 화이팅! 계속 연습해요!" },
        { role: "user", content: `Target phrase: "${phrase.en}"\nContext: "${phrase.context}"\nStudent said: "${transcription}"\n\nGive warm bilingual feedback:\n\n🎯 점수: X/10\n[Korean explanation]\n\n✅ 잘한 점\n[Korean encouragement]\n\n📝 피드백\n[Korean explanation]\n→ [Corrected English if needed]\n\n💡 더 자연스럽게\n→ [Natural native version]\n\n💪 [Short Korean motivation — pure hangul only, no Chinese characters]\n\nUnder 120 words. Korean + English ONLY.` }
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

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(text) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = 0.85;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(v => v.lang === "en-US" && (v.name.includes("Samantha") || v.name.includes("Karen")));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  const [groups, setGroups] = useState(() => load("wayve_groups", SEED_GROUPS));
  const [students, setStudents] = useState(() => load("wayve_students", []));
  const [customPhrases, setCustomPhrases] = useState(() => load("wayve_custom", []));
  const [levelUp, setLevelUp] = useState(null);

  useEffect(() => { save("wayve_groups", groups); }, [groups]);
  useEffect(() => { save("wayve_students", students); }, [students]);
  useEffect(() => { save("wayve_custom", customPhrases); }, [customPhrases]);

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

  const getGroupPhrases = (group) => {
    const week = group.currentWeek || 1;
    const base = CURRICULUM.filter(w => w.week <= week);
    const custom = customPhrases.filter(c => c.groupId === group.id);
    return [...base, ...custom];
  };

  if (screen === "login") return React.createElement(LoginScreen, { students, setStudents, groups, setCurrentUser, setScreen });
  if (screen === "teacher") return React.createElement(TeacherScreen, { groups, setGroups, students, customPhrases, setCustomPhrases, setScreen, getGroupPhrases });
  if (screen === "student") return React.createElement(StudentScreen, { user: currentUser, groups, students, updateStudent, setScreen, getGroupPhrases, levelUp, setLevelUp });
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
          <div style={{ fontSize: "14px", color: "#63b3ed", letterSpacing: "4px", textTransform: "uppercase" }}>English Confidence</div>
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
              <button onClick={() => pass === TEACHER_PASS ? setScreen("teacher") : setError("Wrong password")} style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #fcd34d, #f59e0b)", color: "#1a1a1a", fontSize: "16px", cursor: "pointer", fontFamily: "Georgia, serif" }}>
                Teacher Dashboard →
              </button>
              <div style={{ textAlign: "center", marginTop: "10px", fontSize: "12px", color: "#4a5568" }}>Password: wayve2024</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Student Screen ────────────────────────────────────────────────────────────
function StudentScreen({ user, groups, students, updateStudent, setScreen, getGroupPhrases, levelUp, setLevelUp }) {
  const [tab, setTab] = useState("practice");
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [selectedPhrase, setSelectedPhrase] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const group = groups.find(g => g.id === user.groupId);
  const allWeeks = group ? getGroupPhrases(group) : [];
  const activeWeek = selectedWeek || allWeeks[allWeeks.length - 1];
  const currentLevel = getLevel(user.xp || 0);
  const nextLevel = getNextLevel(user.xp || 0);
  const xpProgress = nextLevel ? ((user.xp || 0) - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired) * 100 : 100;
  const groupStudents = students.filter(s => s.groupId === user.groupId).sort((a, b) => (b.xp || 0) - (a.xp || 0));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => { setAudioBlob(new Blob(chunksRef.current, { type: "audio/webm" })); stream.getTracks().forEach(t => t.stop()); };
      mr.start();
      setIsRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch(e) {}
  };

  const stopRecording = () => { mediaRef.current?.stop(); setIsRecording(false); clearInterval(timerRef.current); };

  const submitRecording = async () => {
    if (!audioBlob || !selectedPhrase) return;
    setIsLoading(true); setFeedback(null);
    try {
      const transcription = await transcribeAudio(audioBlob);
      const fb = await getAIFeedback(transcription, selectedPhrase);
      setFeedback({ text: fb, transcription });
      const already = (user.completedPhrases || []).includes(selectedPhrase.id);
      const xpGain = already ? 10 : 25;
      const newXP = (user.xp || 0) + xpGain;
      const today = new Date().toDateString();
      const isNewDay = user.lastPractice !== today;
      updateStudent({ ...user, xp: newXP, streak: isNewDay ? (user.streak || 0) + 1 : user.streak, lastPractice: today, totalSessions: (user.totalSessions || 0) + 1, completedPhrases: already ? (user.completedPhrases || []) : [...(user.completedPhrases || []), selectedPhrase.id], sessions: [{ date: new Date().toLocaleDateString(), phrase: selectedPhrase.en, xp: xpGain }, ...(user.sessions || []).slice(0, 49)] });
    } catch(e) { setFeedback({ error: "Couldn't load feedback. Try again!" }); }
    setIsLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d1117", fontFamily: "Georgia, serif", color: "#e2e8f0" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #63b3ed, #fcd34d)", zIndex: 20 }} />

      {levelUp && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setLevelUp(null)}>
          <div style={{ background: "linear-gradient(135deg, #1a2332, #0d1117)", border: "1px solid rgba(99,179,237,0.3)", borderRadius: "24px", padding: "48px", textAlign: "center", maxWidth: "340px", margin: "20px" }}>
            <div style={{ fontSize: "72px", marginBottom: "16px" }}>{levelUp.emoji}</div>
            <div style={{ fontSize: "11px", letterSpacing: "4px", color: "#63b3ed", textTransform: "uppercase", marginBottom: "8px" }}>레벨 업!</div>
            <div style={{ fontSize: "24px", color: "#fcd34d", marginBottom: "12px" }}>{levelUp.name}</div>
            <div style={{ fontSize: "16px", color: "#a0aec0", marginBottom: "24px" }}>{levelUp.milestone}</div>
            <button onClick={() => setLevelUp(null)} style={{ background: "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "12px 28px", borderRadius: "20px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif" }}>계속 연습해요! 🚀</button>
          </div>
        </div>
      )}

      <div style={{ background: "rgba(13,17,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <div>
            <div style={{ fontSize: "18px", color: "#fff" }}>Hi, {user.name}! 👋</div>
            <div style={{ fontSize: "12px", color: "#718096" }}>🔥 {user.streak || 0}일 연속 · {currentLevel.emoji} {currentLevel.name}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ background: "rgba(252,211,77,0.15)", border: "1px solid rgba(252,211,77,0.3)", borderRadius: "20px", padding: "6px 12px", fontSize: "13px", color: "#fcd34d" }}>⚡ {user.xp || 0} XP</div>
            <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#718096", padding: "6px 12px", borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" }}>나가기</button>
          </div>
        </div>
        {nextLevel && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#4a5568", marginBottom: "4px" }}>
              <span>{currentLevel.emoji} {currentLevel.name}</span>
              <span>→ {nextLevel.emoji} {nextLevel.name}</span>
            </div>
            <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${xpProgress}%`, background: "linear-gradient(90deg, #63b3ed, #fcd34d)", borderRadius: "3px", transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: "6px", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
        {[["practice", "🎙 연습"], ["leaderboard", "🏆 순위"], ["progress", "📊 진도"]].map(([t, label]) =>
          React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "8px 14px", borderRadius: "20px", border: "1px solid " + (tab === t ? "rgba(99,179,237,0.3)" : "transparent"), background: tab === t ? "rgba(99,179,237,0.15)" : "transparent", color: tab === t ? "#63b3ed" : "#718096", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" } }, label)
        )}
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "16px" }}>

        {tab === "practice" && (
          <div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
              {allWeeks.map(w =>
                React.createElement("button", { key: w.id, onClick: () => { setSelectedWeek(w); setSelectedPhrase(null); setFeedback(null); setAudioBlob(null); }, style: { padding: "7px 12px", borderRadius: "16px", border: "1px solid " + (activeWeek?.id === w.id ? "#63b3ed" : "rgba(255,255,255,0.07)"), background: activeWeek?.id === w.id ? "rgba(99,179,237,0.1)" : "transparent", color: activeWeek?.id === w.id ? "#63b3ed" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" } }, `W${w.week}: ${w.topic}`)
              )}
            </div>

            {activeWeek && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {activeWeek.phrases.map(p => {
                  const done = (user.completedPhrases || []).includes(p.id);
                  return React.createElement("button", { key: p.id, onClick: () => { setSelectedPhrase(p); setFeedback(null); setAudioBlob(null); }, style: { textAlign: "left", padding: "14px 18px", borderRadius: "12px", border: "1px solid " + (selectedPhrase?.id === p.id ? "#63b3ed" : "rgba(255,255,255,0.06)"), background: selectedPhrase?.id === p.id ? "rgba(99,179,237,0.07)" : "rgba(255,255,255,0.02)", cursor: "pointer", fontFamily: "Georgia, serif", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "15px", color: "#e2e8f0", fontStyle: "italic", marginBottom: "3px" } }, '"' + p.en + '"'),
                      React.createElement("div", { style: { fontSize: "12px", color: "#718096" } }, p.ko)
                    ),
                    done ? React.createElement("div", { style: { fontSize: "16px", flexShrink: 0 } }, "✅") : React.createElement("div", { style: { fontSize: "11px", color: "#4a5568", flexShrink: 0 } }, "+25 XP")
                  );
                })}
              </div>
            )}

            {selectedPhrase && (
              <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "18px", padding: "24px", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontSize: "20px", fontStyle: "italic", color: "#fff", marginBottom: "6px", textAlign: "center" }}>"{selectedPhrase.en}"</div>
                <div style={{ fontSize: "14px", color: "#718096", textAlign: "center", marginBottom: "6px" }}>{selectedPhrase.ko}</div>
                <div style={{ background: "rgba(99,179,237,0.07)", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#63b3ed", marginBottom: "18px", textAlign: "center" }}>{selectedPhrase.context}</div>
                <div style={{ textAlign: "center", marginBottom: "14px" }}>
                  <button onClick={() => speak(selectedPhrase.en)} style={{ background: "rgba(99,179,237,0.08)", border: "1px solid rgba(99,179,237,0.2)", color: "#63b3ed", padding: "8px 20px", borderRadius: "18px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>🔊 들어보기</button>
                </div>
                <div style={{ textAlign: "center" }}>
                  {!isRecording && !audioBlob && <button onClick={startRecording} style={{ background: "linear-gradient(135deg, #fc8181, #f56565)", border: "none", color: "#fff", padding: "14px 32px", borderRadius: "28px", cursor: "pointer", fontSize: "15px", fontFamily: "Georgia, serif", boxShadow: "0 6px 18px rgba(245,101,101,0.3)" }}>🎙 녹음 시작</button>}
                  {isRecording && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "14px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fc8181" }} />
                        <span style={{ color: "#fc8181", fontSize: "14px" }}>녹음 중… {recordingTime}초</span>
                      </div>
                      <button onClick={stopRecording} style={{ background: "rgba(245,101,101,0.12)", border: "2px solid #fc8181", color: "#fc8181", padding: "12px 28px", borderRadius: "28px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>⏹ 멈추기</button>
                    </div>
                  )}
                  {audioBlob && !isRecording && (
                    <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                      <button onClick={submitRecording} disabled={isLoading} style={{ background: isLoading ? "rgba(99,179,237,0.15)" : "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "13px 26px", borderRadius: "22px", cursor: isLoading ? "not-allowed" : "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>
                        {isLoading ? "분석 중…" : "✨ 피드백 받기"}
                      </button>
                      <button onClick={() => { setAudioBlob(null); setFeedback(null); }} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#718096", padding: "13px 18px", borderRadius: "22px", cursor: "pointer", fontSize: "14px", fontFamily: "Georgia, serif" }}>↺</button>
                    </div>
                  )}
                </div>
                {feedback && !feedback.error && (
                  <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    {feedback.transcription && <div style={{ background: "rgba(99,179,237,0.06)", borderRadius: "8px", padding: "10px 12px", marginBottom: "12px", fontSize: "13px", color: "#63b3ed", fontStyle: "italic" }}>🎙 "{feedback.transcription}"</div>}
                    <div style={{ fontSize: "14px", color: "#a0aec0", lineHeight: 1.9, whiteSpace: "pre-line" }}>{feedback.text}</div>
                    <div style={{ marginTop: "14px", padding: "10px 12px", background: "rgba(252,211,77,0.07)", borderRadius: "8px", fontSize: "13px", color: "#fcd34d" }}>⚡ XP 획득!</div>
                  </div>
                )}
                {feedback?.error && <div style={{ color: "#fc8181", textAlign: "center", marginTop: "14px" }}>{feedback.error}</div>}
              </div>
            )}
          </div>
        )}

        {tab === "leaderboard" && (
          <div>
            <div style={{ fontSize: "13px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "14px" }}>{group?.name}</div>
            {groupStudents.length === 0 ? (
              <div style={{ textAlign: "center", color: "#4a5568", padding: "40px", fontStyle: "italic" }}>아직 그룹원이 없어요.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {groupStudents.map((s, i) => {
                  const lv = getLevel(s.xp || 0);
                  const isMe = s.id === user.id;
                  return React.createElement("div", { key: s.id, style: { background: isMe ? "rgba(99,179,237,0.07)" : "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "14px 18px", border: "1px solid " + (isMe ? "rgba(99,179,237,0.25)" : "rgba(255,255,255,0.05)"), display: "flex", alignItems: "center", gap: "14px" } },
                    React.createElement("div", { style: { fontSize: "18px", width: "28px", textAlign: "center", color: i === 0 ? "#fcd34d" : "#4a5568" } }, i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`),
                    React.createElement("div", { style: { flex: 1 } },
                      React.createElement("div", { style: { fontSize: "15px", color: isMe ? "#63b3ed" : "#e2e8f0" } }, s.name + (isMe ? " (나)" : "")),
                      React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, lv.emoji + " " + lv.name)
                    ),
                    React.createElement("div", { style: { fontSize: "14px", color: "#fcd34d" } }, "⚡ " + (s.xp || 0))
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "progress" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "20px" }}>
              {[["🔥", user.streak || 0, "연속"], ["⚡", user.xp || 0, "XP"], ["✅", (user.completedPhrases || []).length, "완료"]].map(([emoji, val, label]) =>
                React.createElement("div", { key: label, style: { background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px 10px", textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" } },
                  React.createElement("div", { style: { fontSize: "22px", marginBottom: "4px" } }, emoji),
                  React.createElement("div", { style: { fontSize: "20px", color: "#fff", marginBottom: "2px" } }, val),
                  React.createElement("div", { style: { fontSize: "10px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px" } }, label)
                )
              )}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", marginBottom: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "14px" }}>레벨 여정</div>
              {LEVELS.map(lv => {
                const unlocked = (user.xp || 0) >= lv.xpRequired;
                const current = currentLevel.level === lv.level;
                return React.createElement("div", { key: lv.level, style: { display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", opacity: unlocked ? 1 : 0.35 } },
                  React.createElement("div", { style: { fontSize: "18px" } }, lv.emoji),
                  React.createElement("div", { style: { flex: 1 } },
                    React.createElement("div", { style: { fontSize: "13px", color: current ? "#fcd34d" : unlocked ? "#e2e8f0" : "#4a5568" } }, lv.name + (current ? " ← 현재" : "")),
                    React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, lv.milestone)
                  ),
                  unlocked && React.createElement("div", null, "✅")
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Teacher Screen ────────────────────────────────────────────────────────────
function TeacherScreen({ groups, setGroups, students, customPhrases, setCustomPhrases, setScreen, getGroupPhrases }) {
  const [tab, setTab] = useState("groups");
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [newPhrase, setNewPhrase] = useState({ en: "", ko: "", context: "" });
  const [generateTopic, setGenerateTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPhrases, setGeneratedPhrases] = useState([]);
  const [success, setSuccess] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  const groupStudents = (gid) => students.filter(s => s.groupId === gid);
  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); };

  const addPhrase = () => {
    if (!newPhrase.en.trim() || !selectedGroup) return;
    const existing = customPhrases.find(c => c.groupId === selectedGroup.id && c.topic === "Teacher's Additions");
    if (existing) {
      setCustomPhrases(prev => prev.map(c => c.id === existing.id ? { ...c, phrases: [...c.phrases, { id: "cp" + Date.now(), ...newPhrase }] } : c));
    } else {
      setCustomPhrases(prev => [...prev, { id: "c" + Date.now(), groupId: selectedGroup.id, week: 99, topic: "Teacher's Additions", phrases: [{ id: "cp" + Date.now(), ...newPhrase }] }]);
    }
    setNewPhrase({ en: "", ko: "", context: "" });
    showSuccess("Phrase added!");
  };

  const addGeneratedPhrases = () => {
    if (!generatedPhrases.length || !selectedGroup) return;
    setCustomPhrases(prev => [...prev, { id: "cg" + Date.now(), groupId: selectedGroup.id, week: 98, topic: generateTopic, phrases: generatedPhrases.map((p, i) => ({ id: "cgp" + Date.now() + i, ...p })) }]);
    setGeneratedPhrases([]); setGenerateTopic("");
    showSuccess("Phrases assigned to " + selectedGroup.name + "!");
  };

  const generate = async () => {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    try { setGeneratedPhrases(await generatePhrases(generateTopic)); } catch(e) {}
    setIsGenerating(false);
  };

  const updateWeek = (gid, week) => setGroups(prev => prev.map(g => g.id === gid ? { ...g, currentWeek: Math.max(1, Math.min(12, week)) } : g));

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    setGroups(prev => [...prev, { id: "g" + Date.now(), name: newGroupName, currentWeek: 1 }]);
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
      <div style={{ background: "rgba(13,17,23,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: "20px", color: "#fcd34d", letterSpacing: "-0.5px" }}>WAYVE</div>
          <div style={{ fontSize: "12px", color: "#718096" }}>Teacher Dashboard</div>
        </div>
        <button onClick={() => setScreen("login")} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#718096", padding: "8px 16px", borderRadius: "20px", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" }}>Log out</button>
      </div>

      <div style={{ display: "flex", gap: "6px", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {[["groups", "👥 Groups"], ["add", "✨ Add Phrases"], ["curriculum", "📚 Curriculum"]].map(([t, label]) =>
          React.createElement("button", { key: t, onClick: () => setTab(t), style: { padding: "8px 14px", borderRadius: "20px", border: "1px solid " + (tab === t ? "rgba(252,211,77,0.3)" : "transparent"), background: tab === t ? "rgba(252,211,77,0.1)" : "transparent", color: tab === t ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "13px", fontFamily: "Georgia, serif" } }, label)
        )}
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "16px" }}>
        {success && <div style={{ background: "rgba(72,187,120,0.1)", border: "1px solid #48bb78", color: "#48bb78", padding: "12px 16px", borderRadius: "12px", marginBottom: "14px", fontSize: "14px" }}>{success}</div>}

        {tab === "groups" && (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {groups.map(g => {
                const gs = groupStudents(g.id);
                return React.createElement("div", { key: g.id, style: { background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", border: "1px solid rgba(255,255,255,0.06)" } },
                  React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" } },
                    React.createElement("div", null,
                      React.createElement("div", { style: { fontSize: "16px", color: "#fff" } }, g.name),
                      React.createElement("div", { style: { fontSize: "12px", color: "#718096", marginTop: "3px" } }, "Week " + (g.currentWeek || 1) + " / 12 — " + (CURRICULUM.find(w => w.week === (g.currentWeek || 1))?.topic || ""))
                    ),
                    React.createElement("div", { style: { display: "flex", gap: "6px", alignItems: "center" } },
                      React.createElement("button", { onClick: () => updateWeek(g.id, (g.currentWeek || 1) - 1), style: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", width: "30px", height: "30px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" } }, "−"),
                      React.createElement("span", { style: { fontSize: "14px", color: "#e2e8f0", minWidth: "20px", textAlign: "center" } }, g.currentWeek || 1),
                      React.createElement("button", { onClick: () => updateWeek(g.id, (g.currentWeek || 1) + 1), style: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#718096", width: "30px", height: "30px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" } }, "+")
                    )
                  ),
                  React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: gs.length > 0 ? "14px" : "0" } },
                    [["Students", gs.length], ["Avg XP", avgXP(g.id)], ["Today", gs.filter(s => s.lastPractice === new Date().toDateString()).length + " active"]].map(([label, val]) =>
                      React.createElement("div", { key: label, style: { background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px", textAlign: "center" } },
                        React.createElement("div", { style: { fontSize: "18px", color: "#fcd34d" } }, val),
                        React.createElement("div", { style: { fontSize: "10px", color: "#718096", textTransform: "uppercase", letterSpacing: "1px" } }, label)
                      )
                    )
                  ),
                  gs.length > 0 && gs.sort((a, b) => (b.xp || 0) - (a.xp || 0)).map(s =>
                    React.createElement("div", { key: s.id, style: { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: "13px" } },
                      React.createElement("span", { style: { color: "#a0aec0" } }, s.name),
                      React.createElement("span", { style: { color: "#fcd34d" } }, "⚡ " + (s.xp || 0) + "  " + getLevel(s.xp || 0).emoji)
                    )
                  )
                );
              })}
            </div>
            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "13px", color: "#718096", marginBottom: "12px" }}>+ 새 그룹 만들기</div>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === "Enter" && addGroup()} placeholder="Group name (e.g. Tuesday Morning)" style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "14px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "10px" }} />
              <button onClick={addGroup} style={{ background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.25)", color: "#fcd34d", padding: "10px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "14px", fontFamily: "Georgia, serif" }}>그룹 만들기</button>
            </div>
          </div>
        )}

        {tab === "add" && (
          <div>
            <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "10px" }}>그룹 선택</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "20px" }}>
              {groups.map(g =>
                React.createElement("button", { key: g.id, onClick: () => setSelectedGroup(g), style: { padding: "7px 12px", borderRadius: "18px", border: "1px solid " + (selectedGroup?.id === g.id ? "#fcd34d" : "rgba(255,255,255,0.07)"), background: selectedGroup?.id === g.id ? "rgba(252,211,77,0.1)" : "transparent", color: selectedGroup?.id === g.id ? "#fcd34d" : "#718096", cursor: "pointer", fontSize: "12px", fontFamily: "Georgia, serif" } }, g.name)
              )}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", marginBottom: "14px", border: "1px solid rgba(99,179,237,0.12)" }}>
              <div style={{ fontSize: "14px", color: "#63b3ed", marginBottom: "12px" }}>✨ AI로 문장 생성</div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                <input value={generateTopic} onChange={e => setGenerateTopic(e.target.value)} onKeyDown={e => e.key === "Enter" && generate()} placeholder="주제 (예: ordering coffee, making friends)" style={{ flex: 1, padding: "11px 13px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none" }} />
                <button onClick={generate} disabled={isGenerating} style={{ background: "rgba(99,179,237,0.15)", border: "1px solid rgba(99,179,237,0.25)", color: "#63b3ed", padding: "11px 16px", borderRadius: "10px", cursor: isGenerating ? "not-allowed" : "pointer", fontSize: "13px", fontFamily: "Georgia, serif", whiteSpace: "nowrap" }}>{isGenerating ? "생성 중…" : "생성"}</button>
              </div>
              {generatedPhrases.length > 0 && (
                <div>
                  {generatedPhrases.map((p, i) =>
                    React.createElement("div", { key: i, style: { padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" } },
                      React.createElement("div", { style: { fontSize: "13px", color: "#e2e8f0", fontStyle: "italic" } }, p.en),
                      React.createElement("div", { style: { fontSize: "11px", color: "#718096" } }, p.ko)
                    )
                  )}
                  <button onClick={addGeneratedPhrases} style={{ background: "linear-gradient(135deg, #63b3ed, #4299e1)", border: "none", color: "#fff", padding: "11px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "13px", fontFamily: "Georgia, serif", marginTop: "12px" }}>
                    📤 {selectedGroup?.name}에 추가
                  </button>
                </div>
              )}
            </div>

            <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: "14px", padding: "18px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: "14px", color: "#e2e8f0", marginBottom: "12px" }}>➕ 직접 추가</div>
              {[["en", "English phrase", true], ["ko", "Korean translation", false], ["context", "Context / when to use", false]].map(([field, placeholder]) =>
                React.createElement("input", { key: field, value: newPhrase[field], onChange: e => setNewPhrase(p => ({ ...p, [field]: e.target.value })), placeholder, style: { width: "100%", padding: "11px 13px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", color: "#fff", fontSize: "13px", fontFamily: "Georgia, serif", outline: "none", boxSizing: "border-box", marginBottom: "8px" } })
              )}
              <button onClick={addPhrase} style={{ background: "rgba(252,211,77,0.1)", border: "1px solid rgba(252,211,77,0.25)", color: "#fcd34d", padding: "11px", borderRadius: "10px", cursor: "pointer", width: "100%", fontSize: "13px", fontFamily: "Georgia, serif" }}>
                {selectedGroup?.name}에 추가
              </button>
            </div>
          </div>
        )}

        {tab === "curriculum" && (
          <div>
            <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#4a5568", textTransform: "uppercase", marginBottom: "14px" }}>12주 커리큘럼</div>
            {CURRICULUM.map(w =>
              React.createElement("div", { key: w.id, style: { background: "rgba(255,255,255,0.02)", borderRadius: "12px", padding: "14px 16px", marginBottom: "8px", border: "1px solid rgba(255,255,255,0.05)" } },
                React.createElement("div", { style: { fontSize: "14px", color: "#e2e8f0", marginBottom: "8px" } }, `Week ${w.week}: ${w.topic}`),
                w.phrases.map(p =>
                  React.createElement("div", { key: p.id, style: { fontSize: "12px", color: "#718096", padding: "3px 0" } }, "→ " + p.en)
                )
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
