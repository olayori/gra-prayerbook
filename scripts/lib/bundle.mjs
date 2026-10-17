// Reads the "standalone HTML" bundles that Claude Design exports.
//
// A bundle is a small HTML shell plus <script type="__bundler/..."> islands:
//   manifest      { uuid: { mime, compressed, data(base64) } }  — every asset
//   template      the real page HTML (JSON string) with assets referenced by uuid
//   ext_resources [{ id, uuid }] — named assets (CDN libs, data files)
//   page_order    nested page uuids (unused by our pages)
// The shell unpacks the assets into blob: URLs at runtime and swaps in the template.

import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

function island(html, type) {
  const m = html.match(new RegExp(`<script type="__bundler/${type}">([\\s\\S]*?)</script>`));
  return m ? JSON.parse(m[1]) : null;
}

export function isBundle(html) {
  return html.includes('<script type="__bundler/manifest">') && html.includes('<script type="__bundler/template">');
}

export function parseBundle(html) {
  if (!isBundle(html)) throw new Error('not a Claude Design bundle (missing __bundler islands)');
  const manifest = island(html, 'manifest');
  const template = island(html, 'template');
  const ext = island(html, 'ext_resources') || [];
  const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  return { title, manifest, template, ext };
}

export function decodeAsset(entry) {
  const bytes = Buffer.from(entry.data, 'base64');
  return entry.compressed ? gunzipSync(bytes) : bytes;
}

export const sha = (buf) => createHash('sha256').update(buf).digest('hex');

// The app code of a page: the inline <script type="text/x-dc"> block in the template.
export function appScript(template) {
  const m = template.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/);
  return m ? m[1] : '';
}

// Which site page an export is. Pages are told apart by stable markers in their own code,
// since several designs share the title "Overcomer’s Library".
export const PAGES = {
  home: { targets: ['index.html'] },
  book: { targets: ['covenant/index.html', 'jcfp/index.html', 'weekly/index.html'] },
  read: { targets: ['read/index.html'] },
  bible: { targets: ['bible/index.html'] },
  admin: { targets: ['admin/index.html'] },
};

export function classify({ title, template }) {
  const code = appScript(template);
  if (/^Admin Console/.test(title)) return 'admin';
  if (/^Holy Bible/.test(title)) return 'bible';
  // Order matters: home also mentions the reader's `gra-nr-` storage keys.
  if (/\(covenant\|jcfp\|weekly\)/.test(code)) return 'book';
  if (code.includes("view: 'home'")) return 'home';
  if (code.includes('gra-nr-')) return 'read';
  return null;
}

// Stable, human-readable names for every asset so extracted source diffs cleanly
// between exports (uuids change on every export even when content does not).
export function assetNames({ manifest, template, ext }) {
  const names = {};
  for (const { id, uuid } of ext) names[uuid] = id.startsWith('http') ? id.split('/').pop() : id;
  const counters = {};
  for (const uuid of template.match(UUID) || []) {
    if (names[uuid] || !manifest[uuid]) continue;
    const kind = manifest[uuid].mime.split('/').pop().replace(/^(x-)?javascript$/, 'js');
    counters[kind] = (counters[kind] || 0) + 1;
    names[uuid] = `${kind}-${counters[kind]}`;
  }
  return names;
}

// Fingerprint of what a page actually renders: template + asset contents, ignoring uuids.
export function fingerprint(bundle) {
  const names = assetNames(bundle);
  const tpl = bundle.template.replace(UUID, (u) => names[u] || 'uuid');
  const assets = Object.entries(bundle.manifest)
    .map(([u, e]) => `${names[u] || 'unref'}:${sha(decodeAsset(e))}`)
    .sort();
  return sha(tpl + '\n' + assets.join('\n'));
}

export { UUID };
