-- Folders table — virtual folder hierarchy for file manager
create table folders (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  parent_id uuid references folders(id) on delete cascade,
  box_folder_id text,  -- for Box import mapping
  created_at timestamptz not null default now()
);

create index idx_folders_org on folders(org_id);
create index idx_folders_parent on folders(parent_id);
create unique index idx_folders_box_id on folders(box_folder_id) where box_folder_id is not null;

-- RLS
alter table folders enable row level security;

create policy "Org members can view folders"
  on folders for select using (org_id = auth.user_org_id());
create policy "Org members can insert folders"
  on folders for insert with check (org_id = auth.user_org_id());
create policy "Org members can update folders"
  on folders for update using (org_id = auth.user_org_id());
create policy "Org members can delete folders"
  on folders for delete using (org_id = auth.user_org_id());

-- Add folder_id to file_attachments
alter table file_attachments add column folder_id uuid references folders(id) on delete set null;
create index idx_file_attachments_folder on file_attachments(folder_id);

-- Add box_file_id to file_attachments for import dedup
alter table file_attachments add column box_file_id text;
create unique index idx_file_attachments_box_id on file_attachments(box_file_id) where box_file_id is not null;

-- Create 'files' storage bucket for the general file library
insert into storage.buckets (id, name, public) values ('files', 'files', false);

-- Storage policies for files bucket
create policy "Org members can upload to files bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'files');

create policy "Org members can view files bucket"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'files');

create policy "Org members can update files bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'files');

create policy "Org members can delete from files bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'files');
