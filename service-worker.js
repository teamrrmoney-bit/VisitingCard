/* UNIVERSAL SERVICE WORKER — GitHub + VSCode + GAS safe version */

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
   INSTALL → Safe static caching (individual fetches)
----------------------------------*/
self.addEventListener("install", event => {
  // During install we try to cache listed assets, but never fail the install
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Try to fetch & cache each asset individually.
    const results = await Promise.all(ASSETS_TO_CACHE.map(async (asset) => {
      try {
        // Use no-cache to ensure we attempt fresh fetch (helps during deploys)
        const resp = await fetch(asset, { cache: "no-cache" });
        if (!resp || !resp.ok) throw new Error(`HTTP ${resp ? resp.status : "NO_RESPONSE"}`);
        await cache.put(asset, resp.clone());
        return { asset, ok: true };
      } catch (err) {
        // Log warning but do not throw — install must not fail
        return { asset, ok: false, error: String(err) };
      }
    }));

    const failed = results.filter(r => !r.ok);
    if (failed.length) {
      console.warn("SW: some assets failed to cache during install:", failed);
      // Optional: you can also remove missing entries from ASSETS_TO_CACHE list in future deploys
    }
    // install finishes even if some assets failed
  })());

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
  const req = event.request;
  const url = new URL(req.url);

  // RULE 1: Never cache GAS / googleusercontent URLs (critical!)
  if (url.hostname.includes("script.google.com") || url.hostname.includes("googleusercontent.com")) {
    // allow normal network request, do not intercept
    return;
  }

  // RULE 2: Never cache POST requests (forms)
  if (req.method === "POST") {
    return; // do not intercept POST
  }

  // Handle navigation requests (SPA-like) and normal GETs
  event.respondWith((async () => {
    // Try cache first
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const networkRes = await fetch(req);
      // Only cache successful GET responses (status 200)
      if (networkRes && networkRes.status === 200 && req.method === "GET") {
        try {
          const cloned = networkRes.clone();
          const cache = await caches.open(CACHE_NAME);
          // Put into cache (best-effort)
          cache.put(req, cloned).catch(err => {
            // non-fatal
            console.warn("SW: cache.put failed for", req.url, err);
          });
        } catch (err) {
          // ignore cache errors
          console.warn("SW: error caching response", err);
        }
      }
      return networkRes;
    } catch (err) {
      // Network failed (offline). If it's a navigation, try offline fallback
      if (req.destination === "document" || req.mode === "navigate") {
        const fallback = await caches.match("./index.html") || await caches.match("./");
        if (fallback) return fallback;
      }
      // Otherwise just rethrow or return a Response indicating failure
      return new Response("Network error occurred", { status: 504, statusText: "Gateway Timeout" });
    }
  })());
});
