# Book Catalog Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the book catalog, templates, editions, entitlements and shelves in Supabase behind a small RPC contract; keep the live site and old Admin Console working unchanged; write the data contract for Claude Design; and in the app, remove the guest access code and open free books without signing in.

**Architecture:** One schema migration adds the catalog tables, a config validator, `can_read`, and four read RPCs. Those RPCs (`get_library`, `get_book`, `get_edition`, `get_entries`) are the only things pages call. `book_versions` / `lib_versions` become read-only views over a new `book_editions` table, and `publish_book` / `publish_lib` delegate to a new `publish_edition`. Drafts stay in the existing `book_draft` / `lib_draft` tables, and `weekly_prayers` stays as it is. A generated seed migration loads templates, the four books, their bundled content as edition 0, and the starting shelves. Database behaviour is tested with pgTAP against a local Supabase stack.

**Tech Stack:** Postgres 17 / Supabase (RLS, pgTAP via `supabase test db`), Node 24 scripts (ESM), React 19 + TypeScript app, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-16-book-catalog-design.md`

## Global Constraints

- **Every new table has RLS enabled.** Migrations go in `supabase/migrations/` and are never edited after they're applied to production.
- **Functions:** `security definer` functions set `search_path = ''` and schema-qualify everything (avoids the advisor's 0011 warning).
- **Book slugs are permanent:** `covenant`, `jcfp`, `rooted`, `weekly`. The slug is also the progress/sync key.
- **Starting access:**
  - `covenant` → `members`;
  - `jcfp`, `rooted`, `weekly` → `free`.
- **Guest access code is removed from the app.**
  - **Code:** no code path stores or compares the shared code's SHA-256 (`e6a0edc6…`).
  - **Registration:** the registration code is checked only by the server (`redeem_code`).
- **Live site compatibility:**
  - `book_versions`, `lib_versions`, `book_draft`, `lib_draft`, `weekly_prayers`, `publish_book(p_note, p_data, p_layout, p_stats)`, `publish_lib(p_book, p_note, p_data, p_layout, p_stats)` keep their names, columns and signatures.
  - `site/` is not modified.
- **Progress keys don't change:** `gra-<slug>-*` locally; `book_state` (covenant) / `library_state(book = slug)` remotely.
- **Production:** `npm run db:deploy` runs only after the owner says to deploy the database. App preview deploys (`npm run web:deploy`) are pre-authorized.
- **Public repo:** no secrets in any file.
- **Commits:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Edition privacy starts now (deviation from the spec, owner to confirm):**
  - **What:** the old `book_versions` / `lib_versions` views run with the caller's rights. So editions *published after this deploy* reach only readers who `can_read` them: Covenant members, and everyone for free books.
  - **Who's affected:** non-members on the live site (including old guest-unlock devices) keep the bundled Covenant text they already have, which is still a public file until the switchover, but don't get new Covenant editions.
  - **Rejected alternative:** keeping the views anonymous-readable would leave every new Covenant edition public until the switchover.

## Review Focus

1. **A user on a device unlocked with the old guest code opens Covenant.** They see the sign-in gate, and their on-device Covenant progress (`gra-covenant-prayed`) is still there, not deleted. Test in Task 7.
2. **A signed-in user who isn't a member opens Jesus Chosen Fast and Prayer (free).** It opens and their progress syncs; `library_state` accepts their row. Before this change, RLS required membership. Test in Task 2.
3. **An entitlement that has expired or been revoked** gives no access, even though its row still exists. Test in Task 2.
4. **A section or banner outside its `starts_at` / `ends_at` window** is not returned to readers, but is returned to editors so they can preview it. Test in Task 4.
5. **The live site still behaves as before:**
   - with no new edition published, the old `book_versions` view shows no rows, so the live reader keeps its bundled book;
   - `publish_book` still returns version 1 for the first real publish.
   - Test in Task 3.

---

### Task 1: Catalog tables and config validation

**Files:**
- Create: `supabase/migrations/20261017000000_catalog.sql` (Tasks 1–4 each append their own section to this file. It isn't applied anywhere until Task 8)
- Create: `supabase/tests/01_catalog_config.test.sql`
- Modify: `package.json` (add `"db:start": "supabase start"`, `"db:test": "supabase test db"`, `"db:reset": "supabase db reset"`)
- Modify: `CLAUDE.md` (Commands table: the three scripts; note that Docker Desktop must be running for them)

**Interfaces:**
- Produces:
  - `public.catalog_config_valid(c jsonb) returns boolean` (immutable);
  - table `public.books(slug text pk, template text, config jsonb, title text, subtitle text, author text, description text, cover jsonb default '{}', language text default 'en', access text, status text default 'draft', sort_hint int default 0, created_at, updated_at)` with `check (public.catalog_config_valid(config))`, `access in ('free','members','paid')`, `status in ('draft','published','archived')`, `slug ~ '^[a-z0-9-]+$'`;
  - table `public.book_templates(key text pk, name text, description text, config jsonb)` with the same check;
  - `touch_updated_at` trigger on `books`.
- `config` shape (validated):
  - `reader`: `'prayer' | 'reading'`;
  - `levels`: array of 1–3 `{ "name": text ≠ '', "show_titles": boolean }`;
  - `content`: non-empty array, a subset of `prayer | reading | names | foundation | embed`;
  - `check_on`: `'item' | 'none' | 'level-1' | 'level-2' | 'level-3'`;
  - `numbering`: `'nested' | 'running' | 'none'`;
  - `actions_on`: `'level-1' | 'level-2' | 'level-3'`;
  - `features`: an object whose keys are a subset of `focus, listen, plans, scripture, verse_popups, notes, pen, search, share, journal`, each boolean;
  - `schedule`: `'fixed' | 'dated'`.
- Validity rules, beyond the shape:
  - `level-N` (in `check_on` / `actions_on`) needs N ≤ the number of levels;
  - `check_on = 'item'` needs `'prayer'` in content;
  - `reader = 'prayer'` needs `'prayer'` in content;
  - `reader = 'reading'` needs `'reading'` in content;
  - `features.focus` or `features.listen` true needs `prayer` or `reading` in content;
  - `schedule = 'dated'` needs exactly 1 level.

- [ ] **Step 1: Start the local stack.** Ask the owner to open Docker Desktop if `docker info` fails. Then run `npm run db:start`. Expected: "Started supabase local development setup", and all existing migrations apply cleanly.
- [ ] **Step 2: Write the failing pgTAP test `01_catalog_config.test.sql`.** Use `begin; select plan(N); … select * from finish(); rollback;` with:
  - `ok(catalog_config_valid(<covenant config from Task 5>))`, and the same for the jcfp, rooted and weekly configs;
  - `ok(not catalog_config_valid(...))` for each of:
    - `check_on 'level-3'` with 2 levels;
    - `check_on 'item'` with content `["reading"]`;
    - `reader 'reading'` without `reading`;
    - `schedule 'dated'` with 2 levels;
    - 4 levels;
    - an empty level name;
    - an unknown feature key;
    - `features.listen` with content `["names"]`;
  - `throws_ok($$insert into books(slug,template,config,title,access) values ('Bad Slug','x','{}','t','free')$$)`.
- [ ] **Step 3: Run it.** `npm run db:reset && npm run db:test`. Expected: FAIL, with function `catalog_config_valid` not existing.
- [ ] **Step 4: Implement it in the migration.**
  - `catalog_config_valid` in SQL/plpgsql using `jsonb_typeof`, `jsonb_array_length` and `<@` for subsets. Return false (never raise) on malformed input.
  - The `books` / `book_templates` tables and RLS:
    - **books:**
      - select: `status = 'published' or public.is_editor()`;
      - insert/update: `public.is_editor()`;
      - delete: `public.is_admin()`;
    - **book_templates:** select by authenticated; writes by `public.is_admin()`.
  - Grants: select to anon/authenticated; writes to authenticated.
- [ ] **Step 5: Run.** `npm run db:reset && npm run db:test`. Expected: PASS.
- [ ] **Step 6: Commit.** `git add supabase package.json CLAUDE.md && git commit -m "Catalog: books, templates and config validation"`.

### Task 2: Access — entitlements, `can_read`, free-book sync

**Files:**
- Modify: `supabase/migrations/20261017000000_catalog.sql` (append)
- Create: `supabase/tests/02_catalog_access.test.sql`

**Interfaces:**
- Consumes: `books` (Task 1); existing `members`, `is_editor()`, `library_state`.
- Produces:
  - table `public.entitlements(id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, scope text not null check (scope = 'all' or scope ~ '^book:[a-z0-9-]+$'), source text not null check (source in ('grant','members','apple','google','stripe')), expires_at timestamptz, revoked_at timestamptz, created_at timestamptz default now())`:
    - RLS: users select their own rows; editors select all;
    - no client writes (grants come in Phase 2 through an admin RPC; stores write with the service role in Phase 5);
  - `public.can_read(p_slug text) returns boolean` (`stable security definer set search_path = ''`, executable by anon and authenticated). It's true when:
    - the caller is an editor (any status); or
    - the book is `published` and any of:
      - `access = 'free'`;
      - the caller has an active entitlement with scope `'all'` or `'book:'||p_slug`;
      - `access = 'members'` and the caller is in `members`;
  - "Active" = `revoked_at is null and (expires_at is null or expires_at > now())`.
- **Change:** replace the three `library_state` policies with ones that require only `auth.uid() = user_id` (no membership), so signed-in non-members can sync free books. `book_state` (covenant) keeps its members-only policies.

- [ ] **Step 1: Write the failing test `02_catalog_access.test.sql`.**
  - **Setup:** insert test users into `auth.users` (`anon` = no claims; `member`, `stranger`, `buyer`, `expired`, `revoked`, `editor`). Insert `members(member)` and `admins(editor,'editor')`. Insert published books `t-free` (free), `t-mem` (members), `t-paid` (paid) and a draft book `t-draft` (free).
  - **Entitlements:**
    - `buyer` has `book:t-paid`, active;
    - `expired` has `book:t-paid` with `expires_at = now() - interval '1 second'`;
    - `revoked` has `all` with `revoked_at = now()`.
  - **Impersonation helper:** `set local role authenticated; select set_config('request.jwt.claims', json_build_object('sub', <id>, 'role', 'authenticated')::text, true);` (and `set local role anon` with empty claims for anonymous).
  - **Assertions:**
    - anon: `can_read('t-free')` true, `t-mem` false, `t-paid` false, `t-draft` false;
    - member: `t-mem` true, `t-paid` false;
    - stranger: `t-mem` false;
    - buyer: `t-paid` true, `t-mem` false;
    - expired: `t-paid` false;
    - revoked: `t-paid` false;
    - editor: `t-draft` true;
    - `can_read('nope')` false.
  - **Review focus 2:** as `stranger`, `lives_ok($$insert into library_state(user_id, book, data) values (auth.uid(), 'jcfp', '{}')$$)`, and as `stranger`, `throws_ok` inserting into `book_state`.
- [ ] **Step 2: Run.** `npm run db:reset && npm run db:test`. Expected: FAIL, with `entitlements` / `can_read` not existing.
- [ ] **Step 3: Implement it in the migration** (table, RLS, `can_read`, grants, `library_state` policy swap, using `drop policy if exists`).
- [ ] **Step 4: Run.** Expected: PASS (Task 1 tests too).
- [ ] **Step 5: Commit.** `git commit -m "Catalog: entitlements, can_read, free-book sync for non-members"`.

### Task 3: Editions, compatibility views, content RPCs

**Files:**
- Modify: `supabase/migrations/20261017000000_catalog.sql` (append)
- Create: `supabase/tests/03_catalog_editions.test.sql`

**Interfaces:**
- Consumes: `books`, `can_read`, `is_editor`, existing `book_draft`, `lib_draft`, `weekly_prayers`.
- Produces:
  - **table `public.book_editions`**: `book_slug text references books on update cascade, version int not null check (version >= 0), data jsonb not null, layout jsonb not null default '[]', stats jsonb not null default '{}', note text, published_by uuid references auth.users on delete set null, published_by_email text, published_at timestamptz default now(), primary key (book_slug, version)`:
    - RLS: select `public.can_read(book_slug)`; no direct writes;
  - **table `public.book_entries`**: `book_slug text references books, entry_date date, title text not null default '', intro text not null default '', items jsonb not null default '[]', closing text not null default '', publish_at timestamptz, updated_by_email text, created_at, updated_at, primary key (book_slug, entry_date)`:
    - for dated books other than `weekly`;
    - RLS: select `public.can_read(book_slug) and publish_at <= now()`, or editor; writes by editor;
  - **`book_versions` and `lib_versions` are dropped as tables** (both are empty in production; the migration asserts `count(*) = 0` and raises otherwise) **and recreated as views** with `security_invoker = true`:
    - `book_versions(version, data, layout, stats, note, published_by, published_by_email, published_at)` from `book_editions` where `book_slug = 'covenant' and version > 0`;
    - `lib_versions(book, version, data, layout, stats, note, published_by, published_by_email, published_at)` from `book_editions` where `book_slug <> 'covenant' and version > 0`;
    - grant select to anon and authenticated;
  - **`public.publish_edition(p_slug text, p_note text, p_data jsonb, p_layout jsonb, p_stats jsonb) returns int`**: editor only, else raise `'not allowed'`. It:
    - locks `book_editions`;
    - sets `v = max(version) + 1` over that slug's editions with `version > 0`, or 1 if none;
    - inserts the edition;
    - upserts the draft (`book_draft` id 1 for covenant, otherwise `lib_draft(book)`), exactly as `publish_book` / `publish_lib` do today;
    - returns `v`;
  - **`publish_book` and `publish_lib`** keep their signatures and delegate to `publish_edition('covenant', …)` and `publish_edition(p_book, …)`;
  - **`public.get_edition(p_slug text) returns jsonb`** (security definer):
    - raises errcode `42501`, message `'locked'`, when `not can_read(p_slug)`;
    - otherwise returns `{"slug", "version", "layout", "data"}` for the highest version, or null if there are no editions;
  - **`public.get_entries(p_slug text) returns jsonb`**:
    - raises `'locked'` like `get_edition`;
    - returns an array, newest first, of `{"entry_date", "title", "intro", "items", "closing"}`, published only (`publish_at <= now()`);
    - for `weekly`, reads `weekly_prayers` (`week_of` → `entry_date`, `prayers` → `items`);
    - otherwise reads `book_entries`.

- [ ] **Step 1: Write the failing test `03_catalog_editions.test.sql`.**
  - **Setup:** insert books `covenant` (members) and `jcfp` (free), plus an edition 0 for each, using `on conflict do nothing`. Once Task 5's seed lands, these rows already exist.
  - **Review focus 5:**
    - `is((select count(*) from book_versions), 0::bigint)` as a member;
    - as editor, `is(publish_book('n', '[1]', '[]', '{}'), 1)`, after which `book_versions` has version 1 for a member and 0 rows for anon;
    - `is(publish_lib('jcfp', 'n', '[2]', '[]', '{}'), 1)`, after which anon can see `lib_versions` where `book = 'jcfp'`;
    - the `book_draft` row has `base_version` 1.
  - **`get_edition`:**
    - `throws_ok` as anon for `covenant` with `'locked'`;
    - as anon, `get_edition('jcfp')->>'version' = '1'`.
  - **`get_entries('weekly')`:**
    - returns only rows with `publish_at <= now()`, newest first;
    - insert two `weekly_prayers` rows, one dated in the future, and assert a length of 1.
  - **`publish_edition`** as a non-editor: `throws_ok`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement it in the migration.**
- [ ] **Step 4: Run.** Expected: PASS (all earlier tests too).
- [ ] **Step 5: Commit.** `git commit -m "Catalog: editions, compatibility views for the live site, content RPCs"`.

### Task 4: Shelves, sections, banners, covers bucket, `get_library` / `get_book`

**Files:**
- Modify: `supabase/migrations/20261017000000_catalog.sql` (append)
- Create: `supabase/tests/04_catalog_library.test.sql`

**Interfaces:**
- Consumes: `books`, `can_read`, `is_editor`.
- Produces:
  - **table `public.sections`**: `id uuid pk default gen_random_uuid(), placement text check (placement in ('home','store')), kind text check (kind in ('featured','this_week','continue','plan','shelf','banner')), title text not null default '', position int not null default 0, visible boolean not null default true, starts_at timestamptz, ends_at timestamptz, banner jsonb not null default '{}'` (banner shape: `{ "image_url", "title", "body", "link": { "book" | "entry_date" | "url" } }`) `, created_at, updated_at`:
    - RLS: select `public.is_editor() or (visible and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))`; writes by editor;
  - **table `public.section_books`**: `section_id uuid references sections on delete cascade, book_slug text references books on update cascade on delete cascade, position int not null default 0, primary key (section_id, book_slug)`:
    - RLS: select if the parent section is selectable; writes by editor;
  - **storage bucket `covers`**: public read; insert/update/delete by `public.is_editor()` (policies on `storage.objects` for `bucket_id = 'covers'`);
  - **`public.get_book(p_slug text) returns jsonb`**:
    - returns `{slug, template, config, title, subtitle, author, description, cover, language, access, status, can_read}` for a book the caller may see (published, or the caller is an editor);
    - otherwise null;
  - **`public.get_library(p_placement text, p_show_hidden boolean default false) returns jsonb`**:
    - returns an array ordered by `position` of `{id, kind, title, banner, books: [ {slug, title, subtitle, author, cover, access, template, reader: config->>'reader', can_read} ordered by section_books.position ] }`;
    - only published books;
    - `p_show_hidden` is honoured only for editors. It also includes hidden and out-of-window sections, each with `"hidden": true`.

- [ ] **Step 1: Write the failing test `04_catalog_library.test.sql`.**
  - Insert:
    - books `t-a` (published, free) and `t-b` (draft);
    - section S1 (home, shelf, position 2) with books `t-b` and then `t-a`;
    - section S2 (home, banner, position 1, `ends_at = now() - 1 second`);
    - section S3 (home, featured, position 3, `starts_at = now() + 1 day`).
  - **Review focus 4, as anon:**
    - `jsonb_array_length(get_library('home')) = 1` (S1 only);
    - its books array is `['t-a']`, since the draft is excluded.
  - **As editor:**
    - `get_library('home', true)` has length 3, ordered S2, S1, S3, with `hidden` true on S2 and S3;
    - as anon, `get_library('home', true)` still has length 1.
  - **`get_book`:**
    - `get_book('t-b')` is null for anon and non-null for the editor;
    - `get_book('t-a')->>'can_read' = 'true'` for anon.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement it in the migration.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -m "Catalog: shelves, sections, banners, covers bucket, get_library and get_book"`.

