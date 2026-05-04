-- Each client has a primary Shuman staff manager (the person representing them).
-- References public.profiles (the team-member table).

alter table public.clients
  add column if not exists manager_id uuid references public.profiles(id) on delete set null;

create index if not exists clients_manager_id_idx on public.clients (manager_id);
