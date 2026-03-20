-- Add buyer_type column to people table
CREATE TYPE buyer_type AS ENUM ('Pod', 'Studio', 'Network', 'Streamer', 'Production Company', 'Other');

ALTER TABLE people ADD COLUMN buyer_type buyer_type NULL;

CREATE INDEX idx_people_buyer_type ON people (buyer_type) WHERE buyer_type IS NOT NULL;
