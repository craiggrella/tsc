-- Field-level undo log: captures the OLD row before every UPDATE on the
-- main entity tables so users can undo accidental edits within 48 hours.

create table if not exists public.field_undo_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  snapshot jsonb not null,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists field_undo_log_lookup
  on public.field_undo_log (table_name, record_id, changed_at desc);

create or replace function public.log_field_undo()
returns trigger language plpgsql security definer as $$
begin
  insert into public.field_undo_log (table_name, record_id, snapshot, changed_by)
  values (TG_TABLE_NAME, OLD.id, to_jsonb(OLD), auth.uid());
  return NEW;
end;
$$;

drop trigger if exists _undo on public.people;        create trigger _undo before update on public.people        for each row execute function public.log_field_undo();
drop trigger if exists _undo on public.companies;     create trigger _undo before update on public.companies     for each row execute function public.log_field_undo();
drop trigger if exists _undo on public.clients;       create trigger _undo before update on public.clients       for each row execute function public.log_field_undo();
drop trigger if exists _undo on public.projects;      create trigger _undo before update on public.projects      for each row execute function public.log_field_undo();
drop trigger if exists _undo on public.meetings;      create trigger _undo before update on public.meetings      for each row execute function public.log_field_undo();
drop trigger if exists _undo on public.submissions;   create trigger _undo before update on public.submissions   for each row execute function public.log_field_undo();
drop trigger if exists _undo on public.client_materials; create trigger _undo before update on public.client_materials for each row execute function public.log_field_undo();
drop trigger if exists _undo on public.profiles;      create trigger _undo before update on public.profiles      for each row execute function public.log_field_undo();

create or replace function public.restore_field_undo(p_table text, p_id uuid)
returns jsonb language plpgsql security definer as $$
declare
  prev jsonb;
begin
  select snapshot into prev
  from public.field_undo_log
  where table_name = p_table and record_id = p_id
  order by changed_at desc limit 1;
  return prev;
end;
$$;

create or replace function public.purge_field_undo_log()
returns void language sql security definer as $$
  delete from public.field_undo_log where changed_at < now() - interval '48 hours';
$$;

-- Allow authenticated users to call the restore function for their own undo
grant execute on function public.restore_field_undo(text, uuid) to authenticated;
