-- CMS foundation for Desa Timpik. This migration intentionally creates no
-- sample village records; only verified official information should be loaded.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_content (
  content_key text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.villages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  head_name text not null default '',
  rt_rw text not null default '',
  area text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null default '',
  description text not null default '',
  requirements jsonb not null default '[]'::jsonb,
  google_form_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body text not null default '',
  image_path text not null default '',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  description text not null default '',
  starts_at timestamptz,
  location text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  abbreviation text not null default '',
  category text not null default '',
  description text not null default '',
  focus jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.site_content enable row level security;
alter table public.villages enable row level security;
alter table public.services enable row level security;
alter table public.articles enable row level security;
alter table public.agenda enable row level security;
alter table public.institutions enable row level security;

create policy "admins can read their own admin record" on public.admin_users
  for select to authenticated using (user_id = (select auth.uid()));

create policy "public can read site content" on public.site_content
  for select to anon, authenticated using (true);
create policy "admins can manage site content" on public.site_content
  for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public can read villages" on public.villages
  for select to anon, authenticated using (true);
create policy "admins can manage villages" on public.villages
  for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public can read active services" on public.services
  for select to anon, authenticated using (active = true);
create policy "admins can manage services" on public.services
  for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public can read published articles" on public.articles
  for select to anon, authenticated using (published = true);
create policy "admins can manage articles" on public.articles
  for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public can read published agenda" on public.agenda
  for select to anon, authenticated using (published = true);
create policy "admins can manage agenda" on public.agenda
  for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

create policy "public can read institutions" on public.institutions
  for select to anon, authenticated using (true);
create policy "admins can manage institutions" on public.institutions
  for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())))
  with check (exists (select 1 from public.admin_users a where a.user_id = (select auth.uid())));

grant select on public.site_content, public.villages, public.services, public.articles, public.agenda, public.institutions to anon, authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.site_content, public.villages, public.services, public.articles, public.agenda, public.institutions to authenticated;
