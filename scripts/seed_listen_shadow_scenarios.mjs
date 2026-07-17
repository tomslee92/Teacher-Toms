// Seed starter scenarios + the Narim Australia pack into prod.
// Dialogue (with Korean display glosses) is parsed verbatim from the prototype's SCN object;
// the Narim Korean framing/close lines come from the session-pack .md. No dialogue invented.
// Idempotent: clears prior seed rows (is_starter=true / collection='narim-australia') first.
import { readFileSync } from "node:fs";

const BASE = "https://ulpnmewvejvpancvqnrp.supabase.co/rest/v1";
const KEY = process.env.REACT_APP_SUPABASE_KEY || "sb_publishable_sDP-kuCv5E2LmpDMPp8Y4A_n1ryWhNO";
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const NARIM_ID = "3d9e3d96-f409-4274-bc06-f6a431ab0501";
const AUS_VOICE = "DYkrAHD8iwork3YSUBbs";
const DIR = new URL("../design_handoff_listen_shadow", import.meta.url).pathname;

const post = async (table, body, prefer = "return=representation") => {
  const r = await fetch(`${BASE}/${table}`, { method: "POST", headers: { ...H, Prefer: prefer }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${table} POST ${r.status}: ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
const del = async (q) => { const r = await fetch(`${BASE}/scenarios?${q}`, { method: "DELETE", headers: { ...H, Prefer: "return=minimal" } }); if (!r.ok) throw new Error(`DEL ${r.status}: ${await r.text()}`); };

// ── Parse the SCN object from the prototype (brace-matched; no braces inside its strings) ──
const html = readFileSync(`${DIR}/Listen Shadow Prototype.dc.html`, "utf8");
const bs = html.indexOf("{", html.indexOf("SCN = {"));
let depth = 0, be = -1;
for (let i = bs; i < html.length; i++) { const c = html[i]; if (c === "{") depth++; else if (c === "}") { if (--depth === 0) { be = i; break; } } }
const SCN = new Function("return (" + html.slice(bs, be + 1) + ")")();

// ── Narim framing lines (Wavi, Korean, spoken) — from Narim Australia Session Pack.md ──
const FRAME = {
  aus1: { intro: `오늘은 시드니 호스텔 라운지에서 처음 말을 거는 상황이에요. 편하게 듣기만 하세요.`, close: `"Mind if I join you?"가 두 번 나왔죠. 자리에 낄 때도, 모임에 낄 때도 똑같이 쓸 수 있는 표현이에요.` },
  aus2: { intro: `호스텔 사람들과 본다이 해안 산책을 하는 상황이에요. 함께하고 싶을 때 쓰는 표현이 나와요.`, close: `"Count me in", 함께하고 싶을 때 짧고 자신 있게 말할 수 있는 표현이에요. 오늘 두 번 나왔죠.` },
  aus3: { intro: `산책 후에 다 같이 피시앤칩스를 먹으면서 서로를 더 알아가는 상황이에요.`, close: `"What about you?" 하고 질문을 돌려주면 대화가 끊기지 않고 계속 이어져요. 제일 쉬운 대화의 기술이에요.` },
  aus4: { intro: `이번엔 상대방 말을 못 알아들었을 때 자연스럽게 되묻는 상황이에요. 여행에서 제일 쓸모 있을 거예요.`, close: `되묻는 건 실력이 부족해서가 아니에요. "Sorry, could you say that again?" 이 한 문장이면 어떤 대화도 이어갈 수 있어요.` },
  aus5: { intro: `마지막 상황이에요. 오늘 만난 친구와 다음 약속을 잡는 상황이에요.`, close: `다섯 가지 상황을 다 들으셨어요. 친구 사귀기 편은 여기까지예요. 한 달 뒤 시드니에서 이 문장들이 그대로 나올 거예요. 나림 씨는 준비되어 있어요.` },
  aus6: { intro: `이제 카페 알바 준비예요. 지나가다 구인 공고를 보고 직접 물어보는 상황이에요.`, close: `"Are you hiring?" 이 세 단어로 문이 열려요. 직접 물어보는 사람이 제일 기억에 남는 법이에요.` },
  aus7: { intro: `첫 근무예요. 이번엔 나림 씨가 주문을 받는 쪽이에요.`, close: `"Coming right up", 주문 받고 나서 밝게 마무리하는 표현이에요. 손님이 바로 미소 짓게 돼요.` },
  aus8: { intro: `마감 시간이에요. 동료와 자연스럽게 가까워지는 상황이에요.`, close: `"Do you want a hand?" 하고 먼저 손을 내밀면 동료가 친구가 돼요. 여덟 가지 상황, 전부 나림 씨의 한 달이에요.` },
};

const STARTERS = ["cafe", "taxi", "small"];
const AUS = ["aus1", "aus2", "aus3", "aus4", "aus5", "aus6", "aus7", "aus8"];

const dialogueLines = (key) => SCN[key].lines.map((l) => ({
  speaker: l.who === "m" ? "student" : "other",
  english_text: l.en,
  korean_text: l.ko || null,
}));

const run = async () => {
  console.log("Clearing prior seed rows…");
  await del("is_starter=eq.true");
  await del("collection=eq.narim-australia");

  // Starters
  for (const key of STARTERS) {
    const s = SCN[key];
    const scRow = await post("scenarios", { title: s.title, category: s.cat, context_description: s.other || null, is_active: true, is_starter: true, created_by: "seed" });
    const sc = Array.isArray(scRow) ? scRow[0] : scRow;
    const lines = dialogueLines(key).map((l, i) => ({ ...l, scenario_id: sc.id, sequence_order: i + 1 }));
    await post("scenario_lines", lines, "return=minimal");
    console.log(`  starter ${key.padEnd(6)} "${s.title}" — ${lines.length} lines`);
  }

  // Narim pack
  for (let n = 0; n < AUS.length; n++) {
    const key = AUS[n];
    const s = SCN[key];
    const scRow = await post("scenarios", { title: s.title, category: s.cat, context_description: s.other || null, is_active: true, is_starter: false, collection: "narim-australia", sort_order: n + 1, other_voice_id: AUS_VOICE, created_by: "seed" });
    const sc = Array.isArray(scRow) ? scRow[0] : scRow;
    const body = [
      { speaker: "student", english_text: FRAME[key].intro, korean_text: null },
      ...dialogueLines(key),
      { speaker: "student", english_text: FRAME[key].close, korean_text: null },
    ].map((l, i) => ({ ...l, scenario_id: sc.id, sequence_order: i + 1 }));
    await post("scenario_lines", body, "return=minimal");
    await post("scenario_assignments", { scenario_id: sc.id, student_id: NARIM_ID, group_id: null }, "return=minimal");
    console.log(`  ${key} "${s.title}" — ${body.length} lines (+intro/close), assigned to Narim`);
  }

  // Verify counts
  const cnt = async (q) => (await (await fetch(`${BASE}/scenarios?${q}&select=id`, { headers: { ...H, Prefer: "count=exact", Range: "0-0" } })).headers.get("content-range"));
  console.log("\nVERIFY  starters:", await cnt("is_starter=eq.true"), " narim-australia:", await cnt("collection=eq.narim-australia"));
};
run().catch((e) => { console.error("SEED FAILED:", e.message); process.exit(1); });
