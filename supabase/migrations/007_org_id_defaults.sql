-- Set org_id default to auth.user_org_id() so inserts via the client
-- automatically get the correct org without passing it explicitly.

ALTER TABLE calls ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE client_credits ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE client_materials ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE clients ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE companies ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE contracts ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE file_attachments ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE meetings ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE people ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE projects ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
ALTER TABLE submissions ALTER COLUMN org_id SET DEFAULT auth.user_org_id();
