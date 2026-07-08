# Wayve Redesign — Implementation Handoff

Maps every screen in `Wayve Final.dc.html` to its App.js touchpoints, DB state, and gating.
Honest status: **these are design mockups — no code in teacher-toms was changed.** This spec is what
Claude Code needs to make each screen functional. Backend readiness is noted per screen.

Global rules (from CLAUDE.md): every student-visible change behind a per-student flag with
`|| TEACHER_NAMES.includes(user.name)` fallback; test on Toms Lee; React.createElement + inline styles;
존댓말, no 님; word-break keep-all.

## Shared foundation (do first)
- **Adopt WAYVE_TOKENS everywhere** (~line 178). Replace old `C` palette usages screen-by-screen as each screen ships. No new colors.
- **Font**: swap Inter → Pretendard in `GlobalStyle` (`@import` cdn.jsdelivr pretendardvariable). One-line change, affects all screens — ship behind `home_v2` styling flag or all-at-once after Toms Lee test.
- **Tab bar**: replace emoji tabs (landmark: `tabs = [["home", "🏠"...]` ~line 4694) with inline SVG line icons; 5 tabs → 4 (remove `myphrases`). Routing for old `myphrases` deep-links → `practice` with My List segment active.
- **Header cleanup**: remove Aa / Log out / Teacher buttons from StudentScreen header; add avatar button → Profile sheet (⑨).
- Suggested flag: `redesign_v3_enabled` boolean on `students`, teacher-dashboard toggle, Toms Lee fallback.

## Screen-by-screen

### ① Home — 오늘의 계획
- **Backend: ready.** Plan derives from existing data in `fetchHomeData` (AppInner): QoD/expression listened (localStorage or `active_time_segments`), phrases remaining (`student_progress` vs `phrase_bank`), review count. No new tables.
- New code: plan-state derivation fn + `HomeGridV3` component. Streak line reuses `students.streak` (text only, no 🔥 under 3 — existing `streakDisplay` logic).
- "어제 하던 대화, 이어서 할까요?" requires last-session pointer: add nullable `last_wavi_scenario_id`/`last_phrase_id` to `students` (migration) — or derive from `wavy_phrase_attempts` latest row (no schema change; prefer this first).

### ② Mode picker bottom sheet
- **Backend: mostly ready.** Listen/Shadowing scenarios exist (`20260606_wavi_scenarios_and_character.sql`, `scenario_assignments`, `scenario_category`, `scenario_intro`). Student-facing gate: `SCENARIOS_STUDENT_ENABLED` (line ~171, currently false).
- New code: sheet component on Home; "지난번엔 듣기로" ← store last mode in localStorage (no DB).
- 자유 대화 row is display-only (준비 중) — no backend needed yet.

### ③ Wavi session — listening state
- **Backend: ready.** Restyle of existing `WavyScreen` (landmarks: `wavyState`, `micLevel`, variant pools, `pickVariant`). Changes are presentational: drop message list to last Wavi line only, calmer listening panel, persistent 건너뛰기 (already has skip logic in session flow).
- Keep frozen: ElevenLabs settings, language forcing, `WAVY_VOICE_ID`.

### ④ Pass moment
- **Backend: ready.** Hooks into `celebrateAndAdvance` (writes `passed: true` to `student_progress` — source of truth per the fixed dual-write bug). Swap celebration UI for expression change (`wavi-encouraging.png`) + quiet ✓. New warm lines join a variant pool, not hardcoded strings.

### ⑤ Practice (이번 주)
- **Backend: ready.** Same data as current Practice tab (`phrase_bank`, `student_progress`, personal phrases via `20260526101336_personal_phrases.sql` + `student_id` column workstream). "FOR YOU" chip = `phrase.isPersonal` (already exists, ~line 5435).
- New code: segmented control; hide score after pass (UI only); "최고 7/10" reads existing best-score field.

### ⑥ Solo Practice
- **Backend: ready.** Existing freetalk flow (Groq/Gemini feedback, Whisper ASR, ⭐ save → personal phrases). Redesign is layout only; "따라 말하기" button = existing MiniPractice repeat, "My List에 저장" = existing save.
- **Keep the typed-input path** ("입력으로 물어보기" under the mic) — existing howto text flow; it's the quiet-context / low-anxiety alternative to speaking.
- **Drop the 오늘의 표현/shuffle discovery section from Solo** — discovery lives on Home (오늘의 표현 + 추천 세션); Solo's single job is production.

