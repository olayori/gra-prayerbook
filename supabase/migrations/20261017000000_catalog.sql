-- Book catalog, Phase 1 (docs/superpowers/specs/2026-10-16-book-catalog-design.md).
-- Books and templates live here instead of in code. Pages read them through the RPCs
-- at the end of this file (get_library, get_book, get_edition, get_entries).

-- =====================================================================
-- 1. Book settings (config) validation, books and templates
-- =====================================================================

-- True when a book's config is complete and consistent (see the spec §2). Never raises:
-- malformed input is simply invalid.
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

  if jsonb_typeof(c->'levels') <> 'array' then return false; end if;
  n := jsonb_array_length(c->'levels');
  if n < 1 or n > 3 then return false; end if;
  for lv in select * from jsonb_array_elements(c->'levels') loop
    if jsonb_typeof(lv) <> 'object' or jsonb_typeof(lv->'name') <> 'string' or btrim(lv->>'name') = ''
       or jsonb_typeof(lv->'show_titles') <> 'boolean' then
      return false;
    end if;
  end loop;

  content := c->'content';
  if jsonb_typeof(content) <> 'array' or jsonb_array_length(content) = 0
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

  if jsonb_typeof(c->'features') <> 'object' then return false; end if;
  for k in select jsonb_object_keys(c->'features') loop
    if k not in ('focus', 'listen', 'plans', 'scripture', 'verse_popups', 'notes', 'pen', 'search', 'share', 'journal')
       or jsonb_typeof(c->'features'->k) <> 'boolean' then
      return false;
    end if;
  end loop;
  if (coalesce((c->'features'->>'focus')::boolean, false) or coalesce((c->'features'->>'listen')::boolean, false))
     and not (has_prayer or has_reading) then
    return false;
  end if;

  return true;
end $$;

create table if not exists public.book_templates (
  key text primary key,
  name text not null,
  description text not null default '',
  config jsonb not null check (public.catalog_config_valid(config))
);
alter table public.book_templates enable row level security;
drop policy if exists "signed-in read templates" on public.book_templates;
drop policy if exists "admins write templates" on public.book_templates;
create policy "signed-in read templates" on public.book_templates for select to authenticated using (true);
create policy "admins write templates" on public.book_templates for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.book_templates to authenticated;

create table if not exists public.books (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  template text not null,
  config jsonb not null check (public.catalog_config_valid(config)),
  title text not null,
  subtitle text not null default '',
  author text not null default '',
  description text not null default '',
  cover jsonb not null default '{}'::jsonb,
  language text not null default 'en',
  access text not null check (access in ('free', 'members', 'paid')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort_hint int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.books enable row level security;
drop policy if exists "read published books" on public.books;
drop policy if exists "editors add books" on public.books;
drop policy if exists "editors edit books" on public.books;
drop policy if exists "admins delete books" on public.books;
create policy "read published books" on public.books for select using (status = 'published' or public.is_editor());
create policy "editors add books" on public.books for insert to authenticated with check (public.is_editor());
create policy "editors edit books" on public.books for update to authenticated using (public.is_editor()) with check (public.is_editor());
create policy "admins delete books" on public.books for delete to authenticated using (public.is_admin());
grant select on public.books to anon, authenticated;
grant insert, update, delete on public.books to authenticated;
drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books for each row execute function public.touch_updated_at();
