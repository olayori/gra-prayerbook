# Book catalog, book templates and content dashboard

_Design, 2026-10-16. Status: revised after review, awaiting owner approval._

## Why

Today every book is hard-coded. Its content is a public JSON file in `site/`. The list of books is written into the Claude Design pages (reader, Library home, Admin Console). Adding a book takes a design change, code changes and a deploy.

The owner wants to:
- add books, including ones laid out differently from the current ones, without design or code work;
- control what the Library home and the book store show, and in what order;
- be ready for a marketplace (book purchases or a subscription, still undecided).

The app port is paused while the owner keeps designing. This work is mostly backend and dashboard, so it can go ahead in the meantime.

## Goals

1. **A book catalog in Supabase.** Each book's identity, template settings, cover, description, access and publish state live in the database, not in code.
2. **Book templates (option C).** A new book starts from one of four templates matching today's books, then adjusts:
   - structure: levels and their names;
   - content kinds;
   - where checking happens;
   - numbering;
   - which features are on;
   - schedule (fixed or dated entries).
3. **Private content.** Book content is served only to people allowed to read it, enforced by the database rather than by the page.
4. **A content dashboard in the Admin Console** to manage books, shelves, home and store sections, and featured items, with no deploy.
5. **Access levels ready for the marketplace.** Each book is free, members-only or paid. The entitlement model already supports purchases, subscriptions and grants, even before any payment provider is connected.
6. **Nobody loses anything.** Existing progress, sign-ins and memberships keep working, and the live site keeps working throughout.

## Non-goals (this project)

- **Taking payments.** No RevenueCat, StoreKit, Play Billing or Stripe yet. The schema supports them; connecting one is a later project.
- **A page builder.** Layouts stay in Claude Design. The dashboard controls content and arrangement (which sections, which books, what order), never visual layout.
- **Porting more screens.** Porting is paused. The app reader is made catalog-driven only where this project needs to prove the model works.
- **Porting the live Library home and readers in code.** The owner updates those designs in Claude Design to read the catalog, using the data contract in §7. The one exception is the Admin Console, which is rebuilt in code (§6).

## Anti-goals: failure even if it works

- A book can be configured into a combination that looks broken. Templates and validation must prevent nonsense, such as checks on a book with no checkable unit.
- A member loses access they have today, or anyone loses progress.
- Paid content can still be downloaded by someone without access once the switchover happens.
- Adding a book still needs a developer. The whole path must work from the dashboard: create, upload content, set access, place on a shelf, publish.

## Current state (verified 2026-10-16)

| Book | Content | Structure | Tracking | Synced in |
|---|---|---|---|---|
| Book of Covenant Prayers (`covenant`) | `site/prayers.json`, editions in `book_versions` | Part → Section → Prayer; each section has a Scripture Foundation | Check each prayer; numbered `part.section.prayer` | `book_state` (one row per user) |
| Jesus Chosen Fast and Prayer (`jcfp`) | `site/jcfp.json`, editions in `lib_versions` | Watch → topic (title hidden) → Prayer; plus a part of name lists | Check each prayer; numbered through the watch; actions on the watch | `library_state` (`book = 'jcfp'`) |
| Rooted (`rooted`), Spiritual Nourishment | `site/books/rooted.json` | Chapters of prose, with a cover | Reading position only | Device only (`gra-nr-rooted-*`) |
| GRA Weekly Kingdom Prayers (`weekly`) | `weekly_prayers` table, one row per week, `publish_at` | Week → prayers with a reference | Check each prayer | `library_state` (`book = 'weekly'`) |

- **Access today:** every prayer book opens for members (`members` table, joined by redeeming the registration code), or on a device unlocked with the shared access code, a client-side check that protects nothing.
- **The Admin Console** edits Covenant and Jesus Chosen Fast and Prayer as draft → publish → versions, and edits weekly prayers.

## The design

### 1. Catalog

A `books` table, one row per book:

| Field | Meaning |
|---|---|
| `slug` | Permanent id. It's the storage and sync key, so existing books keep `covenant`, `jcfp`, `rooted`, `weekly`. |
| `template` | Which template it started from. |
| `config` | The template settings below, as JSON, validated by the database and the dashboard. |
| Display fields | Title, subtitle, author, description, cover (image plus the colors used for the cover and player), language. |
| `access` | `free`, `members` or `paid` (see 4). |
| `status` | `draft`, `published` or `archived`. Only published books are visible to readers. |
| `sort_hint` | Default order when a shelf doesn't set one. |