### Task 5: Seed: templates, the four books, edition 0, starting shelves

**Files:**
- Create: `scripts/gen-catalog-seed.mjs` (Node, no dependencies)
- Create: `supabase/migrations/20261017000100_catalog_seed.sql` (generated; committed)
- Create: `supabase/tests/05_catalog_seed.test.sql`
- Modify: `package.json` (`"db:seed-catalog": "node scripts/gen-catalog-seed.mjs"`)

**Interfaces:**
- Consumes: the tables from Tasks 1–4; `site/prayers.json`, `site/jcfp.json`, `site/books/rooted.json`.
- Produces:
  - a deterministic generator: re-running it with unchanged inputs produces a byte-identical file;
  - it embeds JSON with `$json$…$json$::jsonb` and aborts if any input contains `$json$`;
  - each edition's `layout` follows `layoutOf()` from `app/src/features/book/layout.ts` (port the 8-line function into the script), and Rooted's is `[]`.
- **Seed values, exact:**
  - **`book_templates`**:
    - keys `prayer_manual`, `watch_manual`, `devotional`, `weekly_series`;
    - names "Prayer manual", "Watch manual", "Devotional", "Weekly series";
    - configs equal to the matching book's config below.
  - **`books`** (all `status 'published'`):

    | slug | template | title | access | sort_hint | cover |
    |---|---|---|---|---|---|
    | covenant | prayer_manual | Book of Covenant Prayers | members | 1 | `{"colors":["#25685d","#11372f","#d9c27e"]}` |
    | jcfp | watch_manual | Jesus Chosen Fast and Prayer Prayer Manual | free | 2 | `{"colors":["#8e2d3a","#561620","#dcb86c"]}` |
    | weekly | weekly_series | GRA Weekly Kingdom Prayers | free | 0 | `{"colors":["#33407a","#171d40","#e6c47a"]}` |
    | rooted | devotional | title, subtitle, author from `rooted.json` | free | 10 | `rooted.json`'s `cover` |

  - **configs:**
    - **covenant:** `reader prayer`, levels `[{"name":"Part","show_titles":true},{"name":"Section","show_titles":true}]`, content `["prayer","foundation"]`, `check_on item`, `numbering nested`, `actions_on level-2`, `schedule fixed`, features all ten `true`.
    - **jcfp:** `reader prayer`, levels `[{"name":"Watch","show_titles":true},{"name":"Topic","show_titles":false}]`, content `["prayer","names","embed"]`, `check_on item`, `numbering running`, `actions_on level-1`, `schedule fixed`, features all ten `true`.
    - **weekly:** `reader prayer`, levels `[{"name":"Week","show_titles":true}]`, content `["prayer"]`, `check_on item`, `numbering nested`, `actions_on level-1`, `schedule dated`, features `focus, listen, share` true and the rest false.
    - **rooted:** `reader reading`, levels `[{"name":"Chapter","show_titles":true}]`, content `["reading"]`, `check_on none`, `numbering none`, `actions_on level-1`, `schedule fixed`, features `listen, verse_popups, notes, pen, search` true and the rest false.
  - **`book_editions` version 0:**
    - covenant, from `prayers.json`, note `'Bundled edition'`;
    - jcfp, from `jcfp.json`, the same note;
    - rooted, from `rooted.json`, the same note;
    - weekly has none (entries live in `weekly_prayers`).
  - **Home sections:**
    - `this_week` "GRA Weekly Kingdom Prayers" at position 1;
    - `plan` "Today’s Plan" at 2;
    - `continue` "Continue" at 3;
    - `shelf` "My Prayer Library" at 4, with covenant, jcfp, weekly;
    - `shelf` "Spiritual Nourishment" at 5, with rooted.
  - **Store sections:**
    - `shelf` "Prayer books" at 1, with covenant and jcfp;
    - `shelf` "Spiritual Nourishment" at 2, with rooted.
  - The seed migration uses `on conflict do nothing`, so re-applying it is harmless.

