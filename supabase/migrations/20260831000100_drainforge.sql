create extension if not exists "pgcrypto";

create type public.user_role as enum ('resident', 'volunteer', 'authority', 'admin', 'super_admin');
create type public.report_category as enum ('blocked_drain', 'flooding', 'waste_plastic', 'rising_water', 'damaged_drainage', 'other');
create type public.report_severity as enum ('low', 'medium', 'high', 'critical');
create type public.report_status as enum ('received', 'under_review', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected', 'duplicate');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role public.user_role not null default 'resident',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.response_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  stakeholder_email text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.monitored_sites (
  id uuid primary key default gen_random_uuid(),
  site_code text not null unique,
  name text not null,
  area text not null,
  latitude double precision not null,
  longitude double precision not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  reporter_id uuid references public.profiles(id) on delete set null,
  site_id uuid references public.monitored_sites(id) on delete set null,
  category public.report_category not null,
  severity public.report_severity not null default 'medium',
  status public.report_status not null default 'received',
  description text check (char_length(description) <= 500),
  latitude double precision not null,
  longitude double precision not null,
  address text,
  location_accuracy double precision,
  assigned_team_id uuid references public.response_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  file_size integer,
  created_at timestamptz not null default now()
);

create table public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  from_status public.report_status,
  to_status public.report_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  channel text not null default 'in_app' check (channel in ('in_app', 'email')),
  subject text not null,
  body text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_priority_idx on public.reports(status, severity, created_at desc);
create index reports_location_idx on public.reports(latitude, longitude);
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.report_evidence enable row level security;
alter table public.notifications enable row level security;

create policy "Residents can read their own profile" on public.profiles for select using (auth.uid() = id);
create policy "Residents can read their own reports" on public.reports for select using (auth.uid() = reporter_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('authority','admin','super_admin')));
create policy "Authenticated users can submit reports" on public.reports for insert with check (auth.uid() = reporter_id or reporter_id is null);
create policy "Authorities can update reports" on public.reports for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('authority','admin','super_admin')));
create policy "Report owners and authorities can read evidence" on public.report_evidence for select using (exists (select 1 from public.reports r where r.id = report_id and (r.reporter_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('authority','admin','super_admin')))));
create policy "Users can read their notifications" on public.notifications for select using (recipient_id = auth.uid());

insert into public.monitored_sites (site_code, name, area, latitude, longitude) values
  ('UY-03', 'University Road Channel', 'UNILAG', 6.5164, 3.3892),
  ('AK-01', 'Herbert Macaulay Culvert', 'Akoka', 6.5249, 3.3897),
  ('BR-07', 'Oluwalogbon Street', 'Bariga', 6.5384, 3.4041),
  ('IW-02', 'Iwaya Market Crossing', 'Iwaya', 6.5221, 3.3715),
  ('AK-05', 'Onike Junction Drain', 'Akoka', 6.5292, 3.3948)
on conflict (site_code) do nothing;
