ALTER TABLE projects
  ADD COLUMN imdb_id TEXT,
  ADD COLUMN poster_url TEXT,
  ADD COLUMN poster_fetched_at TIMESTAMPTZ;