- [ ] **Step 1: Write the failing test `05_catalog_seed.test.sql`.**
  - `results_eq` of `select slug, access from books order by slug`: covenant/members, jcfp/free, rooted/free, weekly/free.
  - Each config passes `catalog_config_valid`.
  - As anon:
    - `get_edition('jcfp')->>'version' = '0'`;
    - `get_edition('covenant')` throws `'locked'`.
  - `book_versions` shows 0 rows (edition 0 is hidden from the old views).
  - `get_library('home')` returns 5 sections, the 4th with books `['covenant','jcfp','weekly']`.
  - `get_library('store')` returns 2 sections.
- [ ] **Step 2: Run.** Expected: FAIL (no seed).
- [ ] **Step 3: Generate the seed.** Implement the generator, run `npm run db:seed-catalog`, then run it again and check `git diff --stat` shows no change on the second run.
- [ ] **Step 4: Run.** `npm run db:reset && npm run db:test`. Expected: PASS for all five test files.
- [ ] **Step 5: Commit.** `git commit -m "Catalog: seed templates, books, bundled editions and starting shelves"`.

### Task 6: Data contract for Claude Design

**Files:**
- Create: `docs/catalog-data-contract.md`
- Modify: `.claude/skills/pull-design/SKILL.md`. In "Review what changed", add: if a design now calls `get_library` / `get_book` / `get_edition` / `get_entries`, check that the calls and fields match `docs/catalog-data-contract.md`.

