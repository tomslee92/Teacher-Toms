# CLAUDE.md — Wayve / Wavi Context

> This file is read automatically by Claude Code and (via filesystem MCP) by Claude Desktop at the start of each new session. It contains everything a fresh Claude conversation needs to be immediately useful. Update it as priorities and architecture evolve.

---

## What Wayve is

Wayve is a Korean English learning web app for adult professionals (primarily 40s–50s). It's not a traditional academy — it's a community-style product focused on confidence, real conversation, and relationships rather than test scores or grammar drilling.

Wayve runs on production today with 3 students. The teacher (Toms Lee) personally knows every student and has weekly real sessions with them — that's a deliberate advantage almost no app developer has, and it shapes how we build.

## Who the users are

- **Primary audience**: Korean adult professionals, 40s–50s, working
- **Cognitive context**: practicing in moments of focus (work break, evening at home, late night). Often tired. Limited time per session.
- **Tone preference**: warm, professional, no condescension. **No childish gamification, no XP/levels, no leaderboards.**
- **Language**: native Korean speakers learning English. Korean must use 존댓말 (polite form) — these are adults. No 님 honorific on first names (e.g. "Toms" not "Toms님").
- **Korean translations** must preserve meaning + intent, not be word-by-word. For idioms, translate meaning. Length similar to English.

## The core mental model (LOCKED — don't drift from this)

**Wavi = the relationship layer.** Active learning, voice, conversation, AI companion, memory across sessions. The protagonist. The thing students return to.

**The toolkit / rest of the app = the library.** Visual, tappable, browsable. Practice tab, Solo Practice, My List, Daily Question (QoD). The supporting cast.

Every feature decision asks: *is this part of the relationship, or part of the toolkit?*

This framing prevents drift toward "another language app with conversation tacked on." Wavi *is* the product; the toolkit serves Wavi.

## Demo audience

CEOs of small businesses (founder-led referrals). The demo strategy is **NOT** B2B mass-email — it's relationship-driven introductions through Toms's network. Each demo wants to feel like a glimpse of a premium product, not a sales pitch.

This shapes what we build: features that demo well in 60–90 seconds, premium feel over feature breadth, native Korean speakers should hear native-quality voice, no childish UI.

## Project structure

```
/Users/toms/teacher-toms/
  src/App.js          ← ~19,700 lines, single-file React using React.createElement
  src/                ← other components, hooks, utilities
  public/             ← static assets
  build/              ← compiled output
  supabase/           ← Supabase config & migrations
  package.json
  .env, .env.local    ← API keys (NEVER commit; already in .gitignore)
```

**Live URL**: wayvekr.vercel.app

**Stack**: React (with React.createElement, not JSX in most places), Supabase, Groq (Llama 3.3 70B + 8B fallback to Gemini), ElevenLabs TTS, Vercel for hosting.

**Deploy command**: `cd /Users/toms/teacher-toms && vercel --prod` (if working in Claude Code with filesystem MCP) or via copying from `~/Downloads/App.js` when working through this chat.

## Current technical landmarks

### Wavi voice
- `WAVY_VOICE_ID` constant near line ~15226 of App.js
- Current voice: `n2fbxG88jqAoaVPUy3IG` (native Korean pronunciation acceptable, English good energy)
- Previous voices tested: Anna (uyVNoMrnUku1dZyVEXwD — too low energy), Matilda (XrExE9yKIg1WjnnlVkGX — good but English-leaning), Nicole (piTKgcLEGmPE4e6mEKli — great English, weak Korean accent)
- ElevenLabs settings: stability 0.7, similarity_boost 0.8, style 0.0
- Per-segment language_code forcing: pure English → "en", pure Korean → "ko", mixed → auto-detect

### Wavi variant pools (anti-repetition)
At the top of `WavyScreen`, after `sleep` helper, there are pools of phrasing variants used to randomize what Wavi says between phrases:
- FIRST_PHRASE_INTROS (5)
- NEXT_PHRASE_INTROS (9)
- MEANING_INVITATIONS (6, with `{KO}` placeholder)
- NO_MEANING_INVITATIONS (4)
- SILENCE_NUDGES (5)
- CANT_HEAR_RETRIES (4)
- LOW_SCORE_RETRIES (4)
- REPLAY_PROMPTS (4)
- MOVE_ON_LINES (4)
- QUICK_FAREWELLS (5 — distinct from per-phrase praise, pivot forward)

