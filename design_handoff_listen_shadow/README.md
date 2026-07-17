# Handoff: Listen → Shadowing Flow (⑩⑪) + Narim Australia pack

## Overview
Redesign of Wavi's Listen/Shadowing scenario flow: a student opens an assigned or starter scenario, listens to a two-voice dialogue, then shadows their own lines with self-playback comparison (no scoring), ending on a phrase summary. Ships with a curated 8-scenario arc for one student (Narim) preparing for a month in Australia.

**Start here: `Listen Shadow Flow Spec.md`.** It is the authoritative implementation spec — self-contained, with every code anchor verified against the live `src/App.js` on Jul 17, 2026. This README only frames the bundle; the spec carries the detail (DB migration, code touchpoints, gating, 12-step test plan, rollout/rollback).

## About the design files
The `.dc.html` files are **design references written in HTML** — they show intended look and behavior, not production code to paste in. This feature is a **redesign of an existing flow already in `src/App.js`** (React, `React.createElement` + inline style objects, Supabase via `db.*`). The task is to restyle and re-sequence that existing runner to match these references — **not** to build a parallel flow and **not** to port the HTML. The spec's "Code touchpoints" section names exactly what to change and where.

## Fidelity
**High-fidelity.** Colors, typography, spacing, copy, and interaction states in the prototype are final. Recreate them using the codebase's existing UI patterns (`WAYVE_TOKENS`, `word-break: keep-all`, existing `scenarioSay` / VAD / `MediaRecorder` helpers). Korean UI strings are final — copy verbatim, do not re-translate.

## Files in this bundle
- **`Listen Shadow Flow Spec.md`** — the spec. Read first and follow it.
- **`Narim Australia Session Pack.md`** — canonical scripts for the 8-scenario Narim arc (includes Wavi's Korean framing/close lines the prototype omits). Source of truth for seeding those rows.
- **`Listen Shadow Prototype.dc.html`** — interactive behavior reference: starter/collection picker, listen player, listen-done handoff, shadow-with-compare, summary. Open in a browser to click through. Starter scenario scripts (Ordering Coffee / Getting to the Hotel / Meeting a New Coworker) are verbatim in its `SCN` object.
- **`Wayve Final.dc.html`** — static frame reference for screens ⑩A ⑩B ⑪A ⑪B ⑪C.
- **`assets/`** — Wavi character images (`wavi-speaking.png` used during shadowing; neutral/encouraging for other states). These already exist in the app; match to the app's copies.
- **`ios-frame.jsx`, `support.js`** — only so the prototype renders standalone; **not** for production.

## What to build (summary — spec has the detail)
- **Behavior changes:** offer shadowing after ONE listen (drop the `fullListens >= 3` gate); replace silent-discard shadowing with explicit record → compare (own recording vs Wavi's TTS) → re-record / next; full-screen navy player screens.
- **DB:** one migration adds `scenarios.is_starter / other_voice_id / collection / sort_order` and a `scenario_completions` table (the only persistence — no scoring, no `student_progress` writes). Seed 3 starters + the 8 Narim rows.
- **Voice:** other-person lines use `scenario.other_voice_id ?? SCENARIO_OTHER_VOICE_ID`; the Narim pack sets an Australian voice (`DYkrAHD8iwork3YSUBbs`). Wavi's own voice is untouched.
- **Gating:** reuse the existing `SCENARIOS_STUDENT_ENABLED` const + `SCENARIOS_ALLOW_GROUP_IDS` allowlist (add Group 1 for Narim). Test on the Toms Lee account first.

## Non-negotiables (design intent — see spec Non-goals)
No pronunciation scoring / grading / feedback of any kind — self-comparison replaces it by design. No streaks, XP, confetti. No recording uploads (blob is in-memory, discarded on exit). No progress *bars* — thin sentence segments + "N / M 문장" text only.

## Open item flagged for the implementer (do not fix silently)
CLAUDE.md lists `WAVY_VOICE_ID` as `n2fbxG88jqAoaVPUy3IG`, but `src/App.js` uses `"XrExE9yKIg1WjnnlVkGX"`. Left untouched — confirm which is correct and reconcile the docs.
