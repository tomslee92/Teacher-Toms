# Handoff: Wayve App Redesign (v3)

## Overview
Full redesign of the Wayve English-learning app (student app + teacher dashboard): new home built around a daily plan, 5 tabs → 4 (My List folds into Practice), anxiety-reducing Wavi session modes (Listen / Shadowing), a "다음 수업 리퀘스트" feature closing the student→teacher input loop, restrained celebrations, dark mode, and a unified visual language based on the codebase's own `WAYVE_TOKENS`.

**Read `Implementation Handoff.md` first** — it is the codebase-specific spec: every screen mapped to App.js landmarks, DB migrations, feature-flag gating, rollout order, and rollback. This README covers the design-reference side.

## About the Design Files
The HTML files in this bundle are **design references, not production code**. They were built in a design tool's HTML format (`.dc.html` — open in a browser to view; `support.js` is the viewer runtime, ignore it for implementation). The task is to **recreate these designs inside the existing Wayve codebase** (`src/App.js`, ~22k lines, React via `React.createElement`, inline style objects, single file) following its established conventions in `CLAUDE.md` — NOT to ship or port this HTML.

- `Wayve Final.dc.html` — the design board: every screen of the app, light + dark, numbered ①–㉛ (student), TEACHER-chipped screens (teacher), `d`-prefixed dark variants. This is the visual source of truth.
- `Wayve Prototype.dc.html` — interactive prototype of the student core loop (home → mode sheet → Wavi session → pass → teacher note → plan check-off; Practice/Solo/Community/profile/request/tour). This is the **behavioral** source of truth for navigation, state transitions, and overlay behavior. Mic input is simulated (tap = spoke); real app uses the existing Whisper/recording pipeline.
- `ios-frame.jsx` — device-frame chrome used by the board; not part of the design.
- `assets/` — Wavi character art (from the app's own `public/`) and WAYVE logo files.

## Fidelity
**High-fidelity.** Colors, type scale, spacing, radii, and copy are final. Recreate pixel-perfectly with the codebase's inline-style-object pattern. All Korean copy in the mockups is written to the project's register rules (존댓말, no 님) and is final unless it conflicts with an existing string freeze — flag conflicts, don't silently rewrite.

## Screens / Views
See `Implementation Handoff.md` §"Screen-by-screen" for all screens with backend status. Board numbering:
- ①–⑮ student app (home, mode sheet, Wavi session ×2, Practice, Solo, Community, login, profile sheet, Listen player, Shadowing, session end + teacher note, Thursday flow, My List, dark home)
- ⑯⑰⑳㉒㉓㉗㉘ teacher (Today, student detail, Inbox with 리퀘스트 segment, Scenario Builder ×2, Students list, phrase management)
- ⑱⑲ class-request feature · ㉑ tour · ㉔–㉛ review mode, submitted state, profile edit, empty/error/push states
- Dark variants carry the same numbers with `d`-prefixed ids.

## Interactions & Behavior (from the prototype)
- Tab switches are instant (no route transitions). Overlays: bottom sheets slide up ~280ms ease; full-screen session fades in ~300ms.
- Wavi session: exit pill always visible; 건너뛰기 always available while listening; pass moment = expression swap + quiet green ✓ + one warm sentence (variant pool, never a single hardcoded string); NO confetti/trophies anywhere.
- Solo: mic-first; secondary "말하기 대신 입력으로 물어보기" typed path; save → inline green confirm with one-tap 신청 (class request).
- Requests: sent state echoes on Home ("리퀘스트를 보냈어요 — 수업에 반영돼요"); teacher "수업에 반영" later surfaces "반영됐어요" to the student.
- Toasts: bottom-center dark pill, ~2.2s.
- Plan card: steps check off as completed; all-done state changes the greeting line, nothing louder.

## State Management
Per-screen state is enumerated in the prototype's logic (readable at the bottom of `Wayve Prototype.dc.html`): tab, overlay, session phase (listening/passed/end), plan completion, Practice segment, solo result/saved, request sent, Thursday prompt/composed/submitted. In the real app all data flows per existing patterns: `fetchHomeData` → props (no component-local fetches), flags on `students`.

## Design Tokens
Use the existing `WAYVE_TOKENS` constant (App.js ~line 178) — do not invent new values:
- bgGrouped `#F2F3F7` · card `#FFFFFF` · ink `#16181D` / `#6E7178` / `#9DA0A8` · hairline `rgba(22,24,29,0.08)`
- navy `#0B1F3A → #16345C` (gradient 135°) · wave `#3E7BFA` / soft `#EDF3FF` · coral `#FF5D4E` / soft `#FFF0EE` · green `#2FB344` / soft `#EDF9EF` · review amber `#fcd34d` (existing)
- radius: cards 20px, pills 100px · shadows: `0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.05)` (card), `0 8px 28px rgba(11,31,58,.28)` (navy hero)
- **Dark tokens** (add as `DARK_TOKENS` twin): bg `#0E1116` · card `#171B22` · ink `#F2F3F7`/`#9DA0A8`/`#6E7178` · hairline `rgba(255,255,255,0.08)` · links/active `#6FA0FF` · coral `#FF7A6E` · error surfaces = tinted translucent (see dark board section). Navy + wave-blue buttons unchanged.
- Type: Pretendard Variable (replace Inter import), weights 600/700/800; screen titles 30px/800/-0.6px; card titles 15–17px/800; body 13–14px; captions 11–12px. `word-break: keep-all` stays global.
- Icons: 24px inline SVG line icons, stroke 1.8, round caps (all paths are in the board markup — copy them verbatim).

## Assets
- `assets/wavi-neutral.png`, `wavi-encouraging.png`, `wavi-speaking.png` — already in the app's `public/` (same files).
- `assets/wayve-logo-*.png` — existing brand logos, reference only.
- App icon & splash: **unchanged** — keep current production versions.

## Files
- `Implementation Handoff.md` — THE spec (landmarks, DDL, flags, rollout order, watch-outs)
- `Wayve Final.dc.html` — all screens, both themes
- `Wayve Prototype.dc.html` — interactive behavior reference
- `assets/`, `ios-frame.jsx`, `support.js` — supporting files

## Process requirements (non-negotiable, from CLAUDE.md)
Implement one rollout phase per session. Everything behind `redesign_v3_enabled` (per-student flag + Toms Lee fallback). Test on the Toms Lee account before any rollout mention. Landmark-anchored edits only. No new dependencies, no JSX conversion, no gamification.
