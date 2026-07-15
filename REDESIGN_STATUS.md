# Wayve Redesign v3 — Full Status

Branch `redesign-v3`. All student-facing work is behind **`redesign_v3_enabled`** (per-student
flag + TEACHER_NAMES fallback). The teacher dashboard redesign is behind **`TEACHER_DASH_V3`**
(constant, currently `true`; teacher-only surface). Nothing deployed.

## Student app (board ①–㉛)

| # | Screen | Status |
|---|---|---|
| ① | Home — 오늘의 계획 | ✅ HomeGridV3 (plan card, streak line, Wavi resume, Thursday, 추천 세션) |
| ② | Mode sheet | ✅ ModeSheetV3 (듣기 / 따라 말하기) |
| ③ | Wavi listening (in-session) | ⚠️ Partial — ④ pass chip + ⑫ calm end done; deep live-listening restyle **deferred** (frozen voice loop, session-sensitive) |
| ④ | Pass moment | ✅ quiet ✓ chip, no confetti |
| ⑤ | Practice | ✅ 3-segment IA (이번 주 / 지난 표현 / 내 목록) + card visuals |
| ⑥ | Solo | ✅ mic-first light card; discovery dropped; typed path kept |
| ⑦ | Community | ✅ calm Thursday card + feed; confetti removed |
| ⑧ | Login | ⛔ **Skipped — needs your decision.** Renders before any user exists, so it can't be per-student gated (all-or-nothing) |
| ⑨ | Profile sheet | ✅ ProfileSheetV3 (글자 크기, 알림, 다크 모드, Teacher View, 앱 둘러보기 다시 하기) |
| ⑩ | Listen player | ✅ ListenPlayerV3 (light, EN+KO, play, 들었어요 ✓) |
| ⑪ | Shadowing | ⚠️ Not a standalone player. Shadow-mode exists inside the scenario flow, gated behind `SCENARIOS_STUDENT_ENABLED` (**false — you asked me not to flip it**). Build the dedicated player when you validate scenarios |
| ⑫ | Session end + teacher note | ✅ calm end, teacher note surfaced |
| ⑬ | Thursday answer flow | ✅ both entry points (QodEntryScreen + QodAnswerFlow): 반 친구들과 나누기 / 나만 보기로 저장; milestone confetti removed |
| ⑭ | My List | ✅ flat saved list (라이브러리 split removed), universal save toggle |
| ⑮ | Dark mode | ✅ **whole student app** via palette Proxy; toggle in profile sheet |
| ㉑ | Tour | ✅ rebuilt TourSpotlightV3 (7 steps, real anchors); ONBOARDING_VERSION not bumped (bump at rollout) |
| ㉔–㉛ | states/review/etc. | mostly backed by existing behavior; ㉕ (no-confetti) done; others use existing warm copy |

## Teacher dashboard (board ⑯⑰⑳㉒㉓㉗㉘ + spec)

Locked spec: `TEACHER_DASHBOARD_REDESIGN.md`. Built behind `TEACHER_DASH_V3`.

| Step / screen | Status |
|---|---|
| Schema (attendance, group_schedule) | ✅ migrations run |
| Group weekly schedule editor | ✅ Setup → Groups |
| Session wrap-up (attendance + phrases) | ✅ "🗓 수업 정리" on group cards |
| ⑯ Today — pulse | ✅ TeacherTodayV3 (context card · 내가 할 일 · 학생 현황 from attendance+minutes) |
| ⑰ Student detail | ✅ + 출석 기록 log + their 리퀘스트 |
| ⑳ Inbox | ✅ 메시지 / 리퀘스트 / **Thursday** segments |
| Teacher nav chrome (IA) | ✅ collapsed to Today · Students · Inbox (segmented pill on mobile, grouped sidebar on desktop); Notes / AI Tools / Setup moved behind a header ⚙ menu; 🔔 unread bell |
| Teacher dark mode | ✅ 🌙 toggle (now inside the ⚙ menu on mobile); whole dashboard darkens |
| Students **list** status chips | ✅ pulse dot (🟢/🟡/🔴/⚪️) + 이번 주 N분 on every TeacherStudentsTab row |
| ㉗ Students list | ✅ v3 card list + pulse dots (chose the pulse-dot pass over a full re-layout) |
| ㉘ Phrase management | ✅ header + card polish (AddPhrasesTab); functional internals left intact |
| ㉒㉓ Scenario Builder | ⬜ exists (Groq); **not** redesigned — tied to the Groq `openai/gpt-oss-*` migration workstream (deadline Aug 16 2026) |

## Migrations run in Supabase
- `redesign_v3_enabled` on students · `class_requests` (+ groups.session_day/time) · `attendance` · `group_schedule`. ✅ all applied.

## To activate
- **Students:** flip `redesign_v3_enabled = true` per student (teacher dashboard student-detail toggle). Today only Toms sees v3 (name fallback).
- **Teacher dashboard:** already on (`TEACHER_DASH_V3 = true`); flip to `false` to revert to the legacy dashboard.
- **Before student rollout:** bump `ONBOARDING_VERSION` (re-shows the tour), decide ⑧ Login, and validate scenarios before flipping `SCENARIOS_STUDENT_ENABLED`.

## Decisions (resolved 2026-07-15)
1. ⑧ Login — **leave legacy** (not restyled). ✅ decided.
2. ⑪ Shadowing player — **leave as-is** for now. ✅ decided.
3. ㉒㉓ Scenario Builder — **do together with the Groq migration** (`llama-*` → `openai/gpt-oss-*`). ▶ queued.
4. ㉗㉘ teacher list / phrase management — **pixel-restyle**. ▶ queued.
5. Student "N일 남음" countdown — now reads `group_schedule` (falls back to `groups.session_day`). ✅ done. Populate schedules via Setup → Groups to light it up.

## Still open
- `SCENARIOS_STUDENT_ENABLED` — flip after real-session validation (unlocks ⑩ rollout + ⑪ player).
- ③ in-session Wavi listening — pending your OK to restyle (drop message list → last line + persistent 다시 듣기/건너뛰기), with a manual session test.
- 알림 server-honored OFF (a `students.push_enabled` column) — add, or leave enable-only?
- Student rollout: flip `redesign_v3_enabled` per student + bump `ONBOARDING_VERSION` at go-live.
