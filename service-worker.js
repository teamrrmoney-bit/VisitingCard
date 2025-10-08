const CACHE_NAME = "visitingcard-v2";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./MyPhoto.jpg",
  "./mycontact.vcf",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./README.md"
];

// 📦 Install event – files को cache में डालना
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 🔁 Activate event – पुराने cache delete करना
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 🌐 Fetch event – पहले cache चेक, फिर network
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // अगर cache में है तो वही दो, वरना network से लाओ
      return (
        response ||
        fetch(event.request).catch(() => {
          // अगर offline हो तो fallback दे दो
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        })
      );
    })
  );
});
