#!/usr/bin/env node
// Imports Claude Design "standalone HTML" exports into site/.
//
//   npm run design:pull -- <source...> [--as <page>] [--dry-run]
//
// A source can be an .html export, a folder of them, a .zip, or an http(s) URL to either.
// Each export is identified automatically (home, book, read, bible, admin); use --as to
// force it when importing a single file. The book export is written to covenant/, jcfp/
// and weekly/ (the page picks its book from the URL). When anything changes, the service
// worker cache version is bumped so installed apps pick up the new pages.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extract } from './extract-design.mjs';
import { PAGES, classify, fingerprint, isBundle, parseBundle } from './lib/bundle.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SITE = join(ROOT, 'site');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const asIdx = args.indexOf('--as');
const forced = asIdx >= 0 ? args[asIdx + 1] : null;
const sources = args.filter((a, i) => !a.startsWith('--') && !(asIdx >= 0 && i === asIdx + 1));

if (!sources.length) {
  console.error('usage: npm run design:pull -- <file.html|folder|file.zip|url>... [--as home|book|read|bible|admin] [--dry-run]');
  process.exit(2);
}
if (forced && !PAGES[forced]) {
  console.error(`--as must be one of: ${Object.keys(PAGES).join(', ')}`);
  process.exit(2);
}

async function materialize(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src, { redirect: 'follow' });
    if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
    const dir = mkdtempSync(join(tmpdir(), 'design-'));
    const zip = /zip/.test(res.headers.get('content-type') || '') || src.endsWith('.zip');
    const file = join(dir, zip ? 'export.zip' : 'export.html');
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    return materialize(file);
  }
  if (!existsSync(src)) throw new Error(`${src}: not found`);
  if (statSync(src).isDirectory()) {
    return readdirSync(src, { recursive: true })
      .filter((f) => f.endsWith('.html') && !f.includes('__MACOSX'))
      .map((f) => join(src, f));
  }
  if (src.endsWith('.zip')) {
    const dir = mkdtempSync(join(tmpdir(), 'design-'));
    execFileSync('unzip', ['-q', '-o', src, '-d', dir]);
    return materialize(dir);
  }
  return [src];
}

const files = (await Promise.all(sources.map(materialize))).flat();
const found = {};
for (const file of files) {
  const html = readFileSync(file, 'utf8');
  if (!isBundle(html)) {
    console.log(`skip   ${file} (not a Claude Design standalone export)`);
    continue;
  }
  const bundle = parseBundle(html);
  const page = forced || classify(bundle);
  if (!page) {
    console.error(`??     ${file} — could not tell which page "${bundle.title}" is; re-run with --as <page>`);
    process.exitCode = 1;
    continue;
  }
  if (found[page]) console.warn(`warn   two exports look like "${page}"; using ${file}`);
  found[page] = { file, html, bundle };
}

let changed = 0;
for (const [page, { file, html, bundle }] of Object.entries(found)) {
  const next = fingerprint(bundle);
  for (const target of PAGES[page].targets) {
    const path = join(SITE, target);
    const prev = existsSync(path) ? fingerprint(parseBundle(readFileSync(path, 'utf8'))) : null;
    const status = prev === next ? 'same' : prev ? 'update' : 'new';
    console.log(`${status.padEnd(6)} ${page.padEnd(6)} → site/${target}   (${file})`);
    if (status === 'same') continue;
    changed++;
    if (!dryRun) writeFileSync(path, html);
  }
  if (!dryRun) extract(html, page);
}

const missing = Object.keys(PAGES).filter((p) => !found[p]);
if (missing.length) console.log(`\nnot in this pull (left as is): ${missing.join(', ')}`);

if (changed && !dryRun) {
  const swPath = join(SITE, 'sw.js');
  const sw = readFileSync(swPath, 'utf8');
  const bumped = sw.replace(/const C='([a-z-]+)-v(\d+)'/, (_, name, v) => `const C='${name}-v${+v + 1}'`);
  writeFileSync(swPath, bumped);
  console.log(`\nservice worker cache: ${sw.match(/const C='([^']+)'/)[1]} → ${bumped.match(/const C='([^']+)'/)[1]}`);
}
console.log(`\n${changed} page file(s) ${dryRun ? 'would change' : 'changed'}.`);
