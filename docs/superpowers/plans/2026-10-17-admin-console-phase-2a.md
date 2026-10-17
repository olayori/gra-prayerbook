# Admin Console Phase 2A (parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Admin Console in `app/` with everything the live one does, working on catalog books. Then move `/overcomers/admin/` to it.

**Architecture:**
- **Where it lives:** a lazy-loaded, web-only area at `#/admin/<tab>` in the existing React app, using the Classical tokens and the shared auth store.
- **Pure logic, unit-tested:** the book-editor engine (tree edits, undo, change log, diff, problems, clean), the weekly paste parser, and the user/insight maths.
- **Screens are thin** over that logic.
- **Drafts** go through two new editor-only RPCs that check for conflicts on the server. Content comes from `book_editions`, so no bundled JSON is needed.
- **Browser tests** run against the local Supabase stack with real users, RLS and RPCs.

**Tech Stack:** React 19 + TypeScript, React Router (hash), supabase-js, Vitest, Playwright, Supabase CLI local stack, pgTAP.

**Spec:** `docs/superpowers/specs/2026-10-16-book-catalog-design.md` §6 (new Admin Console, parity list). The behaviour reference is the live console's source: `design/src/admin/app.js` (logic) and `design/src/admin/template.html` (layout and copy).

## Global Constraints

- **Parity:** every behaviour listed in the task's "Parity" block matches `design/src/admin/app.js`, with the same wording for buttons, confirmations, toasts and errors, unless the task says otherwise.
- **Who can get in:** `admins.role` of `editor` or `admin`. The Users tab is `admin` only. Anyone else signed in sees "This account isn’t an editor" plus Sign out.
- **Web only:** under Capacitor (`Capacitor.isNativePlatform()`), `#/admin*` redirects to `/`.
- **Books edited:** catalog books with `config.reader = 'prayer'` and `config.schedule = 'fixed'`, at first `covenant` and `jcfp`. Content is the newest `book_editions` row (version 0 = "Original book").
- **Drafts:** stay in `book_draft` (covenant) / `lib_draft` (other slugs), read and written only through `get_draft` / `save_draft`. Publishing goes through `publish_edition`.
- **The live site is untouched until Task 11.**
- **Production:** `npm run db:deploy` and `npm run web:deploy` are pre-authorized by the owner for this project (no users yet).
- **Commits:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- **Translations "Prepare in French and Spanish"** is left out, because the translate function and DeepL key aren't deployed. The list, search, edit and save are in.

## Review Focus

1. **Two editors change the same draft:** the second save shows the conflict banner ("Someone else changed this draft…" + Reload). It never silently overwrites. Test in Task 1 (RPC) and Task 5 (UI).
2. **An editor closes the tab with unsaved changes:** the browser's leave-page warning appears. Test in Task 5.
3. **Publishing with an empty prayer or an untitled section:** Publish stays disabled, and the problem links jump to the item. Test in Task 4 (unit) and Task 5.
4. **A weekly paste with no numbered prayers** shows "No numbered prayers found…" and changes nothing. Test in Task 7.
5. **An admin tries to remove their own admin role or delete themselves:** refused with the old wording. Test in Task 8.

---

### Task 1: Draft RPCs

**Files:**
- Create: `supabase/migrations/20261017000300_admin_drafts.sql`
- Create: `supabase/tests/06_admin_drafts.test.sql`

**Interfaces:**
- Produces:
  - **`public.get_draft(p_slug text) returns jsonb`** (security definer, `search_path = ''`, editors only, else raise `'not allowed'`):
    - returns `{data, log, base_version, updated_at, updated_by}` from `book_draft` (id 1) for `covenant`, otherwise from `lib_draft`;
    - returns null when there's no draft.
  - **`public.save_draft(p_slug text, p_data jsonb, p_log jsonb, p_base_version int, p_expected_at timestamptz) returns jsonb`** (editors only):
    - if a draft row exists, its `updated_at` is distinct from `p_expected_at`, **and** its `updated_by` isn't `auth.uid()` → return `{"conflict": true}` without writing;
    - otherwise upsert (`log` trimmed to its last 500 entries) and return `{"conflict": false, "updated_at": <new>}`.
  - Grants: execute to authenticated only.

