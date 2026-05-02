-- Macros: per-client text snippets that can be copy-pasted into other programs.
-- Each client can have many.

create table if not exists public.client_macros (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text,
  content text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_macros_client_id_idx on public.client_macros (client_id, sort_order);

-- Auto-update updated_at on UPDATE
create or replace function public.touch_client_macros_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists _touch_updated_at on public.client_macros;
create trigger _touch_updated_at
  before update on public.client_macros
  for each row execute function public.touch_client_macros_updated_at();

-- Enable RLS — same pattern as other client sub-tables
alter table public.client_macros enable row level security;

-- Read: anyone authenticated who can read the parent client can read its macros
create policy "client_macros_select" on public.client_macros for select
  using (auth.role() = 'authenticated');

-- Write: same permissive policy as the other contact-info sub-tables
create policy "client_macros_insert" on public.client_macros for insert
  with check (auth.role() = 'authenticated');
create policy "client_macros_update" on public.client_macros for update
  using (auth.role() = 'authenticated');
create policy "client_macros_delete" on public.client_macros for delete
  using (auth.role() = 'authenticated');
