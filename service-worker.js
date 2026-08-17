const CACHE_PREFIX = 'mochi-';
const CACHE_NAME = 'mochi-internal-build6-v10-game-table-view';
const EXCEL_LIB_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.mini.min.js';
const APP_SHELL = [
  './','./index.html','./style.css','./games.css','./game-table-view.css','./tomodachi.css','./tomodachi-presets.css','./genshin.css',
  './app.js','./tomodachi.js','./tomodachi-presets.js','./genshin.js','./games.js','./xlsx-import.js','./game-table-view.js','./qa-runtime.js','./manifest.json',
  './icon/icon-192.png','./icon/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    try{await cache.add(EXCEL_LIB_URL)}catch{}
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.href === EXCEL_LIB_URL) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached=await cache.match(EXCEL_LIB_URL);
        if(cached)return cached;
        try{
          const response=await fetch(event.request);
          if(response.ok||response.type==='opaque')await cache.put(EXCEL_LIB_URL,response.clone());
          return response;
        }catch(err){
          return cached||Response.error();
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(response => {
        if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request,response.clone()));
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});