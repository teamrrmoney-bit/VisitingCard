/* UNIVERSAL SERVICE WORKER — GitHub + GAS Compatible */

const CACHE_NAME = "visitingcard-cache-v3";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./mycontact.vcf",

  // Icons folder (correct paths)
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/MyPhoto.jpg"
];

/* ---------------------------------
   INSTALL → Safe caching
----------------------------------*/
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const results = [];

      for (const asset of ASSETS_TO_CACHE) {
        try {
          const req = new Request(asset, { cache: "no-cache" });
          const res = await fetch(req);

          if (res.ok) {
            await cache.put(asset, res.clone());
          }
        } catch (err) {
          console.warn("SW: Failed to cache:", asset);
        }
      }
    })()
  );

  self.skipWaiting();
});

/* ---------------------------------
   ACTIVATE → Delete old cache
----------------------------------*/
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null)
      )
    )
  );
  self.clients.claim();
});

/* ---------------------------------
   FETCH HANDLER (SAFE MODE)
----------------------------------*/
self.addEventListener("fetch", event => {

  const request = event.request;
  const url = new URL(request.url);

  // 🚫 RULE 1: Skip GAS URLs
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    return; // do nothing → allow normal network call
  }

  // 🚫 RULE 2: Skip POST requests
  if (request.method === "POST") {
    return;
  }

  // 🌐 STATIC CACHING
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          // cache only valid static resources
          if (response && response.status === 200 && response.type === "basic") {
            const responseToCache = response.clone(); // safe clone

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          if (request.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});

