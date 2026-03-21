-- Junction table for multi-client materials (co-written material)
create table if not exists material_clients (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null default (current_setting('app.current_org_id')::uuid) references organizations(id) on delete cascade,
  material_id uuid not null references client_materials(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(material_id, client_id)
);

alter table material_clients enable row level security;

create policy "org_isolation" on material_clients
  using (org_id = current_setting('app.current_org_id')::uuid);

-- Migrate existing client_id data into the junction table
insert into material_clients (org_id, material_id, client_id)
select org_id, id, client_id from client_materials
where client_id is not null
on conflict do nothing;
