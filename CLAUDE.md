# CLAUDE.md — Wayve / Wavi Operating Manual

> Read automatically by Claude Code (and via filesystem MCP by Claude Desktop) at session start.
> This file is written as an **operating manual**: it assumes the model reading it will make
> predictable mistakes and names them in advance. If you read nothing else, read
> §3 (Named Failure Modes) and §5 (Escalation Rules) before touching code.

---

## 0. Orientation in 60 seconds

- **Product**: Wayve — English learning web app for Korean adult professionals, paired with live small-group Zoom teaching. Not an academy; a relationship-driven community product.
- **Team**: One person. Toms is the teacher, product owner, and (with your help) the developer.
- **Scale**: A handful of real students, all personally known to Toms. This is a deliberate advantage, not a limitation. It changes what "good engineering" means here.
- **The locked mental model**: **Wavi is the relationship layer** (voice, conversation, AI companion, memory across sessions — the protagonist). **Everything else is the toolkit/library** (Practice tab, Solo Practice, My List, QoD — supporting cast). Every feature decision asks: *is this part of the relationship, or part of the toolkit?*
- **The prime directive**: **Restraint over abundance.** The highest-value moves deepen the relationship with current students. When in doubt: *would a current student notice this change?* If no, deprioritize.

## 1. Facts you must not guess

If any of these conflict with what you find on disk, **the disk wins — say so and stop**.

| Fact | Value |
|---|---|
| Project path (Wayve) | `/Users/toms/Desktop/projects/teacher-toms` ← confirmed via `ls` on 2026-07-09. Older docs said `/Users/toms/teacher-toms` and `/Users/toms/projects/teacher-toms` (both wrong — missing `Desktop/`). Verify with `ls` before assuming; this has been wrong twice already. |
| Main file | `src/App.js` — ~19,700 lines, single-file React using `React.createElement` (not JSX) |
| Live URL | wayvekr.vercel.app (business site: wayvekr.com) |
| Stack | React (createElement pattern) · Supabase (backend + auth) · Groq (AI generation) · ElevenLabs (TTS) · Vercel (hosting) |
| Deploy | `cd <project path> && vercel --prod` |
| Wavi voice ID | `n2fbxG88jqAoaVPUy3IG` (`WAVY_VOICE_ID` constant, ~line 15226) |
| Second voice ID ("other person" in scenarios) | `UgBBYS2sOqTuMpoF3BR0` |
| ElevenLabs settings | stability 0.7, similarity_boost 0.8, style 0.0; per-segment `language_code` forcing (pure EN → "en", pure KO → "ko", mixed → auto) |
| Groq models — **DEPRECATION DEADLINE Aug 16, 2026** | Current: `llama-3.3-70b-versatile` (primary), `llama-3.1-8b-instant` (fallback) — both decommissioned Aug 16, 2026. Replacements: `openai/gpt-oss-120b` (primary), `openai/gpt-oss-20b` (fallback). The `openai/` prefix is **part of the string**. GPT-OSS models are reasoning-style — re-test all structured-output paths (Scenario Builder especially). |
| Teacher accounts | `TEACHER_NAMES = ["Toms Lee", "Toms"]`; teacher accounts always have Wavi + V2 home enabled as fallback |
| Test account | "Toms Lee" — every feature is validated here before any student sees it |
| Secrets | `.env`, `.env.local` — never commit (already gitignored). Never print key values into chat, specs, or docs. |
| Second app (Way) | Scripture memorization app at `/Users/toms/projects/way/` — **separate Supabase project, separate repo, separate rules.** Do not cross-pollinate. Known issue there: `VITE_`-prefixed ElevenLabs/API.Bible keys are client-exposed; must be proxied through Supabase Edge Functions before production. |

## 2. Conventions

### 2a. Conventions already in force

**Code**
- Single-file React with `React.createElement`. Match the surrounding pattern exactly. JSX exists in a few places; never expand its footprint.
- Inline styles via style objects. No styled-components, no CSS modules, no new CSS files.
- Comments in English. User-facing strings in Korean.
- `word-break: keep-all` is a global CSS rule (Korean typography). Never override it per-element without a stated reason.
- Feature gating pattern: DB boolean column on `students` (e.g. `wavy_enabled`, `home_v2_enabled`), toggled from teacher dashboard student detail modal, with `|| user.name === "Toms Lee"` safety fallback. New student-visible features follow this exact pattern.
- Anti-repetition pattern for Wavi speech: variant pools at top of `WavyScreen` + `pickVariant(poolKey, options)` with `lastVariantRef`. New Wavi lines join a pool; they are never single hardcoded strings.
- Home data flows top-down: `fetchHomeData` in `AppInner` runs all queries in parallel → passed as `homeData` prop → `HomeGridV2`. Components keep an internal fetch only as fallback when the prop is missing.

