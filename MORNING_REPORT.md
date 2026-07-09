# Wayve Redesign v3 — Overnight Run Report

**Branch:** `redesign-v3` · **Base:** `15d5573 pre-redesign checkpoint`
**Everything is behind `redesign_v3_enabled` (per-student flag + `TEACHER_NAMES` fallback), so only the Toms Lee account sees anything new. No real student is enabled. Nothing was deployed. The two new migrations were written but NOT run.**

`npm run build` passes at every commit.

---

## TL;DR

All 5 rollout phases were worked through in order, one commit per phase. Phases 1–3 are complete; phases 4–5 are partial by deliberate choice (the highest-value, backed, low-risk pieces landed; large cosmetic rewrites and the frozen-voice-loop deep restyle were deferred and are logged below). One item (Login ⑧) was **skipped as ungateable** — see decisions.

---

## Commits (one per phase)

| Commit | Phase | Summary |
|---|---|---|
| `faa94d5` | 1 | Foundation: Pretendard (FONT_V3), DARK_TOKENS twin, `isRedesignV3` gate + teacher toggle, SVG 4-tab bar (My List → Practice; Home·Practice·Solo·Community), header cleanup, ProfileSheetV3 ⑨ |
| `7c62aec` | 2 | Home ① `오늘의 계획` (HomeGridV3) + mode sheet ② (ModeSheetV3) |
| `9d5a767` | 3 | Session pass moment ④ (quiet ✓ chip) + calm session end ⑫ (teacher note) |
| `4f2e0af` | 4 | Practice `My List` segment ⑤⑭ + Solo discovery drop ⑥ |
| `da8d8b2` | 5 | `class_requests` student loop ⑱⑲ + migration |

---

## What each phase delivered