The `pickVariant(poolKey, options)` helper with `lastVariantRef` tracker prevents back-to-back repeats.

### Home screen V2 (Wavi-led)
- `HomeGridV2` component (~line 18965 in App.js)
- Gated by `home_v2_enabled` DB column on students table
- Toggleable from teacher dashboard student detail modal (🏠 emoji toggle, mirrors 🌊 wavy_enabled pattern)
- Toms Lee always sees V2 as safety fallback: `user.home_v2_enabled || user.name === "Toms Lee"`
- Currently enabled for: Toms Lee (always), Chris and David from Group 2 (via toggle)

### Home V2 layout
1. Greeting (5-band time-of-day: 5–11am 아침, 11am–5pm 안녕, 5–9pm 좋은 저녁, 9pm–12am 늦은 저녁, 12am–5am 늦은 시간) + name (no 님)
2. Wavi hero card (gradient navy, 44px "Wavi" wordmark, NEW badge, "오늘 얼마나 시간 있어요?" + "연습 시작 →" pill)
3. Stats card (🔥 streak · ⏱ weekly minutes · ✨ phrases mastered)
4. Today's QoD card (above week phrases — coral/red if unanswered, green if answered)
5. Week phrases card (tiered: Tier 1 unpassed-this-week, Tier 2 all-this-week-passed-for-review, Tier 3 group library fallback)

### Home data fetch architecture
- **`HomeGridV2` self-fetches its own data** in a single `useEffect` keyed on `[user?.id, isPreview, group?.id]`. There is NO `AppInner.fetchHomeData`/`homeData` prop layer (an earlier design that was removed — ignore older references to it).
- The effect runs these in parallel: weekly `active_time_segments`, lifetime `student_progress` (phrases mastered), tiered week phrases (`session_phrases`+`phrase_bank`), today's QoD (`qod_prompts`+`qod_responses`), and — gated by `session_notes_enabled` — `session_notes`.
- `cardsReady` flag gates a choreographed below-the-fold entrance once data settles (or a 600ms safety cap).

### Active time tracking
- `active_time_segments` table: `(id, student_id, date, seconds, source, created_at)` with indexes
- `useActivityTracker(user)` hook in AppInner: tracks pointerdown/keydown/scroll/touchstart, 3min idle threshold, pauses on visibilitychange hidden, flushes every 30s
- `waviSessionActive` flag pauses global tracker during Wavi sessions
- `reportWaviSessionTime(userId, durationSeconds)` reports on finishSession
- Wavi background-safe timing: accumulator pattern with `accumulatedSessionMsRef` + `lastResumeAtRef` + `backgroundedAtRef`
- Auto-end Wavi session after 5min backgrounded via `manualExitRef` + `handleExitRef`
- Teacher dashboard shows weekly active minutes ("N분 / 주")

### student_progress + Wavi resume (fixed 2026-06-01, commit dd5d010)
Wavi sessions now write `passed: true` to `student_progress` when a phrase is mastered. Previously this was written ONLY to `wavy_phrase_attempts` (analytics), so mastered phrases stayed in the "unpassed" pool — Wavi rebuilt the same first 5 phrases (`unpassed.slice(0,5)`) every session and students never reached phrases 6+. (An earlier version of this doc claimed the fix was in place; it was not — it was actually landed in dd5d010.)

The fix is in `celebrateAndAdvance` — fire-and-forget upsert of `{passed: true, best_score: max(8, existing), attempts: existing+1, needs_retry: false}` to student_progress, mirroring the PhraseCard pattern.

Resume cursor: `wavy_memory.last_phrase_idx` already handles mid-session resume (interrupt → `currentIdx`; completed → 0). With masteries now persisted, "0" correctly means "first still-unpassed phrase." When all are passed, init hits the "이번 주에 연습할 표현이 없어요" finished-state.

**Caveat**: Only applies to NEW masteries post-fix. Old Wavi-mastered phrases still count as unpassed unless re-mastered.

