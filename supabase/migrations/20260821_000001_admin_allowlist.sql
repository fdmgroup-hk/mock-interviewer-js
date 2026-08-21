-- Admin allowlist and RLS expansion for read-only cross-user access.

create table if not exists public.admin_allowlist (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    email text not null,
    is_active boolean not null default true,
    notes text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists admin_allowlist_email_idx
    on public.admin_allowlist (email);

create trigger admin_allowlist_set_updated_at
before update on public.admin_allowlist
for each row execute function public.set_updated_at();

alter table public.admin_allowlist enable row level security;

create or replace function public.is_admin_allowlisted()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.admin_allowlist aa
        where aa.user_id = auth.uid()
          and aa.is_active = true
    );
$$;

revoke all on function public.is_admin_allowlisted() from public;
grant execute on function public.is_admin_allowlisted() to authenticated;

-- Allow authenticated users to validate only their own allowlist record.
drop policy if exists "admin_allowlist_select_self" on public.admin_allowlist;
create policy "admin_allowlist_select_self"
on public.admin_allowlist
for select
to authenticated
using (auth.uid() = user_id and is_active = true);

-- Read-only admin policy expansion for core interview tables.
drop policy if exists "interview_sessions_select_admin" on public.interview_sessions;
create policy "interview_sessions_select_admin"
on public.interview_sessions
for select
to authenticated
using (public.is_admin_allowlisted());

drop policy if exists "session_questions_select_admin" on public.session_questions;
create policy "session_questions_select_admin"
on public.session_questions
for select
to authenticated
using (public.is_admin_allowlisted());

drop policy if exists "answer_summaries_select_admin" on public.answer_summaries;
create policy "answer_summaries_select_admin"
on public.answer_summaries
for select
to authenticated
using (public.is_admin_allowlisted());

drop policy if exists "reports_select_admin" on public.reports;
create policy "reports_select_admin"
on public.reports
for select
to authenticated
using (public.is_admin_allowlisted());
