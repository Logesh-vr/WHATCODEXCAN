-- Explicit array types avoid implicit text-to-array cast warnings in plpgsql_check.
create or replace function faultline_private.valid_decision(d jsonb)
returns boolean language plpgsql immutable security invoker
set search_path = '' as $$
declare
  c jsonb; o jsonb; s jsonb; criterion_ids text[] := array[]::text[]; option_ids text[] := array[]::text[];
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