- [ ] **Step 1: Write `06_admin_drafts.test.sql`** with editor A and editor B (inserted into `admins` as `editor`), a non-editor, and the seeded `jcfp`:
  - non-editor: `get_draft` throws `'not allowed'`;
  - A: `save_draft('jcfp', '[1]', '[]', 0, null)` → `conflict` false and `get_draft('jcfp')->'data' = '[1]'`;
  - B: `save_draft('jcfp', '[2]', '[]', 0, null)` → `conflict` true, and the data is still `[1]`;
  - B: `save_draft(..., <A's updated_at>)` → `conflict` false;
  - A: saves again with its own stale `updated_at` → `conflict` false (same editor);
  - a 600-entry log is stored with 500 entries;
  - `covenant` reads and writes `book_draft`.
- [ ] **Step 2:** `npm run db:reset && npm run db:test`. Expected: 06 fails (functions missing).
- [ ] **Step 3: Implement the migration.**
- [ ] **Step 4:** `npm run db:reset && npm run db:test`. Expected: all 6 files pass.
- [ ] **Step 5: Commit** "Admin: draft RPCs with server-side conflict check".

### Task 2: Admin browser-test harness against the local stack

**Files:**
- Create: `scripts/admin-e2e-server.mjs`:
  - reads `npx supabase status -o env` (`API_URL`, `ANON_KEY`);
  - builds the app with `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` set to those into `app/dist-local` (`vite build --outDir dist-local`);
  - serves it with `vite preview --outDir dist-local --port 4310 --strictPort`.
- Create: `tests/admin/global-setup.mjs`:
  - creates or updates these users through the local Auth admin API with the `SERVICE_ROLE_KEY`:
    - `editor@test.local` / `editor-pass-1` (role `editor`);
    - `admin@test.local` / `admin-pass-1` (role `admin`);
    - `reader@test.local` / `reader-pass-1` (no role);
  - upserts their `admins` rows;
  - resets drafts for `covenant` / `jcfp` (delete the `book_draft` / `lib_draft` rows) and deletes `book_editions` with `version > 0`, so every run starts from edition 0.
- Create: `tests/admin/helpers.js`:
  - `signIn(page, who: 'editor' | 'admin' | 'reader')` fills the console's sign-in form;
  - `db(sql)` runs SQL through `psql` against the local DB URL from `supabase status`, for assertions.
- Create: `tests/admin/smoke.spec.js`:
  - reader sees "This account isn’t an editor";
  - editor sees tabs `Content, Weekly, Translations, Insights, History` (no Users);
  - admin also sees `Users`.
- Modify: `playwright.config.js`:
  - add project `admin` with `testDir: 'tests/admin'`, `baseURL: 'http://localhost:4310/'`, `globalSetup`, and its own `webServer` entry (`node scripts/admin-e2e-server.mjs`);
  - the existing projects ignore `tests/admin`.
- Modify: `package.json`:
  - `"test:admin": "playwright test --project admin"`;
  - `verify` stays as it is. Admin tests need Docker, and CI gets its own job.
- Modify: `.github/workflows/pages.yml`: new job `admin-e2e` (ubuntu, `supabase/setup-cli@v1`, `supabase start`, `npm ci`, `npx playwright install --with-deps chromium`, `npm run test:admin`). `deploy` needs both `verify` and `admin-e2e`.
- Modify: `.gitignore` (`app/dist-local`).

**Interfaces:**
- Consumes: the local stack (Docker running), the seeded catalog.
- Produces: `signIn(page, who)`, `db(sql): Promise<string>` (psql `-t -A` output), the three test accounts.

