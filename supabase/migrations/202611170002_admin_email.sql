-- Store a minimal email/name allowlist for Supabase Auth dashboard accounts.
-- Passwords remain exclusively in Supabase Auth (hashed by Supabase).
alter table public.admin_users
  add column if not exists email text;

update public.admin_users as admins
set email = users.email
from auth.users as users
where admins.user_id = users.id
  and admins.email is null;

create unique index if not exists admin_users_email_lower_unique
  on public.admin_users (lower(email))
  where email is not null;

alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon;
revoke insert, update, delete on public.admin_users from authenticated;
grant select on public.admin_users to authenticated;
