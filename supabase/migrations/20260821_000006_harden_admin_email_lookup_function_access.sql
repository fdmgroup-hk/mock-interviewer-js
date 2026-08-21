-- Security hardening: restrict admin email lookup function to authenticated callers.
-- Keep SECURITY DEFINER because this function needs privileged read access to auth.users.

create or replace function public.admin_lookup_user_id_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
    v_user_id uuid;
    v_email text;
begin
    if auth.uid() is null or auth.role() <> 'authenticated' then
        raise exception 'Not authorized to perform admin email lookups'
            using errcode = '42501';
    end if;

    if not public.is_admin_allowlisted() then
        raise exception 'Not authorized to perform admin email lookups'
            using errcode = '42501';
    end if;

    v_email := nullif(btrim(p_email), '');
    if v_email is null then
        return null;
    end if;

    select u.id
    into v_user_id
    from auth.users u
    where lower(u.email) = lower(v_email)
    order by u.created_at desc, u.id desc
    limit 1;

    return v_user_id;
end;
$$;

revoke all on function public.admin_lookup_user_id_by_email(text) from public;
revoke execute on function public.admin_lookup_user_id_by_email(text) from anon;
grant execute on function public.admin_lookup_user_id_by_email(text) to authenticated;
