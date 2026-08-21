-- Revoke admin allowlist entries by setting is_active = false.
--
-- Usage:
-- 1) Replace emails in `admins_to_revoke`.
-- 2) Run in Supabase SQL Editor.
--
-- This does not delete rows; it deactivates access for auditability.

create temporary table if not exists _admins_to_revoke (
    email text not null,
    revoke_note text not null
) on commit drop;

truncate table _admins_to_revoke;

insert into _admins_to_revoke (email, revoke_note)
values
    ('admin.revoke@fdmgroup.com', 'Access revoked by maintenance script');

update public.admin_allowlist al
set
    is_active = false,
    notes = case
        when coalesce(al.notes, '') = '' then atr.revoke_note
        else al.notes || ' | ' || atr.revoke_note
    end,
    updated_at = now()
from _admins_to_revoke atr
where lower(al.email) = lower(atr.email);

-- Shows requested emails that are not present in admin_allowlist.
select atr.email as not_found_email
from _admins_to_revoke atr
left join public.admin_allowlist al on lower(al.email) = lower(atr.email)
where al.user_id is null;

-- Shows resulting status for requested emails.
select al.user_id, al.email, al.is_active, al.notes, al.updated_at
from public.admin_allowlist al
join _admins_to_revoke atr on lower(atr.email) = lower(al.email)
order by al.updated_at desc;
