-- Drop AI-related columns from contracts (no Ask feature anymore).
DROP INDEX IF EXISTS idx_contracts_extracted_fts;
ALTER TABLE contracts
  DROP COLUMN IF EXISTS extracted_text,
  DROP COLUMN IF EXISTS extracted_at;

-- Drop credit_status from client_credits (Status column removed from UI).
ALTER TABLE client_credits DROP COLUMN IF EXISTS credit_status;

-- Drop unused picklist table.
DROP TABLE IF EXISTS list_credit_statuses;
