# Overcomer’s Library: catalog data contract

_For the Library home, store and reader designs in Claude Design. Last updated 2026-10-17._

## 1. What changed and why

Books no longer live in the page code. Each book's details, settings, content and access, and what the Library home and store show, now come from Supabase, and editors manage them in the Admin Console. The pages read everything through four calls, so adding a book or rearranging a shelf needs no design change.

## 2. Calling Supabase from a page

Use the existing Supabase client and settings the pages already have:

- Project URL: `https://sjcosqxtgllfwldhnoax.supabase.co`
- Anon key: the one already in the pages (it is public by design).
- Sign-in session storage key: `gra-covenant-auth`. Keep it, so people stay signed in.
- Calls: `const { data, error } = await sb.rpc('<name>', { …args })`.

**For books and shelves**, pages use **only** the four functions below; never select book or shelf tables directly.

**Everything else keeps the calls the pages make today.** Don't remove them:
- sign-in and accounts (`sb.auth.*`, including password reset);
- membership (`members`, `redeem_code`) and the admin badge (`admins`);
- progress sync (`book_state` for Covenant, `library_state` for other books, §8);
- usage counts (`log_usage`).

## 3. The four calls

### `get_library(p_placement, p_show_hidden = false)`

Returns what to show on the Library home (`'home'`) or the book store (`'store'`), in order.
- Hidden sections and ones outside their date window are already filtered out.
- Only published books appear.

```json
[
  { "id": "00000000-0000-4000-8000-000000000001", "kind": "this_week", "title": "GRA Weekly Kingdom Prayers", "banner": {}, "books": [] },
  { "id": "00000000-0000-4000-8000-000000000004", "kind": "shelf", "title": "My Prayer Library", "banner": {},
    "books": [
      { "slug": "covenant", "title": "Book of Covenant Prayers", "subtitle": "", "author": "",
        "cover": { "colors": ["#25685d", "#11372f", "#d9c27e"] },
        "access": "members", "can_read": false, "template": "prayer_manual", "reader": "prayer" }
    ] }
]
```

The home starts with five sections in this order: `this_week`, `plan`, `continue`, a `shelf` "My Prayer Library" (covenant, jcfp, weekly), and a `shelf` "Spiritual Nourishment" (rooted).

### `get_book(p_slug)`

Returns one book's details and settings, or `null` if there's no such published book.

```json
{
  "slug": "jcfp", "template": "watch_manual", "title": "Jesus Chosen Fast and Prayer Prayer Manual",
  "subtitle": "", "author": "", "description": "", "language": "en", "status": "published",
  "cover": { "colors": ["#8e2d3a", "#561620", "#dcb86c"] },
  "access": "free", "can_read": true,
  "config": {
    "reader": "prayer",
    "levels": [ { "name": "Watch", "show_titles": true }, { "name": "Topic", "show_titles": false } ],
    "content": ["prayer", "names", "embed"],
    "check_on": "item", "numbering": "running", "actions_on": "level-1", "schedule": "fixed",
    "features": { "focus": true, "listen": true, "plans": true, "scripture": true, "verse_popups": true,
                  "notes": true, "pen": true, "search": true, "share": true, "journal": true }
  }
}
```

**Covers:** `cover.colors` is `[light, dark, ink]` for drawn covers. If a book has `cover.image_url`, show the image instead.

### `get_edition(p_slug)`

Returns the book's newest content, in the same shape as today's book files: `{ "slug", "version", "layout", "data" }`.
- **Prayer books:** `data` is the list of parts, sections and prayers.
- **Reading books:** `data` is the chapters object, as `books/rooted.json` is today.
- **No access:** the call fails with `error.message === 'locked'`. Show the access state from §6.

```json
{ "slug": "jcfp", "version": 0, "layout": [ … ],
  "data": [ { "label": "Prayer Watch ONE", "title": "FIRST PRAYER WATCH", "subtitle": "",
              "sections": [ { "title": "Prayers for America", "hideTitle": true, "foundation": [],
                              "prayers": [ { "text": "Prayers for America",
                                             "scripture": [ { "ref": "1 Timothy 2:1-3", "verses": [ { "n": "", "text": "I exhort therefore…" } ] } ] } ] } ] } ] }
```

Use `version` exactly as the reader uses the published version today (the `bookV` it remembers). Version 0 is the edition bundled with the site.

### `get_entries(p_slug)`

Returns the published entries of a dated book (`config.schedule === "dated"`, e.g. `weekly`), newest first. Future-dated entries are already left out. If the reader has no access, it fails with `locked`, like `get_edition`.

```json
[ { "entry_date": "2026-10-12", "title": "Weekly Kingdom Prayers", "intro": "",
    "items": [ { "text": "Father, let the heavens be opened over every minister…", "ref": "Acts 19:20" } ],
    "closing": "In Jesus Christ name we pray, AMEN!" } ]
```

## 4. What `config` means on screen

