-- Fix: catalog_config_valid accepted configs with missing keys (a missing key made
-- jsonb_typeof() null, and `if null` doesn't reject). Every check is now null-safe.
-- Existing rows are unaffected (all seeded configs are complete).
create or replace function public.catalog_config_valid(c jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  n int;
  lv jsonb;
  content jsonb;
  has_prayer boolean;
  has_reading boolean;
  k text;
  lvl_ref text;
begin
  if c is null or jsonb_typeof(c) <> 'object' then return false; end if;
  if coalesce(c->>'reader', '') not in ('prayer', 'reading') then return false; end if;
  if coalesce(c->>'numbering', '') not in ('nested', 'running', 'none') then return false; end if;
  if coalesce(c->>'schedule', '') not in ('fixed', 'dated') then return false; end if;

  if coalesce(jsonb_typeof(c->'levels'), '') <> 'array' then return false; end if;
  n := jsonb_array_length(c->'levels');
  if n < 1 or n > 3 then return false; end if;
  for lv in select * from jsonb_array_elements(c->'levels') loop
    if coalesce(jsonb_typeof(lv), '') <> 'object' or coalesce(jsonb_typeof(lv->'name'), '') <> 'string'
       or btrim(coalesce(lv->>'name', '')) = '' or coalesce(jsonb_typeof(lv->'show_titles'), '') <> 'boolean' then
      return false;
    end if;
  end loop;

  content := c->'content';
  if coalesce(jsonb_typeof(content), '') <> 'array' or jsonb_array_length(content) = 0
     or not content <@ '["prayer","reading","names","foundation","embed"]'::jsonb then
    return false;
  end if;
  has_prayer := content ? 'prayer';
  has_reading := content ? 'reading';

  -- check_on: item | none | level-N within the book's levels; item needs prayers.
  lvl_ref := coalesce(c->>'check_on', '');
  if lvl_ref = 'item' then
    if not has_prayer then return false; end if;
  elsif lvl_ref <> 'none' then
    if lvl_ref !~ '^level-[1-3]$' or substr(lvl_ref, 7)::int > n then return false; end if;
  end if;

  lvl_ref := coalesce(c->>'actions_on', '');
  if lvl_ref !~ '^level-[1-3]$' or substr(lvl_ref, 7)::int > n then return false; end if;

  if c->>'reader' = 'prayer' and not has_prayer then return false; end if;
  if c->>'reader' = 'reading' and not has_reading then return false; end if;
  if c->>'schedule' = 'dated' and n <> 1 then return false; end if;

  if coalesce(jsonb_typeof(c->'features'), '') <> 'object' then return false; end if;
  for k in select jsonb_object_keys(c->'features') loop
    if k not in ('focus', 'listen', 'plans', 'scripture', 'verse_popups', 'notes', 'pen', 'search', 'share', 'journal')
       or coalesce(jsonb_typeof(c->'features'->k), '') <> 'boolean' then
      return false;
    end if;
  end loop;
  if (coalesce((c->'features'->>'focus')::boolean, false) or coalesce((c->'features'->>'listen')::boolean, false))
     and not (has_prayer or has_reading) then
    return false;
  end if;

  return true;
end $$;
