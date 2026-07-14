# Teacher Dashboard Redesign — Locked IA + Screen Spec

> Status: **spec locked, pre-build.** Author: Toms + Claude. Scope: the teacher-facing
> dashboard only (student app is separate and already redesigned). Everything here is
> teacher-only (only teacher accounts ever see it), so there's no per-student flag risk.

## 1. Goal & non-goals

**Goal.** Restructure the teacher dashboard around a **daily pulse** so the moment Toms
opens it he can answer two questions instantly: *how is everyone doing?* and *who needs me?*
Pulse is driven by two honest signals — **session attendance** and **minutes practiced**.
The post-session habit (open app → add phrases) is folded into a **session wrap-up** that
also captures attendance, which is what powers the pulse.

**Also in scope (Toms's asks):** per-student **attendance log/history**, and per-group
**weekly class schedules** (multiple sessions/week supported).

**Non-goals.** No student-app changes. No automated/real-time attendance (manual capture).
No rebuild of AI Tools / Setup internals — they relocate behind a header ⚙, unchanged.
Dark mode for the teacher dashboard is a fast follow, not part of the structural work.

## 2. Information architecture

- **Bottom nav (3): `Today · Students · Inbox`** — the daily rhythm.
- **Header:** `🔔` inbox badge (jumps to Inbox) · `⚙` menu → **Setup** (groups + **schedules**,
  dues, per-student flags, phrase library, **Scenario Builder**, account). These are
  not-daily, so they leave the primary flow.
- **Phrase input is an action, not a tab** — reached from the Today session card
  ("표현 추가") and from a group in Students. It stops being the reason he opens the app.

Screens: **Today**, **Session wrap-up** (sheet), **Students** (list), **Student detail**
(+ attendance log), **Inbox**, **Group schedule editor** (under ⚙), **Phrase management**
(existing screen, reached as an action).

## 3. Per-student status (the spine)

Two inputs: **last session attendance** (attended / absent / not-yet-recorded) and
**minutes practiced this week** (`active_time_segments`, KST Mon–Sun).

| Last session | Practiced this week | Status | Label |
|---|---|---|---|
| ✓ attended | > 0 min | 🟢 | On track |
| ✓ attended | 0 min | 🟡 | Coasting (shows up, not practicing) |
| ✗ missed | > 0 min | 🟡 | Missed class (still engaged) |
| ✗ missed | 0 min | 🔴 | Reach out |
| not recorded | — | ⚪️ | 정리 전 — prompts "이번 수업 정리하기" |

- Always render the raw truth next to the dot: `지난 수업 ✓ · 이번 주 14분`.
- Thresholds are intentionally simple (practiced = any minutes > 0). Tunable later
  (e.g., a "coasting" cutoff at < 10 min) — kept binary for v1 per Toms's "two signals."
- "Last session" for a student = the most recent **past** scheduled slot for their group
  (from the schedule, §5). Attendance read from the `attendance` table for that date.

## 4. Screen specs

### 4a. Today (default landing)
Purpose: pulse + "who needs me" + one-tap into the session wrap-up.
```
WAYVE · TEACHER                          🔔2   ⚙
오늘 · 목요일 7월 14일

┌ CONTEXT CARD (one of two) ─────────────────┐
│  A) 방금 Group 3 수업 · 정리하기 →           │  ← if a slot ended recently
│     출석 체크 + 오늘 배운 표현 추가            │     and has no attendance yet
│  B) 다음 수업 · Group 3 · 수요일 오후 8시     │  ← else: next upcoming slot
│     Jojo · Daniel · Wood                     │
│     이번 주 표현 3개    [준비]  [표현 추가]     │
└─────────────────────────────────────────────┘

내가 할 일
 🙏 Thursday 답변 N개 — 댓글 대기 →     (qod_responses without a teacher comment)
 💬 리퀘스트 N개 →                       (class_requests status='new')
 📩 메시지 N개 →                          (student_messages replied=false)
 📞 연락해볼 학생 N명 →                    (🔴 students / last_practice > X days)

이번 주 학생 현황                                    전체 ▸
 🔴 Wood    지난수업 ✗ · 0분          연락?
 🟡 Chris   지난수업 ✓ · 3분
 🟢 Judy    지난수업 ✓ · 14분
 🟢 Jojo    지난수업 ✓ · 22분
        (sorted attention-first: 🔴 → 🟡 → ⚪️ → 🟢)

        [ Today ]     Students     Inbox
```
Data: schedule (next/last slot), `attendance`, `active_time_segments`, `qod_responses`,
`class_requests`, `student_messages`, `last_practice`. Actions: open wrap-up, open
prep/phrase-add, tap a "내가 할 일" item → its Inbox section, tap a student → detail.

### 4b. Session wrap-up (bottom sheet, from Today card A / any past slot)
Purpose: the post-session habit — mark attendance + add phrases in one place.
```
Group 3 수업 정리 · 7월 14일
출석    [✓ Jojo]  [✓ Daniel]  [  Wood  ]     ← tap chip to toggle attended/absent
────────────────────────────────────────
오늘 배운 표현                     [ + 표현 추가 ]
 · "Could you arrange a shuttle?"           ✎ 🗑
 · "I'm just here on business."             ✎ 🗑
────────────────────────────────────────
                 [ 완료 ]
```
On 완료: upsert one `attendance` row per student for this (group, session_date); phrase
adds reuse the existing `session_phrases` insert + auto-translate + tagging. Idempotent —
re-opening the wrap-up for the same date edits the same rows.

### 4c. Students (roster)
Grouped by class; each row = the same status chip + raw stat as Today. Tap → detail.
Header ⚙ available. A group header shows the group's next scheduled slot.

### 4d. Student detail (+ attendance log — new)
Existing detail (progress, notes, flags, this-week stats) **plus**:
- **출석 기록** — reverse-chronological list of that student's past sessions:
  `7월 14일 ✓` · `7월 9일 ✗` · `7월 7일 ✓` … with a small summary (e.g., "최근 8회 중 6회 출석").
- Their **class requests** (from `class_requests`) surfaced here too (closes the request loop
  at the student level).
Data: `attendance` (student_id, order by session_date desc), `class_requests`.

### 4e. Inbox
Unchanged in function, restyled: the existing **메시지** segment + the **리퀘스트** segment
(already built) + a **Thursday 댓글** segment (qod_responses awaiting a teacher comment).
Counts match Today's "내가 할 일."

### 4f. Group schedule editor (under ⚙ → group)
Purpose: set each group's **weekly** class times (supports multiple/week).
```
Group 3 · 일정
 수요일  20:00  90분    🗑
 [ + 시간 추가 ]                 (day picker · time · duration)
```
Writes `group_schedule` rows. Drives: Today's next/last-session logic, the wrap-up date,
and the student app's "N일 남음" countdown on the request card (which currently reads the
now-superseded `groups.session_day`).

