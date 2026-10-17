-- Draft saves are checked per console session, not per person (final review of Phase 2A):
--  * the same editor in two tabs or devices gets the conflict banner instead of a silent
--    overwrite; a session's own retried save is still accepted;
--  * any write that isn't save_draft (publishing, the old console) clears the session id,
--    so a stale session must reload;
--  * a per-book lock makes the very first save of a draft safe too.

alter table public.book_draft add column if not exists updated_client uuid;
alter table public.lib_draft add column if not exists updated_client uuid;

-- Only save_draft sets app.draft_client; every other write leaves no session behind.
create or replace function public.draft_client_stamp() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_client := nullif(current_setting('app.draft_client', true), '')::uuid;
  return new;
end $$;
drop trigger if exists book_draft_client on public.book_draft;
create trigger book_draft_client before insert or update on public.book_draft for each row execute function public.draft_client_stamp();
drop trigger if exists lib_draft_client on public.lib_draft;
create trigger lib_draft_client before insert or update on public.lib_draft for each row execute function public.draft_client_stamp();

drop function if exists public.save_draft(text, jsonb, jsonb, int, timestamptz);

-- Save unless the draft changed since p_expected_at by anything other than this session.
-- Returns {"conflict": true} or {"conflict": false, "updated_at": …}.
create or replace function public.save_draft(p_slug text, p_data jsonb, p_log jsonb, p_base_version int, p_expected_at timestamptz, p_client uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cur_at timestamptz;
  cur_client uuid;
  new_at timestamptz;
  log_tail jsonb;
begin
  if not public.is_editor() then raise exception 'not allowed'; end if;
  perform pg_advisory_xact_lock(hashtext('draft:' || p_slug));
  if p_slug = 'covenant' then
    select updated_at, updated_client into cur_at, cur_client from public.book_draft where id = 1 for update;
  else
    select updated_at, updated_client into cur_at, cur_client from public.lib_draft where book = p_slug for update;
  end if;
  if found and cur_at is distinct from p_expected_at and (p_client is null or cur_client is distinct from p_client) then
    return jsonb_build_object('conflict', true);
  end if;

  log_tail := coalesce((
    select jsonb_agg(e order by i) from jsonb_array_elements(coalesce(p_log, '[]'::jsonb)) with ordinality as x(e, i)
    where i > jsonb_array_length(coalesce(p_log, '[]'::jsonb)) - 500
  ), '[]'::jsonb);

  perform set_config('app.draft_client', coalesce(p_client::text, ''), true);
  if p_slug = 'covenant' then
    insert into public.book_draft (id, data, log, base_version, updated_by) values (1, p_data, log_tail, p_base_version, auth.uid())
      on conflict (id) do update set data = excluded.data, log = excluded.log, base_version = excluded.base_version, updated_by = excluded.updated_by
      returning updated_at into new_at;
  else
    insert into public.lib_draft (book, data, log, base_version, updated_by) values (p_slug, p_data, log_tail, p_base_version, auth.uid())
      on conflict (book) do update set data = excluded.data, log = excluded.log, base_version = excluded.base_version, updated_by = excluded.updated_by
      returning updated_at into new_at;
  end if;
  perform set_config('app.draft_client', '', true);
  return jsonb_build_object('conflict', false, 'updated_at', new_at);
end $$;

revoke all on function public.save_draft(text, jsonb, jsonb, int, timestamptz, uuid) from public, anon;
grant execute on function public.save_draft(text, jsonb, jsonb, int, timestamptz, uuid) to authenticated;