### 2. Templates and `config`

`config` describes how the reader presents and tracks the book. The four templates are presets of these fields:

- **`levels`**: one to three level names, outermost first, e.g. `["Part", "Section"]`, `["Watch", "Topic"]`, `["Chapter"]`, `["Week"]`. The reader uses these words everywhere ("Section 1.2", "Watch TWO", "Mark all prayed in this watch").
- **`level_titles`**: per level, show or hide titles. This covers Jesus Chosen Fast and Prayer's hidden topic titles.
- **`content`**: which item kinds the book may contain:
  - `prayer`: text with scripture references and optional verses;
  - `reading`: prose paragraphs;
  - `names`: a list of names with an optional subtitle and group;
  - `foundation`: a scripture block at the top of a level.
- **`check_on`**: where marks go: `item`, `section`, `chapter`, or `none` (reading position only).
- **`numbering`**: `nested` (1.2.3), `running` (counts through the outermost level), or `none`.
- **`actions_on`**: which level carries "Mark all", "Focused Mode" and "Listen". Today that's the section for Covenant and the watch for Jesus Chosen Fast and Prayer.
- **`features`**: on/off for Focused Mode, Listen, plans, scripture under prayers, verse pop-ups, highlights and notes, pen, search, share, journal export.
- **`schedule`**: `fixed` (a normal book), or `dated` (entries published over time, newest first, like Weekly).
- **`reader`**: `prayer` or `reading`, i.e. which of the two designed readers presents it. Weekly uses the prayer reader with `schedule: dated`.

**Templates (seeded, editable later):**

| Template | levels | content | check_on | numbering | actions_on | schedule | reader |
|---|---|---|---|---|---|---|---|
| Prayer manual (Covenant) | Part, Section | prayer, foundation | item | nested | Section | fixed | prayer |
| Watch manual (Jesus Chosen Fast and Prayer) | Watch, Topic (titles hidden) | prayer, names | item | running | Watch | fixed | prayer |
| Devotional (Rooted) | Chapter | reading | none | none | Chapter | fixed | reading |
| Weekly series (Weekly) | Week | prayer | item | nested | Week | dated | prayer |

**One-offs in Jesus Chosen Fast and Prayer (my calls):**
- Its name-list part uses the `names` content kind.
- Its "pray the weekly prayers" placeholder becomes an `embed` item pointing at another book (`weekly`), rendered inline the way it is today.
- Plans and prayer history span books, so they stay outside the catalog.
  - Today's keys stay as they are, including weekly history stored under the covenant key.

**Validation rules** (database check plus dashboard):
- `check_on` must name a level that exists, or be `item` when the book has prayers.
- Focused Mode and Listen need prayer or reading content.
- `names` items are never checkable.
- A `dated` book has exactly one level.

### 3. Content, editions and privacy

**Compatibility until the switchover (my call):** the new tables are the source of truth from Phase 1.
- `book_versions`, `lib_versions` and the weekly table become views, or triggers keep them in sync, so the live pages and the old Admin Console keep reading and publishing unchanged.
- `publish_book` / `publish_lib` write to the new tables.
- Anonymous read of those old views stays until the switchover, because the live site depends on it. Privacy is therefore fully effective only at the switchover. New access paths use `can_read` from day one.


- **Generalize today's draft → publish → version flow** (`book_draft`, `book_versions`, `lib_draft`, `lib_versions`) into one pair:
  - `book_drafts(book_slug)`;
  - `book_editions(book_slug, version, data, layout, note, published_by, published_at)`.
  - The stable item ids (`u`) and the layout remapping the reader already does stay exactly as they are.
