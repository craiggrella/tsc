-- Add status, start_year, end_year to client_credits; rename year to start_year
ALTER TABLE client_credits ADD COLUMN IF NOT EXISTS credit_status text;
ALTER TABLE client_credits ADD COLUMN IF NOT EXISTS start_year integer;
ALTER TABLE client_credits ADD COLUMN IF NOT EXISTS end_year integer;

-- Migrate existing year data to start_year
UPDATE client_credits SET start_year = year WHERE year IS NOT NULL AND start_year IS NULL;
