-- Rate limit for the public POST /api/auth/send-reset route.
-- Every request is logged here; the route sends an email only while the
-- address has <= 3 and the client IP has <= 10 requests in the last 15 minutes.
-- Only the service role touches this table (RLS on, no policies).

create table if not exists public.password_reset_requests (
  id bigint generated always as identity primary key,
  email text not null,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_requests_email
  on public.password_reset_requests (email, created_at);
create index if not exists password_reset_requests_ip
  on public.password_reset_requests (ip, created_at);

alter table public.password_reset_requests enable row level security;

-- Logs the request, drops rows older than a day, and returns whether this
-- request is still within both limits.
create or replace function public.password_reset_allowed(p_email text, p_ip text)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  email_count int;
  ip_count int;
begin
  delete from password_reset_requests where created_at < now() - interval '1 day';
  insert into password_reset_requests (email, ip) values (p_email, p_ip);

  select count(*) into email_count from password_reset_requests
    where email = p_email and created_at > now() - interval '15 minutes';
  select count(*) into ip_count from password_reset_requests
    where ip = p_ip and created_at > now() - interval '15 minutes';

  return email_count <= 3 and ip_count <= 10;
end;
$$;

revoke execute on function public.password_reset_allowed(text, text) from public, anon, authenticated;
grant execute on function public.password_reset_allowed(text, text) to service_role;
