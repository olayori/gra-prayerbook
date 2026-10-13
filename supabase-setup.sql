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