- [ ] **Step 1: Write `tests/admin/smoke.spec.js`** (the three role checks above).
- [ ] **Step 2:** `npm run test:admin`. Expected: FAIL (no `#/admin` route; the harness itself starts).
- [ ] **Step 3: Implement the harness files and a placeholder `#/admin` route.** Sign-in form (email, password, "Sign in"), the role check (`admins` select), the denied screen, and a tab bar per role. Layout from `template.html`'s header and tabs.
- [ ] **Step 4:** `npm run test:admin`. Expected: PASS.
- [ ] **Step 5: Commit** "Admin: shell, sign-in, roles, and browser tests on the local stack".

### Task 3: Admin shell completion: book picker, routing, native guard

**Files:**
- Create: `app/src/features/admin/AdminApp.tsx` (shell: header with book picker, signed-in email, role badge, Sign out, tabs → nested routes `#/admin/content|weekly|users|translations|insights|history`, toast)
- Create: `app/src/features/admin/admin.css`
- Create: `app/src/features/admin/useAdmin.ts`:
  - `useAdmin()` returns `{ me: string, role: 'editor' | 'admin', books: AdminBook[], book: AdminBook, pickBook(slug), toast(msg) }`;
  - `AdminBook = { slug, title, config }` comes from `books` where `config->>'reader' = 'prayer' and config->>'schedule' = 'fixed'`, ordered by `sort_hint`;
  - the chosen book persists in `localStorage['gra-admin-book']`. That's the same key as today; the value is now a slug.
- Modify: `app/src/App.tsx`: lazy `#/admin/*` route; redirect to `/` when `Capacitor.isNativePlatform()`.

**Parity:**
- Toasts last 3.2 s.
- Esc closes dialogs.
- Signing out with unsaved changes asks "Some changes aren’t saved yet. Sign out anyway?".

- [ ] **Step 1: Extend `smoke.spec.js`:**
  - the picker lists "Book of Covenant Prayers" and "Jesus Chosen Fast and Prayer Prayer Manual";
  - the choice survives a reload;
  - `#/admin/users` as an editor redirects to `#/admin/content`.
- [ ] **Step 2:** `npm run test:admin`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `npm run test:admin` and `npm run verify`. Expected: PASS.
- [ ] **Step 5: Commit** "Admin: book picker, tabs and routes".

### Task 4: Book-editor engine (pure, unit-tested)

**Files:**
- Create: `app/src/features/admin/editor/engine.ts`
- Create: `app/src/features/admin/editor/engine.test.ts`

**Interfaces (all pure, no React):**
- `type EPrayer = { u: string; text: string; scripture: Scripture[] }` plus any extra keys kept as they are (e.g. `link`).
- `type ESection = { u: string; title: string; foundation: Scripture[]; prayers: EPrayer[]; [k: string]: unknown }`, which keeps `hideTitle`, `kind` and `list`.
- `type EPart = { u: string; title: string; subtitle: string; label?: string; sections: ESection[] }`
- `type Draft = EPart[]`
- `ensureU(d: Part[]): Draft`: same ids and defaults as the old console's `ensureU`.
- `newId(prefix: 'p' | 's' | 'pt'): string`
- **Edits**, each returning a new `Draft`:
  - `setPartTitle`, `setPartSubtitle`, `setSectionTitle`, `setPrayerText`;
  - `addPart`: title `'NEW PART'`;
  - `addSection(pu)`: title `'New section'`, one empty prayer;
  - `addPrayer(su, at?)`;
  - `deletePart`, `deleteSection`, `deletePrayer`;
  - `swapPrayer(u, dir: -1 | 1)`;
  - `move(kind: 'part' | 'section' | 'prayer', u, targetU, pos: 'before' | 'after' | 'into')`;
  - `setScripture(owner: 'f' | 'p', ownerU, idx: number, value: Scripture | null)`, where idx −1 adds and null removes.
- `class History { push(prev: Draft, key?: string): void; undo(cur): Draft | null; redo(cur): Draft | null }`:
  - coalesces pushes with the same key within 4 s;
  - keeps 80 steps.
