# Overcomer’s Library

GRA prayer library: a PWA on GitHub Pages (https://olayori.github.io/overcomers/) with a Supabase backend (`gra-prayerbook`, ref `sjcosqxtgllfwldhnoax`). Direction and options for the app-store version: `docs/ARCHITECTURE.md`.

## Layout
- `site/` is the deployed web root. Pages are **Claude Design standalone exports**: self-unpacking bundles. Never hand-edit them. Change the design in Claude Design and re-import.
  - The book export is deployed three times (`covenant/`, `jcfp/`, `weekly/`). The page picks its book from the URL.
  - `sw.js` precaches the pages. Its cache name (`gra-prayers-vN`) must be bumped whenever pages change. `design:pull` does this.
- `design/src/<page>/` holds the readable source extracted from each bundle (`app.js`, `template.html`, `assets.json`). It is generated, never edited, and exists for diffs and review.
- `app/` is the new app (Vite + React + TypeScript, Capacitor 8 for iOS/Android; decided 2026-10-16, see `docs/ARCHITECTURE.md`). Screens are ported from `design/src/` one at a time. Done so far: Weekly Kingdom Prayers. Until a screen is ported, `site/` keeps serving it. CI publishes a preview at https://olayori.github.io/overcomers/app/.
  - `app/android`, `app/ios` are Capacitor native projects: `npm run cap:sync -w app` after building, then open in Android Studio / Xcode.
  - App id `org.gra.overcomers` is a placeholder. It is permanent after the first store upload, so confirm it with the user before then.
- `supabase/migrations/` is the database schema. `supabase/functions/` holds edge functions (`translate` is not deployed; DeepL is off). Production had no migration history before `20261013000000_baseline.sql`.
- `scripts/` holds the design importer and extractor, the site checks, the local server and the deploy scripts. `tests/` holds the Playwright smoke tests.

## Commands
| | |
|---|---|
| `npm run serve` | local site at http://localhost:4173/overcomers/ |
| `npm run verify` | site checks, app unit tests, app build, browser tests (Supabase blocked or mocked) |
| `npm run app:dev` | app dev server (Vite) |
| `npm run design:pull -- <export(s)>` | import Claude Design exports (see the `pull-design` skill) |
| `npm run db:new <name>` | new migration |
| `npm run db:deploy` | push migrations to production (see the `deploy` skill) |
| `npm run web:deploy` | deploy site/ via GitHub Pages and confirm it is live |

## Rules
- Pull, commit and deploy only when asked. "Pull designs" does not mean deploy.
- Deploy the database before the web app.
- Migrations must be idempotent where practical, and every table needs RLS. Never edit an applied migration.
- The repo is public. Never commit secrets: the Supabase anon key in pages is public by design, but service-role keys and the DB password are not.
