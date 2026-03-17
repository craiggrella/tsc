-- Flexible phone/email/address sub-records for people and clients
-- Replaces fixed phone_cell, phone_office, etc. columns with one-to-many tables

-- ─── contact_phones ───────────────────────────────────
CREATE TABLE contact_phones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL DEFAULT auth.user_org_id(),
  entity_type text NOT NULL CHECK (entity_type IN ('person', 'client')),
  entity_id uuid NOT NULL,
  designation text NOT NULL CHECK (designation IN ('Cell', 'Office', 'Home', 'Assistant', 'Fax', 'Other')),
  number text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_phones_entity ON contact_phones (entity_type, entity_id);
ALTER TABLE contact_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_phones_org" ON contact_phones
  USING (org_id = auth.user_org_id())
  WITH CHECK (org_id = auth.user_org_id());

-- ─── contact_emails ───────────────────────────────────
CREATE TABLE contact_emails (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL DEFAULT auth.user_org_id(),
  entity_type text NOT NULL CHECK (entity_type IN ('person', 'client')),
  entity_id uuid NOT NULL,
  designation text NOT NULL CHECK (designation IN ('Work', 'Personal', 'Assistant', 'Other')),
  address text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_emails_entity ON contact_emails (entity_type, entity_id);
ALTER TABLE contact_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_emails_org" ON contact_emails
  USING (org_id = auth.user_org_id())
  WITH CHECK (org_id = auth.user_org_id());

-- ─── contact_addresses ────────────────────────────────
CREATE TABLE contact_addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL DEFAULT auth.user_org_id(),
  entity_type text NOT NULL CHECK (entity_type IN ('person', 'client')),
  entity_id uuid NOT NULL,
  designation text NOT NULL CHECK (designation IN ('Office', 'Home', 'Mailing', 'Other')),
  street text,
  city text,
  state text,
  zip text,
  country text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_addresses_entity ON contact_addresses (entity_type, entity_id);
ALTER TABLE contact_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_addresses_org" ON contact_addresses
  USING (org_id = auth.user_org_id())
  WITH CHECK (org_id = auth.user_org_id());

-- ─── Migrate people phone data ───────────────────────
INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'person', id, 'Cell', phone_cell, (preferred_phone = 'cell')
FROM people WHERE phone_cell IS NOT NULL;

INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'person', id, 'Office', phone_office, (preferred_phone = 'office')
FROM people WHERE phone_office IS NOT NULL;

INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'person', id, 'Home', phone_home, (preferred_phone = 'home')
FROM people WHERE phone_home IS NOT NULL;

INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'person', id, 'Other', phone_other, (preferred_phone = 'other')
FROM people WHERE phone_other IS NOT NULL;

-- ─── Migrate people email data ───────────────────────
INSERT INTO contact_emails (org_id, entity_type, entity_id, designation, address, is_primary)
SELECT org_id, 'person', id, 'Work', email_office, (preferred_email = 'office')
FROM people WHERE email_office IS NOT NULL;

INSERT INTO contact_emails (org_id, entity_type, entity_id, designation, address, is_primary)
SELECT org_id, 'person', id, 'Personal', email_home, (preferred_email = 'home')
FROM people WHERE email_home IS NOT NULL;

INSERT INTO contact_emails (org_id, entity_type, entity_id, designation, address, is_primary)
SELECT org_id, 'person', id, 'Other', email_other, (preferred_email = 'other')
FROM people WHERE email_other IS NOT NULL;

-- ─── Migrate client phone data ───────────────────────
INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'client', id, 'Cell', phone_cell, (preferred_phone = 'cell')
FROM clients WHERE phone_cell IS NOT NULL;

INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'client', id, 'Office', phone_office, (preferred_phone = 'office')
FROM clients WHERE phone_office IS NOT NULL;

INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'client', id, 'Home', phone_home, (preferred_phone = 'home')
FROM clients WHERE phone_home IS NOT NULL;

INSERT INTO contact_phones (org_id, entity_type, entity_id, designation, number, is_primary)
SELECT org_id, 'client', id, 'Other', phone_other, (preferred_phone = 'other')
FROM clients WHERE phone_other IS NOT NULL;

-- ─── Migrate client email data ───────────────────────
INSERT INTO contact_emails (org_id, entity_type, entity_id, designation, address, is_primary)
SELECT org_id, 'client', id, 'Work', email_office, (preferred_email = 'office')
FROM clients WHERE email_office IS NOT NULL;

INSERT INTO contact_emails (org_id, entity_type, entity_id, designation, address, is_primary)
SELECT org_id, 'client', id, 'Personal', email_home, (preferred_email = 'home')
FROM clients WHERE email_home IS NOT NULL;

INSERT INTO contact_emails (org_id, entity_type, entity_id, designation, address, is_primary)
SELECT org_id, 'client', id, 'Other', email_other, false
FROM clients WHERE email_other IS NOT NULL;

-- ─── Update calls.preferred_phone to store phone record UUID ──
-- Change column type from text to uuid-compatible text (stores phone record id)
-- First map existing values to the matching phone record
UPDATE calls SET preferred_phone = cp.id::text
FROM contact_phones cp
WHERE calls.contact_id IS NOT NULL
  AND cp.entity_type = 'person'
  AND cp.entity_id = calls.contact_id
  AND cp.designation = CASE calls.preferred_phone
    WHEN 'cell' THEN 'Cell'
    WHEN 'office' THEN 'Office'
    WHEN 'home' THEN 'Home'
    WHEN 'other' THEN 'Other'
  END;

-- ─── Drop old columns from people ─────────────────────
ALTER TABLE people DROP COLUMN IF EXISTS phone_cell;
ALTER TABLE people DROP COLUMN IF EXISTS phone_office;
ALTER TABLE people DROP COLUMN IF EXISTS phone_home;
ALTER TABLE people DROP COLUMN IF EXISTS phone_other;
ALTER TABLE people DROP COLUMN IF EXISTS preferred_phone;
ALTER TABLE people DROP COLUMN IF EXISTS email_office;
ALTER TABLE people DROP COLUMN IF EXISTS email_home;
ALTER TABLE people DROP COLUMN IF EXISTS email_other;
ALTER TABLE people DROP COLUMN IF EXISTS preferred_email;

-- ─── Drop old columns from clients ────────────────────
ALTER TABLE clients DROP COLUMN IF EXISTS phone_cell;
ALTER TABLE clients DROP COLUMN IF EXISTS phone_office;
ALTER TABLE clients DROP COLUMN IF EXISTS phone_home;
ALTER TABLE clients DROP COLUMN IF EXISTS phone_other;
ALTER TABLE clients DROP COLUMN IF EXISTS preferred_phone;
ALTER TABLE clients DROP COLUMN IF EXISTS email_office;
ALTER TABLE clients DROP COLUMN IF EXISTS email_home;
ALTER TABLE clients DROP COLUMN IF EXISTS preferred_email;

-- ─── contact_socials ──────────────────────────────────
CREATE TABLE contact_socials (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL DEFAULT auth.user_org_id(),
  entity_type text NOT NULL CHECK (entity_type IN ('person', 'client')),
  entity_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('Facebook', 'Instagram', 'YouTube', 'LinkedIn', 'Twitter/X', 'TikTok', 'IMDb', 'Website', 'Other')),
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_contact_socials_entity ON contact_socials (entity_type, entity_id);
ALTER TABLE contact_socials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contact_socials_org" ON contact_socials
  USING (org_id = auth.user_org_id())
  WITH CHECK (org_id = auth.user_org_id());

-- Migrate existing social data from people
INSERT INTO contact_socials (org_id, entity_type, entity_id, platform, url)
SELECT org_id, 'person', id, 'Website', website FROM people WHERE website IS NOT NULL AND website != '';
INSERT INTO contact_socials (org_id, entity_type, entity_id, platform, url)
SELECT org_id, 'person', id, 'LinkedIn', linkedin FROM people WHERE linkedin IS NOT NULL AND linkedin != '';
INSERT INTO contact_socials (org_id, entity_type, entity_id, platform, url)
SELECT org_id, 'person', id, 'Instagram', instagram FROM people WHERE instagram IS NOT NULL AND instagram != '';

ALTER TABLE people DROP COLUMN IF EXISTS website;
ALTER TABLE people DROP COLUMN IF EXISTS linkedin;
ALTER TABLE people DROP COLUMN IF EXISTS instagram;
