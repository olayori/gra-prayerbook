# Overcomer’s Library

Prayer books, the Weekly Kingdom Prayers, and the Bible, from God’s Remnant Assembly. Live at https://olayori.github.io/overcomers/.

- **Web app:** `site/`, designed in Claude Design and imported with `npm run design:pull`
- **Backend:** Supabase (auth, Postgres with RLS); schema in `supabase/migrations/`
- **Plan for the iOS/Android apps and the marketplace:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Develop

```bash
npm install
npx playwright install chromium
npm run serve      # http://localhost:4173/overcomers/
npm run verify     # checks + smoke tests
```

## Update designs and deploy

```bash
npm run design:pull -- ~/Downloads/<exports>   # import Claude Design standalone HTML exports
npm run db:deploy                              # apply new migrations to Supabase
npm run web:deploy                             # deploy to GitHub Pages
```

The database tools need `npx supabase login` and `SUPABASE_DB_PASSWORD` once per machine. Before the first deploy, run `npm run db:baseline` to record the hand-applied schema as migrated.