### Session Notes (teacher → student) + Student Feedback (student → teacher) — SHELVED 2026-06
**Both features are currently shelved** behind a single master switch `NOTES_FEATURES_ENABLED` (constant just after `TEACHER_NAMES`, ~line 157, currently `false`). The code, components, tables, and migration all remain intact — flip the constant to `true` to restore every entry point (teacher 💬 Notes tab, per-student composer + toggles, the student profile-menu channel, the home note card). Toms decided they weren't helpful right now (restraint-over-abundance). Do NOT treat the dormant code as a bug to delete. The per-student `session_notes_enabled`/`student_feedback_enabled` flags still exist but are inert while the master switch is off.

Two communication features sharing the QoD voice infra (`useRecorder` ~1898, `RecordButton` ~2269, `transcribe` Groq Whisper ~1645, `geminiCallForFeedback` ~92) and the public `session-notes-audio` storage bucket. Both gated independently.

- **Tables**: `session_notes` (teacher→student: text/voice/structured jsonb, `seen_at`/`dismissed_at`) and `student_notes` (student→teacher: `is_anonymous`, `prompt_context`='continuous', `teacher_seen_at`, `reply_session_note_id` → session_notes). Migration: `supabase/migrations/20260601_session_and_student_notes.sql`.
- **Flags** (students table, default false; Toms always sees via name fallback): `session_notes_enabled` (📝), `student_feedback_enabled` (💬). Toggles live next to 🌊/🏠 in the student detail modal.
- **Audio paths** in the shared bucket: `teacher-notes/{student_id}/…` (session notes), `student-notes/{student_id}/…` (feedback). `uploadSessionNoteAudio(blob, label, folder)`.
- **Components**: `SessionNoteComposer` (teacher, AI-drafts from text+voice; reply mode via `replyTo` prop links `reply_session_note_id`), `SessionNoteSheet`/`SessionNoteArchiveSheet` + custom `NoteWaveformPlayer` (~19347), `StudentFeedbackComposer` (student bottom-sheet, prompts/anonymity), `StudentTeacherComms` (profile-menu "선생님과의 소통" = archive + send-a-note), `StudentNotesReceived` (teacher per-student, **attributed-only** — anonymity preserved), `StudentNotesInbox` (global dashboard 💬 tab, anonymous shown as "익명 학생", no reply).
- **Teacher identity**: `resolveTeacherAccount()` (cached, by TEACHER_NAMES) gives student-addressed feedback a real `teacher_id`. Multi-teacher assignment is intentionally NOT built — `teacher_name` is always read from the row, never hardcoded.

### Wavi Character + Listen/Shadowing Mode — scenarios (added 2026-06, commits 20b7d53→5b8e2d3)
A curated, scenario-based conversation mode students launch from the home screen, plus a character image on `WavyScreen`. Migration: `supabase/migrations/20260606_wavi_scenarios_and_character.sql` (adds `phrase_bank.wavi_video_url`; tables `scenarios`, `scenario_lines`, `phrase_exposures`).