- **Dated books store entries as rows** (`book_entries(book_slug, entry_date, title, intro, items, closing, publish_at)`). The existing `weekly_prayers` rows move into it, or it becomes a view over them (builder's call).
- **Privacy:** edition and entry rows are readable only through RLS:
  - `free` books: anyone;
  - `members` books: users in `members`, or with a members grant;
  - `paid` books: users with an entitlement for that book, or for `all`.
- **Covers** go in a public Supabase Storage bucket. Content never goes in a public bucket.
- **Existing editions:** Covenant and Jesus Chosen Fast and Prayer move from `book_versions` / `lib_versions`, keeping their version numbers so users' `bookV` stays valid. Their bundled JSON becomes edition 0.

### 4. Access and entitlements

- **`books.access`**: `free | members | paid`.
- **`entitlements(user_id, scope, source, expires_at, revoked_at, created_at)`**:
  - `scope`: `book:<slug>` or `all`;
  - `source`: `grant`, `members`, `apple`, `google`, `stripe`;
  - `expires_at` null means forever; a subscription sets it.
- **One database function, `can_read(slug)`**, decides access, and every content RLS policy uses it. The app asks the same function, so the UI and the data agree.
- **Members today:** `members` stays the source for `members` access. No data moves, and nobody loses access.
- **Registration code:** stays as it is on the web.
  - TODO (later project): code redemption is not offered inside the iOS app (Apple 3.1.1). Members redeem on the web, and the app honours the membership.
- **Starting access (owner decision, 2026-10-16):**
  - Weekly, Rooted and Jesus Chosen Fast and Prayer: `free`;
  - Covenant: `members`.
  - Free books open without signing in. Signing in only adds sync.
- **The guest access code is removed (owner decision, 2026-10-16):**
  - **In the app:** the "Continue with access code" path and the device unlock are deleted.
  - **On the live site:** the owner removes them in Claude Design, as part of the catalog update (§7). The data contract says so explicitly.
  - **People on a device unlocked with the code:**
    - they can still open free books;
    - Covenant asks them to sign in or create an account (with the registration code);
    - their on-device progress is kept and merged into the account on first sign-in, as sync already does, so nothing is lost.
  - **The stored hash goes:** the app no longer stores or checks the shared code's hash. The registration code stays a server-side check (`redeem_code`).

### 5. Shelves and sections (what the Library home and store show)

- **`sections(placement, kind, title, position, visible, starts_at, ends_at)`**:
  - `placement`: `home` or `store`;
  - `kind` is one of a fixed set the designs know how to draw: `featured`, `this_week`, `continue`, `plan`, `shelf`, `banner`.
- **`section_books(section_id, book_slug, position)`** lists the books on a `shelf` or `featured` section.
- **`banners`** (or banner fields on `sections`): image, title, text, link (a book, a week, or an external URL), and dates.
- **Visibility:** the designs draw sections in `position` order, skipping hidden ones and ones outside their dates.
  - **Dated sections:** they appear and disappear on their own, with no deploy.
- **Section kinds:** adding a new one is a design change; arranging existing ones is not.

### 6. The new Admin Console (owner decision, 2026-10-16)

**Where it's built:** the Admin Console is rebuilt in `app/` as a web-only admin area (not included in the store apps), using the Classical design tokens. It replaces the Claude Design Admin Console at the same address (`/overcomers/admin/`) once it can do everything the current one does:
- edit, publish, view versions of and restore Covenant and Jesus Chosen Fast and Prayer;
- the weekly prayers editor with scheduled `publish_at`;
- users (roles, reset, delete);
- usage insights;
- translations.

Until then both run side by side. The old one keeps working because the old tables stay compatible (§3).

On top of today's features, editors (the existing `editor` / `admin` roles) can:
1. **Books:**
   - create from a template;
   - edit settings, with validation messages in plain words;
   - upload or replace the cover;
   - set access and status.
2. **Content:**
   - **import:** a Word document or PDF, converted to the book format, then reviewed before saving to the draft;
   - **edit:** directly in the existing draft editor;
   - **publish:** a new edition, with a note.
3. **Weekly and other dated books:** add or edit entries with a publish date (today's weekly editor, generalized).
4. **Shelves and sections:** reorder (drag), show or hide, date ranges, choose and order books.
5. **Preview:** see a draft book as a reader would, before publishing.
   - **Sections and banners:** these have no draft layer. Saving one hidden and turning on "show hidden" lets an editor see it in place before switching it on. (My call.)

### 7. Data contract for Claude Design (owner decision, 2026-10-16)

The owner updates the live Library home, store and readers in Claude Design to read the catalog. A separate document, `docs/catalog-data-contract.md`, is pasted into Claude Design and must let a designer with no other context build against the catalog. It covers:
- **Endpoints:** which views and RPCs to call with the anon or user key. Pages never touch base tables directly.
- **Fields and examples:** every field with an example payload for each of the four templates.
- **Readers:** how a reader page gets a book, its `config`, the latest edition and progress keys, and how it opens any catalog book (e.g. `?book=<slug>`) rather than one hard-coded per folder.
- **Shelves:** how the home and store read sections, banners and books in order, honouring dates and visibility.
- **Access:** how to show free, members and paid books, what `can_read` returns, and what to show when content is locked.
  - Free books open without the sign-in gate.
  - The guest "Continue with access code" path is removed everywhere.
- **Compatibility:** progress and sync rules that keep existing users' data.

The contract ships with Phase 1, so design work can start as soon as the tables exist.

### 8. Readers

- The reader takes everything from `books.config`, so wording, numbering, check placement and features come from data. Two reader layouts exist in design: prayer and reading.
- In the app (`app/`), the ported prayer reader becomes config-driven. Browser tests prove that Covenant, Jesus Chosen Fast and Prayer and Weekly render as they do today.
- The reading reader (Rooted) isn't ported yet. It waits until porting resumes, and Rooted keeps its device-only `gra-nr-rooted-*` progress until then. (My call.)
- **Progress keys don't change:** `gra-<slug>-*` locally; `library_state(book = slug)` remotely. Covenant stays in `book_state` for compatibility.

## Phases

1. **Schema, seed and data contract** (no visible change):
   - catalog, editions, entries, entitlements, sections and `can_read`;
   - the four books seeded from today's content and versions;
   - RLS tested;
   - old tables kept compatible;
   - `docs/catalog-data-contract.md` written, so the owner can start the Claude Design updates.
   - The live site keeps using its JSON files.
2. **New Admin Console:** today's features plus books, content import, editions, dated entries, shelves and sections. It replaces `site/admin` at parity.
3. **App reader on the catalog:** the app reads books, config, content and sections from Supabase. Browser tests prove the four seeded books match today's rendering.
4. **Switchover:**
   - the main URL moves to the app (needs the remaining screens ported);
   - public content JSON is removed from `site/`;
   - existing progress carries over (already compatible).
5. **Payments** (separate project): a provider writes `entitlements`.

## Constraints

- **Supabase** stays the backend.
- **Migrations:** every table gets RLS. Migrations go in `supabase/migrations/`, are idempotent where practical, and production is deployed with `npm run db:deploy` only when asked.
- **Public repo:** no secrets. Content in the repo stays only until the switchover.
- **Layouts:** Claude Design owns them. Anything the dashboard controls must be something the designs can draw from data.
- **Store rules:**
  - Apple 3.1.1: no code-unlock in the iOS app;
  - 3.1.3(b): content granted elsewhere is fine if also sold in-app.

## Decided by the owner

- Option C: templates you start from, then adjust.
- A content dashboard for books, shelves, sections and featured items.
- Layouts stay in Claude Design; no page builder.
- The Admin Console is rebuilt in code as the new dashboard and replaces the live one at parity.
- The live Library home, store and readers are updated by the owner in Claude Design to read the catalog, using a data contract written as part of this project.
- Purchase vs subscription is undecided; the model supports both.

## My calls (owner to check)

- Four templates seeded from today's books, with the `config` fields above.
- The slug is permanent and doubles as the progress and sync key.
- Covenant keeps syncing in `book_state`; new books use `library_state`.
- `members` stays the source of members access; entitlements add `grant` / store sources.
- Covers in a public bucket; content only behind RLS.
- Old tables (`book_versions`, `lib_versions`, weekly) kept compatible as views or synced until the switchover; full privacy only at the switchover.
- (Superseded by owner decision: Weekly, Rooted and Jesus Chosen Fast and Prayer free; Covenant members; guest code removed.)
- Jesus Chosen Fast and Prayer: lists as `names`; the weekly placeholder as an `embed`; plans and history stay outside the catalog.
- Sections and banners have no draft layer; "save hidden and preview" instead.
- Rooted's reader waits for porting to resume; its progress stays device-only.

## Left to the builder

- Exact table and column names, indexes, and the JSON schema for `config`.
- Whether `weekly_prayers` is migrated into `book_entries` or wrapped by a view.
- How Word or PDF import is implemented (client, edge function or offline tool), as long as editors review before saving.
- Dashboard interaction details within the existing Admin Console look.