### ⑦ Community — Thursday ritual
- **Backend: ready.** QoD tables + `isQodDay` gate (line ~544) already implemented. Redesign is presentational.
- **Reactions (♡): fully backed** — `qod_reactions` table with toggle insert/delete (~line 13490). Design shows a single quiet count; the emoji set (`REACTION_EMOJIS`, ~13363) can stay behind a long-press if desired.
- **Student-to-student replies: NOT backed and not designed.** `qod_comments` is teacher→student feedback only (with seen_at/unread badges). The mockup shows a "선생님 댓글" indicator (backed) instead of a reply count. Building student replies would need a new table + moderation thinking — recommend against at current scale.

### ⑧ Login
- **Backend: ready.** Existing name-based login (`wayve_student_name` localStorage + `students` lookup). Pure restyle.

### ⑨ Profile sheet
- **Backend: ready.** 글자 크기 = existing `body[data-fontsize]` zoom; 언어 = `students.language`; 알림 = `subscribeToPush`; 내 프로필 = existing profile fields (hometown/job/hobby/level/goal); Teacher View = `TEACHER_NAMES` check; 로그아웃 = existing handler. New code: the sheet itself.

### ⑩ Listen mode player
- **Backend: exists, needs wiring.** Scenario data + two-voice TTS already built (second voice `UgBBYS2sOqTuMpoF3BR0`, per-segment language forcing). New code: line-by-line player UI (current line highlight, ↺ replay, 천천히 slow toggle = existing slow-listen path), progression state. No mic code paths at all.
- Flip `SCENARIOS_STUDENT_ENABLED` only after Toms Lee validation.

### ⑪ Shadowing
- **Backend: partial.** Playback + recording exist; the point is what's ABSENT: no Whisper scoring call, no transcript display, no writes to `student_progress`. New code: shadowing session loop (play → record (optional local waveform only) → next). Log time via `useActivityTracker` (engagement metric = time, not completion). Uses `wavi-speaking.png` expression.

### ⑫ Session end + teacher note
- **Backend: needs one decision.** Note infra exists but is mothballed (`NOTES_FEATURES_ENABLED = false`, `20260601_session_and_student_notes.sql`; feature intact per commit 329cd37). Options: (a) re-enable notes tables scoped to per-session teacher note surfaced at session end / Wavi open — matches workstream 4; (b) new minimal `teacher_session_notes` table. Recommend (a) — reversible, code exists.
- Stats line ("6분 · 표현 2개 통과") = `active_time_segments` + session pass count, both existing.

### ⑬ Thankful Thursday answer flow
- **Backend: ready.** Existing QoD answer paths (direct English / Korean-voice → translate). Redesign consolidates to one screen; "나만 보기" = existing private-submit path. Removes trophy/confetti animations (banned list).

### ⑭ My List segment
- **Backend: ready.** Personal/saved phrases + `phrase_dismissals` (`20260611` migration). Source chips ("SOLO에서 저장", "THURSDAY에서 저장") need a `source` column on saved phrases if not present — check `phrase_bank`/personal phrases schema; add nullable column via migration if missing.

### ⑮ Dark mode
- **Backend: none needed; code: theme plumbing.** Inline styles mean no CSS-variable shortcut — add a `DARK_TOKENS` twin of `WAYVE_TOKENS` and select per render via a `theme` value (from `prefers-color-scheme`, with manual override stored on `students.theme` nullable column or localStorage). Practical path: introduce a `useTokens()` helper returning the active token set, and adopt it screen-by-screen as each redesigned screen ships — do NOT attempt a big-bang retrofit of all 22k lines.

### ⑯⑰ Teacher dashboard
- **Backend: ready.** Today view composes existing queries: groups/schedule, `active_time_segments` (weekly minutes — see §7 SQL), `student_progress` pass counts, unanswered `qod_responses`/`student_messages` for the pending card and Inbox badge. Student detail = existing `StudentDetailView` (~line 8486) restyled; flag toggles already exist there; the 이번 주 메모 composer writes to the re-enabled notes tables (pairs with ⑫).
- "4일 전 — 연락해 볼까요?" nudge = derived from `last_seen`/`last_practice` (existing `lastActive` helpers, ~line 958). Display only; no automation (manual Kakao outreach stays the process).

### ⑱⑲⑳ Class requests ("다음 수업 리퀘스트")
- **Why the pin feature failed**: it was a filing chore separated from the moment of motivation. Requests are reframed as a message to Toms, captured at three entry points: home 다음 수업 card, Solo post-save one-tap (⑲), request sheet (⑱).
- **Backend: new table** `class_requests` (migration): id, student_id, group_id, kind (voice|text|phrase), content text, audio_url nullable, phrase_id nullable (FK to saved phrase), status (new|planned|covered), created_at. Indexes: none needed at this scale.
- Voice path reuses existing recording + Whisper transcript pipeline; audio upload reuses the QoD comment storage pattern (~line 19795 comment).
- "수요일 수업까지 3일" needs group session day: add nullable `session_day`/`session_time` to `groups` (already partially implied by scheduling; verify before adding).
- Teacher Inbox (⑳): new "리퀘스트" segment alongside existing `student_messages`; "수업에 반영" sets status=planned and can prefill the phrase-add flow. Status=covered → student home shows "리퀘스트가 이번 수업에 반영됐어요" (closes the loop — this is the retention moment).
- Deprecate the old pin UI once requests ship (data can migrate: pinned → kind=phrase requests).

