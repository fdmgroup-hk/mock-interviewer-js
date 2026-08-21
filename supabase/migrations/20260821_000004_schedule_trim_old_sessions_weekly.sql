-- Schedule weekly retention cleanup for interview sessions.
-- Runs every Monday at 02:00 UTC.

create extension if not exists pg_cron;

do $$
declare
    existing_job_id bigint;
begin
    select j.jobid
    into existing_job_id
    from cron.job j
    where j.jobname = 'trim_old_interview_sessions_weekly_utc'
    limit 1;

    if existing_job_id is not null then
        perform cron.unschedule(existing_job_id);
    end if;

    perform cron.schedule(
        'trim_old_interview_sessions_weekly_utc',
        '0 2 * * 1',
        $cron$select public.trim_old_interview_sessions(90, 3, 10000);$cron$
    );
end;
$$;