| Field | Values | On screen |
|---|---|---|
| `reader` | `prayer`, `reading` | Which reader opens the book. Prayer: parts and sections of numbered prayers. Reading: chapters of prose. |
| `levels[].name` | e.g. Part, Section, Watch, Topic, Chapter, Week | The words used everywhere: "Section 1.2", "Prayer Watch ONE", "Mark all prayed in this watch". The first level is the outermost. |
| `levels[].show_titles` | true / false | false: don't print that level's titles in the text. JCFP hides topic titles. They still appear in the contents. |
| `content` | `prayer`, `reading`, `names`, `foundation`, `embed` | What the book can contain. `foundation`: scripture block at the top of a section. `names`: a list of names (e.g. U.S. states). `embed`: an item that shows another book inline, e.g. JCFP's "this week's Kingdom Prayers". |
| `check_on` | `item`, `level-1`/`2`/`3`, `none` | Where the check circle goes: on each prayer, on each section/chapter, or nowhere (reading progress only). |
| `numbering` | `nested`, `running`, `none` | `nested`: 1.2.3 (Covenant). `running`: 1, 2, 3 … through each outermost level (JCFP counts through the whole watch). `none`: no numbers. |
| `actions_on` | `level-1`/`2`/`3` | Which level shows "Mark all prayed", "Focused Mode", "Bookmark", "Listen". Covenant: sections (`level-2`). JCFP: watches (`level-1`). |
| `features.focus` | true / false | Focused Mode button and tap-a-prayer-to-focus. |
| `features.listen` | | Listen buttons and the now-playing player. |
| `features.plans` | | "Add to plan", Today's Prayers tags, the plan builder. |
| `features.scripture` | | Scripture under each prayer, and the "Scripture under each prayer" setting. |
| `features.verse_popups` | | Tapping a reference opens the verse sheet. |
| `features.notes` | | Highlights, bookmarks and notes. |
| `features.pen` | | The pen / ink toolbar. |
| `features.search` | | Search within the book. |
| `features.share` | | Share a prayer (text or image). |
| `features.journal` | | Export journal. |
| `schedule` | `fixed`, `dated` | `dated`: the book is a series of dated entries from `get_entries`, newest first, with "This week" / past entries (like Weekly). |

## 5. Readers open any book

- **Prayer reader:** opens `?book=<slug>`, e.g. `covenant/` becomes `…/book/?book=covenant`. The old folders can stay as shortcuts.
- **Reading reader:** keeps `?b=<slug>`, as today.
- **Load order:**
  1. `get_book(slug)`, which gives the title, cover, config and access.
  2. `get_edition(slug)`, or `get_entries(slug)` when `schedule` is `dated`.
  3. Render with `config`.

## 6. Access on screen

- **`access: "free"`:** opens straight away, no sign-in gate. Signing in is optional and only adds sync. Offer it from the account or settings area.
- **`access: "members"` with `can_read: false`:** show the existing gate:
  - sign in;
  - create an account with the GRA registration code;
  - "One more step" to enter the code on an existing account.
  - After sign-in, call `get_book` again; `can_read` becomes true for members.
- **`access: "paid"` with `can_read: false`:** show a locked state. The copy and design are up to you; purchasing isn't connected yet.
- **Remove "Continue with access code" and the device unlock entirely.** Don't store or compare the access code (or its hash) in the page. The registration code is checked by the server (`redeem_code`) only.

## 7. Shelves on the Library home and store

Draw `get_library('home')` and `get_library('store')` in the order returned. Design each kind once:

| `kind` | Draw |
|---|---|
| `this_week` | This week's Kingdom Prayers card (from `get_entries('weekly')`). |
| `plan` | Today's Plan card (from the device plan, as today). |
| `continue` | Continue card (last reading position, as today). |
| `shelf` | Its `title` and its `books` as covers, in order. |
| `featured` | One or more books given prominence. |
| `banner` | `banner.image_url`, `banner.title`, `banner.body`; tapping follows `banner.link`, which has one of `book` (a slug), `entry_date` (a weekly entry) or `url`. |

Editors can switch sections on and off, reorder them and date them. The page just draws what comes back.

## 8. Keep everyone's data

- **Progress keys:** `gra-<slug>-*` in localStorage stay exactly as they are (e.g. `gra-covenant-prayed`, `gra-jcfp-fav`). Shared keys keep the `gra-covenant-` prefix (`settings`, `member`, `uq`, …).
- **Rooted:** keeps `gra-nr-rooted-*`.
- **Sync:** Covenant syncs in `book_state` and every other book in `library_state` with `book = <slug>`, using today's merge rules.
- **Signed-in non-members** can now sync free books.
- **Usage counts:** keep calling `log_usage` for Covenant.

## 9. Don't

- Read books, editions, entries or shelves from tables directly; use the four calls. (Sync, sign-in, membership and usage calls stay as they are, §2.)
- Embed book content in the page (no `prayersData` / `jcfpData` resources). Content comes from `get_edition` / `get_entries`.
- Keep the access code, its hash, or the device unlock.