**Interfaces:**
- Consumes: the RPC signatures and return shapes from Tasks 3–4 and the seed values from Task 5.
- Produces: a self-contained document that a designer in Claude Design can build against with no other context.

- [ ] **Step 1: Write the contract**, with these sections, in this order:
  1. **What changed and why** (3 sentences).
  2. **How to call Supabase from a page.** The existing project URL and anon key, the existing `gra-covenant-auth` session key, and `supabase.rpc(name, args)`.
  3. **The four calls.** For each: purpose, arguments, the exact return JSON with a real example from the seed (Covenant `get_book`; `get_library('home')`; the first 2 items of `get_edition('jcfp')`; `get_entries('weekly')`), and the errors (`locked`).
  4. **What `config` means on screen**, as a table mapping each field and value to the visible behaviour:
     - `levels[].name` is used in the kicker ("Section 1.2", "Watch TWO");
     - `show_titles`;
     - `check_on`;
     - `numbering` (with Covenant 1.2.3 and JCFP running examples);
     - `actions_on`;
     - each `features` flag shows or hides its control;
     - `schedule: dated`;
     - `reader`.
  5. **Readers open any book** with `?book=<slug>` (prayer reader) or `?b=<slug>` (reading reader, as today), via `get_book`, then `get_edition` or `get_entries`.
  6. **Access on screen:**
     - free books open without the sign-in gate;
     - `can_read: false` on a members book shows the existing sign-in/registration-code gate;
     - `paid` shows a "locked" state (copy left to design);
     - **remove "Continue with access code" and the device unlock entirely.**
  7. **Shelves:** draw `get_library('home')` and `get_library('store')` in order. Kinds the design must support: `featured`, `this_week`, `continue`, `plan`, `shelf`, `banner`. Hidden and dated sections are already filtered.
  8. **Keep users' data:**
     - progress keys `gra-<slug>-*` unchanged;
     - sync tables unchanged;
     - Rooted keeps `gra-nr-rooted-*`;
     - keep the Supabase session key;
     - keep `log_usage` for Covenant.
  9. **Don't:**
     - call base tables directly;
     - embed book content in the page;
     - store the access code hash.