**Korean copy**
- 존댓말 (polite form) throughout. These are adult professionals.
- No 님 on first names: "Toms", not "Toms님".
- Translations preserve meaning and intent, never word-by-word. Idioms translate by meaning. Length roughly parallel to the English.

**Product**
- Premium adult feel. No XP, no levels, no leaderboards, no badges-as-decoration, no confetti.
- No streaks inside Wavi's voice (streak = guilt mechanic; Wavi welcomes, never shames). Streak/stats live on home only.
- Engagement metric is **time spent**, not completion of any specific activity.
- Emoji policy: status indicators (✓ ▶ ■) OK; identity emojis in established contexts (🌊 🔥 ⏱ ✨) OK; decorative emoji clutter not OK.
- Design language: Apple-style minimal. Navy gradient, action blue, coral, green; grouped background `#F2F2F7`; hairline separators `#C6C6C8`; 20px card radius; 8pt grid.

**Process**
- Confirm root cause before fixing. Minimal changes. Test on Toms Lee first.
- Claude Desktop = strategy/design/review; Claude Code = implementation/deploys.
- Manual before automated (e.g., Kakao outreach instead of push-notification infra at this scale).
- Socratic mode for judgment questions; immediate execution for execution requests. Exit Socratic on "summarize it for me" / "give me a conclusion".

### 2b. Conventions to adopt (additions)

1. **Landmark-anchored editing.** In a 19,700-line file, never edit by pattern-matching a short string. Anchor every edit to a named landmark (component name, constant, comment) and confirm the match is unique before writing. If a search string appears more than once, expand the context until it appears exactly once.
2. **Named constants for external identifiers.** Model IDs, voice IDs, and third-party endpoints live as named constants near the top of their scope — never inline string literals scattered through call sites. (Motivated directly by the Groq deprecation: this is the second time an inline-vs-constant question has cost time.)
3. **One-sentence root cause.** Before any bug fix, write the root cause in one sentence in the plan/commit. If you can't write that sentence, you haven't found it yet.
4. **Migration files, not dashboard mutations.** Schema changes go in `supabase/` migrations so they're replayable. Ad-hoc SQL is fine for data inspection and per-student toggles (see §7), not for structure.
5. **Dual-write audits.** When a value is written to more than one table (e.g., `student_progress` vs `wavy_phrase_attempts`), name the source of truth explicitly in a comment at the write site. The passed-phrases bug came from exactly this ambiguity.
6. **Copy freezes with flags.** Changing student-visible Korean copy is a feature change. It ships behind the same gating discipline as code.
7. **Deprecation register.** Any third-party model/API with a known sunset date gets a dated entry in §1. Check §1 dates at session start; if a deadline is within 45 days and unresolved, raise it before doing anything else.

## 3. Named failure modes (what a weaker model will do here, and the rule that prevents it)

1. **The JSX Missionary.** Sees `React.createElement`, "modernizes" to JSX.
   *Rule: match the surrounding pattern byte-for-byte in style. Zero conversions, ever, without an explicit ask.*
2. **The Drive-By Refactor.** Fixes the bug, then tidies variable names, extracts helpers, reorders imports nearby.
   *Rule: the diff may contain only lines the stated task requires. If you see something worth cleaning, list it under "Noticed, not touched" in your summary instead.*
3. **The Ship-It-To-Everyone.** Adds a student-visible feature with no gate.
   *Rule: every student-visible change is behind a per-student flag, enabled for Toms Lee only, until Toms explicitly says to roll out. No exceptions for "small" changes.*
4. **The Symptom Patcher.** The passed phrase cycles back next session, so it adds a client-side filter instead of finding the missing `student_progress` write.
   *Rule: one-sentence root cause before the fix (§2b.3). If the fix doesn't touch the cause, it's a workaround — label it as one and ask.*
5. **The Register Slipper.** Writes 반말, adds 님 to first names, or translates idioms word-by-word.
   *Rule: run the Korean checklist (§4b) on every string. 존댓말 always; no 님 on first names; meaning over words.*
6. **The Gamification Gremlin.** Adds confetti on mastery, a streak counter in Wavi, an XP bar "for motivation."
   *Rule: the banned list in §2a is absolute. Celebration = restrained (a quiet ✓, a warm sentence from Wavi), never animated abundance.*
7. **The Model-String Guesser.** Types a Groq model ID from memory, drops the `openai/` prefix, or "helpfully" upgrades to a model that doesn't exist.
   *Rule: model IDs are copied from §1 or from the live constant — never composed from memory. If §1 and the code disagree, stop and say so.*
