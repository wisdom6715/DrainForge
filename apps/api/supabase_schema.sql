-- Run this once against your Supabase project (SQL editor or `supabase db execute`).
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  reporter_id text,
  title text not null,
  area text,
  category text not null,
  severity text not null default 'medium',
  description text default '',
  latitude double precision not null,
  longitude double precision not null,
  address text,
  location_accuracy double precision,
  image_path text,
  status text not null default 'pending' check (status in ('pending', 'resolved')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- If your `reports` table already existed from an earlier iteration, these
-- add whatever's missing without touching existing data.
alter table reports add column if not exists title text not null default 'Untitled report';
alter table reports add column if not exists area text;
alter table reports add column if not exists image_path text;
alter table reports add column if not exists resolved_at timestamptz;

create table if not exists report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists reports_created_at_idx on reports (created_at desc);
create index if not exists reports_status_idx on reports (status);
create index if not exists reports_reference_idx on reports (reference);

-- Storage bucket for evidence photos (public so report images can be shown
-- on the home page without extra signed-URL plumbing). Create it once via
-- the dashboard (Storage -> New bucket -> "report-evidence", Public) or:
-- select storage.create_bucket('report-evidence', public => true);
