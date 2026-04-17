create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'technician')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chapels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  region text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  chapel_id uuid not null references public.chapels (id) on delete restrict,
  subject text not null,
  description text not null,
  status text not null check (status in ('overdue', 'due_soon', 'on_track', 'completed')),
  due_date date not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_order_images (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders (id) on delete cascade,
  file_url text not null,
  storage_path text,
  alt_text text,
  is_cover boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.service_order_metadata (
  service_order_ref text primary key,
  workflow_status text not null check (workflow_status in ('pending', 'in_progress', 'in_review', 'completed')),
  previous_workflow_status text check (previous_workflow_status in ('pending', 'in_progress', 'in_review', 'completed')),
  reviewed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  updated_by uuid references public.profiles (id)
);

create table if not exists public.service_order_attachments (
  id uuid primary key default gen_random_uuid(),
  service_order_ref text not null,
  file_url text not null,
  storage_path text,
  alt_text text,
  is_cover boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  created_by uuid references public.profiles (id)
);

create table if not exists public.service_order_status_events (
  id uuid primary key default gen_random_uuid(),
  service_order_ref text not null,
  actor_name text not null,
  actor_role text not null check (actor_role in ('admin', 'technician')),
  description text not null,
  note text,
  from_status text check (from_status in ('pending', 'in_progress', 'in_review', 'completed')),
  to_status text check (to_status in ('pending', 'in_progress', 'in_review', 'completed')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_service_orders_chapel on public.service_orders (chapel_id);
create index if not exists idx_service_orders_due_date on public.service_orders (due_date);
create index if not exists idx_service_orders_status on public.service_orders (status);
create index if not exists idx_service_order_attachments_ref on public.service_order_attachments (service_order_ref);
create index if not exists idx_service_order_events_ref on public.service_order_status_events (service_order_ref);

alter table public.profiles enable row level security;
alter table public.chapels enable row level security;
alter table public.service_orders enable row level security;
alter table public.service_order_images enable row level security;
alter table public.service_order_metadata enable row level security;
alter table public.service_order_attachments enable row level security;
alter table public.service_order_status_events enable row level security;

create policy "authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "authenticated users can read chapels"
on public.chapels
for select
to authenticated
using (true);

create policy "authenticated users can read service orders"
on public.service_orders
for select
to authenticated
using (true);

create policy "authenticated users can read service order images"
on public.service_order_images
for select
to authenticated
using (true);

create policy "authenticated users can read service order metadata"
on public.service_order_metadata
for select
to authenticated
using (true);

create policy "authenticated users can read service order attachments"
on public.service_order_attachments
for select
to authenticated
using (true);

create policy "authenticated users can read service order events"
on public.service_order_status_events
for select
to authenticated
using (true);

create policy "admins manage chapels"
on public.chapels
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admins manage service orders"
on public.service_orders
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admins manage service order images"
on public.service_order_images
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admins manage service order metadata"
on public.service_order_metadata
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admins manage service order attachments"
on public.service_order_attachments
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "admins manage service order events"
on public.service_order_status_events
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
