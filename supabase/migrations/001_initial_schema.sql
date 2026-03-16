-- TSC - The Shuman Company CRM Schema
-- Aligned to Notion HQ 1.3 database structure
-- Multi-tenant talent management database

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- CORE ENTITIES
-- ============================================

-- Organizations (multi-tenant root)
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null default 'manager' check (role in ('admin', 'manager', 'assistant')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Companies (studios, networks, production companies, agencies, etc.)
-- One company can serve multiple roles (studio AND network)
create table companies (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  types text[] default '{}',            -- multi-select: studio, network, production_company, agency, management, law_firm, distributor, guild, publisher, publicity, theatre, financer, hedge_fund, business_management, financial_consultant, news, video_game_publisher
  outlet text[] default '{}',           -- multi-select: broadcast, cable, digital, independent, major, pod
  department text[] default '{}',       -- multi-select: IP, TV, Digital, MP
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- People (all industry contacts — executives, assistants, casting directors, etc.)
-- The people you call and put on a call sheet
create table people (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  first_name text,
  last_name text,
  title text,                           -- job title
  type text check (type in ('contact', 'potential_client', 'vendor', 'assistant', 'executive')),
  exec_level text check (exec_level in ('intern', 'assistant', 'coordinator', 'manager', 'director', 'vice_president', 'senior_vice_president', 'executive_vice_president', 'president', 'chair')),
  company_id uuid references companies(id) on delete set null,
  department text[],                    -- multi-select
  -- Multiple phones with preferred selector
  phone_cell text,
  phone_office text,
  phone_home text,
  phone_other text,
  preferred_phone text check (preferred_phone in ('cell', 'office', 'home', 'other')),
  -- Multiple emails with preferred selector
  email_office text,
  email_home text,
  email_other text,
  preferred_email text check (preferred_email in ('office', 'home', 'other')),
  -- Social/web
  website text,
  linkedin text,
  instagram text,
  -- Assistant relationship (self-referential)
  assistant_id uuid references people(id) on delete set null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Clients (talent represented by TSC)
create table clients (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  full_name text not null,
  first_name text,
  last_name text,
  email text,
  phone text,
  company_id uuid references companies(id) on delete set null,
  staff_level text,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Projects (TV shows, films, etc.)
create table projects (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  status text not null default 'development' check (status in ('rumored', 'development', 'pilot', 'picked_up', 'current', 'on_the_bubble', 'completed', 'cancelled')),
  network_id uuid references companies(id) on delete set null,
  studio_id uuid references companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- ACTIVITY ENTITIES
-- ============================================

-- Calls (call log entries)
create table calls (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  about text not null,                  -- subject of the call
  contact_id uuid references people(id) on delete set null,   -- who to call / who called
  client_id uuid references clients(id) on delete set null,   -- regarding which client
  user_id uuid not null references profiles(id),              -- for/by which staff member
  call_status text not null default 'to_call' check (call_status in ('to_call', 'incoming', 'left_word', 'returning', 'connected')),
  priority text check (priority in ('high', 'medium', 'low')),
  preferred_phone text check (preferred_phone in ('cell', 'office', 'home', 'other', 'custom')),
  phone_custom text,
  quick_connect boolean not null default false,
  log_time timestamptz,                 -- when call happened
  due_date timestamptz,                 -- when call needs to happen
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Submissions (client material going out to people, or incoming material to review)
create table submissions (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  description text not null,            -- submission description/title
  status text not null default 'need_to_send' check (status in ('need_to_send', 'sent', 'connected')),
  reason text[] default '{}',           -- multi-select: general, meeting, staffing, at_their_request, spec_script, development
  response text check (response in ('love', 'like', 'meh', 'hate')),
  responsible_user_id uuid references profiles(id),
  submission_date date,
  set_meeting boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Meetings (set by managers for clients with people)
create table meetings (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  meeting_status text not null default 'need_to_set' check (meeting_status in ('need_to_set', 'need_to_reschedule', 'scheduled', 'completed', 'cancelled')),
  meeting_at timestamptz,
  location_link text,                   -- address or Zoom link
  response text check (response in ('love', 'like', 'meh', 'hate')),
  responsible_user_id uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- ASSET ENTITIES
-- ============================================

-- Client Materials (scripts, reels, etc. — attached to submissions)
create table client_materials (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  client_id uuid not null references clients(id) on delete cascade,
  status text not null default 'not_yet_reviewed' check (status in ('not_yet_reviewed', 'in_review', 'coverage_available', 'notes_given', 'editing', 'final_draft')),
  format text,
  genre text,
  sub_genre text,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contracts (agreements tied to clients, companies, and projects)
create table contracts (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  contract_name text not null,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Client Credits (a client's credit on a project)
create table client_credits (
  id uuid primary key default uuid_generate_v4(),
  org_id uuid not null references organizations(id) on delete cascade,
  project_name text not null,
  project_id uuid references projects(id) on delete set null,
  client_id uuid not null references clients(id) on delete cascade,
  level text,                           -- e.g. "Series Regular", "Guest Star"
  year integer,
  created_at timestamptz not null default now()
);

-- ============================================
-- JOIN TABLES (many-to-many relationships)
-- ============================================

-- Project relationships
create table project_production_companies (
  project_id uuid not null references projects(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (project_id, company_id)
);

create table project_people (
  project_id uuid not null references projects(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (project_id, person_id)
);

-- Submission relationships
create table submission_clients (
  submission_id uuid not null references submissions(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key (submission_id, client_id)
);

create table submission_people (
  submission_id uuid not null references submissions(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (submission_id, person_id)
);

create table submission_projects (
  submission_id uuid not null references submissions(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (submission_id, project_id)
);

create table submission_materials (
  submission_id uuid not null references submissions(id) on delete cascade,
  material_id uuid not null references client_materials(id) on delete cascade,
  primary key (submission_id, material_id)
);

-- Meeting relationships
create table meeting_clients (
  meeting_id uuid not null references meetings(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key (meeting_id, client_id)
);

create table meeting_people (
  meeting_id uuid not null references meetings(id) on delete cascade,
  person_id uuid not null references people(id) on delete cascade,
  primary key (meeting_id, person_id)
);

create table meeting_projects (
  meeting_id uuid not null references meetings(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (meeting_id, project_id)
);

create table meeting_attendees (
  meeting_id uuid not null references meetings(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  primary key (meeting_id, profile_id)
);

-- Contract relationships
create table contract_clients (
  contract_id uuid not null references contracts(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key (contract_id, client_id)
);

create table contract_companies (
  contract_id uuid not null references contracts(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (contract_id, company_id)
);

create table contract_projects (
  contract_id uuid not null references contracts(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  primary key (contract_id, project_id)
);

-- People previous companies
create table people_previous_companies (
  person_id uuid not null references people(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (person_id, company_id)
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_profiles_org on profiles(org_id);
create index idx_companies_org on companies(org_id);
create index idx_people_org on people(org_id);
create index idx_people_company on people(company_id);
create index idx_people_last_name on people(org_id, last_name);
create index idx_clients_org on clients(org_id);
create index idx_clients_last_name on clients(org_id, last_name);
create index idx_projects_org on projects(org_id);
create index idx_projects_status on projects(org_id, status);
create index idx_calls_org on calls(org_id);
create index idx_calls_user on calls(user_id);
create index idx_calls_status on calls(org_id, call_status);
create index idx_calls_log_time on calls(org_id, log_time desc);
create index idx_submissions_org on submissions(org_id);
create index idx_submissions_status on submissions(org_id, status);
create index idx_submissions_date on submissions(org_id, submission_date desc);
create index idx_meetings_org on meetings(org_id);
create index idx_meetings_status on meetings(org_id, meeting_status);
create index idx_meetings_date on meetings(org_id, meeting_at);
create index idx_client_materials_org on client_materials(org_id);
create index idx_client_materials_client on client_materials(client_id);
create index idx_contracts_org on contracts(org_id);
create index idx_client_credits_org on client_credits(org_id);
create index idx_client_credits_client on client_credits(client_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table companies enable row level security;
alter table people enable row level security;
alter table clients enable row level security;
alter table projects enable row level security;
alter table calls enable row level security;
alter table submissions enable row level security;
alter table meetings enable row level security;
alter table client_materials enable row level security;
alter table contracts enable row level security;
alter table client_credits enable row level security;
alter table project_production_companies enable row level security;
alter table project_people enable row level security;
alter table submission_clients enable row level security;
alter table submission_people enable row level security;
alter table submission_projects enable row level security;
alter table submission_materials enable row level security;
alter table meeting_clients enable row level security;
alter table meeting_people enable row level security;
alter table meeting_projects enable row level security;
alter table meeting_attendees enable row level security;
alter table contract_clients enable row level security;
alter table contract_companies enable row level security;
alter table contract_projects enable row level security;
alter table people_previous_companies enable row level security;

-- Helper: get the current user's org_id
create or replace function auth.user_org_id()
returns uuid
language sql
stable
security definer
as $$
  select org_id from profiles where id = auth.uid()
$$;

-- Organizations: users can only see their own org
create policy "Users can view own org"
  on organizations for select
  using (id = auth.user_org_id());

-- Profiles: users can see others in their org
create policy "Users can view own org profiles"
  on profiles for select
  using (org_id = auth.user_org_id());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid());

-- Macro for org-scoped CRUD policies
-- Companies
create policy "Org members can view companies"
  on companies for select using (org_id = auth.user_org_id());
create policy "Org members can insert companies"
  on companies for insert with check (org_id = auth.user_org_id());
create policy "Org members can update companies"
  on companies for update using (org_id = auth.user_org_id());
create policy "Org members can delete companies"
  on companies for delete using (org_id = auth.user_org_id());

-- People
create policy "Org members can view people"
  on people for select using (org_id = auth.user_org_id());
create policy "Org members can insert people"
  on people for insert with check (org_id = auth.user_org_id());
create policy "Org members can update people"
  on people for update using (org_id = auth.user_org_id());
create policy "Org members can delete people"
  on people for delete using (org_id = auth.user_org_id());

-- Clients
create policy "Org members can view clients"
  on clients for select using (org_id = auth.user_org_id());
create policy "Org members can insert clients"
  on clients for insert with check (org_id = auth.user_org_id());
create policy "Org members can update clients"
  on clients for update using (org_id = auth.user_org_id());
create policy "Org members can delete clients"
  on clients for delete using (org_id = auth.user_org_id());

-- Projects
create policy "Org members can view projects"
  on projects for select using (org_id = auth.user_org_id());
create policy "Org members can insert projects"
  on projects for insert with check (org_id = auth.user_org_id());
create policy "Org members can update projects"
  on projects for update using (org_id = auth.user_org_id());
create policy "Org members can delete projects"
  on projects for delete using (org_id = auth.user_org_id());

-- Calls
create policy "Org members can view calls"
  on calls for select using (org_id = auth.user_org_id());
create policy "Org members can insert calls"
  on calls for insert with check (org_id = auth.user_org_id());
create policy "Org members can update calls"
  on calls for update using (org_id = auth.user_org_id());
create policy "Org members can delete calls"
  on calls for delete using (org_id = auth.user_org_id());

-- Submissions
create policy "Org members can view submissions"
  on submissions for select using (org_id = auth.user_org_id());
create policy "Org members can insert submissions"
  on submissions for insert with check (org_id = auth.user_org_id());
create policy "Org members can update submissions"
  on submissions for update using (org_id = auth.user_org_id());
create policy "Org members can delete submissions"
  on submissions for delete using (org_id = auth.user_org_id());

-- Meetings
create policy "Org members can view meetings"
  on meetings for select using (org_id = auth.user_org_id());
create policy "Org members can insert meetings"
  on meetings for insert with check (org_id = auth.user_org_id());
create policy "Org members can update meetings"
  on meetings for update using (org_id = auth.user_org_id());
create policy "Org members can delete meetings"
  on meetings for delete using (org_id = auth.user_org_id());

-- Client Materials
create policy "Org members can view client_materials"
  on client_materials for select using (org_id = auth.user_org_id());
create policy "Org members can insert client_materials"
  on client_materials for insert with check (org_id = auth.user_org_id());
create policy "Org members can update client_materials"
  on client_materials for update using (org_id = auth.user_org_id());
create policy "Org members can delete client_materials"
  on client_materials for delete using (org_id = auth.user_org_id());

-- Contracts
create policy "Org members can view contracts"
  on contracts for select using (org_id = auth.user_org_id());
create policy "Org members can insert contracts"
  on contracts for insert with check (org_id = auth.user_org_id());
create policy "Org members can update contracts"
  on contracts for update using (org_id = auth.user_org_id());
create policy "Org members can delete contracts"
  on contracts for delete using (org_id = auth.user_org_id());

-- Client Credits
create policy "Org members can view client_credits"
  on client_credits for select using (org_id = auth.user_org_id());
create policy "Org members can insert client_credits"
  on client_credits for insert with check (org_id = auth.user_org_id());
create policy "Org members can update client_credits"
  on client_credits for update using (org_id = auth.user_org_id());
create policy "Org members can delete client_credits"
  on client_credits for delete using (org_id = auth.user_org_id());

-- Join table policies (access controlled via parent table's org_id)
-- For join tables, we check that the user owns the parent record

-- Project join tables
create policy "Org access project_production_companies"
  on project_production_companies for all
  using (exists (select 1 from projects where id = project_id and org_id = auth.user_org_id()));

create policy "Org access project_people"
  on project_people for all
  using (exists (select 1 from projects where id = project_id and org_id = auth.user_org_id()));

-- Submission join tables
create policy "Org access submission_clients"
  on submission_clients for all
  using (exists (select 1 from submissions where id = submission_id and org_id = auth.user_org_id()));

create policy "Org access submission_people"
  on submission_people for all
  using (exists (select 1 from submissions where id = submission_id and org_id = auth.user_org_id()));

create policy "Org access submission_projects"
  on submission_projects for all
  using (exists (select 1 from submissions where id = submission_id and org_id = auth.user_org_id()));

create policy "Org access submission_materials"
  on submission_materials for all
  using (exists (select 1 from submissions where id = submission_id and org_id = auth.user_org_id()));

-- Meeting join tables
create policy "Org access meeting_clients"
  on meeting_clients for all
  using (exists (select 1 from meetings where id = meeting_id and org_id = auth.user_org_id()));

create policy "Org access meeting_people"
  on meeting_people for all
  using (exists (select 1 from meetings where id = meeting_id and org_id = auth.user_org_id()));

create policy "Org access meeting_projects"
  on meeting_projects for all
  using (exists (select 1 from meetings where id = meeting_id and org_id = auth.user_org_id()));

create policy "Org access meeting_attendees"
  on meeting_attendees for all
  using (exists (select 1 from meetings where id = meeting_id and org_id = auth.user_org_id()));

-- Contract join tables
create policy "Org access contract_clients"
  on contract_clients for all
  using (exists (select 1 from contracts where id = contract_id and org_id = auth.user_org_id()));

create policy "Org access contract_companies"
  on contract_companies for all
  using (exists (select 1 from contracts where id = contract_id and org_id = auth.user_org_id()));

create policy "Org access contract_projects"
  on contract_projects for all
  using (exists (select 1 from contracts where id = contract_id and org_id = auth.user_org_id()));

-- People previous companies
create policy "Org access people_previous_companies"
  on people_previous_companies for all
  using (exists (select 1 from people where id = person_id and org_id = auth.user_org_id()));