8. **The Blind Search-and-Replacer.** Replaces a string that occurs 14 times in App.js and edits the wrong one — or all of them.
   *Rule: landmark-anchored editing (§2b.1). Verify uniqueness before every replace; state the anchor in your summary.*
9. **The Prop-Drilling Saboteur.** Adds a fresh Supabase query inside `HomeGridV2` instead of extending `fetchHomeData`.
   *Rule: home-screen data enters through `fetchHomeData` in `AppInner` and flows down as props. Component-local fetches exist only as documented fallbacks.*
10. **The Secret Leaker.** Pastes an API key into a spec, commits `.env`, or moves a key to client-side code.
    *Rule: keys never appear in chat output, docs, or commits. Server-side only (and fix, don't repeat, Way's `VITE_` exposure).*
11. **The Scale Hallucinator.** Designs for ten thousand users: caching layers, queues, notification infra, admin panels.
    *Rule: the product has a handful of students Toms talks to weekly. Manual beats automated until Toms says otherwise. Ask "would a current student notice?" before building.*
12. **The Voice Tinkerer.** Adjusts ElevenLabs stability/similarity "for quality," or removes per-segment `language_code` forcing while refactoring TTS calls.
    *Rule: voice settings and language forcing are the product of real-session testing (iPhone Korean-accent bug). Treat them as frozen constants; changes require an explicit ask and a voice-test page pass.*
13. **The Toolkit Confuser.** Builds detailed pronunciation scoring into Wavi, or conversational flow into the Practice tab.
    *Rule: Wavi = flow/relationship (low pressure, no test anxiety); Practice tab = detailed feedback. The dual-mode blend was explicitly rejected. Check the locked mental model before placing any feature.*
14. **The Stale-Doc Truster.** Follows this file when the codebase has moved on.
    *Rule: this file is a map, not the territory. Verify landmarks (line numbers drift), verify flags, verify the roster. When the doc and disk disagree, disk wins — and flag the doc for update.*

## 4. Quality bar per deliverable (checkable, not adjectives)

### 4a. Code change (App.js or any Wayve source)
- [ ] Root cause (for fixes) stated in one sentence
- [ ] Diff contains only task-required lines; "Noticed, not touched" list included if applicable
- [ ] Matches surrounding pattern: `React.createElement`, inline style objects, English comments
- [ ] Every edit anchored to a verified-unique landmark
- [ ] Student-visible behavior gated by flag; Toms Lee fallback present
- [ ] No new dependencies without prior approval
- [ ] No secrets in diff or summary
- [ ] Tested (or test plan written) on Toms Lee account before rollout mention
- [ ] Rollback described in one line (usually: flag off / revert commit)

### 4b. Korean copy (any student-visible string)
- [ ] 존댓말 throughout; zero 반말
- [ ] No 님 on first names
- [ ] Meaning-preserving (idiom → idiom or paraphrase, never literal)
- [ ] Length roughly parallel to English counterpart
- [ ] Register fits a tired 40s–50s professional at 10pm — warm, adult, zero condescension
- [ ] No decorative emoji added

### 4c. Phrase list entries (for phrase_bank)
- [ ] Three parts per entry: English phrase / Korean translation / Korean context description
- [ ] Context description in 존댓말, no 님
- [ ] Phrase is something the student could plausibly say this week (level- and goal-matched to their group)
- [ ] English is natural spoken register, not textbook register

### 4d. SQL / schema work
- [ ] Structure changes as migration files in `supabase/`; data-inspection and toggles may be ad-hoc
- [ ] Every new table has indexes considered and stated (even if the answer is "none needed at this scale")
- [ ] Writes to multi-written domains name the source of truth
- [ ] Destructive statements (DROP, DELETE without WHERE, column removals) never run without explicit confirmation — see §5

### 4e. Implementation spec (handoff to Claude Code)
- [ ] Goal + explicit non-goals
- [ ] DB changes (exact DDL), code touchpoints (file + landmark), gating plan
- [ ] Test plan starting with Toms Lee
- [ ] Rollout order and rollback line
- [ ] Self-contained: a fresh session could execute it without this conversation

### 4f. Design / UI work
- [ ] Uses the token set (§2a design language); no new colors/radii/spacings invented
- [ ] 8pt grid respected; `word-break: keep-all` intact
- [ ] Passes the "premium adult" squint test: nothing on the banned gamification list
- [ ] Demos well in 60–90 seconds if student-facing (founder-demo audience)

## 5. When uncertain: exact escalation rules

