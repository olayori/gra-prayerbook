-- Book of Covenant Prayers — sign-in & sync setup
-- Paste into Supabase → SQL Editor → New query → Run (once).

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.members (
  user_id uuid primary key references auth.users on delete cascade,
  joined_at timestamptz not null default now()
);
alter table public.members enable row level security;
drop policy if exists "read own membership" on public.members;
create policy "read own membership" on public.members for select using (auth.uid() = user_id);

create table if not exists public.book_state (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.book_state enable row level security;
drop policy if exists "members read own" on public.book_state;
drop policy if exists "members insert own" on public.book_state;
drop policy if exists "members update own" on public.book_state;
create policy "members read own" on public.book_state for select
  using (auth.uid() = user_id and exists (select 1 from public.members m where m.user_id = auth.uid()));
create policy "members insert own" on public.book_state for insert
  with check (auth.uid() = user_id and exists (select 1 from public.members m where m.user_id = auth.uid()));
create policy "members update own" on public.book_state for update
  using (auth.uid() = user_id and exists (select 1 from public.members m where m.user_id = auth.uid()))
  with check (auth.uid() = user_id);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = clock_timestamp(); return new; end $$;
drop trigger if exists book_state_touch on public.book_state;
create trigger book_state_touch before insert or update on public.book_state
  for each row execute function public.touch_updated_at();

-- Registration code check (server-side). The hash below is SHA-256 of the current code.
-- To change the code later: replace the hash here AND tell Claude to update the book.
create or replace function public.redeem_code(code text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
begin
  if auth.uid() is null then return false; end if;
  if encode(extensions.digest(trim(code), 'sha256'), 'hex')
     <> 'e6a0edc6786aea7bad85cc9fec671bfa84763bd161c450a579df4b1087b5d270' then
    return false;
  end if;
  insert into public.members (user_id) values (auth.uid()) on conflict do nothing;
  return true;
end $$;
revoke all on function public.redeem_code(text) from public, anon;
grant execute on function public.redeem_code(text) to authenticated;

-- =====================================================================
-- v2 — Admins, anonymous usage counts, and prayer wording edits.
-- Safe to run again. Paste into SQL Editor → Run.
-- =====================================================================

create table if not exists public.admins (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.admins enable row level security;
drop policy if exists "read own admin" on public.admins;
create policy "read own admin" on public.admins for select using (auth.uid() = user_id);
grant select on public.admins to authenticated;

-- Make someone an admin (replace the email, then run this line):
-- insert into public.admins (user_id) select id from auth.users where email = 'you@example.com' on conflict do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

-- Anonymous usage: daily counts only. No user ids are stored.
create table if not exists public.usage_daily (
  day date not null,
  kind text not null,
  ref text not null,
  n integer not null default 0,
  primary key (day, kind, ref)
);
alter table public.usage_daily enable row level security;
drop policy if exists "admins read usage" on public.usage_daily;
create policy "admins read usage" on public.usage_daily for select using (public.is_admin());
grant select on public.usage_daily to authenticated;

create or replace function public.log_usage(events jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare e jsonb; d date; c integer;
begin
  if jsonb_typeof(events) <> 'array' or jsonb_array_length(events) > 500 then return; end if;
  for e in select * from jsonb_array_elements(events) loop
    begin
      d := (e->>'d')::date;
      c := least(greatest(coalesce((e->>'n')::int, 1), 1), 100);
    exception when others then continue;
    end;
    if d < current_date - 8 or d > current_date + 1 then continue; end if;
    if coalesce(e->>'k', '') not in ('pray', 'open', 'search') then continue; end if;
    if coalesce(length(e->>'r'), 0) not between 1 and 40 then continue; end if;
    insert into public.usage_daily (day, kind, ref, n) values (d, e->>'k', e->>'r', c)
      on conflict (day, kind, ref) do update set n = usage_daily.n + excluded.n;
  end loop;
end $$;
revoke all on function public.log_usage(jsonb) from public;
grant execute on function public.log_usage(jsonb) to anon, authenticated;

-- Prayer wording edits made by admins inside the book.
create table if not exists public.prayer_edits (
  pid text primary key,
  orig text not null,
  text text not null,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.prayer_edits enable row level security;
drop policy if exists "anyone reads edits" on public.prayer_edits;
drop policy if exists "admins insert edits" on public.prayer_edits;
drop policy if exists "admins update edits" on public.prayer_edits;
drop policy if exists "admins delete edits" on public.prayer_edits;
create policy "anyone reads edits" on public.prayer_edits for select using (true);
create policy "admins insert edits" on public.prayer_edits for insert with check (public.is_admin());
create policy "admins update edits" on public.prayer_edits for update using (public.is_admin()) with check (public.is_admin());
create policy "admins delete edits" on public.prayer_edits for delete using (public.is_admin());
grant select on public.prayer_edits to anon, authenticated;
grant insert, update, delete on public.prayer_edits to authenticated;
drop trigger if exists prayer_edits_touch on public.prayer_edits;
create trigger prayer_edits_touch before insert or update on public.prayer_edits
  for each row execute function public.touch_updated_at();

-- =====================================================================
-- v3 — Admin console: roles, book drafts & published versions, user tools.
-- Safe to run again. Run AFTER v2 above.
-- =====================================================================

alter table public.admins add column if not exists role text not null default 'admin';
alter table public.admins drop constraint if exists admins_role_check;
alter table public.admins add constraint admins_role_check check (role in ('editor', 'admin'));

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'admin')
$$;
create or replace function public.is_editor() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role in ('editor', 'admin'))
$$;

drop policy if exists "admins read usage" on public.usage_daily;
create policy "admins read usage" on public.usage_daily for select using (public.is_editor());

-- Working draft of the book (one row).
create table if not exists public.book_draft (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  log jsonb not null default '[]'::jsonb,
  base_version int not null default 0,
  updated_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.book_draft enable row level security;
drop policy if exists "editors all draft" on public.book_draft;
create policy "editors all draft" on public.book_draft for all using (public.is_editor()) with check (public.is_editor());
grant select, insert, update, delete on public.book_draft to authenticated;
drop trigger if exists book_draft_touch on public.book_draft;
create trigger book_draft_touch before insert or update on public.book_draft
  for each row execute function public.touch_updated_at();

-- Published versions. Readers download the newest one.
create table if not exists public.book_versions (
  version int primary key,
  data jsonb not null,
  layout jsonb not null,
  stats jsonb not null default '{}'::jsonb,
  note text,
  published_by uuid references auth.users on delete set null,
  published_by_email text,
  published_at timestamptz not null default now()
);
alter table public.book_versions enable row level security;
drop policy if exists "anyone reads versions" on public.book_versions;
create policy "anyone reads versions" on public.book_versions for select using (true);
grant select on public.book_versions to anon, authenticated;

create or replace function public.publish_book(p_note text, p_data jsonb, p_layout jsonb, p_stats jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not public.is_editor() then raise exception 'not allowed'; end if;
  lock table public.book_versions in exclusive mode;
  select coalesce(max(version), 0) + 1 into v from public.book_versions;
  insert into public.book_versions (version, data, layout, stats, note, published_by, published_by_email)
    values (v, p_data, p_layout, p_stats, nullif(trim(p_note), ''), auth.uid(), (select email from auth.users where id = auth.uid()));
  insert into public.book_draft (id, data, log, base_version, updated_by) values (1, p_data, '[]', v, auth.uid())
    on conflict (id) do update set data = excluded.data, log = '[]', base_version = v, updated_by = auth.uid();
  return v;
end $$;
revoke all on function public.publish_book(text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.publish_book(text, jsonb, jsonb, jsonb) to authenticated;

-- Users list for admins. Pen-note drawings are left out to keep it light.
create or replace function public.admin_users()
returns table (user_id uuid, email text, name text, created_at timestamptz, last_sign_in_at timestamptz,
  is_member boolean, role text, state_at timestamptz, ink_pages int, data jsonb)
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
  select u.id, u.email::text,
    coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')::text,
    u.created_at, u.last_sign_in_at,
    exists (select 1 from public.members m where m.user_id = u.id),
    (select a.role from public.admins a where a.user_id = u.id),
    s.updated_at,
    coalesce((select count(*)::int from jsonb_object_keys(coalesce(s.data->'ink', '{}'::jsonb))), 0),
    coalesce(s.data, '{}'::jsonb) - 'ink'
  from auth.users u left join public.book_state s on s.user_id = u.id
  order by u.created_at desc;
end $$;
revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;

create or replace function public.admin_set_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_user = auth.uid() and coalesce(p_role, '') <> 'admin' then raise exception 'You cannot remove your own admin access.'; end if;
  if p_role is null or p_role = '' then
    delete from public.admins where user_id = p_user;
  elsif p_role in ('editor', 'admin') then
    insert into public.admins (user_id, role) values (p_user, p_role) on conflict (user_id) do update set role = excluded.role;
  else raise exception 'bad role'; end if;
end $$;
revoke all on function public.admin_set_role(uuid, text) from public, anon;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Reset: wipes progress and leaves a marker so the user's devices clear too.
create or replace function public.admin_reset_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.book_state (user_id, data) values (p_user, jsonb_build_object('reset', extract(epoch from now())::bigint))
    on conflict (user_id) do update set data = jsonb_build_object('reset', extract(epoch from now())::bigint, 'bv', public.book_state.data->'bv');
end $$;
revoke all on function public.admin_reset_user(uuid) from public, anon;
grant execute on function public.admin_reset_user(uuid) to authenticated;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  if p_user = auth.uid() then raise exception 'You cannot delete your own account here.'; end if;
  delete from auth.users where id = p_user;
end $$;
revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;


-- =====================================================================
-- GRA Weekly Kingdom Prayers (run this section once)
-- =====================================================================
create table if not exists public.weekly_prayers (
  id uuid primary key default gen_random_uuid(),
  week_of date not null unique,
  title text not null default 'Weekly Kingdom Prayers',
  intro text not null default '',
  prayers jsonb not null default '[]'::jsonb,
  closing text not null default '',
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by_email text
);
alter table public.weekly_prayers enable row level security;
drop policy if exists "readers see live weeks" on public.weekly_prayers;
drop policy if exists "editors all weeks" on public.weekly_prayers;
create policy "readers see live weeks" on public.weekly_prayers for select
  using (publish_at is not null and publish_at <= now());
create policy "editors all weeks" on public.weekly_prayers for all
  using (public.is_editor()) with check (public.is_editor());
grant select on public.weekly_prayers to anon, authenticated;
grant insert, update, delete on public.weekly_prayers to authenticated;
drop trigger if exists weekly_prayers_touch on public.weekly_prayers;
create trigger weekly_prayers_touch before update on public.weekly_prayers
  for each row execute function public.touch_updated_at();


-- =====================================================================
-- GRA Prayer Library: progress for the other books (run this section once)
-- =====================================================================
create table if not exists public.library_state (
  user_id uuid not null references auth.users on delete cascade,
  book text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, book)
);
alter table public.library_state enable row level security;
drop policy if exists "members read own library" on public.library_state;
drop policy if exists "members insert own library" on public.library_state;
drop policy if exists "members update own library" on public.library_state;
create policy "members read own library" on public.library_state for select
  using (auth.uid() = user_id and exists (select 1 from public.members m where m.user_id = auth.uid()));
create policy "members insert own library" on public.library_state for insert
  with check (auth.uid() = user_id and exists (select 1 from public.members m where m.user_id = auth.uid()));
create policy "members update own library" on public.library_state for update
  using (auth.uid() = user_id and exists (select 1 from public.members m where m.user_id = auth.uid()))
  with check (auth.uid() = user_id);
grant select, insert, update on public.library_state to authenticated;
drop trigger if exists library_state_touch on public.library_state;
create trigger library_state_touch before update on public.library_state
  for each row execute function public.touch_updated_at();

-- Reset now clears every book, not just Covenant Prayers.
create or replace function public.admin_reset_user(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  insert into public.book_state (user_id, data) values (p_user, jsonb_build_object('reset', extract(epoch from now())::bigint))
    on conflict (user_id) do update set data = jsonb_build_object('reset', extract(epoch from now())::bigint, 'bv', public.book_state.data->'bv');
  update public.library_state set data = jsonb_build_object('reset', extract(epoch from now())::bigint) where user_id = p_user;
end $$;
revoke all on function public.admin_reset_user(uuid) from public, anon;
grant execute on function public.admin_reset_user(uuid) to authenticated;
