-- List current admins from the allowlist.
--
-- Run this in Supabase SQL editor.

-- Active admins only.
select
    al.user_id as account_id,
    al.email,
    al.is_active,
    al.notes,
    al.created_at,
    al.updated_at
from public.admin_allowlist al
where al.is_active = true
order by lower(al.email);

-- Full allowlist history (active + inactive).
select
    al.user_id as account_id,
    al.email,
    al.is_active,
    al.notes,
    al.created_at,
    al.updated_at
from public.admin_allowlist al
order by al.is_active desc, lower(al.email);
