const key='paldea-book-2026-11-26-13-compass';
const shell=['./','./index.html','./style.css','./app.js','./atlas.mjs','./core.mjs','./visuals.mjs','./media.mjs','./local-art.mjs','./expanded.mjs','./evolution.mjs','./wayfinding.mjs','./hunt.mjs','./manifest.webmanifest','./assets/countryside.webp','./assets/icon-192.png?v=compass','./assets/icon-512.png?v=compass','./assets/icon-compass-maskable-512.png','./assets/icon-compass-32.png','./assets/icon-compass-180.png','./data/dex.json','./data/adventure.json','./data/map.json','./data/fieldbook.json','./data/visual-steps.json','./data/visual-references.json','./data/dex-media.json','./data/story-expanded.json','./data/dlc-expanded.json','./data/field-expanded.json','./data/evolution-guides.json','./data/mission-wayfinding.json','./data/tm-paldea-paths.json','./data/dlc-wayfinding.json','./data/blueberry-tm-shop.json','./data/catch-trails.json','./data/sandwiches.json','./data/sprite-catalog.json'];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(key);
  await cache.addAll(shell);
  const visuals=await (await cache.match('./data/visual-steps.json')).json();
  const icons=new Set(['camera','coin','bag',...Object.values(visuals).flatMap(group=>Object.values(group).flat().map(s=>s.icon))]);
  await cache.addAll([
   ...[...icons].map(icon=>'./assets/guide/'+icon+'.webp')
  ]);
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const name of await caches.keys()) if(name.startsWith('paldea-book-')&&name!==key) await caches.delete(name);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin) return;
 event.respondWith((async()=>{
  const cache=await caches.open(key);
  try{
   const resp=await fetch(event.request);
   if(resp.ok&&resp.type==='basic') await cache.put(event.request,resp.clone());
   return resp;
  }catch{
   return await cache.match(event.request) ?? (event.request.mode==='navigate'?await cache.match('./index.html'):Response.error());
  }
 })());
});