**Stop and ask (one question, with options and tradeoffs) before:**
1. Any schema change beyond adding a nullable column
2. Any destructive data operation (DELETE, DROP, UPDATE without a keyed WHERE)
3. Changing a gating default or enabling anything for a real student
4. Touching auth, API keys, or ElevenLabs/Groq settings constants
5. Adding a dependency, service, or piece of infrastructure
6. Changing student-visible Korean copy outside the current task's scope
7. Anything where two plausible code locations both match your landmark

**Proceed without asking, but state your assumption in the summary, when ALL of:**
- The change is behind a flag visible only to Toms Lee, AND
- It's reversible with a one-line revert, AND
- It doesn't touch the list above

**When the doc conflicts with the disk:** disk wins; report the conflict; propose the doc update.

**When a task is ambiguous between execution and judgment:** if it starts with a verb and an object ("add", "fix", "write"), execute; if it starts with "should", "which", "I'm considering", go Socratic — one question at a time, and exit on "summarize it for me."

**When you'd need to guess a fact in §1:** don't. Read it from disk or ask.

**Budget rule:** if a "small fix" is exceeding ~3 attempted approaches or spreading beyond the files you named at the start, stop, summarize what you've learned, and ask whether to continue — don't grind.

## 6. Current landscape (verify before relying on — this section goes stale fastest)

**Students / groups** (roster changes; confirm before building against it)
- Group 1: Haeun, Yuna, Narim — intermediate
- Group 2: Chris (David no longer attending) — the "would Chris notice?" benchmark
- Group 3: Jojo (furniture/merchandising), Daniel (plumbing), Wood (interior design) — beginner professionals, 90-min sessions
- Group 4: Judy — beginner, golf-travel English, 20-min solo sessions ×3/week

**Technical landmarks in App.js** (line numbers drift — search by name, not number)
- `WAVY_VOICE_ID` (~15226) · `HomeGridV2` (~18965) · variant pools at top of `WavyScreen` after `sleep` helper · `pickVariant` / `lastVariantRef` · `fetchHomeData` in `AppInner` · `useActivityTracker` · `celebrateAndAdvance` (writes `passed: true` to `student_progress` — the recently fixed bug; old Wavi masteries before the fix still read as unpassed) · `TEACHER_NAMES` · multi-tag system (`phrase_tags` junction, BulkAutoTagger with "↺ Re-tag all")

**Active workstreams**
1. **Groq migration (deadline Aug 16, 2026)** — model IDs are now centralized in `GROQ_MODEL_PRIMARY` / `GROQ_MODEL_FALLBACK` (near `GROQ_KEY`, ~line 16); all call sites route through them. Remaining: two-line swap to `openai/gpt-oss-120b` / `openai/gpt-oss-20b`, then re-test every structured-output path (Scenario Builder especially).
2. **Personal phrases feature** — spec drafted: `student_id` column on `phrase_bank` (NULL = group phrase), `phrase_dismissals` table, teacher-dashboard scope dropdown, dismissed-phrase re-add in student detail modal.
3. **Wavi redesign** — three modes: Listen (passive scenario flow), Shadowing (speaking, no scoring), richer conversation later. Motivated by affective filter: low return rates traced to microphone/scoring anxiety, not disinterest. Character art: four expression PNGs; HeyGen lip-sync clips as progressive enhancement, static images as fallback. Teacher-facing Scenario Builder (Groq-powered) planned.
4. **Relational continuity layer** — per-session, per-student teacher note (1–2 sentences in Toms's voice, referencing something specific the student reached for), surfaced when the student opens Wavi during the week. This is the moat vs. Speak/Duolingo: apps preserve artifacts; only Toms delivers being personally noticed.

**Known bug watch**
- Galaxy student: male voice before English statements — suspected TalkBack; awaiting student check.
- iPhone Korean accent — believed fixed (language forcing + voice swap); awaiting more sessions.
- Voice `n2fbxG88jqAoaVPUy3IG` still needs real-session validation.

**Explicitly not building**
- Wavi dual-mode (accuracy + flow blended) · Wavi background music · childish gamification · push-notification infrastructure at current scale.

## 7. SQL quick reference

```sql
-- Enable Wavi for a student
UPDATE students SET wavy_enabled = TRUE WHERE name = '[student name]';

-- Enable V2 home for a student
UPDATE students SET home_v2_enabled = TRUE WHERE name = '[student name]';

-- Check flag state
SELECT name, wavy_enabled, home_v2_enabled FROM students;

-- Recent active time
SELECT student_id, date, SUM(seconds)/60 AS minutes
FROM active_time_segments
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY student_id, date
ORDER BY date DESC;
```

## 8. Closing principle

Wayve's competitive advantage is that the teacher personally knows every student. Every hour spent on speculative features is an hour not spent deepening that. **Restraint over abundance; relationship over toolkit; current students over hypothetical ones.** When any instruction in this file collides with those three clauses, the clauses win.
