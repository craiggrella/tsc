-- Allow multiple managers per client (Larry alone, or Steve+Steve together).
-- Replaces the single manager_id column with a many-to-many join table.

create table if not exists public.client_managers (
  client_id uuid not null references public.clients(id) on delete cascade,
  manager_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, manager_id)
);

create index if not exists client_managers_manager_idx on public.client_managers (manager_id);

alter table public.clients drop column if exists manager_id;

alter table public.client_managers enable row level security;
create policy "client_managers_select" on public.client_managers for select using (auth.role() = 'authenticated');
create policy "client_managers_insert" on public.client_managers for insert with check (auth.role() = 'authenticated');
create policy "client_managers_update" on public.client_managers for update using (auth.role() = 'authenticated');
create policy "client_managers_delete" on public.client_managers for delete using (auth.role() = 'authenticated');
