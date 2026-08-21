-- Supabase MVP schema for interview persistence and per-user ownership.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create table if not exists public.interview_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Interview Session',
    interview_type text not null default 'mixed',
    status text not null default 'draft',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.session_questions (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.interview_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    position integer not null,
    question_type text not null default 'technical',
    question_text text not null,
    source text not null default 'generated',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (session_id, position)
);

create table if not exists public.answer_summaries (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.interview_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    question_id uuid references public.session_questions(id) on delete set null,
    transcript text not null default '',
    summary_markdown text not null default '',
    metrics jsonb not null default '{}'::jsonb,
    captured_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.reports (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references public.interview_sessions(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    report_type text not null,
    status text not null default 'ready',
    model text not null default '',
    provider text not null default '',
    content_markdown text not null default '',
    error_message text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists interview_sessions_user_id_created_at_idx
    on public.interview_sessions(user_id, created_at desc);

create index if not exists session_questions_user_id_session_id_idx
    on public.session_questions(user_id, session_id);

create index if not exists answer_summaries_user_id_session_id_idx
    on public.answer_summaries(user_id, session_id);

create index if not exists reports_user_id_session_id_idx
    on public.reports(user_id, session_id);

create trigger interview_sessions_set_updated_at
before update on public.interview_sessions
for each row execute function public.set_updated_at();

create trigger session_questions_set_updated_at
before update on public.session_questions
for each row execute function public.set_updated_at();

create trigger answer_summaries_set_updated_at
before update on public.answer_summaries
for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

alter table public.interview_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.answer_summaries enable row level security;
alter table public.reports enable row level security;

create policy "interview_sessions_select_own"
on public.interview_sessions
for select
using (auth.uid() = user_id);

create policy "interview_sessions_insert_own"
on public.interview_sessions
for insert
with check (auth.uid() = user_id);

create policy "interview_sessions_update_own"
on public.interview_sessions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "interview_sessions_delete_own"
on public.interview_sessions
for delete
using (auth.uid() = user_id);

create policy "session_questions_select_own"
on public.session_questions
for select
using (auth.uid() = user_id);

create policy "session_questions_insert_own"
on public.session_questions
for insert
with check (auth.uid() = user_id);

create policy "session_questions_update_own"
on public.session_questions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "session_questions_delete_own"
on public.session_questions
for delete
using (auth.uid() = user_id);

create policy "answer_summaries_select_own"
on public.answer_summaries
for select
using (auth.uid() = user_id);

create policy "answer_summaries_insert_own"
on public.answer_summaries
for insert
with check (auth.uid() = user_id);

create policy "answer_summaries_update_own"
on public.answer_summaries
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "answer_summaries_delete_own"
on public.answer_summaries
for delete
using (auth.uid() = user_id);

create policy "reports_select_own"
on public.reports
for select
using (auth.uid() = user_id);

create policy "reports_insert_own"
on public.reports
for insert
with check (auth.uid() = user_id);

create policy "reports_update_own"
on public.reports
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "reports_delete_own"
on public.reports
for delete
using (auth.uid() = user_id);