- [ ] **Step 2: Check the examples are real.** With the local stack seeded, run each example call through `npx supabase db query` (or psql against the local DB URL from `npx supabase status`). Paste the real output, trimmed, into the doc.
- [ ] **Step 3: Commit.** `git commit -m "Docs: catalog data contract for Claude Design"`.

### Task 7: App — remove the guest code, open free books without signing in

**Files:**
- Modify: `app/src/lib/auth.ts`:
  - remove `HASH`, `isGuest`, `codeOk`, and the `'guest'` mode;
  - sign-up no longer pre-checks the code client-side; it stores `pendingCode` and `onSession` redeems it as today;
  - initial `locked` = `!member()`;
  - with no session, set `locked: true`.
- Modify: `app/src/features/book/LockScreen.tsx`:
  - remove the guest link and the `'guest'` heading/labels;
  - add an optional `onClose?: () => void` that renders a "Not now" link under the form.
- Modify: `app/src/features/book/books.ts`:
  - `BookConfig.access: 'free' | 'members'` (`covenant: 'members'`, `jcfp: 'free'`);
  - add a `// TODO(catalog phase 3): from get_book()` comment.
- Modify: `app/src/features/book/Reader.tsx`:
  - show the gate only when `book.access === 'members' && locked`;
  - `syncUser = user && (book.access === 'free' || !locked) ? user : null`;
  - add state for an optional sign-in overlay.
