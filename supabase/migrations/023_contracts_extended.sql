-- Extend contracts table with per-row fields for the client Contracts tab
-- and storage for Box-extracted text (powers full-text search + AI Q&A).

ALTER TABLE contracts
  ADD COLUMN client_id uuid REFERENCES clients(id) ON DELETE CASCADE,
  ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  ADD COLUMN staff_level text,
  ADD COLUMN status text,
  ADD COLUMN start_date date,
  ADD COLUMN end_date date,
  ADD COLUMN box_file_id text,
  ADD COLUMN extracted_text text,
  ADD COLUMN extracted_at timestamptz;

CREATE INDEX idx_contracts_client ON contracts(client_id);
CREATE INDEX idx_contracts_project ON contracts(project_id);
-- Postgres FTS index on extracted text for fast keyword search.
CREATE INDEX idx_contracts_extracted_fts ON contracts
  USING gin(to_tsvector('english', coalesce(extracted_text, '')));

-- Picklist for contract status. Mirrors the list_project_statuses table shape.
CREATE TABLE list_contract_statuses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, value)
);

-- Seed default statuses for the existing org.
INSERT INTO list_contract_statuses (org_id, value, label, sort_order)
SELECT id, v.value, v.label, v.sort_order
FROM organizations,
  (VALUES
    ('active', 'Active', 0),
    ('in_negotiation', 'In Negotiation', 1),
    ('pending_signature', 'Pending Signature', 2),
    ('pending_renewal', 'Pending Renewal', 3),
    ('expired', 'Expired', 4),
    ('terminated', 'Terminated', 5)
  ) AS v(value, label, sort_order);