- `logChange(log: LogEntry[], entry: { what, key?, by }, now): LogEntry[]`: coalesces the same key within 5 minutes.
- `diff(pub: Draft, draft: Draft): { st: {pAdd,pDel,pEdit,pMove,sAdd,sDel,sEdit,partAdd,partDel,partEdit}, total, flag: Record<u,'New'|'Edited'|'Moved'>, secFlag: Record<u,boolean> }`: the old console's `diff()` rules exactly.
- `problems(d: Draft, partLabel): { label, sel, fu? }[]`: the old console's `problems()` labels exactly.
- `clean(d: Draft, keepExtras: boolean): Part[]`:
  - Covenant uses `keepExtras = false` (`config.content` lacks `names`/`embed`): strip to the fields the old Covenant `clean()` keeps, and set `label` to `Part One…`;
  - other books keep every key and trim titles and text, like the old console's `lib` branch.
- `stats(data: Part[], st): { parts, sections, prayers, changes: st }`
- `partLabel(i): string` (`Part One` … `Part Fifteen`, then `Part 16`)
- `titleCase(s)`: the old console's `tc()`.

- [ ] **Step 1: Write `engine.test.ts`** with a 2-part fixture:
  - every edit is immutable (the input is unchanged);
  - `move` covers before/after/into for all three kinds;
  - `History` coalesces and has a limit of 80;
  - `diff` counts each category, including "Moved" when a prayer changes section, and `secFlag` is set on a section that lost a prayer;
  - `problems` labels exactly `Part Two has no title`, `Section 1.2 has no title`, `Section 1.2 has no prayers`, `Prayer 1.1.3 is empty` (review focus 3);
  - `clean` for Covenant drops unknown keys and labels parts, and for JCFP keeps `hideTitle`/`kind`/`list`/`link`;
  - `ensureU` on `site/jcfp.json` gives ids `part-1`, `s-1-1`, `s-1-1-1`.
- [ ] **Step 2:** `npm run app:test`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement `engine.ts`.**
- [ ] **Step 4:** `npm run app:test`. Expected: PASS.
- [ ] **Step 5: Commit** "Admin: book-editor engine".

### Task 5: Content tab: tree, editors, autosave, publish

**Files:**
- Create: `app/src/features/admin/editor/useBookDraft.ts`. The hook owns:
  - `draft`, `pub`, `pubV`, `versions`, `save: 'saved' | 'saving' | 'unsaved' | 'error'`, `conflict`;
  - `edit(what, key, fn)`, `undo`, `redo`, `publish(note)`, `discard()`, `reload()`.
  - Loading: `get_edition(slug)` gives `pub`/`pubV`, and `get_draft(slug)` gives the draft (else a copy of `pub`).
  - Saving: 1200 ms after the last edit, via `save_draft`. A conflict sets `conflict = true` and stops saving. An error retries after 8 s.
  - Publishing: saves first, then calls `publish_edition(slug, note, clean(draft), layoutOf(data), stats)`.
- Create: `ContentTab.tsx`, `Tree.tsx`, `SectionEditor.tsx`, `PartEditor.tsx`, `ScriptureDialog.tsx`, `MoveDialog.tsx`, `PublishDialog.tsx` in `app/src/features/admin/editor/`.
- Create: `tests/admin/content.spec.js`

**Parity** (`design/src/admin/app.js` lines 168–381, `template.html` content section):
- **Tree:** search over titles and prayers (≥ 2 characters, "N matches" / "No matches"); expand and collapse; drag and drop with before/after/into lines.
- **Selection:** the first section is selected on load.
- **Editors:**
  - section editor: kicker `Part One · Section 1.1`, title, foundation list with "No reference" placeholders, prayer rows with number, auto-sized textarea, scripture chips, up/down/insert/move/delete, and New/Edited/Moved flags;
  - part editor: title, subtitle, section list.
- **Dialogs:**
  - scripture: reference plus verse rows, "Add a reference first";
  - move: "Move to the end of".
