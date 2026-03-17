-- Materials: add new fields, make client_id nullable
ALTER TABLE client_materials ADD COLUMN IF NOT EXISTS box_file_id text;
ALTER TABLE client_materials ADD COLUMN IF NOT EXISTS is_client_material boolean NOT NULL DEFAULT false;
ALTER TABLE client_materials ADD COLUMN IF NOT EXISTS material_type text DEFAULT 'Script';
ALTER TABLE client_materials ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT 'Outgoing';
ALTER TABLE client_materials ALTER COLUMN client_id DROP NOT NULL;

-- Set existing materials as client materials
UPDATE client_materials SET is_client_material = true WHERE client_id IS NOT NULL;

-- Material responses: one response per person per material
CREATE TABLE IF NOT EXISTS material_responses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL DEFAULT auth.user_org_id(),
  material_id uuid NOT NULL REFERENCES client_materials(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  response text CHECK (response IN ('love', 'like', 'meh', 'hate')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(material_id, person_id)
);
CREATE INDEX IF NOT EXISTS idx_material_responses_material ON material_responses (material_id);
CREATE INDEX IF NOT EXISTS idx_material_responses_person ON material_responses (person_id);
ALTER TABLE material_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "material_responses_org" ON material_responses
  USING (org_id = auth.user_org_id())
  WITH CHECK (org_id = auth.user_org_id());
