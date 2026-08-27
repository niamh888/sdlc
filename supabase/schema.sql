-- ============================================================
-- supabase/schema.sql
-- Run this in the Supabase dashboard: Project -> SQL Editor -> New query,
-- paste the whole file, click Run. Safe to re-run — every statement either
-- uses IF NOT EXISTS or ON CONFLICT DO NOTHING, so running it twice does not
-- duplicate anything or error out.
--
-- After this file, run supabase/seed_questions.sql (generated from the
-- site's existing data/questions-intro.json and data/questions-advanced.json
-- by supabase/generate_seed_sql.py) to load the 30 quiz questions.
-- ============================================================

-- ---------- COURSES ----------
-- One row per course. "training" (the Supabase project name Niamh chose)
-- signals this is meant to grow beyond IEC 62304 — a second course is just
-- a second row here, not a schema change.
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- COURSE VERSIONS ----------
-- A course can have more than one version over time (e.g. IEC 62304 Edition 1
-- vs a future Edition 2 course). Quiz questions belong to a VERSION, not
-- directly to a course, so two editions never mix their question banks.
create table if not exists public.course_versions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  version_label text not null,
  is_current boolean not null default false,
  effective_date date,
  created_at timestamptz not null default now()
);

-- ---------- QUIZ QUESTIONS ----------
-- Replaces data/questions-intro.json / data/questions-advanced.json.
-- `options` is a JSON array of the (always 4, today) answer strings, mirroring
-- the shape quiz.js already works with, so quiz.js's own validation and
-- shuffling logic barely change.
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  course_version_id uuid not null references public.course_versions(id) on delete cascade,
  level text not null check (level in ('intro', 'advanced')),
  question text not null,
  options jsonb not null,
  correct_index int not null,
  explanation text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- QUIZ ATTEMPTS ----------
-- One row per completed (or abandoned) quiz attempt. Replaces the in-memory
-- quizState object that used to vanish on reload.
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_version_id uuid not null references public.course_versions(id),
  level text not null check (level in ('intro', 'advanced')),
  participant_name text not null,
  score int not null,
  total int not null,
  pct int not null,
  passed boolean not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now()
);

-- ---------- QUIZ ATTEMPT ANSWERS ----------
-- One row per question answered within an attempt. Not required to show a
-- score, but cheap to keep now and enables a future "review your answers"
-- feature without a schema change later.
create table if not exists public.quiz_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id),
  selected_index int not null,
  correct boolean not null
);

-- ============================================================
-- ROW LEVEL SECURITY
--
-- RLS is the actual security boundary here, not the secrecy of the
-- publishable key (that key is meant to be embedded in browser code — see
-- supabase-config.js). Every table below has RLS turned on, and every
-- policy is written as narrowly as the feature actually needs.
-- ============================================================

alter table public.courses enable row level security;
alter table public.course_versions enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;

-- Courses and course versions are harmless to read publicly (no personal
-- data, no answers) — useful later for a public course catalogue page.
drop policy if exists "Courses are publicly readable" on public.courses;
create policy "Courses are publicly readable"
  on public.courses for select
  using (true);

drop policy if exists "Course versions are publicly readable" on public.course_versions;
create policy "Course versions are publicly readable"
  on public.course_versions for select
  using (true);

-- Quiz questions (and their answer keys) are readable only by a signed-in
-- user. Login is already required to reach the quiz in the UI; this makes
-- that a real guarantee rather than a UI-only one, so the question bank
-- cannot be scraped anonymously via the API directly.
drop policy if exists "Quiz questions readable when signed in" on public.quiz_questions;
create policy "Quiz questions readable when signed in"
  on public.quiz_questions for select
  to authenticated
  using (true);

-- A user may create and read only their OWN attempts — never anyone else's.
-- No update/delete policy is defined for any role, so attempts are
-- effectively immutable once written (an honest permanent record).
drop policy if exists "Users insert their own attempts" on public.quiz_attempts;
create policy "Users insert their own attempts"
  on public.quiz_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users read their own attempts" on public.quiz_attempts;
create policy "Users read their own attempts"
  on public.quiz_attempts for select
  to authenticated
  using (auth.uid() = user_id);

-- Attempt answers are keyed to an attempt, not directly to a user, so the
-- policy checks ownership by joining back to quiz_attempts.
drop policy if exists "Users insert their own attempt answers" on public.quiz_attempt_answers;
create policy "Users insert their own attempt answers"
  on public.quiz_attempt_answers for insert
  to authenticated
  with check (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "Users read their own attempt answers" on public.quiz_attempt_answers;
create policy "Users read their own attempt answers"
  on public.quiz_attempt_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = auth.uid()
    )
  );

-- ============================================================
-- SEED: the course and its current version
--
-- Fixed, hand-picked UUIDs (not gen_random_uuid()) so this file can be
-- re-run safely AND so supabase/generate_seed_sql.py can reference the same
-- course_version_id without first querying the database for it.
-- ============================================================

insert into public.courses (id, slug, title, description)
values (
  '11111111-1111-1111-1111-111111111111',
  'iec-62304-essentials',
  'IEC 62304 Essentials',
  'Medical device software lifecycle training, based on IEC 62304:2006+AMD1:2015.'
)
on conflict (id) do nothing;

insert into public.course_versions (id, course_id, version_label, is_current, effective_date)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'Edition 1 - 2006+A1:2015',
  true,
  '2026-08-27'
)
on conflict (id) do nothing;
