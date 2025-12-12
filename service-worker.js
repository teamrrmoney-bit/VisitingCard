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
   FETCH HANDLER
----------------------------------*/
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Never cache GAS URLs
  if (url.hostname.includes("script.google.com") ||
      url.hostname.includes("googleusercontent.com")) {
    return;
  }

  // Never intercept POST requests
  if (event.request.method === "POST") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200 && networkRes.type === "basic") {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkRes.clone());
            });
          }
          return networkRes;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
