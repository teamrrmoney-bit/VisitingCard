const CACHE_NAME = "visitingcard-v3";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./MyPhoto.jpg",
  "./mycontact.vcf",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./README.md",
  "./style.css",      // ✅ Add your CSS
  "./script.js"       // ✅ Add your JS
];

// 📦 INSTALL EVENT – static files cache करना
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// 🔁 ACTIVATE EVENT – पुराने cache हटाना
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

// 🌐 FETCH EVENT – पहले cache, फिर network (और dynamic cache)
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // ✅ Cache hit – direct return
        return cachedResponse;
      }

      // 🆕 Network से लाओ और dynamic cache में डालो
      return fetch(event.request)
        .then(networkResponse => {
          // केवल valid responses (status 200) को cache करें
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse;
          }

          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // ❌ Offline fallback
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        });
    })
  );
});
