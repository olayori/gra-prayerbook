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

-- =====================================================================
-- 2. Access: entitlements and can_read
-- =====================================================================

-- Who may read what beyond free books. Grants come from the Admin Console (Phase 2) and
-- from app-store / Stripe purchases (Phase 5, written with the service role). Clients
-- can only read their own rows.
create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  scope text not null check (scope = 'all' or scope ~ '^book:[a-z0-9]+(-[a-z0-9]+)*$'),
  source text not null check (source in ('grant', 'members', 'apple', 'google', 'stripe')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists entitlements_user_idx on public.entitlements (user_id);
alter table public.entitlements enable row level security;
drop policy if exists "read own entitlements" on public.entitlements;
create policy "read own entitlements" on public.entitlements for select to authenticated
  using (user_id = auth.uid() or public.is_editor());
grant select on public.entitlements to authenticated;

-- The one access rule every content read goes through (spec §4).
create or replace function public.can_read(p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b
    where b.slug = p_slug
      and (
        public.is_editor()
        or (b.status = 'published' and (
          b.access = 'free'
          or exists (
            select 1 from public.entitlements e
            where e.user_id = auth.uid()
              and e.scope in ('all', 'book:' || p_slug)
              and e.revoked_at is null
              and (e.expires_at is null or e.expires_at > now()))
          or (b.access = 'members' and exists (select 1 from public.members m where m.user_id = auth.uid()))
        ))
      )
  )
$$;
revoke all on function public.can_read(text) from public;
grant execute on function public.can_read(text) to anon, authenticated;

-- Free books sync for any signed-in reader, not only members. Covenant (book_state) stays
-- members-only.
drop policy if exists "members read own library" on public.library_state;
drop policy if exists "members insert own library" on public.library_state;
drop policy if exists "members update own library" on public.library_state;
drop policy if exists "read own library" on public.library_state;
drop policy if exists "insert own library" on public.library_state;
drop policy if exists "update own library" on public.library_state;
create policy "read own library" on public.library_state for select to authenticated using (auth.uid() = user_id);
create policy "insert own library" on public.library_state for insert to authenticated with check (auth.uid() = user_id);
create policy "update own library" on public.library_state for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================================================================
-- 3. Editions, dated entries, and the live site's old tables as views
-- =====================================================================

-- Published book content. Version 0 is the edition bundled with the site and app; the
-- Admin Console publishes 1, 2, … Readable only by people who may read the book.
create table if not exists public.book_editions (
  book_slug text not null references public.books (slug) on update cascade,
  version int not null check (version >= 0),
  data jsonb not null,
  layout jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  note text,
  published_by uuid references auth.users on delete set null,
  published_by_email text,
  published_at timestamptz not null default now(),
  primary key (book_slug, version)
);
alter table public.book_editions enable row level security;
drop policy if exists "read editions you may read" on public.book_editions;
create policy "read editions you may read" on public.book_editions for select using (public.can_read(book_slug));
grant select on public.book_editions to anon, authenticated;

-- Entries of dated books other than Weekly (Weekly keeps using weekly_prayers).
create table if not exists public.book_entries (
  book_slug text not null references public.books (slug) on update cascade,
  entry_date date not null,
  title text not null default '',
  intro text not null default '',
  items jsonb not null default '[]'::jsonb,
  closing text not null default '',
  publish_at timestamptz,
  updated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (book_slug, entry_date)
);
alter table public.book_entries enable row level security;
drop policy if exists "read published entries" on public.book_entries;
drop policy if exists "editors write entries" on public.book_entries;
create policy "read published entries" on public.book_entries for select
  using ((public.can_read(book_slug) and publish_at is not null and publish_at <= now()) or public.is_editor());
create policy "editors write entries" on public.book_entries for all to authenticated
  using (public.is_editor()) with check (public.is_editor());
grant select on public.book_entries to anon, authenticated;
grant insert, update, delete on public.book_entries to authenticated;
drop trigger if exists book_entries_touch on public.book_entries;
create trigger book_entries_touch before update on public.book_entries for each row execute function public.touch_updated_at();

-- The live site and the old Admin Console read book_versions / lib_versions. They are
-- empty in production, so they become views over book_editions (edition 0 hidden, so the
-- live reader keeps its bundled book until a real edition is published).
do $$
begin
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'book_versions') then
    if (select count(*) from public.book_versions) > 0 then raise exception 'book_versions has rows; migrate them first'; end if;
    drop table public.book_versions;
  end if;
  if exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'lib_versions') then
    if (select count(*) from public.lib_versions) > 0 then raise exception 'lib_versions has rows; migrate them first'; end if;
    drop table public.lib_versions;
  end if;
