-- Security hardening: prevent unauthenticated execution of allowlist helper function.

create or replace function public.is_admin_allowlisted()
returns boolean
language sql
stable
security invoker
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
revoke execute on function public.is_admin_allowlisted() from anon;
grant execute on function public.is_admin_allowlisted() to authenticated;
