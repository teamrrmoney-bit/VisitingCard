/* =====================================================
   FINAL UNIVERSAL SERVICE WORKER
   ✔ Phone safe
   ✔ GitHub Pages safe
   ✔ Google Apps Script (GAS) safe
   ✔ No CORS / POST issues
===================================================== */

const CACHE_VERSION = "final-v3";
const CACHE_NAME = `vc-cache-${CACHE_VERSION}`;

/* 🔹 Only STATIC files (no HTML hardcoding) */
const STATIC_ASSETS = [
  "./",
  "./manifest.json",
  "./mycontact.vcf",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./MyPhoto.jpg"
];

/* ---------------- INSTALL ---------------- */
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      for (const asset of STATIC_ASSETS) {
        try {
          const res = await fetch(asset, { cache: "no-store" });
          if (res && res.ok) {
            await cache.put(asset, res.clone());
          }
        } catch (e) {
          /* silently ignore */
        }
      }
    })()
  );
  self.skipWaiting();
});

/* ---------------- ACTIVATE ---------------- */
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

/* ---------------- FETCH ---------------- */
self.addEventListener("fetch", event => {

  const req = event.request;
  const url = new URL(req.url);

  /* 🚫 RULE 1: Never touch GAS */
  if (
    url.hostname.includes("script.google.com") ||
    url.hostname.includes("googleusercontent.com")
  ) {
    return;
  }
/* 🚫 RULE 1B: Never cache QR API */
if (url.hostname.includes("api.qrserver.com")) {
  return;
}

  /* 🚫 RULE 2: Never cache POST */
  if (req.method !== "GET") {
    return;
  }

  /* 🚫 RULE 3: Skip browser extensions */
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return;
  }

  /* ✅ SAFE STATIC CACHE STRATEGY */
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(res => {
          if (
            res &&
            res.status === 200 &&
            res.type === "basic"
          ) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(req, clone);
            });
          }
          return res;
        })
        .catch(() => {
          /* Offline fallback only for main page */
          if (req.destination === "document") {
            return caches.match("./");
          }
        });
    })
  );
});
