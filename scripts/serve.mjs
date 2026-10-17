#!/usr/bin/env node
// Serves site/ the way GitHub Pages does: under /overcomers/, with folder → index.html.
// The app preview (app/dist, from `npm run app:build`) is served at /overcomers/app/, as in CI.
//   npm run serve            → http://localhost:4173/overcomers/
//   PORT=8080 npm run serve

import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = fileURLToPath(new URL('../site', import.meta.url));
const APP = fileURLToPath(new URL('../app/dist', import.meta.url));
const BASE = '/overcomers/';
const PORT = Number(process.env.PORT || 4173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/') return res.writeHead(302, { location: BASE }).end();
  if (!url.pathname.startsWith(BASE)) return res.writeHead(404).end('not found');
  const rel = decodeURIComponent(url.pathname.slice(BASE.length));
  const root = rel === 'app' || rel.startsWith('app/') ? APP : SITE;
  let path = normalize(join(root, root === APP ? rel.slice(4) : rel));
  if (!path.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(path) && statSync(path).isDirectory()) {
    if (!url.pathname.endsWith('/')) return res.writeHead(301, { location: url.pathname + '/' }).end();
    path = join(path, 'index.html');
  }
  if (!existsSync(path)) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  createReadStream(path).pipe(res);
}).listen(PORT, () => console.log(`serving site/ at http://localhost:${PORT}${BASE}`));
