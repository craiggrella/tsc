-- Rollback migration 004: remove folders table, files bucket, and related columns

-- Clean up synced data first
delete from file_attachments where bucket = 'files';

-- Drop columns added in 004
alter table file_attachments drop column if exists folder_id;
alter table file_attachments drop column if exists box_file_id;

-- Drop folders table (cascade drops indexes and policies)
drop table if exists folders cascade;

-- Remove files bucket storage policies
drop policy if exists "Org members can upload to files bucket" on storage.objects;
drop policy if exists "Org members can view files bucket" on storage.objects;
drop policy if exists "Org members can update files bucket" on storage.objects;
drop policy if exists "Org members can delete from files bucket" on storage.objects;

-- Remove files bucket (and its contents)
delete from storage.objects where bucket_id = 'files';
delete from storage.buckets where id = 'files';

-- Add box_file_id to file_attachments for Box file references
alter table file_attachments add column if not exists box_file_id text;
alter table file_attachments add column if not exists box_url text;
