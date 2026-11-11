/* Bafra Fen Lisesi LCD Pano - Servis Çalışanı
   - Pano dosyaları: önce ağ (yeni sürüm hemen görünür), internet yoksa önbellekten açılır
   - Yazı tipi / ikon kütüphaneleri: ilk yüklemede önbelleğe alınır, sonra internetsiz de çalışır
   - Hava durumu, haber, slayt siteleri ve görseller: hiç önbelleğe alınmaz (her zaman canlı) */
const CACHE = "bfl-pano-v1";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];
const RUNTIME_HOSTS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (e) => {
    const req = e.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);

    // Kendi dosyalarımız: önce ağ, olmazsa önbellek
    if (url.origin === self.location.origin) {
        e.respondWith(
            fetch(req)
                .then((res) => {
                    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
                    return res;
                })
                .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
        );
        return;
    }

    // Yazı tipleri ve ikon kütüphanesi: önbellek öncelikli
    if (RUNTIME_HOSTS.includes(url.hostname)) {
        e.respondWith(
            caches.match(req).then((hit) => hit || fetch(req).then((res) => {
                if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
                return res;
            }))
        );
    }
    // Diğer her şey (API, haber görselleri, slayt siteleri) doğrudan ağdan gider
});
