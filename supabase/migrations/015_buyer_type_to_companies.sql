-- Move buyer_type from people to companies. The company is the buyer; everyone
-- at that company inherits the designation. Backfill with the most common
-- buyer_type seen among each company's people.

alter table public.companies
  add column if not exists buyer_type text;

update public.companies c
set buyer_type = sub.buyer_type
from (
  select p.company_id, p.buyer_type
  from public.people p
  where p.company_id is not null and p.buyer_type is not null
  group by p.company_id, p.buyer_type
  having count(*) = (
    select max(cnt) from (
      select count(*) as cnt
      from public.people
      where company_id = p.company_id and buyer_type is not null
      group by buyer_type
    ) inner_max
  )
) sub
where sub.company_id = c.id
  and (c.buyer_type is null or c.buyer_type = '');

alter table public.people drop column if exists buyer_type;
