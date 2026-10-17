#!/usr/bin/env bash
# Applies pending supabase/migrations/ to production (gra-prayerbook).
#
#   npm run db:deploy             # shows status + dry run, asks before applying
#   npm run db:deploy -- --yes    # no prompt
#
# Needs, once per machine: `npx supabase login` (or SUPABASE_ACCESS_TOKEN) and the
# database password in SUPABASE_DB_PASSWORD (Supabase → Project Settings → Database).
set -euo pipefail
cd "$(dirname "$0")/.."

REF=sjcosqxtgllfwldhnoax
sb() { npx --no-install supabase "$@"; }

if [ "$(cat supabase/.temp/project-ref 2>/dev/null)" != "$REF" ]; then
  echo "== linking to $REF"
  sb link --project-ref "$REF"
fi

echo "== migrations (local vs production)"
sb migration list --linked

echo "== dry run"
sb db push --linked --dry-run

if [ "${1:-}" != "--yes" ]; then
  read -r -p "Apply these migrations to PRODUCTION? [y/N] " answer
  [ "$answer" = "y" ] || { echo "cancelled"; exit 1; }
fi

sb db push --linked
echo "== after"
sb migration list --linked