### Phase 1 — Foundation ✅ complete
- **Pretendard**: loaded globally in `GlobalStyle`, applied only via `FONT_V3` in v3-gated components (so non-v3 users keep Inter — see decision #1).
- **Tokens**: `DARK_TOKENS` twin of `WAYVE_TOKENS` added (keys mirror it, for the deferred dark mode). `NavIconV3` line-icon set.
- **Flag**: `isRedesignV3(u)` helper; teacher-dashboard toggle ("🌊 Redesign v3 (Beta)") next to the Home V2 toggle; migration for the column.
- **Tab bar**: 5 emoji tabs → 4 SVG line-icon tabs (**Home · Practice · Solo · Community**), active = wave, inactive = ink3, no sliding indicator. My List tab removed.
- **Header**: Aa / Log out / Teacher buttons removed for v3; only the avatar remains → opens **ProfileSheetV3** (⑨: 글자 크기 segmented, 언어, 알림 toggle, 내 프로필, Teacher View, 앱 둘러보기 다시 하기, 로그아웃). Deep profile/language edit reuses the existing `ProfileModal`.

### Phase 2 — Home ① + mode sheet ② ✅ complete
- **HomeGridV3**: greeting + dynamic time line → `오늘의 계획` card (오늘의 표현 듣기 · Wavi와 연습 · 복습) with done/current/todo states derived from `student_progress` + `session_phrases` (no new tables) → text-only streak line → navy Wavi resume card (resume pointer derived from `wavy_phrase_attempts`, no schema change) → Thankful Thursday card (Thursdays) → gated `추천 세션`.
- **ModeSheetV3** (②): 듣기 / 따라 말하기 rows; both launch the existing Wavi session for now and store the pick in `localStorage` (`wayve_last_mode`) for the future Listen/Shadowing players.

### Phase 3 — Session ③④ + end ⑫ ✅ (③ deep restyle deferred)
- **④ pass moment**: a quiet green ✓ `이 표현은 통과했어요` chip when the current phrase is mastered (the expression already swaps to `wavi-encouraging`). No confetti/trophy.
- **⑫ session end**: the recap screen becomes calm for v3 — green ✓, one stats line (`오늘 Wavi와 N분 함께했어요 · 표현 N개 통과`), the **latest teacher session note** (reuses the un-shelved `session_notes` table, same gating as the home note card), and `홈으로`. Deliberately drops the trophy / mastery-% bar.
- **No changes** to recording, scoring, TTS, voice settings, or session flow.

### Phase 4 — Practice/Solo/Community/Login ⚠️ partial
- **⑤⑭ Practice**: a v3 segmented control (`이번 주` / `My List`) at the top of the Practice tab **restores My List access** after Phase 1 removed its tab. It toggles the two already-mounted feature-screens; old `myphrases` deep-links route to Practice · My List.
- **⑥ Solo**: the `오늘의 표현` discovery card is hidden for v3 (Solo is production-only; discovery lives on Home). The typed-input path (`상황별 표현 생성`) is kept.

### Phase 5 — Listen/Shadowing + class_requests + tour ⚠️ partial
- **⑱⑲ class_requests (net-new)**: `다음 수업 리퀘스트` card on Home opens **ClassRequestSheetV3** (Korean text composer, writes `kind='text'`); after sending, the home card echoes `리퀘스트를 보냈어요 — 수업에 반영돼요`. The insert is fire-and-forget so the flow works for Toms even before the migration is applied.

---

## Migration files awaiting your review (NOT run)

1. **`supabase/migrations/20260709_redesign_v3_flag.sql`** — `ALTER TABLE students ADD COLUMN IF NOT EXISTS redesign_v3_enabled boolean DEFAULT false;` (nullable, no index). Until you run this, the teacher toggle's write silently no-ops (caught) and Toms still sees v3 via the name fallback.
2. **`supabase/migrations/20260709_class_requests.sql`** — new `class_requests` table (`kind` text/voice/phrase, `status` new/planned/covered, nullable `audio_url`/`phrase_id`) + nullable `groups.session_day` / `groups.session_time` (for the "수요일 수업까지 N일" line; the card omits the countdown when unset). No indexes (per scale). Until you run this, sending a request shows the confirmation but writes nothing.

Both are idempotent (`IF NOT EXISTS`).

---

## Autonomous decisions (spec didn't fully answer)

1. **Pretendard gated, not global.** The spec treats the font swap as an all-at-once change, but this run requires *everything* student-visible behind the flag. A CSS `@import` is global, so I load Pretendard for everyone (an unused webfont renders nothing) but only *apply* it via `FONT_V3` inside v3-gated components. Non-v3 users see zero change. To roll out later: point the shared components at `FONT_V3` unconditionally, or swap `FONT`.
2. **Reused the un-shelved `session_notes` table for ⑫** (spec option (a), recommended) rather than a new `teacher_session_notes` table — reversible, code already exists, gated by `SESSION_NOTES_ENABLED` + the per-student flag / Toms fallback.
3. **`fetchHomeData` is stale in the spec.** On disk, `HomeGridV2` does component-local fetches (there is no central `fetchHomeData`). Disk wins (CLAUDE.md §14). HomeGridV3 follows the same component-local pattern, reusing the existing module helpers (`phraseScopeFilter`, `fetchDismissedPhraseIds`, `ensureThankfulThursdayPrompt`).
4. **Resume pointer derived, no schema change** (spec's preferred first option): latest `wavy_phrase_attempts` row, not a new `last_wavi_scenario_id` column.
5. **Plan-step derivation**: 오늘의 표현 듣기 = today's expression practiced today; Wavi와 연습 = remaining unpassed `this-week` `session_phrases`; 복습 shown only when there are mastered phrases untouched >21 days. The greeting time line sums the remaining steps (≈ the mockup's "8분"). All-done changes the greeting line only.
6. **Mode sheet has no `지난번엔 듣기로` hint** — the mockup doesn't show it and the spec marks it optional; kept faithful to the mockup. `wayve_last_mode` is stored for when it's wanted.
7. **Both mode-sheet rows launch the existing Wavi session** for now ("sheet can launch legacy session first," per the rollout note). The dedicated Listen/Shadowing players are a later slice.
8. **Practice segment lives at the StudentScreen level**, toggling the two already-mounted feature-screens, instead of rewriting the ~700-line JSX `PracticeTab`. Lower risk, fully reversible. The "My List · N" **count is omitted** (would need an extra query) — the segment reads just `My List`.
9. **class_requests text path only.** The voice path ("말로 보내기") needs the recording/Whisper/upload pipeline; deferred. The composer covers the core loop.
10. **③ deep listening restyle deferred** (message-list→single-bubble, persistent 다시 듣기/건너뛰기 row) — held back to avoid destabilizing the frozen voice loop unattended. The live listening screen is already dark-navy and close to the mockup; ④ and ⑫ (the backed, additive parts) landed.

---

## Skipped / deferred (and why)

**Skipped (cannot be done under this run's rules):**
- **⑧ Login restyle** — the login screen renders *before* any `user` object exists, so it can't be gated behind `redesign_v3_enabled`. Restyling it would change login for every student, which this run forbids. Needs your call (roll to everyone, or a non-per-student gate).

**Deferred (logged; safe to pick up next):**
- **⑦⑬ Community / Thursday restyle** — presentational only, functionality unchanged, gateable; low-risk to defer.
- **⑥ Solo full mic-first restyle** — only the discovery-drop (the specific backed instruction) landed; the layout restyle remains.
- **⑤ Practice card pixel restyle** — the segmented-control IA landed; the card visuals still use the current styling.
- **③ session deep restyle** — see decision #10.
- **⑩ Listen / ⑪ Shadowing players** — large; and they sit behind `SCENARIOS_STUDENT_ENABLED`, which this run **must not flip**. Not started.
- **class_requests remainder** — voice path, Solo post-save one-tap (⑲), teacher **Inbox 리퀘스트 segment** (⑳) + "수업에 반영" + Scenario Builder prefill (㉒㉓). The student→teacher write exists; you can't yet *see* requests in-app until the inbox segment ships (and the migration is run).
- **㉑ Tour re-map** — the re-entry row ("앱 둘러보기 다시 하기") is already wired in ProfileSheetV3 (calls `resetTour`), but the step **anchors were not re-mapped** to the new IA and `ONBOARDING_VERSION` was not bumped. ⚠️ If you trigger the tour on the v3 account it may spotlight legacy/absent elements. Risky to auto-remap unattended.
- **⑮ Dark mode** — `DARK_TOKENS` + the plan are in place; no `useTokens()` plumbing yet (it was the stated last priority).

---

## Known limitations to be aware of while testing
- **Home doesn't re-derive the plan on return from a session** (it stays mounted; effect keys on user/group only). Same behavior as the existing HomeGridV2. Pull-to-refresh / re-login refreshes it.
- **Sending a class request writes nothing until `20260709_class_requests.sql` is run** — the confirmation is optimistic by design.
- **The teacher toggle write no-ops until `20260709_redesign_v3_flag.sql` is run** — Toms still sees v3 via the name fallback regardless.

---

## Test script (Toms Lee account)

Log in as **Toms Lee** (sees v3 via the name fallback — no migration needed).

**Phase 1 — foundation**
1. On login, confirm the whole app is in **Pretendard** (rounder Korean type) and the bottom tab bar shows **4 line-icon tabs**: Home · Practice · Solo · Community (no ⭐ My List tab).
2. Header: confirm **only the avatar** on the right (no Aa / Log out / Teacher).
3. Tap the avatar → **Profile sheet** slides up. Check: 글자 크기 segmented (tap 크게 → text zooms), 언어 row, 알림 toggle, 내 프로필 (opens the full editor, then back), Teacher View badge (opens the password prompt), 앱 둘러보기 다시 하기, 로그아웃 (coral). Close it.

**Phase 2 — home + mode sheet**
4. Home: confirm the greeting (`Toms` + a time line), the **오늘의 계획** card with check circles (done = green ✓, current = blue ring, todo = grey), the streak line, the navy **Wavi** resume card, and (Thursday only) the Thankful Thursday card.
5. Tap **시작** on the Wavi step (or the navy Wavi card) → **mode sheet** slides up with 듣기 / 따라 말하기 + 다음에 할게요.
6. Tap 듣기 → the existing Wavi session opens.

**Phase 3 — session end + pass**
7. In a Wavi session, pass a phrase → a quiet green **✓ 이 표현은 통과했어요** chip appears (no confetti).
8. Finish the session → the **calm end screen**: green ✓, `수고하셨어요!`, one stats line, then `홈으로`. (If you have a `session_notes` row for Toms, the teacher-note card shows above the button.)

**Phase 4 — Practice / Solo**
9. Practice tab: confirm the **이번 주 / My List** segmented control at the top. Tap **My List** → your saved phrases show; tap **이번 주** → the week view returns.
10. Solo tab: confirm the **오늘의 표현** discovery card is gone; **상황별 표현 생성** (typed input) is still there.

**Phase 5 — class request**
11. Home: tap **다음 수업 리퀘스트** → the composer sheet opens. Type something in Korean → **보내기** → the sent confirmation shows, and the home card now reads **리퀘스트를 보냈어요 — 수업에 반영돼요**. (Nothing is written to the DB until the migration is run — expected.)

**Regression (turn v3 off):** in the teacher dashboard, a non-Toms student with the flag off should see the **unchanged legacy app** (5 emoji tabs, old home, old header). Toms always sees v3.
