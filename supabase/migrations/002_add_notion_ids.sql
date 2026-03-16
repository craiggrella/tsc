-- Add notion_id columns for Notion→Supabase import mapping
-- These are the Notion page UUIDs used to resolve relations

alter table companies add column notion_id text unique;
alter table people add column notion_id text unique;
alter table clients add column notion_id text unique;
alter table projects add column notion_id text unique;
alter table calls add column notion_id text unique;
alter table submissions add column notion_id text unique;
alter table meetings add column notion_id text unique;
alter table client_materials add column notion_id text unique;
alter table contracts add column notion_id text unique;
alter table client_credits add column notion_id text unique;

-- Add genre/sub_genre to projects (discovered in Notion schema)
alter table projects add column genre text;
alter table projects add column sub_genre text;

-- Submission also has "External Submission" people relation —
-- we already have submission_people join table which handles this

create index idx_companies_notion on companies(notion_id);
create index idx_people_notion on people(notion_id);
create index idx_clients_notion on clients(notion_id);
create index idx_projects_notion on projects(notion_id);
create index idx_calls_notion on calls(notion_id);
create index idx_submissions_notion on submissions(notion_id);
create index idx_meetings_notion on meetings(notion_id);
create index idx_client_materials_notion on client_materials(notion_id);
create index idx_contracts_notion on contracts(notion_id);
create index idx_client_credits_notion on client_credits(notion_id);
