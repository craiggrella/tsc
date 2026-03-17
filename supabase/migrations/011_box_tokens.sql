-- Store Box OAuth tokens in Supabase so they work on Vercel
-- Single-row table (id=1 always)
CREATE TABLE IF NOT EXISTS box_tokens (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
