# LAUNCH CHECKLIST — redesign-v3 → production

Tick-through guide for shipping the `redesign-v3` branch to prod. Ordered so nothing
student-visible changes until you deliberately flip a flag.

**Golden rule:** `redesign_v3_enabled` defaults to **false**, and all v3 visuals + dark mode
are gated on it (`isRedesignV3`, App.js ~L649). Deploying the code changes **nothing** for
current students until you flip their flag. Toms Lee always sees v3 via the `TEACHER_NAMES`
fallback. The only un-gated changes that reach everyone on deploy are the Groq proxy + a few
bug fixes — that's what the pre-deploy validation focuses on.

---

## 0. Pre-flight (before touching prod)

- [ ] On branch `redesign-v3`, working tree clean (`git status`)
- [ ] `npm run build` → "Compiled successfully" (last verified: clean, ~273 kB gzip)
- [ ] Confirm Groq key present in Vercel prod: `vercel env ls` shows `REACT_APP_GROQ_KEY` (Production).
      The proxy `api/groq.js` reads `REACT_APP_GROQ_KEY || GROQ_KEY` server-side — if absent, every
      Groq call 500s and silently falls back to Gemini.
- [ ] Record baseline row counts in **prod** Supabase (proof phrases survive):
      ```sql
      SELECT
        (SELECT count(*) FROM phrase_bank)     AS phrase_bank,
        (SELECT count(*) FROM session_phrases) AS session_phrases,
        (SELECT count(*) FROM student_progress) AS student_progress;
      ```

## 1. Database migration (prod Supabase SQL editor)

- [ ] Run **Part 1** of `PROD_DEPLOY_MIGRATIONS.sql` (idempotent; safe to re-run — zero "already exists" errors)
- [ ] Run **Part 2** verification query → every row reads `exists = true`
- [ ] Run the "Key added COLUMNS" query at the bottom → each expected column present
- [ ] Re-run the baseline count query from §0 → **counts identical** (migrations are additive; the
      only `phrase_bank` change is one nullable column, `wavi_video_url`)

## 2. Deploy code

- [ ] `vercel --prod`
- [ ] Deploy succeeds; site loads. **All current students still on the old UI** (flags default false).

## 3. Validate the un-gated surface — Groq paths (on Toms Lee, in prod)

Models are on stable **llama** (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`); this is about
the proxy routing working, not model behavior. All six route through `/api/groq` + `extractLLMJSON`.

- [ ] **Phrase generation** (teacher: generate AI phrases) returns valid phrases
- [ ] **AI translation review** (teacher) returns a review
- [ ] **BulkAutoTagger** — "↺ Re-tag all" completes and tags apply
- [ ] **How-to-say** (student FreeTalk) returns structured output
- [ ] **FreeTalk feedback** (student, record → feedback) returns feedback
- [ ] **Today's-expression** (student FreeTalk → 오늘의 표현) loads; tap 🔄 retry works (fixed in `8abd8a7`)
- [ ] Sanity: confirm output is coming from Groq, not silently from Gemini (i.e. key is wired) —
      check a response feels llama-shaped / no console 500s on `/api/groq`

> Scenario Builder generation is on **Gemini**, not Groq — separate path, test separately if used.

## 4. Phrase integrity — behavioral (Toms Lee, prod)

Schema is data-safe; this confirms phrases still *surface*.

- [ ] Toms Lee's week phrases appear in the new 3-segment Practice IA (이번 주 / 지난 표현 / 내 목록)
- [ ] Saved My List entries all present
- [ ] If any student changed groups: confirm carried phrases still show (commit `799b1f6` changed
      group-change surfacing — no back-catalog inheritance)

## 5. v3 smoke test (flip Toms Lee's flag first)

```sql
UPDATE students SET redesign_v3_enabled = TRUE WHERE name = 'Toms Lee';
```

- [ ] Home → mode sheet → Wavi Listen / Shadowing → session pass moment
- [ ] Dark mode toggle: no white-on-white regressions across home, modals, pills, teacher dash
- [ ] Teacher dashboard v3: Today pulse, session wrap-up (attendance capture), inbox class requests
- [ ] 7-step v3 tour renders
- [ ] Thankful Thursday flow (if in-window)

## 6. Roll out per student (one at a time, only after §5 passes)

Start with the "would Chris notice?" benchmark; watch each before the next.

```sql
UPDATE students SET redesign_v3_enabled = TRUE WHERE name = '[student name]';
-- check state:
SELECT name, redesign_v3_enabled, wavy_enabled, home_v2_enabled FROM students;
```

- [ ] Student 1 (benchmark) — enabled, spot-checked
- [ ] Remaining students, individually

---

## Rollback (one line at each layer)

| Problem | Rollback |
|---|---|
| A student sees something broken in v3 | `UPDATE students SET redesign_v3_enabled = FALSE WHERE name = '…';` (instant) |
| Code-level regression (affects everyone) | `git revert` the offending commit + `vercel --prod` |
| Migration concern | None needed — all additive/idempotent; old code ignores new columns |

## Post-launch register (not blockers — don't let a clean launch hide these)

- [ ] **Groq deprecation Aug 16, 2026** still unresolved. gpt-oss returned empty structured output and
      was reverted to llama; a replacement must be re-tested and shipped before the deadline.
- [ ] **Groq key still client-exposed:** `REACT_APP_GROQ_KEY` is baked into the bundle at build time.
      The proxy fixed CORS, not exposure. To also hide the key: add an unprefixed `GROQ_KEY` server-side,
      drop `REACT_APP_GROQ_KEY`. Post-launch hardening.
