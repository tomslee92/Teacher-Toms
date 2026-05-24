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

### Home data pre-fetch architecture
- `homeData` state lives in `AppInner`
- `fetchHomeData(user, group)` callback runs all 5 queries in parallel (active_time_segments, student_progress, session_phrases+phrase_bank, qod_prompts, qod_responses)
- Fires on `[user?.id, groups]` change after login — data ready before student reaches home
- Passed down: AppInner → StudentScreen → HomeGridV2 as `homeData` prop
- `refreshHomeData` callback also passed down; StudentScreen calls it on mount (catches return-from-Wavi case)
- HomeGridV2 initializes state from props if available, useEffect on `homeData?.fetchedAt` syncs state when refresh fires
- Internal fetch effect kept as fallback (only runs if homeData prop missing)

### Active time tracking
- `active_time_segments` table: `(id, student_id, date, seconds, source, created_at)` with indexes
- `useActivityTracker(user)` hook in AppInner: tracks pointerdown/keydown/scroll/touchstart, 3min idle threshold, pauses on visibilitychange hidden, flushes every 30s
- `waviSessionActive` flag pauses global tracker during Wavi sessions
- `reportWaviSessionTime(userId, durationSeconds)` reports on finishSession
- Wavi background-safe timing: accumulator pattern with `accumulatedSessionMsRef` + `lastResumeAtRef` + `backgroundedAtRef`
- Auto-end Wavi session after 5min backgrounded via `manualExitRef` + `handleExitRef`
- Teacher dashboard shows weekly active minutes ("N분 / 주")

### student_progress (recently fixed bug)
Wavi sessions now correctly write `passed: true` to `student_progress` when a phrase is mastered. Previously this was only written to `wavy_phrase_attempts` (analytics table), which caused passed phrases to cycle back next session.

The fix is in `celebrateAndAdvance` — upserts `{passed: true, best_score: max(8, existing), attempts: existing+1, needs_retry: false}` to student_progress.

**Caveat**: Only applies to NEW masteries post-fix. Old Wavi-mastered phrases still count as unpassed unless re-mastered.

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