## 5. Data model

**Existing (reused):** `active_time_segments` (minutes), `session_phrases` (phrases),
`student_progress`, `qod_responses`, `class_requests`, `student_messages`, `students`
(`last_seen`/`last_practice`), `groups`.

**New table — `attendance`** (one row per student per session date):
```sql
CREATE TABLE IF NOT EXISTS public.attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL,
  group_id    uuid,
  session_date date NOT NULL,
  attended    boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (student_id, session_date)
);
CREATE INDEX IF NOT EXISTS attendance_student_idx ON public.attendance (student_id, session_date DESC);
CREATE INDEX IF NOT EXISTS attendance_group_date_idx ON public.attendance (group_id, session_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO anon, authenticated;
-- + permissive RLS policy guard (mirrors session_notes) if RLS is on.
```

**New table — `group_schedule`** (weekly recurring slots; multiple per group):
```sql
CREATE TABLE IF NOT EXISTS public.group_schedule (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     uuid NOT NULL,
  day_of_week  int  NOT NULL,          -- 0=Sun … 6=Sat
  start_time   text NOT NULL,          -- 'HH:MM' local
  duration_min int  DEFAULT 90,
  created_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_schedule_group_idx ON public.group_schedule (group_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_schedule TO anon, authenticated;
-- + permissive RLS policy guard if RLS is on.
```
`groups.session_day` / `session_time` (added earlier) become a fallback only; the schedule
table is the source of truth. The student request-card countdown switches to "next slot
from `group_schedule`."

Migrations will be written to `supabase/migrations/` and handed over for review — **not run**
automatically (same as the earlier ones).

## 6. Gating, rollout, rollback
- Teacher-only surface → gate the **new dashboard** behind a simple switch
  (`TEACHER_DASH_V3` constant, or a `localStorage` toggle) so the current dashboard stays
  as a one-flip fallback during the build. Flip on for Toms only; the old `TeacherScreen`
  remains intact underneath.
- Build order: (1) schema + schedule editor → (2) wrap-up (attendance capture) →
  (3) Today pulse → (4) Students + attendance log → (5) Inbox restyle → (6) dark mode.
  Each step ships behind the flag; rollback = flag off.

## 7. Test plan (Toms account, teacher view)
1. ⚙ → Group schedule: add Group 3 = 수요일 20:00 90분; confirm it saves and Today shows the
   right next/last slot.
2. After a slot's end time, Today shows the **정리하기** card → wrap-up → toggle attendance →
   완료 → re-open shows the saved state (idempotent).
3. Today pulse: a student with attendance ✓ + minutes → 🟢; ✗ + 0 min → 🔴; verify sort order.
4. Student detail → 출석 기록 shows the logged sessions.
5. "내가 할 일" counts match the Inbox segments.
6. Old dashboard returns intact when the flag is off.

## 8. Open decisions (flag before build)
- **Attendance granularity:** one row per student per session date (chosen) — fine at this
  scale. OK?
- **"This week" window:** KST Mon–Sun (matches the student home). OK?
- **Reach-out threshold:** 🔴 also when `last_practice` > N days even if attendance unknown —
  propose N = 4 (matches the mockup's "4일 전"). OK?
- **Dark mode for teacher:** fold in during step 6 using the same palette Proxy (needs a
  teacher theme source since theme currently lives in the student screen). Confirm you want
  the teacher dashboard dark too.