- **Confirmations and labels:** every confirm text and every change-log `what` label as in the old console.
- **Header:**
  - save state: "Saving…" / "Unsaved changes" / "Couldn’t save · retrying" / "Draft saved" / "Draft up to date";
  - undo and redo buttons, and ⌘/Ctrl-Z / ⇧⌘Z when not typing;
  - "Publish" shows the change count.
- **Publish dialog:**
  - change lines;
  - up to 8 problem links that jump to the item;
  - a note field;
  - "Publish version N";
  - disabled when there are no changes or there are problems;
  - "Discard all changes".
- **Conflict banner:** "Someone else changed this draft. Reload to see their changes." plus Reload.
- **Leave-page warning:** `beforeunload` while the draft is unsaved.

- [ ] **Step 1: Write `content.spec.js`** (as the editor):
  - select JCFP, edit prayer 1.1.1's text; within 3 s "Draft saved" appears, and `db("select data->0->'sections'->0->'prayers'->0->>'text' from lib_draft where book='jcfp'")` equals the new text;
  - Ctrl-Z restores the old text;
  - add a prayer and leave it empty; the Publish dialog lists "Prayer … is empty" and the publish button is disabled; clicking the problem focuses that textarea (review focus 3);
  - fill it in and publish with note "test"; the toast is "Version 1 published" and `db("select max(version) from book_editions where book_slug='jcfp'")` is `1`;
  - **conflict (review focus 1):** a second browser context signed in as admin edits and saves; the first context then edits and shows the conflict banner; after Reload it shows the admin's text;
  - **leave-page warning (review focus 2):** after an edit, `page.evaluate(() => { const e = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(e); return e.defaultPrevented })` is `true`.
- [ ] **Step 2:** `npm run test:admin`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** `npm run test:admin` and `npm run verify`. Expected: PASS.
- [ ] **Step 5: Commit** "Admin: content editor with autosave, conflicts and publishing".

### Task 6: History tab

**Files:**
- Create: `app/src/features/admin/HistoryTab.tsx`
- Modify: `useBookDraft.ts`: add `versions` (select from `book_editions`: version, note, stats, published_by_email, published_at, ordered desc, including version 0) and `versionData(v)`.
- Create: `tests/admin/history.spec.js`

**Parity** (lines 657–686):
- **Change log:** "N changes since version V" or "No changes since version V", the newest 200 entries, and "Discard all changes".
- **Versions:**
  - each version is listed with "Live" on the current one;
  - version 0 is titled "Original book" with the note "The book as first loaded into the app";
  - the meta line reads "by … · N parts · N sections · N prayers";
  - Restore uses the old confirm text and toast "Restored to the draft. Review it, then publish.";
  - Download saves `<slug>-v<N>.json`. (The old name was `covenant-prayers-v…` for every book; this is a deliberate fix.)

- [ ] **Step 1: Write `history.spec.js`:**
  - after one edit, the log shows "1 change since version 0";
  - restoring "Original book" puts the draft back and the log records "Restored the original book";
  - Download produces a JSON file whose first part title equals edition 0's.
- [ ] **Step 2:** run it. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** run it. Expected: PASS.
- [ ] **Step 5: Commit** "Admin: history, restore and download".

### Task 7: Weekly tab

**Files:**
- Create: `app/src/features/admin/weekly/parse.ts`: `parseWeekly(raw: string): { week_of: string | null, title, intro, prayers: {text, ref}[], closing }`, the old console's `parseWeekly` exactly.
- Create: `app/src/features/admin/weekly/parse.test.ts`
- Create: `app/src/features/admin/weekly/WeeklyTab.tsx`
- Create: `tests/admin/weekly.spec.js`

**Parity** (lines 478–560, 598–628):
- **List:** each week with its status (Draft / Scheduled · … / Live) and prayer count.
- **New week:** defaults to next Monday, 06:00, title "Weekly Kingdom Prayers", closing "In Jesus Christ name we pray, AMEN!".
- **Paste and split:**
  - note "N prayers found · week of … Check them below.";
  - with nothing numbered: "No numbered prayers found. Each prayer should start with 1. 2. 3. …" (review focus 4).
