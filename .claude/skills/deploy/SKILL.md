---
name: deploy
description: Deploy Overcomer's Library — database migrations to Supabase and/or the web app to GitHub Pages. Use only when the user explicitly asks to deploy, release, ship, or push changes live ("deploy", "deploy db", "deploy the app").
---

# Deploy

Deploy only what the user asked for: `db`, `web`, or both. **Always deploy the database before the web app**, because new pages may depend on new tables.
This changes production for real users, so confirm the plan with the user unless they already said to go ahead in this request.

## Database (Supabase project `gra-prayerbook`, ref `sjcosqxtgllfwldhnoax`)

1. Check `supabase/migrations/` for pending files: `npm run db:status` (requires the project to be linked).
2. **First time on a machine:** the user must run `npx supabase login` (interactive) and set `SUPABASE_DB_PASSWORD`. If either is missing, the link step fails. Ask the user to do it; don't try to work around it.
3. **First deploy ever:** production was set up by hand, so record the baseline as applied without running it: `npm run db:baseline`.
4. `npm run db:deploy` shows status and a dry run. Show the user the pending list, then apply with `npm run db:deploy -- --yes`.
5. Afterwards, run the Supabase MCP `get_advisors` (security) on `sjcosqxtgllfwldhnoax` and report any new warnings.

Never edit a migration that has already been applied. Add a new one instead.

## Web app (GitHub Pages → https://olayori.github.io/overcomers/)

1. Make sure the changes are committed on `main`.
2. `npm run web:deploy` runs `npm run verify`, pushes `main` (or triggers the workflow), waits for the Pages workflow, then confirms the live `sw.js` cache version matches the local one.
3. Report the live URL and the deployed cache version.

If the Pages workflow fails, show the failing step with `gh run view <id> --log-failed`.
