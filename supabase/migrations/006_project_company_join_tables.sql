-- Convert projects from single network_id/studio_id FKs to many-to-many join tables

-- Network join table
create table project_networks (
  project_id uuid not null references projects(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (project_id, company_id)
);

-- Studio join table
create table project_studios (
  project_id uuid not null references projects(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (project_id, company_id)
);

-- Migrate existing data
insert into project_networks (project_id, company_id)
select id, network_id from projects where network_id is not null;

insert into project_studios (project_id, company_id)
select id, studio_id from projects where studio_id is not null;

-- Drop old columns
alter table projects drop column network_id;
alter table projects drop column studio_id;

-- RLS policies
alter table project_networks enable row level security;
alter table project_studios enable row level security;

create policy "org_access" on project_networks for all
  using (project_id in (select id from projects where org_id = auth.uid()));
create policy "org_access" on project_studios for all
  using (project_id in (select id from projects where org_id = auth.uid()));
create policy "org_access" on project_production_companies for all
  using (project_id in (select id from projects where org_id = auth.uid()));
create policy "org_access" on project_people for all
  using (project_id in (select id from projects where org_id = auth.uid()));