- **Fields:** title, intro and closing; prayers with text and reference, up/down/delete, and add.
- **Modes:**
  - a week that isn't live yet: Schedule / Publish now / Keep as draft;
  - a live week: Live / Unpublish;
  - each mode with its explanatory note.
- **Errors:** "Choose the week date.", "Add at least one prayer.", and the duplicate-date message.
- **Delete:** the old confirm text.
- **Toasts** per mode.
- **Unsaved changes:** a guard when switching weeks.
- **Left out:** the i18n pre-translation (`GRAi18n.prewarm`), since i18n isn't ported.

- [ ] **Step 1: Write `parse.test.ts`.** Use the real text of `~/Downloads/KINGDOM PRAYERS - OCTOBER 12th 2026.pdf`, copied as a fixture `app/src/features/admin/weekly/fixtures/oct-12.txt` (extract with `pdftotext` if it's available; otherwise paste the 7 prayers from `weekly-oct-2026.sql`, with numbers):
  - 7 prayers, `week_of` `'2026-10-12'`, the first ref `Acts 19:20`, and the closing contains "AMEN";
  - text with no numbered lines gives `prayers.length === 0`.
- [ ] **Step 2: Write `weekly.spec.js`:**
  - New week, paste the fixture, Split, "7 prayers found";
  - choose Keep as draft and Save; toast "Saved as draft", and `db` shows a row with `publish_at` null;
  - paste "hello" and Split shows the "No numbered prayers found…" note, with the 7 prayers unchanged;
  - Delete removes the row.
- [ ] **Step 3:** run both. Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5:** run both. Expected: PASS.
- [ ] **Step 6: Commit** "Admin: weekly prayers".

### Task 8: Users tab (admin only)

**Files:**
- Create: `app/src/features/admin/users/userStats.ts`:
  - `histStats(h)`, the old console's version;
  - `userRow(apiRow, layouts: Record<number, Record<string, string>>)`, giving the old console's row fields;
  - `filterUsers(rows, q, filter, sort)`;
  - `toCsv(rows): string`, with the old header and order, and a BOM.
- Create: `app/src/features/admin/users/userStats.test.ts`
- Create: `app/src/features/admin/users/UsersTab.tsx`
- Create: `tests/admin/users.spec.js`

**Parity** (lines 385–467):
- **Data:**
  - users come from `admin_users()`;
  - the version layouts come from Covenant's `book_editions` (all versions, including 0).
- **Summary line:** "N accounts · N activated · N active this week".
- **Controls:**
  - filters: All / Activated / Not activated / Staff;
  - sortable columns;
  - search.
- **User detail:**
  - meta line;
  - six stat tiles;
  - a 26-week heat map with the 4-step colours;
  - per-part progress;
  - the latest 60 days.
- **Roles:**
  - Reader / Editor / Admin;
  - removing your own admin access gives "You can’t remove your own admin access", and you can't delete your own account (review focus 5).
- **Actions:**
  - Reset uses the old confirm;
  - Delete requires typing DELETE;
  - Export CSV is named `prayer-book-users-<date>.csv`.

- [ ] **Step 1: Write `userStats.test.ts`:**
  - `histStats` for a streak that includes today and one that ends yesterday;
  - `toCsv` quoting;
  - filters and sort.
- [ ] **Step 2: Write `users.spec.js`** (as admin):
  - the reader account is listed as "Not activated";
  - make it Editor, and `db` shows `admins.role = 'editor'`; set it back to Reader;
  - on your own row, choosing Reader shows the self-removal toast and Delete is disabled;
  - Export CSV downloads a file whose first line is the old header.
- [ ] **Step 3:** run both. Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5:** run both. Expected: PASS.
- [ ] **Step 6: Commit** "Admin: users".

### Task 9: Insights tab

**Files:**
- Create: `app/src/features/admin/insights/aggregate.ts`:
  - `aggregate(rows: {day, kind, ref, n}[], pub: Draft, days: number, today: Date)`, giving `{ stats, dayBars, parts, top, secs, themes }` with the old console's labels and maths;
  - the usage `ref`s are stable ids (`u`), resolved against the current published edition.
- Create: `app/src/features/admin/insights/aggregate.test.ts`
- Create: `app/src/features/admin/insights/InsightsTab.tsx`
- Create: `tests/admin/insights.spec.js`

**Parity** (lines 468–477, 629–656):
- **Range:** 7 days / 30 days / 90 days / Year.
- **Four stat tiles:**
  - Prayers checked;
  - Sessions started;
  - Active days;
  - Prayers per active day.
- **Charts and lists:**
  - day bars;
  - per-part bars;
  - top 12 prayers and top 12 sections, each linking into Content;
  - search themes.
- **Book:** insights are for Covenant (the only book that logs usage); for other books show "Usage is only counted for the Book of Covenant Prayers."

- [ ] **Step 1: Write `aggregate.test.ts`** with 3 days of rows: totals, `Prayers per active day` rounding, the top ordering, and ids that are no longer present are dropped.
- [ ] **Step 2: Write `insights.spec.js`:** insert `usage_daily` rows for today through `db`, open Insights on 7 days, and the "Prayers checked" tile shows the inserted sum.
- [ ] **Step 3:** run both. Expected: FAIL.
- [ ] **Step 4: Implement.**
- [ ] **Step 5:** run both. Expected: PASS.
- [ ] **Step 6: Commit** "Admin: insights".

### Task 10: Translations tab

**Files:**
- Create: `app/src/features/admin/TranslationsTab.tsx`
- Create: `tests/admin/translations.spec.js`

**Parity** (lines 561–597, without the warm button):
- **Language:** Français / Español.
- **Search:** with Enter or the Search button; it matches the source or the translation.
- **Rows:**
  - 60 rows, newest first;
  - each row shows the source, an editable translation, a tag ("Français · DeepL" or "· edited") and Save / Revert when changed;
  - the toast "Translation saved".
- **Empty states:**
  - with a search: "No translations match that search.";
  - otherwise: "Nothing translated yet. Open the app in French or Spanish."

- [ ] **Step 1: Write `translations.spec.js`:**
  - insert a `translations` row through `db`;
  - it's listed;
  - edit and Save; `db` shows `edited = true` and the new text.
- [ ] **Step 2:** run it. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4:** run it. Expected: PASS.
- [ ] **Step 5: Commit** "Admin: translations".

### Task 11: Move `/overcomers/admin/` to the new console

**Files:**
- Delete: `site/admin/index.html` (the Claude Design export)
- Modify: `.github/workflows/pages.yml`: after copying `app/dist` to `site/app`, write `site/admin/index.html`, a tiny page that redirects to `../app/#/admin/content` (meta refresh plus `location.replace`) with an "Opening the Admin Console…" fallback link.
- Modify: `scripts/lib/bundle.mjs` (remove `admin` from `PAGES`), `scripts/check-site.mjs` if needed, `tests/smoke.spec.js` (remove the admin case; the admin tests cover the console), `.claude/skills/pull-design/SKILL.md` (`Admin Console.dc.html` is no longer imported), `CLAUDE.md` (Layout: the Admin Console is now `app/src/features/admin`).
- Modify: `docs/superpowers/specs/2026-10-16-book-catalog-design.md` (§6 status: replaced on 2026-10-17).

- [ ] **Step 1: Check parity.** Walk through the parity blocks of Tasks 3, 5–10 against `design/src/admin/app.js`, and record any gap as a ledger ruling. Fix it, or note it as deferred, before switching.
- [ ] **Step 2: Make the changes and run** `npm run verify && npm run test:admin`. Expected: PASS.
- [ ] **Step 3: Commit**, merge to `main`, then `npm run db:deploy -- --yes` (Task 1's migration) and `npm run web:deploy`.
- [ ] **Step 4: Check the live site.** `https://olayori.github.io/overcomers/admin/` lands on the new console's sign-in, with no console errors.