- Modify: `app/src/features/book/SettingsSheet.tsx`:
  - replace the guest section with: when signed out, an Account block with the text "Sign in to keep your progress in sync on all your devices." and a button "Sign in or create account" that calls a new `onSignIn` prop (opens `LockScreen` with `onClose`).
- Modify: `tests/app.spec.js`:
  - replace `unlock()` with `asMember(page)`, which stores a non-expired fake session under `gra-covenant-auth` (`{access_token:'test', refresh_token:'test', token_type:'bearer', expires_in:3600, expires_at: <now+3600>, user:{id:'00000000-0000-0000-0000-000000000001', aud:'authenticated', email:'member@test'}}`) and `gra-covenant-member` = that id;
  - the live-site round-trip test also keeps setting `gra-covenant-unlocked` for the live page, which still has guest mode until the owner's redesign.

**Interfaces:**
- Consumes: nothing new from the database (`library_state` policy from Task 2 enables free-book sync once deployed).
- Produces: `LockScreen({ title, onClose? })`; `SettingsSheet({ store, onClose, onSignIn })`.

- [ ] **Step 1: Write the failing browser tests** in `tests/app.spec.js`, describe `'access'`:
  - `'JCFP opens without signing in'`: no session; `goto('app/#/book/jcfp')`; the title page heading is visible and `.lock` has count 0.
  - `'Covenant asks a signed-out reader to sign in, with no access-code option'`: `.lock` is visible; `getByText('Continue with access code')` has count 0.
  - **Review focus 1:** `'an old guest unlock no longer opens Covenant but keeps its progress'`:
    - init script sets `gra-covenant-unlocked` = the old hash and `gra-covenant-prayed` = `{"s-1-1-1":1}`;
    - `.lock` is visible;
    - `page.evaluate(() => localStorage.getItem('gra-covenant-prayed'))` equals `'{"s-1-1-1":1}'`.
  - `'signed-out JCFP reader can open sign-in from Settings and dismiss it'`: open Settings, click "Sign in or create account", `.lock` is visible, click "Not now", `.lock` has count 0.
