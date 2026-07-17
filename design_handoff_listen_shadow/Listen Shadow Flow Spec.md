# Listen → Shadowing Flow (⑩⑪) — Implementation Spec

Design reference: `Wayve Final.dc.html` frames ⑩A ⑩B ⑪A ⑪B ⑪C; interactive behavior reference: `Listen Shadow Prototype.dc.html` (design project). This spec is self-contained. **All anchors below were verified against `src/App.js` (~22.3k lines) on Jul 17, 2026.**

## Goal
A student opens an assigned (or starter) scenario and completes one continuous session — listen to all lines, then shadow their own lines with self-playback comparison — ending on a summary of the phrases they practiced.

## Context: this is a redesign of an EXISTING flow
A working Listen/Shadowing session runner already exists inside the Wavi screen (state: `scenarioIdx`, `shadowMode`, `curSpeaker`; loader `loadScenarioById` reading `scenarios` + `scenario_lines`; two-voice playback via `scenarioSay`). Do not build a parallel flow — restyle and re-sequence the existing one.

**Intentional behavior changes vs current code (not regressions):**
1. Current: Shadowing is offered only after 3+ full listens (`fullListens >= 3` check before `runShadowing`). New: offer shadowing immediately after ONE complete listen via the ⑩B handoff screen. Remove/bypass the 3-listen gate.
2. Current: shadowing auto-advances after 5s of silence, recording discarded. New: explicit record → compare (replay own blob vs Wavi's line) → 다시 녹음 / 다음 문장. Keep the 5s-silence gentle-move-on as a fallback if the student says nothing.
3. New UI is full-screen navy-gradient player screens (per frames), not the current chat-style Wavi screen.

## Non-goals
- No refactoring outside the touched components
- No JSX conversion of React.createElement code
- No dependency additions
- **No Whisper scoring, no transcript grading, no pronunciation feedback of any kind** — self-comparison replaces scoring by design
- No writes to `student_progress` from this flow (engagement metric is time only, via `useActivityTracker`)
- No uploads of student recordings — blob stays in memory, discarded on exit
- No confetti, streaks, XP, or celebration animation on the summary screen
- No changes to the teacher Scenario Builder component
- No progress *bars* — thin sentence segments + "N / M 문장" text only (visual-language rule)
- Do not touch `WAVY_VOICE_ID`, ElevenLabs settings, or per-segment `language_code` forcing. `SCENARIO_OTHER_VOICE_ID` stays as the default, but other-person playback must use `scenario.other_voice_id ?? SCENARIO_OTHER_VOICE_ID` (see Database changes).

## Database changes
Tables are `scenarios` and `scenario_lines` (NOT `wavi_scenarios` — that name in older docs is wrong). One migration:

```sql
-- 20260717_starter_scenarios.sql
ALTER TABLE scenarios ADD COLUMN is_starter boolean DEFAULT false;
ALTER TABLE scenarios ADD COLUMN other_voice_id text; -- nullable; per-scenario override of SCENARIO_OTHER_VOICE_ID
ALTER TABLE scenarios ADD COLUMN collection text;     -- nullable; groups an arc, e.g. 'narim-australia'
ALTER TABLE scenarios ADD COLUMN sort_order int;      -- nullable; position within a collection

CREATE TABLE scenario_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  scenario_id uuid NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (student_id, scenario_id)
);
-- No index needed at current scale.
```

`scenario_completions.student_id` must use the same id type/reference as `scenario_assignments.student_id` — copy that column's definition. Apply the same RLS/policy pattern as `scenario_assignments`: a student can insert and select only their own completion rows; teachers read all.

Seed 3 starter scenarios (`is_starter = true`, `is_active = true`, no assignment rows): Ordering Coffee / CAFÉ, Getting to the Hotel / TAXI, Meeting a New Coworker / SMALL TALK — 6 alternating `scenario_lines` each. Copy scripts verbatim from the `SCN` object in `Listen Shadow Prototype.dc.html`; do not invent dialogue.

Also seed the **Narim pack** — see the "Narim pack (Australia arc)" section below.

Note: an assignment row with `student_id` and `group_id` both null already means "visible to everyone" (the student fetch includes `and(student_id.is.null,group_id.is.null)`). Starters deliberately do NOT use that pattern — `is_starter` keeps them out of the normal assigned list so "assigned wins" precedence stays simple.

Source of truth: `scenario_assignments` rows when any exist for the student; otherwise the `is_starter` set.

## Narim pack (Australia arc)
A curated 8-scenario arc for Narim (Group 1, intermediate). Part 1 (aus1–aus5) Making Friends: hostel ice-break → joining a group → going deeper → repair skills → making plans. Part 2 (aus6–aus8) Working at a Café, Narim on the staff side: getting the job → first shift → coworker small talk. UI reference: the "나림 · 호주 한 달 준비" collection in `Listen Shadow Prototype.dc.html`.

**Seeding** (same migration):
- 8 `scenarios` rows: `collection = 'narim-australia'`, `sort_order` 1–8, `other_voice_id = 'DYkrAHD8iwork3YSUBbs'` (Australian; null everywhere else), `is_starter = false`, `is_active = true`.
- One `scenario_assignments` row per scenario for Narim's student id.
- Scripts: copy verbatim from `Narim Australia Session Pack.md` (canonical — includes Wavi's Korean framing/close lines, which the prototype's `SCN` object omits). Speaker mapping: `[Wavi]` → the "나" role, `[Other]` → other-person voice; `lang` per line as tagged (`ko` framing lines play in Wavi's voice, never the other voice).

**Picker treatment** (⑪C when assignments exist): assigned scenarios sharing a `collection` render as one ordered group — header with collection title + "N/{total} 완료" (total from the collection's row count, not hardcoded), thin green segment bar (one segment per scenario — this is the sentence-segment visual language, not a progress bar), numbered cards in `sort_order`, with two part labels inside the group (PART 1 · 친구 사귀기 / PART 2 · 카페에서 일하기). Non-collection assigned scenarios list below as today.

**Arc progress**: on reaching the ⑪B summary, upsert into `scenario_completions`. Picker reads completions to render: ✓ badge + dimmed card + "다시 →" on completed; blue border + "이어서 →" on the first uncompleted; "시작 →" otherwise. Completion is re-runnable (다시 keeps the row, no counter). This is the ONLY persistence in the flow — the no-`student_progress`-writes non-goal stands; `scenario_completions` is deliberately a separate table with no score/duration columns.

## Code touchpoints
All in `src/App.js`. Verify each anchor is unique before editing; stop and report if it matches twice.

1. **Starter picker (⑪C)**
   - Anchor: comment `// ── Curated scenarios available to this student — via scenario_assignments ──` (~student home data fetch, guarded by `scenariosVisible`).
   - Change: when the assignments query returns zero scenario ids, fetch `db.get("scenarios", "is_starter=eq.true&is_active=eq.true")` and render the ⑪C picker (light bg, 3 cards, "첫 시나리오를 골라봐요", footer "선생님이 배정한 시나리오가 생기면 여기에 먼저 보여요."). Assigned scenarios always take precedence.
   - Pattern: same fetch-then-setScenarios pattern already in that block.

2. **Assigned + collection picker (⑪C, assignments exist)**
   - Anchor: same block as #1, the branch where the assignments query returns ≥1 scenario id (existing assigned-list render).
   - Change: group the returned rows by `collection`. Rows sharing a non-null `collection` render as one ordered unit (title header + "N/{total} 완료" from row count, green segment bar, `sort_order` cards, PART labels by `sort_order` band — see "Picker treatment" above); null-`collection` rows list flat below as today. Read `scenario_completions` for this student once here to drive the ✓/이어서/시작 card states, and re-read on return from a session so states refresh.

3. **Listen player (⑩A)**
   - Anchors: `loadScenarioById` (loader), `const scenarioSay = async (text, voiceId = WAVY_VOICE_ID, rate = 1.0)` (playback), `SCENARIO_OTHER_VOICE_ID` (other-person voice).
   - Change: restyle the listen pass into the ⑩A screen — navy gradient, transcript with current-line highlight (past/future ~0.4 opacity), controls (↺ replay current line, play/pause, next), 천천히 toggle → pass `rate` ≤0.7 to `scenarioSay` (the slowed-replay call near the existing "천천히 다시 들려드릴게요" line shows the pattern), segment progress from `scenarioIdx` / line count. No mic on this pass (already true — keep it).

4. **Listen-complete handoff (⑩B)**
   - Anchor: the `fullListens` / `showExposureOffer({ id: "shadow" }, "shadow")` block that gates `runShadowing(lines)`.
   - Change: replace the 3-listen gate + spoken offer with the ⑩B screen (green segments, check, "다 들었어요"). Primary CTA "이어서 따라 말하기 · 약 2분 →" calls `runShadowing(lines)` directly (same lines array, no re-fetch). "오늘은 여기까지" keeps the existing `endScenario()` path.

5. **Shadowing loop (⑪A)**
   - Anchors: `const runShadowing = async (lines)` and the VAD listener class (unique log string `"[WAVY VAD] listener start called"`).
   - Change: per student-role line: Wavi speaks via `scenarioSay` (`wavi-speaking.png` expression per the existing `charExpr` logic), mic button records via the VAD listener, on stop retain the blob and show the compare card — "Wavi 발음" replays the TTS line, "내 목소리" plays the blob (reuse the existing WebM-duration-Infinity workaround if seeking), 다시 녹음 replaces the blob, 다음 문장 advances. Header "따라 말하기 · N/M". Keep `scShadowPraise` subtle flash; keep 5s-silence move-on as fallback. Keep the "점수 없음 · 몇 번이든 괜찮아요" pill on every phase.

6. **Session summary (⑪B)**
   - Anchor: `endScenario` (shadowing completion path).
   - Change: before ending, show ⑪B — "수고하셨어요! / {N}분 · 표현 {M}개가 입에 붙었어요" (N from session active time, M = shadowed line count), white card listing shadowed English phrases with green checks, nudge "내일 같은 시나리오를 한 번 더 들으면 완전히 내 것이 돼요.", primary 홈으로, secondary 한 번 더 듣기 (restart listen pass, same scenario). Also upsert `scenario_completions` (student_id, scenario_id) here — the single write in this flow; do it before navigating home so the picker re-read reflects it.

## Gating
Already exists — reuse, don't duplicate:
- `const SCENARIOS_STUDENT_ENABLED = false` (global const near top of App.js, NOT a per-student DB column)
- `SCENARIOS_ALLOW_GROUP_IDS` group allowlist (currently contains Group 4 / Judy) — **add Group 1's id (Narim) as part of this work**
- `scenariosVisible = SCENARIOS_STUDENT_ENABLED || user?.name === "Toms Lee" || user?.name === "Toms" || SCENARIOS_ALLOW_GROUP_IDS.includes(...)` — anchor: comment `// Toms-only while testing; flip SCENARIOS_STUDENT_ENABLED`
- No teacher-dashboard toggle exists for this flag and none is needed — rollout is by editing the allowlist/const.

## Test plan
On the Toms Lee account first:
1. Toms Lee, no scenario assignments → starter picker shows exactly 3 cards → tap Ordering Coffee → listen pass opens, segments "1 / 6 문장".
2. Lines auto-advance as audio ends; current line highlighted; "나" lines play in Wavi's voice, other-person lines in `SCENARIO_OTHER_VOICE_ID`'s voice (voice check: English lines forced `en`, Korean glosses never spoken). Then assign an aus-pack scenario to Toms Lee: other-person lines must play in `DYkrAHD8iwork3YSUBbs` (Australian, via `other_voice_id` override); Wavi's own lines unchanged.
3. 천천히 toggle → slowed `scenarioSay` rate; toggle back → normal.
4. ↺ replays current line; next advances one line.
5. Finish line 6 → ⑩B appears after ONE listen (3-listen gate gone); "이어서 따라 말하기" → shadowing on the same scenario, mic permission requested here for the first time.
6. Record a line → compare card; "내 목소리" plays the just-made recording; "Wavi 발음" replays TTS; 다시 녹음 replaces the blob; say nothing for 5s → gentle move-on still works.
7. Complete all student lines → ⑪B lists exactly those phrases; 홈으로 lands on Home; 한 번 더 듣기 restarts the listen pass.
8. Assign a scenario to Toms Lee → reopen → assigned scenario replaces the starter picker.
9. Negative: account not in TEACHER_NAMES, flag false, group not allowlisted → no scenario entry anywhere; existing Wavi session unchanged.
10. Exit mid-recording (← 나가기) → mic indicator off (VAD listener cleaned up), no data persisted (recording blob discarded; only `scenario_completions` upsert on summary).
11. Narim pack: assign `aus1`–`aus8` to Toms Lee → picker shows the collection group, 8 numbered cards in two part groups, "0/8 완료". Complete aus1 through the ⑪B summary → back on picker: aus1 ✓ + "다시 →", aus2 highlighted "이어서 →", bar "1/8 완료"; survives reload. Re-running aus1 doesn't duplicate the completion row (upsert on the unique pair).
12. Narim pack voice: other-person lines play in `DYkrAHD8iwork3YSUBbs`; Wavi's ko framing lines play in Wavi's voice with `language_code` "ko".

## Rollout
Toms Lee (name fallback, no flag change) → Group 1's id (Narim, added in this work) alongside Group 4 (Judy) in `SCENARIOS_ALLOW_GROUP_IDS` → flip `SCENARIOS_STUDENT_ENABLED = true` for everyone.

## Rollback
Revert `SCENARIOS_ALLOW_GROUP_IDS` / keep `SCENARIOS_STUDENT_ENABLED = false`; the new columns and `scenario_completions` table can stay (unused and invisible while hidden — no down-migration needed).

## Out-of-band notes for the implementer
- Korean strings: 존댓말, no 님 on first names; copy UI strings verbatim from this spec/frames — don't re-translate.
- React.createElement + inline style objects (`WAYVE_TOKENS` for new UI), English comments, `word-break: keep-all` untouched.
- App.js has many repeated strings (`MediaRecorder` appears in 8+ places; the VAD class is the right one for shadowing) — anchor on the strings given above.
- Don't touch Groq model constants (not needed here).
- Noticed-but-not-touched goes in the summary, not fixed. One such item: CLAUDE.md lists `WAVY_VOICE_ID` as `n2fbxG88jqAoaVPUy3IG` but App.js has `"XrExE9yKIg1WjnnlVkGX"` — do not change either; report it.
