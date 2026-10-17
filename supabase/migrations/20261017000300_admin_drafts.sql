-- Drafts for the new Admin Console (Phase 2A). Drafts stay in book_draft (Covenant) and
-- lib_draft (other books); these two functions read and write them, and refuse to
-- overwrite someone else's newer save.

create or replace function public.get_draft(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_editor() then raise exception 'not allowed'; end if;
  if p_slug = 'covenant' then
    return (select jsonb_build_object('data', d.data, 'log', d.log, 'base_version', d.base_version, 'updated_at', d.updated_at, 'updated_by', d.updated_by)
            from public.book_draft d where d.id = 1);
  end if;
  return (select jsonb_build_object('data', d.data, 'log', d.log, 'base_version', d.base_version, 'updated_at', d.updated_at, 'updated_by', d.updated_by)
          from public.lib_draft d where d.book = p_slug);
end $$;

-- Save unless the draft was changed by another editor since p_expected_at.
-- Returns {"conflict": true} or {"conflict": false, "updated_at": …}.
create or replace function public.save_draft(p_slug text, p_data jsonb, p_log jsonb, p_base_version int, p_expected_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cur_at timestamptz;
  cur_by uuid;
  new_at timestamptz;
  log_tail jsonb;
begin
  if not public.is_editor() then raise exception 'not allowed'; end if;
  if p_slug = 'covenant' then
    select updated_at, updated_by into cur_at, cur_by from public.book_draft where id = 1 for update;
  else
    select updated_at, updated_by into cur_at, cur_by from public.lib_draft where book = p_slug for update;
  end if;
  if found and cur_at is distinct from p_expected_at and cur_by is distinct from auth.uid() then
    return jsonb_build_object('conflict', true);
  end if;

  log_tail := coalesce((
    select jsonb_agg(e order by i) from jsonb_array_elements(coalesce(p_log, '[]'::jsonb)) with ordinality as x(e, i)
    where i > jsonb_array_length(coalesce(p_log, '[]'::jsonb)) - 500
  ), '[]'::jsonb);

  if p_slug = 'covenant' then
    insert into public.book_draft (id, data, log, base_version, updated_by) values (1, p_data, log_tail, p_base_version, auth.uid())
      on conflict (id) do update set data = excluded.data, log = excluded.log, base_version = excluded.base_version, updated_by = excluded.updated_by
      returning updated_at into new_at;
  else
    insert into public.lib_draft (book, data, log, base_version, updated_by) values (p_slug, p_data, log_tail, p_base_version, auth.uid())
      on conflict (book) do update set data = excluded.data, log = excluded.log, base_version = excluded.base_version, updated_by = excluded.updated_by
      returning updated_at into new_at;
  end if;
  return jsonb_build_object('conflict', false, 'updated_at', new_at);
end $$;

revoke all on function public.get_draft(text) from public, anon;
revoke all on function public.save_draft(text, jsonb, jsonb, int, timestamptz) from public, anon;
grant execute on function public.get_draft(text) to authenticated;
grant execute on function public.save_draft(text, jsonb, jsonb, int, timestamptz) to authenticated;
