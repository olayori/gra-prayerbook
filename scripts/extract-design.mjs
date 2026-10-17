#!/usr/bin/env node
// Extracts readable source from the deployed bundles into design/src/<page>/ so design
// changes show up as normal diffs in git. Generated output — never edit it by hand.
//
//   node scripts/extract-design.mjs            # all pages in site/
//   node scripts/extract-design.mjs <bundle.html> <page>

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGES, UUID, appScript, assetNames, decodeAsset, parseBundle, sha } from './lib/bundle.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

// Vendored or generated assets we only record by hash.
const SKIP = (name, text) =>
  /^react(-dom)?\.production\.min\.js$/.test(name) ||
  /\.(woff2?|webp|png|jpe?g|svg)$/.test(name) || /^(woff2?|webp|png|jpeg|svg\+xml)-\d+$/.test(name) ||
  /Data$/.test(name) ||
  (text && text.startsWith('// GENERATED from dc-runtime'));

export function extract(html, page) {
  const bundle = parseBundle(html);
  const names = assetNames(bundle);
  const out = join(ROOT, 'design', 'src', page);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  const code = appScript(bundle.template);
  const props = (bundle.template.match(/<script type="text\/x-dc"[^>]*data-props="([^"]*)"/) || [])[1];
  const template = bundle.template
    .replace(code, '\n/* → app.js */\n')
    .replace(UUID, (u) => `asset:${names[u] || 'unknown'}`);

  writeFileSync(join(out, 'template.html'), template);
  writeFileSync(join(out, 'app.js'), code.trim() + '\n');
  if (props) writeFileSync(join(out, 'props.json'), JSON.stringify(JSON.parse(props.replace(/&quot;/g, '"').replace(/&amp;/g, '&')), null, 2) + '\n');

  const assets = [];
  for (const [uuid, entry] of Object.entries(bundle.manifest)) {
    const name = names[uuid] || `unreferenced-${uuid.slice(0, 8)}`;
    const bytes = decodeAsset(entry);
    const text = /javascript|json|css/.test(entry.mime) ? bytes.toString('utf8') : null;
    assets.push({ name, mime: entry.mime, bytes: bytes.length, sha256: sha(bytes).slice(0, 16) });
    if (text && !SKIP(name, text)) writeFileSync(join(out, name.endsWith('.js') ? name : `${name}.js`), text);
  }
  assets.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync(join(out, 'assets.json'), JSON.stringify({ title: bundle.title, assets }, null, 2) + '\n');
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [file, page] = process.argv.slice(2);
  if (file) {
    console.log('extracted →', extract(readFileSync(file, 'utf8'), page || 'unknown'));
  } else {
    for (const [page, { targets }] of Object.entries(PAGES)) {
      const dir = extract(readFileSync(join(ROOT, 'site', targets[0]), 'utf8'), page);
      console.log(`${page.padEnd(6)} → ${dir.replace(ROOT, '')}`);
    }
  }
}