end $$;

create or replace view public.book_versions with (security_invoker = true) as
  select version, data, layout, stats, note, published_by, published_by_email, published_at
  from public.book_editions where book_slug = 'covenant' and version > 0;
create or replace view public.lib_versions with (security_invoker = true) as
  select book_slug as book, version, data, layout, stats, note, published_by, published_by_email, published_at
  from public.book_editions where book_slug <> 'covenant' and version > 0;
grant select on public.book_versions, public.lib_versions to anon, authenticated;

-- Publish a new edition (editors). Drafts stay in book_draft (Covenant) / lib_draft.
create or replace function public.publish_edition(p_slug text, p_note text, p_data jsonb, p_layout jsonb, p_stats jsonb)
returns int language plpgsql security definer set search_path = '' as $$
declare v int;
begin
  if not public.is_editor() then raise exception 'not allowed'; end if;
  lock table public.book_editions in exclusive mode;
  select coalesce(max(version), 0) + 1 into v from public.book_editions where book_slug = p_slug and version > 0;
  insert into public.book_editions (book_slug, version, data, layout, stats, note, published_by, published_by_email)
    values (p_slug, v, p_data, p_layout, coalesce(p_stats, '{}'::jsonb), nullif(btrim(p_note), ''), auth.uid(),
            (select email from auth.users where id = auth.uid()));
  if p_slug = 'covenant' then
    insert into public.book_draft (id, data, log, base_version, updated_by) values (1, p_data, '[]', v, auth.uid())
      on conflict (id) do update set data = excluded.data, log = '[]', base_version = v, updated_by = auth.uid();
  else
    insert into public.lib_draft (book, data, log, base_version, updated_by) values (p_slug, p_data, '[]', v, auth.uid())
      on conflict (book) do update set data = excluded.data, log = '[]', base_version = v, updated_by = auth.uid();
  end if;
  return v;
end $$;
revoke all on function public.publish_edition(text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.publish_edition(text, text, jsonb, jsonb, jsonb) to authenticated;

-- The old Admin Console's publish calls keep working.
create or replace function public.publish_book(p_note text, p_data jsonb, p_layout jsonb, p_stats jsonb) returns int
language sql security definer set search_path = '' as $$
  select public.publish_edition('covenant', p_note, p_data, p_layout, p_stats)
$$;
create or replace function public.publish_lib(p_book text, p_note text, p_data jsonb, p_layout jsonb, p_stats jsonb) returns int
language sql security definer set search_path = '' as $$
  select public.publish_edition(p_book, p_note, p_data, p_layout, p_stats)
$$;

-- Newest edition of a book: { slug, version, layout, data }, or null if it has none.
create or replace function public.get_edition(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_read(p_slug) then raise exception 'locked' using errcode = '42501'; end if;
  return (
    select jsonb_build_object('slug', e.book_slug, 'version', e.version, 'layout', e.layout, 'data', e.data)
    from public.book_editions e where e.book_slug = p_slug order by e.version desc limit 1
  );
end $$;
revoke all on function public.get_edition(text) from public;
grant execute on function public.get_edition(text) to anon, authenticated;

-- Published entries of a dated book, newest first: [{ entry_date, title, intro, items, closing }].
create or replace function public.get_entries(p_slug text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_read(p_slug) then raise exception 'locked' using errcode = '42501'; end if;
  if p_slug = 'weekly' then
    return coalesce((
      select jsonb_agg(jsonb_build_object('entry_date', w.week_of, 'title', w.title, 'intro', w.intro, 'items', w.prayers, 'closing', w.closing)
                       order by w.week_of desc)
      from public.weekly_prayers w where w.publish_at is not null and w.publish_at <= now()
    ), '[]'::jsonb);
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('entry_date', e.entry_date, 'title', e.title, 'intro', e.intro, 'items', e.items, 'closing', e.closing)
                     order by e.entry_date desc)
    from public.book_entries e where e.book_slug = p_slug and e.publish_at is not null and e.publish_at <= now()
  ), '[]'::jsonb);
end $$;
revoke all on function public.get_entries(text) from public;
grant execute on function public.get_entries(text) to anon, authenticated;

-- =====================================================================
-- 4. Shelves and sections (Library home and store), covers
-- =====================================================================

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('home', 'store')),
  kind text not null check (kind in ('featured', 'this_week', 'continue', 'plan', 'shelf', 'banner')),
  title text not null default '',
  position int not null default 0,
  visible boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  -- banner: { image_url, title, body, link: { book | entry_date | url } }
  banner jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sections_placement_idx on public.sections (placement, position);

