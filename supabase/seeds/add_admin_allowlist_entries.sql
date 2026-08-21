-- Add or update admin allowlist entries after initial setup.
--
-- Usage:
-- 1) Replace the emails in `new_admins` with real account emails.
-- 2) Ensure each email has signed in at least once (exists in auth.users).
-- 3) Run in Supabase SQL Editor.

with new_admins(email, notes) as (
    values
        ('hayden.mak@fdmgroup.com', 'Added by admin maintenance script')
),
resolved as (
    select
        au.id as user_id,
        au.email,
        na.notes
    from new_admins na
    join auth.users au on lower(au.email) = lower(na.email)
)
insert into public.admin_allowlist (user_id, email, is_active, notes)
select
    r.user_id,
    r.email,
    true,
    r.notes
from resolved r
on conflict (user_id)
do update
set
    email = excluded.email,
    is_active = true,
    notes = excluded.notes,
    updated_at = now();

-- Shows any requested emails that were not found in auth.users.
with new_admins(email, notes) as (
    values
        ('hayden.mak@fdmgroup.com', 'Added by admin maintenance script')
)
select na.email as missing_email
from new_admins na
left join auth.users au on lower(au.email) = lower(na.email)
where au.id is null;

-- Shows the entries currently allowlisted for the requested emails.
with new_admins(email, notes) as (
    values
        ('hayden.mak@fdmgroup.com', 'Added by admin maintenance script')
)
select al.user_id, al.email, al.is_active, al.notes, al.updated_at
from public.admin_allowlist al
join new_admins na on lower(na.email) = lower(al.email)
order by al.updated_at desc;
