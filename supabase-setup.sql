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
