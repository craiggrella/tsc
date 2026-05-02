-- Add subject column to calls
alter table public.calls
  add column if not exists subject text;
