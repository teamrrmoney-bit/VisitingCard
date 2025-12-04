/* UNIVERSAL SERVICE WORKER — Works on GitHub + VS Code + GAS */

const CACHE_NAME = "visitingcard-universal-v1";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./MyPhoto.jpg",
  "./mycontact.vcf",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./style.css",
  "./script.js"
];

/* ---------------------------------
   INSTALL → Static Cache
----------------------------------*/
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

/* ---------------------------------
   ACTIVATE → Old Cache Delete
----------------------------------*/
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

/* ---------------------------------
   FETCH HANDLER (SAFE MODE)
----------------------------------*/
self.addEventListener("fetch", event => {

  const url = new URL(event.request.url);

  // 🚫 RULE 1: Never cache GAS URLs (critical!)
  if (url.hostname.includes("script.google.com") ||
      url.hostname.includes("googleusercontent.com")) {
    return;  // allow normal network request
  }

  // 🚫 RULE 2: Never cache POST requests (forms)
  if (event.request.method === "POST") {
    return; // do not intercept
  }

  // 🌐 RULE 3: Safe static caching
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(networkRes => {
          // only cache valid static GET responses
          if (networkRes && networkRes.status === 200 && networkRes.type === "basic") {
            const cloned = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
          }
          return networkRes;
        })
        .catch(() => {
          // offline fallback → open index.html
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
