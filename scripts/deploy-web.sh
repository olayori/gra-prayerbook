#!/usr/bin/env bash
# Deploys site/ to GitHub Pages and waits until the new version is live.
#
#   npm run web:deploy
#
# Pushes main (the Pages workflow deploys on push), or triggers the workflow by hand if
# there is nothing new to push, then checks the live service worker version.
set -euo pipefail
cd "$(dirname "$0")/.."

LIVE=https://olayori.github.io/overcomers
WORKFLOW=pages.yml

[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "deploy from main"; exit 1; }
[ -z "$(git status --porcelain -- site)" ] || { echo "site/ has uncommitted changes; commit them first"; exit 1; }

npm run --silent verify

git fetch -q origin main
sha=$(git rev-parse HEAD)
if [ "$sha" != "$(git rev-parse origin/main)" ]; then
  git push origin main
else
  echo "nothing new to push; triggering $WORKFLOW"
  gh workflow run "$WORKFLOW" --ref main
fi

run=""
for _ in $(seq 1 20); do
  run=$(gh run list --workflow "$WORKFLOW" --commit "$sha" --limit 1 --json databaseId -q '.[0].databaseId' 2>/dev/null || true)
  [ -n "$run" ] && break
  sleep 3
done
if [ -z "$run" ]; then
  echo "no Pages run started for $sha (push touched no deployable paths?); triggering it"
  gh workflow run "$WORKFLOW" --ref main
  sleep 5
  run=$(gh run list --workflow "$WORKFLOW" --limit 1 --json databaseId -q '.[0].databaseId')
fi
gh run watch "$run" --exit-status

want=$(grep -o "const C='[^']*'" site/sw.js)
for _ in $(seq 1 10); do
  live=$(curl -fsS "$LIVE/sw.js?ts=$(date +%s)" | grep -o "const C='[^']*'" || true)
  [ "$live" = "$want" ] && { echo "live at $LIVE/ ($want)"; exit 0; }
  sleep 6
done
echo "deployed, but $LIVE/sw.js still shows ${live:-nothing} (expected $want); the CDN may need a minute"
exit 1