-- Shown to readers when switched on and inside its date window.
create or replace function public.section_live(s public.sections) returns boolean
language sql stable set search_path = '' as $$
  select s.visible and (s.starts_at is null or s.starts_at <= now()) and (s.ends_at is null or s.ends_at > now())
$$;

alter table public.sections enable row level security;
drop policy if exists "read live sections" on public.sections;
drop policy if exists "editors write sections" on public.sections;
create policy "read live sections" on public.sections for select using (public.section_live(sections) or public.is_editor());
create policy "editors write sections" on public.sections for all to authenticated
  using (public.is_editor()) with check (public.is_editor());
grant select on public.sections to anon, authenticated;
grant insert, update, delete on public.sections to authenticated;
drop trigger if exists sections_touch on public.sections;
create trigger sections_touch before update on public.sections for each row execute function public.touch_updated_at();

create table if not exists public.section_books (
  section_id uuid not null references public.sections on delete cascade,
  book_slug text not null references public.books (slug) on update cascade on delete cascade,
  position int not null default 0,
  primary key (section_id, book_slug)
);
alter table public.section_books enable row level security;
drop policy if exists "read books of readable sections" on public.section_books;
drop policy if exists "editors write section books" on public.section_books;
create policy "read books of readable sections" on public.section_books for select
  using (exists (select 1 from public.sections s where s.id = section_id));
create policy "editors write section books" on public.section_books for all to authenticated
  using (public.is_editor()) with check (public.is_editor());
grant select on public.section_books to anon, authenticated;
grant insert, update, delete on public.section_books to authenticated;

-- Cover images: public to read, editors upload.
insert into storage.buckets (id, name, public) values ('covers', 'covers', true) on conflict (id) do nothing;
drop policy if exists "read covers" on storage.objects;
drop policy if exists "editors add covers" on storage.objects;
drop policy if exists "editors change covers" on storage.objects;
drop policy if exists "editors remove covers" on storage.objects;
create policy "read covers" on storage.objects for select using (bucket_id = 'covers');
create policy "editors add covers" on storage.objects for insert to authenticated with check (bucket_id = 'covers' and public.is_editor());
create policy "editors change covers" on storage.objects for update to authenticated using (bucket_id = 'covers' and public.is_editor());
create policy "editors remove covers" on storage.objects for delete to authenticated using (bucket_id = 'covers' and public.is_editor());

-- One book's details for a page: { slug, template, config, title, …, access, status, can_read }.
create or replace function public.get_book(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('slug', b.slug, 'template', b.template, 'config', b.config, 'title', b.title,
    'subtitle', b.subtitle, 'author', b.author, 'description', b.description, 'cover', b.cover,
    'language', b.language, 'access', b.access, 'status', b.status, 'can_read', public.can_read(b.slug))
  from public.books b
  where b.slug = p_slug and (b.status = 'published' or public.is_editor())
$$;
revoke all on function public.get_book(text) from public;
grant execute on function public.get_book(text) to anon, authenticated;

-- What the Library home or store shows, in order. Editors can include hidden and
-- out-of-window sections (marked "hidden") to preview them.
create or replace function public.get_library(p_placement text, p_show_hidden boolean default false) returns jsonb
language sql stable security definer set search_path = '' as $$
  with preview as (select p_show_hidden and public.is_editor() as enabled),
  secs as (
    select s.*, not public.section_live(s) as hidden from public.sections s where s.placement = p_placement
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('id', s.id, 'kind', s.kind, 'title', s.title, 'banner', s.banner,
      'books', coalesce((
        select jsonb_agg(jsonb_build_object('slug', b.slug, 'title', b.title, 'subtitle', b.subtitle, 'author', b.author,
                 'cover', b.cover, 'access', b.access, 'template', b.template, 'reader', b.config->>'reader',
                 'can_read', public.can_read(b.slug)) order by sb.position)
        from public.section_books sb join public.books b on b.slug = sb.book_slug
        where sb.section_id = s.id and b.status = 'published'), '[]'::jsonb))
    || case when (select enabled from preview) then jsonb_build_object('hidden', s.hidden) else '{}'::jsonb end
    order by s.position), '[]'::jsonb)
  from secs s
  where not s.hidden or (select enabled from preview)
$$;
revoke all on function public.get_library(text, boolean) from public;
grant execute on function public.get_library(text, boolean) to anon, authenticated;
