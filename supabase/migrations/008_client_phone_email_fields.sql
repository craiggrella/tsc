-- Add phone/email fields to clients matching the people table structure

ALTER TABLE clients ADD COLUMN phone_cell text;
ALTER TABLE clients ADD COLUMN phone_office text;
ALTER TABLE clients ADD COLUMN phone_home text;
ALTER TABLE clients ADD COLUMN phone_other text;
ALTER TABLE clients ADD COLUMN preferred_phone text;
ALTER TABLE clients ADD COLUMN email_office text;
ALTER TABLE clients ADD COLUMN email_home text;
ALTER TABLE clients ADD COLUMN preferred_email text;

-- Migrate existing data
UPDATE clients SET phone_office = phone WHERE phone IS NOT NULL;
UPDATE clients SET email_office = email WHERE email IS NOT NULL;

-- Drop old columns
ALTER TABLE clients DROP COLUMN phone;
ALTER TABLE clients DROP COLUMN email;
