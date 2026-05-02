-- Add street2 and street3 lines to contact_addresses for multi-line street addresses
-- (suite, apartment, building, etc.)

alter table public.contact_addresses
  add column if not exists street2 text,
  add column if not exists street3 text;
