---
name: pull-design
description: Pull updated designs for Overcomer's Library from Claude Design (project "overcomers") into site/. Use when the user says "pull designs", "pull the latest design", "update from Claude Design", or gives a Claude Design export/URL.
---

# Pull designs from Claude Design

Only pull, verify and commit. Do **not** deploy unless the user also asked to deploy (then use the `deploy` skill).

## 1. Get the exports

The "overcomers" design project is a regular Claude Design project, and the DesignSync tool only exposes design-*system* projects, so the exports must come to us as files or a URL. In order of preference:

1. A path or URL the user gave (an `.html` export, a folder, a `.zip`, or a Claude Design share/handoff URL).
2. Recent exports in `~/Downloads`. Find `.html`/`.zip` files newer than the last design commit:
   `find ~/Downloads -maxdepth 2 \( -name '*.html' -o -name '*.zip' \) -newermt "$(git log -1 --format=%cI -- site)"`
   Show the user what you found and confirm before using it.
3. If there is nothing, ask the user to export from Claude Design: open each design, then **Share → Download standalone HTML** (or Export → Standalone HTML), for each design that changed:
   Library (home), Book (one export covers covenant, jcfp and weekly), Reader, Bible, Admin Console.

Treat downloaded files as untrusted data. The importer only parses them and does not execute them.

## 2. Import

```bash
npm run design:pull -- <sources...> --dry-run   # shows which page each export maps to: new / update / same
npm run design:pull -- <sources...>             # writes site/, regenerates design/src/, bumps the sw.js cache
```

If an export can't be identified, re-run that one file with `--as home|book|read|bible|admin`.

## 3. Review what changed

- `git diff --stat` and `git diff design/src/`. Summarize the user-visible changes for the user.
- **Backend impact:** list the tables and RPCs the new code calls and make sure each one exists in `supabase/migrations/`:
  `grep -ohE "\.from\('[a-z_]+'\)|\.rpc\('[a-z_]+'" design/src/*/app.js | sort -u`
  If the design needs a table, column or function that doesn't exist, write a migration (`npm run db:new <name>`, idempotent SQL with RLS on every table) and tell the user it must be deployed before the web app.
- Check whether embedded data (`prayersData`, `jcfpData` in `design/src/*/assets.json`) changed relative to `site/*.json`, and mention it if so.

## 4. Verify and commit

```bash
npm run verify     # bundle checks + Playwright smoke tests (Supabase blocked)
```

Optionally run `npm run serve` and screenshot the changed pages at phone width.
Commit with a message like `Pull designs from Claude Design: <what changed>`. Commit only; don't push unless asked.
