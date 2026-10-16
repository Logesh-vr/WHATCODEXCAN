-- Faultline v1. Apply through a Supabase migration, not as an unrestricted API query.
create schema if not exists faultline_private;
revoke all on schema faultline_private from public;
grant usage on schema faultline_private to authenticated;

create function faultline_private.valid_decision(d jsonb)
returns boolean language plpgsql immutable security invoker
set search_path = '' as $$
declare
  c jsonb; o jsonb; s jsonb; criterion_ids text[] := '{}'; option_ids text[] := '{}';
  k text; total_weight numeric := 0;
begin
  if d is null or jsonb_typeof(d) <> 'object' or octet_length(d::text) > 30000 then return false; end if;
  if not (d ?& array['schemaVersion','title','context','criteria','options','notes']) then return false; end if;
  if d->'schemaVersion' <> '1'::jsonb or jsonb_typeof(d->'title') <> 'string'
    or length(trim(d->>'title')) not between 1 and 100
    or jsonb_typeof(d->'context') <> 'string' or length(d->>'context') > 500
    or jsonb_typeof(d->'notes') <> 'string' or length(d->>'notes') > 3000
    or jsonb_typeof(d->'criteria') <> 'array' or jsonb_typeof(d->'options') <> 'array' then return false; end if;
  if jsonb_array_length(d->'criteria') not between 2 and 6 or jsonb_array_length(d->'options') not between 2 and 4 then return false; end if;
  for c in select value from jsonb_array_elements(d->'criteria') loop
    if jsonb_typeof(c) <> 'object' or not (c ?& array['id','name','weight']) then return false; end if;
    if jsonb_typeof(c->'id') <> 'string' or (c->>'id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or (c->>'id') = any(criterion_ids) or jsonb_typeof(c->'name') <> 'string' or length(trim(c->>'name')) not between 1 and 48
      or jsonb_typeof(c->'weight') <> 'number' then return false; end if;
    if (c->>'weight')::numeric not between 0 and 100 then return false; end if;
    total_weight := total_weight + (c->>'weight')::numeric;
    criterion_ids := array_append(criterion_ids, c->>'id');
  end loop;
  if total_weight <= 0 then return false; end if;
  for o in select value from jsonb_array_elements(d->'options') loop
    if jsonb_typeof(o) <> 'object' or not (o ?& array['id','name','scores']) then return false; end if;
    if jsonb_typeof(o->'id') <> 'string' or (o->>'id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or (o->>'id') = any(option_ids) or jsonb_typeof(o->'name') <> 'string' or length(trim(o->>'name')) not between 1 and 48
      or jsonb_typeof(o->'scores') <> 'object' then return false; end if;
    option_ids := array_append(option_ids, o->>'id');
    if (select count(*) from jsonb_object_keys(o->'scores')) <> cardinality(criterion_ids) then return false; end if;
    foreach k in array criterion_ids loop
      s := o->'scores'->k;
      if s is null or jsonb_typeof(s) <> 'object' or not (s ?& array['value','uncertain']) then return false; end if;
      if jsonb_typeof(s->'value') <> 'number' or jsonb_typeof(s->'uncertain') <> 'boolean' then return false; end if;
      if (s->>'value')::numeric not between 0 and 10 then return false; end if;
    end loop;
  end loop;
  return true;
exception when others then return false;
end;
$$;
revoke all on function faultline_private.valid_decision(jsonb) from public;
grant execute on function faultline_private.valid_decision(jsonb) to authenticated;

create table public.faultline_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  payload jsonb not null check (faultline_private.valid_decision(payload)),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faultline_decisions_owner_updated_idx on public.faultline_decisions(owner_id, updated_at desc);
alter table public.faultline_decisions enable row level security;
alter table public.faultline_decisions force row level security;
revoke all on public.faultline_decisions from anon, authenticated;
grant select, insert, delete on public.faultline_decisions to authenticated;
grant update(payload, revision) on public.faultline_decisions to authenticated;
create policy "Read own decisions" on public.faultline_decisions for select to authenticated using ((select auth.uid()) = owner_id);
create policy "Insert own decisions" on public.faultline_decisions for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "Update own decisions" on public.faultline_decisions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "Delete own decisions" on public.faultline_decisions for delete to authenticated using ((select auth.uid()) = owner_id);

create function faultline_private.touch_decision()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.revision <> old.revision + 1 then raise exception 'Revision must increase by exactly one' using errcode = '23514'; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function faultline_private.touch_decision() from public;
create trigger faultline_decision_updated before update on public.faultline_decisions for each row execute function faultline_private.touch_decision();
