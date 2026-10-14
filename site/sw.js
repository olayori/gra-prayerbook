const C='gra-prayers-v16';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const EXTRA=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE).then(()=>Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{}))))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!=='gra-book').map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;
  if(new URL(r.url).pathname.startsWith('/admin'))return;
  if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put('./index.html',cp));return res;}).catch(()=>caches.match('./index.html')));return;}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&(new URL(r.url).origin===location.origin||/fonts\.(googleapis|gstatic)|cdn\.jsdelivr\.net/.test(r.url))){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})));});
