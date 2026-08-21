-- Retention cleanup for interview sessions.
-- Rule:
-- 1) Delete sessions older than 90 days.
-- 2) Never delete a user's newest 3 sessions, even if older than 90 days.

create or replace function public.trim_old_interview_sessions(
    p_keep_days integer default 90,
    p_keep_per_user integer default 3,
    p_batch_size integer default 10000
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    deleted_count integer;
begin
    with ranked_sessions as (
        select
            s.id,
            s.user_id,
            s.created_at,
            row_number() over (
                partition by s.user_id
                order by s.created_at desc, s.id desc
            ) as user_session_rank
        from public.interview_sessions s
    ),
    sessions_to_delete as (
        select rs.id
        from ranked_sessions rs
        where rs.created_at < now() - make_interval(days => p_keep_days)
          and rs.user_session_rank > p_keep_per_user
        order by rs.created_at asc
        limit greatest(p_batch_size, 1)
    )
    delete from public.interview_sessions s
    using sessions_to_delete d
    where s.id = d.id;

    get diagnostics deleted_count = row_count;
    return deleted_count;
end;
$$;

revoke all on function public.trim_old_interview_sessions(integer, integer, integer) from public;
grant execute on function public.trim_old_interview_sessions(integer, integer, integer) to service_role;

-- Apply the retention rule once during migration.
select public.trim_old_interview_sessions(90, 3, 10000);