- [ ] **Step 2: Run.** `npx playwright test tests/app.spec.js -g access`. Expected: FAIL.
- [ ] **Step 3: Make the code changes** listed under Files. Then check that no code still compares against the guest hash: `grep -rn "e6a0edc6" app/src` returns nothing.
- [ ] **Step 4: Run.** `npm run verify`. Expected: everything passes, including the existing reader, Focused Mode and Listen tests, now using `asMember`.
- [ ] **Step 5: Commit, then deploy the app preview** (pre-authorized): `git commit -m "App: remove guest access code; free books open without signing in"`, then `npm run web:deploy`.

### Task 8: Verify against production schema, then deploy on the owner's go-ahead

**Files:**
- Modify: `docs/ARCHITECTURE.md` (roadmap: mark catalog Phase 1 done; link the spec and the data contract)

- [ ] **Step 1: Full local check.**
  - `npm run db:reset && npm run db:test`: all pgTAP files pass.
  - `npx supabase db lint --local`: no errors.
  - `npm run verify`: passes.
- [ ] **Step 2: Production dry run.** `npx supabase db push --linked --dry-run`. Expected: it lists exactly `20261017000000_catalog.sql` and `20261017000100_catalog_seed.sql`.
- [ ] **Step 3: Stop and ask the owner** to approve the production database deploy, showing the dry run. Don't continue without a yes.
- [ ] **Step 4: Deploy and verify** (after the yes):
  - `npm run db:deploy -- --yes`;
  - Supabase MCP `get_advisors` (security), and report anything new;
  - read-only `execute_sql`: `select slug, access, status from books order by slug`, which should show 4 rows matching the seed;
  - load https://olayori.github.io/overcomers/covenant/ and confirm it still opens for a member with no errors in the console.
- [ ] **Step 5: Commit the ARCHITECTURE update** and report to the owner.
