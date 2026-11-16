# Supabase setup for Desa Timpik

## What this migration provides

`migrations/202611160001_initial_cms.sql` creates CMS tables for site content, dusun, services, articles, agenda, institutions, and an administrator allowlist. Public reads are limited to published services/articles/agenda; writes require an authenticated user listed in `admin_users`. It inserts no records because the current project data is sample data and must not be presented as verified village information.

## Apply it

1. Create a Supabase project and open **SQL Editor**.
2. Run the migration file.
3. Create the administrator account using Supabase Auth.
4. Add only that Auth user's UUID to `public.admin_users` from the SQL Editor. Do not expose database credentials or the secret/service-role key in browser code.
5. Send the project URL and publishable key to the application through the deployment provider's server environment settings. Keep secret keys server-side only.

The Astro project is currently configured for static output and browser `localStorage`. This migration alone does not switch the live app to Supabase. The next application step is enabling Astro server rendering, adding the deployment adapter and cookie-based Supabase Auth, then migrating each admin editor and public query to the database. That requires the target hosting provider and a Supabase project to verify against.

## Official data needed before import

Provide the approved source file/document for dusun names and counts, organization chart photo, official profile/vision/mission, and the final list of services with their real Google Forms. News and agenda can be imported from the current JSON only if those records are approved for publication; several entries are placeholders. No resident-level personal data should be imported into public tables.
