-- PolyTrick
-- Eseguire questo SQL nel SQL Editor di Supabase.
-- Poi creare gli utenti del team da Authentication > Users.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  location text,
  start_time time,
  end_time time,
  status text not null default 'definitivo',
  room_status text not null default 'non_riservata',
  reserved_room text,
  room_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  event_id uuid references public.events(id) on delete set null,
  status text not null default 'da_contattare',
  contacted_by text,
  contacted_at date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  event_ids uuid[] default '{}',
  status text not null default 'trattativa',
  contacted_by text,
  contacted_at date,
  offer text,
  pickup_status text not null default 'da_fare',
  asks text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_id uuid references public.events(id) on delete set null,
  assignee text,
  due_date date,
  priority text not null default 'media',
  status text not null default 'da_fare',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_people (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person text not null,
  role text,
  arrival time,
  departure time,
  created_at timestamptz not null default now()
);

-- RLS: solo utenti autenticati.
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.sponsors enable row level security;
alter table public.tasks enable row level security;
alter table public.event_people enable row level security;

drop policy if exists "authenticated can read events" on public.events;
drop policy if exists "authenticated can write events" on public.events;
create policy "authenticated can read events" on public.events for select to authenticated using (true);
create policy "authenticated can write events" on public.events for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can read guests" on public.guests;
drop policy if exists "authenticated can write guests" on public.guests;
create policy "authenticated can read guests" on public.guests for select to authenticated using (true);
create policy "authenticated can write guests" on public.guests for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can read sponsors" on public.sponsors;
drop policy if exists "authenticated can write sponsors" on public.sponsors;
create policy "authenticated can read sponsors" on public.sponsors for select to authenticated using (true);
create policy "authenticated can write sponsors" on public.sponsors for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can read tasks" on public.tasks;
drop policy if exists "authenticated can write tasks" on public.tasks;
create policy "authenticated can read tasks" on public.tasks for select to authenticated using (true);
create policy "authenticated can write tasks" on public.tasks for all to authenticated using (true) with check (true);

drop policy if exists "authenticated can read event_people" on public.event_people;
drop policy if exists "authenticated can write event_people" on public.event_people;
create policy "authenticated can read event_people" on public.event_people for select to authenticated using (true);
create policy "authenticated can write event_people" on public.event_people for all to authenticated using (true) with check (true);

-- Realtime: aggiunge le tabelle al publication se non ci sono già.
do $$
begin
  begin
    alter publication supabase_realtime add table public.events;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.guests;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.sponsors;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.event_people;
  exception when duplicate_object then null;
  end;
end $$;
