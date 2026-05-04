-- Drop direction (a submission concept, not a property of the work itself).
-- Drop is_client_material — every row in client_materials is now by definition client material.

alter table public.client_materials drop column if exists direction;
alter table public.client_materials drop column if exists is_client_material;
