#!/usr/bin/env node
// Static checks on site/ before it is deployed:
//   - every page is a valid bundle, is the page its path says, and all its assets decode
//   - every file the service worker precaches exists
//   - data files parse

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, UUID, classify, decodeAsset, parseBundle } from './lib/bundle.mjs';

const SITE = fileURLToPath(new URL('../site', import.meta.url));
const errors = [];
const fail = (msg) => errors.push(msg);

for (const [page, { targets }] of Object.entries(PAGES)) {
  for (const target of targets) {
    const path = join(SITE, target);
    if (!existsSync(path)) { fail(`${target}: missing`); continue; }
    try {
      const bundle = parseBundle(readFileSync(path, 'utf8'));
      const kind = classify(bundle);
      if (kind !== page) fail(`${target}: looks like the "${kind}" design, expected "${page}"`);
      for (const [uuid, entry] of Object.entries(bundle.manifest)) {
        try { decodeAsset(entry); } catch (e) { fail(`${target}: asset ${uuid} does not decode (${e.message})`); }
      }
      for (const uuid of new Set(bundle.template.match(UUID) || [])) {
        if (!bundle.manifest[uuid] && !bundle.template.includes(`about:blank#${uuid}`)) {
          // Unresolved uuids are usually harmless ids in app code; only flag asset-like uses.
          if (new RegExp(`(src|href)=\\\\?"${uuid}|url\\(["']?${uuid}`).test(bundle.template)) fail(`${target}: references missing asset ${uuid}`);
        }
      }
    } catch (e) {
      fail(`${target}: ${e.message}`);
    }
  }
}

const sw = readFileSync(join(SITE, 'sw.js'), 'utf8');
const core = JSON.parse(sw.match(/const CORE=(\[[^\]]*\])/)[1].replace(/'/g, '"'));
for (const url of core) {
  const rel = url.replace(/^\.\//, '');
  const path = join(SITE, rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel);
  if (!existsSync(path)) fail(`sw.js precaches ${url} but ${path.replace(SITE, 'site')} does not exist`);
}

for (const json of ['prayers.json', 'jcfp.json', 'i18n-fr.json', 'i18n-es.json', 'books/rooted.json', 'manifest.webmanifest']) {
  try { JSON.parse(readFileSync(join(SITE, json), 'utf8')); } catch (e) { fail(`${json}: ${e.message}`); }
}

if (errors.length) {
  console.error(`site check failed:\n  - ${errors.join('\n  - ')}`);
  process.exit(1);
}
console.log(`site check passed (${Object.values(PAGES).flatMap((p) => p.targets).length} pages, ${core.length} precached files, cache ${sw.match(/const C='([^']+)'/)[1]})`);
