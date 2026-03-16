-- File attachments table — links storage objects to any entity
create table file_attachments (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  file_name text not null,
  file_path text not null,              -- storage path: bucket/path/to/file
  bucket text not null,                 -- which storage bucket
  file_size bigint,
  mime_type text,
  category text check (category in ('script', 'contract', 'reel', 'headshot', 'bio', 'press', 'coverage', 'other')),
  -- Polymorphic parent — exactly one should be set
  client_id uuid references clients(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  contract_id uuid references contracts(id) on delete cascade,
  client_material_id uuid references client_materials(id) on delete cascade,
  submission_id uuid references submissions(id) on delete cascade,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_file_attachments_org on file_attachments(org_id);
create index idx_file_attachments_client on file_attachments(client_id);
create index idx_file_attachments_person on file_attachments(person_id);
create index idx_file_attachments_project on file_attachments(project_id);
create index idx_file_attachments_contract on file_attachments(contract_id);
create index idx_file_attachments_material on file_attachments(client_material_id);

-- RLS
alter table file_attachments enable row level security;

create policy "Org members can view file_attachments"
  on file_attachments for select using (org_id = auth.user_org_id());
create policy "Org members can insert file_attachments"
  on file_attachments for insert with check (org_id = auth.user_org_id());
create policy "Org members can update file_attachments"
  on file_attachments for update using (org_id = auth.user_org_id());
create policy "Org members can delete file_attachments"
  on file_attachments for delete using (org_id = auth.user_org_id());

-- Storage bucket policies (org-scoped via file path convention: {org_id}/...)
-- All authenticated users in the org can read/write their org's files

create policy "Org members can upload files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('client-materials', 'contracts', 'attachments')
  );

create policy "Org members can view files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id in ('client-materials', 'contracts', 'attachments')
  );

create policy "Org members can delete files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('client-materials', 'contracts', 'attachments')
  );