### ㉑ Tour
- **Backend: ready.** Existing tour system (`ONBOARDING_VERSION`, TourTabTooltip, tour steps array ~line 4038) — redesign to spotlight style, rewrite copy for the new IA (remove emoji from titles).
- **Full step list (7)**: ① 홈=오늘의 계획 (plan card) ② Wavi 모드 시트 (마이크·점수 부담 없음) ③ Practice + My List 세그먼트 ④ Solo (말로도 글로도) ⑤ 리퀘스트 행 ⑥ Community 목요일 ⑦ 주간 리듬 요약 + 시작하기. Each step spotlights the real element on the real screen (elevated z-index + ring, dimmed scrim — see ㉑ mockup).
- **Spotlight anchors must be re-mapped**: the old tour's highlight targets (cardKey "practice"/"freetalk" home cards, freetalkSubStep record targets, tab tooltips) point at elements that no longer exist or moved in the new IA. Audit every step's anchor against the redesigned DOM; delete steps whose target was removed (e.g. old home grid cards) rather than pointing them at approximate replacements. Bump `ONBOARDING_VERSION` on ship.
- **Re-entry**: new "앱 둘러보기 다시 하기" row in Profile sheet (⑨) — clears the localStorage onboarding-version key and restarts the tour. One-line handler, no DB.

### ㉒㉓ Scenario Builder (teacher)
- **Backend: mostly ready.** Tables exist: `wavi_scenarios`, `scenario_assignments`, `scenario_category`, `scenario_intro`, `scenario_drafts` (+ exposure/attempted). Groq generation path is the planned workstream item — structured output must be re-tested on the `openai/gpt-oss-*` models after the Aug 16 migration (reasoning-style models, per §1).
- Draft flow: prompt → Groq draft → per-line edit (★ lines = the student's practice phrases, stored as phrase refs) → assign (student or whole group via `scenario_assignments`) → publish. Voice preview per line uses existing two-voice TTS (Wavi + `UgBBYS2sOqTuMpoF3BR0`).
- **Request → Builder prefill**: "수업에 반영" on a class_request (⑳) opens the Builder with the request text as the situation prompt and the student pre-assigned — this is the loop that makes requests visibly shape sessions.

### ㉔–㉛ Review mode, states, teacher tools
- **㉔ 복습 모드**: backed — existing `isReviewMode` branch in WavyScreen (amber prompt, Korean-only). Adds a "힌트 보기"/"정답 듣기" affordance (client-only). 
- **㉕ Thursday 제출 완료**: replaces trophy/confetti celebration (banned list) with quiet ✓ + reveal of classmates' board — existing post-submit data paths.
- **㉖ 프로필 편집**: backed — existing hometown/job/hobby/skill_level/goal fields (PHRASE_TOKENS personalization).
- **㉗ Students list / ㉘ 표현 관리**: backed — existing teacher tabs; ㉘ composer reuses `autoFillKorean` auto-translate + multi-tag system; "Daniel에게만" = personal-phrase scope (student_id column workstream); "리퀘스트에서 추가됨" chip ties to class_requests.
- **㉙ Empty states**: pattern (icon + one line + CTA toward the fill path) for My List, Thursday board, no-phrases-yet.
- **㉚ Errors**: keeps existing warm copy (rate-limit notify → error_logs, teacher visibility already built); mic-denied always offers "듣기로 계속" (no-mic path).
- **㉛ Push pre-prompt**: sheet before the system dialog; wires to existing `subscribeToPush`; "나중에" stores a local don't-ask flag.

## Rollout order
1. Foundation (font, tokens, tab bar, header + profile sheet ⑨) — behind `redesign_v3_enabled`, Toms Lee only.
2. Home ① + mode sheet ② (sheet can launch legacy session first).
3. Session restyle ③④ + session end ⑫ (note surfacing decision).
4. Practice ⑤⑭, Solo ⑥, Community ⑦⑬, Login ⑧.
5. Listen ⑩ / Shadowing ⑪ — last; flip `SCENARIOS_STUDENT_ENABLED` after real-session validation.

Rollback for every step: flag off.

## Watch-outs for Claude Code
- Landmark-anchored edits only; App.js is ~22k lines with repeated strings.
- Don't touch Groq model constants except per the Aug 16, 2026 migration entry.
- No new dependencies; no JSX conversions; no confetti/streak-guilt/XP anywhere.
