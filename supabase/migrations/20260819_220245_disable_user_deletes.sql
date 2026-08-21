-- Disable client-initiated deletes for interview persistence tables.
-- Existing RLS delete policies allowed users to delete their own rows via API clients.

begin;

drop policy if exists "reports_delete_own" on public.reports;
drop policy if exists "answer_summaries_delete_own" on public.answer_summaries;
drop policy if exists "session_questions_delete_own" on public.session_questions;
drop policy if exists "interview_sessions_delete_own" on public.interview_sessions;

commit;
