const C='gra-prayers-v20';
const CORE=['./','./index.html','./covenant/','./jcfp/','./weekly/','./prayers.json','./jcfp.json','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
const EXTRA=['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>Promise.all(CORE.map(u=>c.add(u).catch(()=>{}))).then(()=>Promise.all(EXTRA.map(u=>c.add(u).catch(()=>{}))))));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!=='gra-book').map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.pathname.startsWith('/admin')||u.pathname.includes('/rest/v1/')||u.pathname.includes('/auth/v1/'))return;
  if(r.mode==='navigate'){const key=new URL(u.pathname.replace(/index\.html$/,''),u.origin).href;
    e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(C).then(c=>c.put(key,cp));}return res;}).catch(()=>caches.match(key).then(m=>m||caches.match('./'))));return;}
  e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&(u.origin===location.origin||/fonts\.(googleapis|gstatic)|cdn\.jsdelivr\.net/.test(r.url))){const cp=res.clone();caches.open(C).then(c=>c.put(r,cp));}return res;})));});