**Curated library + home picker + rollout gate.** Scenarios are a reusable library, not one-off auto-launches. `scenarios.student_id`/`group_id` define scope: both null = **Everyone** (global library, the builder's default), else targeted to a student or group. The student home (`HomeGridV2`) shows a **"추천 세션"** card listing available scenarios (global ∪ mine ∪ my-group, `is_active`); tapping one sets `scenarioToLaunch` in AppInner → opens `WavyScreen` with `initialScenarioId` → Listen Mode. **Student-facing rollout is gated by `SCENARIOS_STUDENT_ENABLED` (constant ~line 163, currently `false`) — Toms-only via `scenariosVisible` name fallback in HomeGridV2.** This gate is deliberately INDEPENDENT of the V2 home flag (all students have V2, so V2 is not a safe gate). Flip the constant to `true` to roll out to all students. The teacher-side `ScenarioBuilder` (student detail modal) is always available and unaffected by this gate.

**Character** (`renderWaviCharacter(expression, videoUrl)` in WavyScreen): 4 PNGs in `public/` (`wavi-neutral/speaking/listening/encouraging.png`), cross-faded via opacity transitions. Expression derives purely from existing session state (`wavyState` + `phraseStatus`), so no lifecycle changes. **Rollout gate is Toms-only**: `const showCharacter = user?.name === "Toms Lee" || user?.name === "Toms"` (near the WavyScreen state block) — change this to roll out to all `wavy_enabled` students. Used by both the normal session and the scenario screens.

**Pre-rendered video is a DORMANT STUB.** The `wavi_video_url` columns and the `<video>` branch in `renderWaviCharacter` exist, but `characterVideoUrl` is always `null` — video is never actually played yet. Wiring it requires coordinating the clip's own audio against the ElevenLabs TTS so they don't double-play; pointless until real clips exist in the `wavi-videos/` bucket. Today's working path is always static image + ElevenLabs audio (the intended fallback).

**Listen Mode** (card-driven entry): `init()` checks the `initialScenarioId` prop — when set (from the home card), it loads that scenario via `loadScenarioById` and enters Listen Mode (no mic), else runs the normal phrase flow. Entry is now card-driven, so `skill_level` no longer gates it (the old beginner-auto-launch via `loadActiveScenario` was removed). `runScenario` plays alternating lines — "other" lines use the new `SCENARIO_OTHER_VOICE_ID` (`UgBBYS2sOqTuMpoF3BR0`), "student" lines use `WAVY_VOICE_ID` so the learner hears the correct version. `wavyGenerateAudio`/`wavySpeak` now take a `voiceId` param (default `WAVY_VOICE_ID`); the audio cache key includes the voice. New phases: `"scenario"` (player) + `"scenario_done"` (completion).

**Exposure prompts** (`phrase_exposures`, keyed by the student-role `scenario_lines.id` in the `phrase_id` column): graduated Korean offers on student-role lines — 1-2 pure listen, 3 warm ("직접 한번 말해볼래요?"), 4-5 gentle ("한번 따라 말해볼까요?"), 6+ silent. Accepting replays the line slowed (0.85x) to shadow along.

**Shadowing Mode** (second pass): at Listen Mode end Wavi offers "이번엔 직접 말해볼래요?" → `runShadowing` replays with the mic open on student lines (`captureShadowLine` reuses `WavyVoiceListener`, `noSpeechTimeoutMs: 5000`). **No scoring — the audio blob is discarded.** 5s silence auto-advances; expression flips to listening then a brief `scShadowPraise` encouraging flash. Mic permission requested once at shadow start.

**Teacher Scenario Builder** (`ScenarioBuilder`, in the student detail modal before the phrase grid): title + context + scope (this student / their group) + ordered lines (speaker toggle, EN/KR, reorder). "Generate with AI" uses `geminiCallForFeedback` (custom system prompt → JSON; chosen over `groqCall`, which hardcodes a fixed persona unsuited to JSON — Gemini also gives more natural 존댓말). Saves `scenarios` + `scenario_lines`; self-fetches existing with an Active toggle.

### Multi-tag system
- `phrase_tags` junction table for many-to-many phrase ↔ tag relationships
- Filter chips on PracticeTab, inline tag editor
- BulkAutoTagger with "↺ Re-tag all" force option, queries DB directly to avoid stale cache

### Teacher account
- `TEACHER_NAMES` constant defines who sees the Teacher View button: `["Toms Lee", "Toms"]`
- Teacher accounts always have Wavi enabled, V2 home enabled, etc. (safety fallback while testing)

## Working principles (locked)

- **Confirm root cause before fixing.** Don't paper over symptoms.
- **Minimal changes.** Don't refactor while fixing a bug.
- **Test on Toms Lee account first** before any student rollout.
- **Premium adult professional audience.** Restraint with gamification.
- **No 님 honorific on first names.** "Toms" not "Toms님".
- **No emojis-as-decoration in production strings.** Status indicators (✓, ▶, ■) OK. Visual identity emojis (🌊, 🔥, ⏱, ✨) OK in context. Random emoji clutter not OK.
- **Engagement metric is time-spent**, not QoD-completion. Strava/Duolingo model — measure output not specific input behavior.
- **No streaks in Wavi itself.** Streak count is a guilt mechanic; Wavi should welcome students back, not shame them. Streak info lives on home/stats, not in Wavi's voice.

## Conversation mode (per user's preference)

- For **execution requests** ("make this," "write this," "convert this"): do it immediately
- For **thinking/judgment requests** ("what should I do," "which direction is better," "I'm considering this"): use Socratic mode — ask one question at a time, deepen based on response, guide to conclusion
- Exit Socratic mode when user says "summarize it for me" or "give me a conclusion"

## Workflow

The user works in two tools:

**Claude Desktop (this chat-style interface)** for:
- Strategy, design, framing decisions
- Visual exploration (HTML previews, mockups, voice test pages)
- Code review and second-pair-of-eyes work
- Multi-day thinking that needs persistent thread

**Claude Code (terminal-based agent)** for:
- Implementation, deploys, file edits
- Bulk file operations
- Quick fixes that don't need conversation
- Running `vercel --prod` and other commands

Both share the same Max subscription. Neither replaces the other.

## Known issues / pending items

### High priority
- **Voice n2fbxG88jqAoaVPUy3IG** needs more real-session validation. Voice-test page samples sounded good but actual Wavi sessions are the acid test.
- **MCP filesystem** is configured but Claude Desktop isn't exposing its tools reliably. Investigation: try absolute `/usr/local/bin/npx` path in config, verify Claude Desktop version, check developer settings logs.

### Next week (quick wins)
- Practice tab → "Library view" reframe (rename, copy refresh)
- Set up Sentry error monitoring (sentry.io free tier, ~30 min setup)
- Wider student rollout of V2 home (after Chris/David feedback)

### After demos (the bigger Wavi expansion)
1. **QoD-in-Wavi** (priority 1) — full mode integration, bilingual scaffolding, language detection in real-time, multi-turn conversation, route home QoD card to Wavi instead of separate flow. Keep separate QoD entry as fallback for non-Wavi students.
2. **Wavi-Solo** (priority 2) — conversational phrase discovery, builds on QoD infrastructure

### NOT building
- Wavi-Accuracy/dual-mode architecture. Practice tab handles detailed-feedback needs, Wavi handles flow/conversation needs. Don't blend them.
- Wavi background music. Speech recognition interference risk. Adults ≠ Duolingo teenagers.
- Childish gamification. Confirmed: no XP, no leveling, no leaderboards, no badges-as-decoration.

### Pattern detection (deferred)
`wayve_wavi_modes_<student_id>` localStorage already logs energy mode picks. Wait until 7+ sessions of real student data before analyzing.

### Known bug watch
- Galaxy student previously reported male voice playing before English statement — suspected TalkBack accessibility reader. Awaiting student to check Settings → Accessibility → TalkBack toggle.
- iPhone Korean accent bug — believed fixed by language_code forcing + voice swap, awaiting more session feedback.

## Recent feedback from students (Chris & David, Group 2)

1. **"Find a different voice with more energy. Bilingual."** → Tried Matilda, then Nicole, currently on n2fbxG88jqAoaVPUy3IG. Validation pending.
2. **"Add more variance when going from one phrase to the next."** → SHIPPED variant pools (10 pools, 4–9 variants each, with back-to-back repeat prevention).

## SQL reference

Common operations:

```sql
-- Enable Wavi for a student
UPDATE students SET wavy_enabled = TRUE WHERE name = '[student name]';

-- Enable V2 home for a student
UPDATE students SET home_v2_enabled = TRUE WHERE name = '[student name]';

-- Check who has V2 home enabled
SELECT name, wavy_enabled, home_v2_enabled FROM students;

-- See recent active time
SELECT student_id, date, SUM(seconds)/60 as minutes
FROM active_time_segments
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY student_id, date
ORDER BY date DESC;
```

## Style notes (when writing code)

- Single-file React with React.createElement (most of the codebase). Don't introduce JSX-everywhere refactor without explicit ask.
- Inline styles via style objects, not styled-components or CSS modules.
- Korean strings throughout — keep them in 존댓말, no 님 on first names.
- Comments in English. Korean strings in Korean.
- `word-break: keep-all` is the global CSS rule (Korean typography requirement).

## Closing principle

**Restraint over abundance.** Wayve has 3 students. It doesn't need to be a feature factory. The single highest-value moves are usually the ones that deepen the relationship with current students, not the ones that add features for hypothetical future ones.

When in doubt: would Chris or David notice this change? If no, deprioritize.
