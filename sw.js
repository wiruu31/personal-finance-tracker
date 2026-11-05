/* ================================================================
   SW.JS - SERVICE WORKER (agar bisa dipasang & jalan offline)

   Cara kerja:
   - Saat pertama dibuka, semua file inti disimpan ke cache.
   - File milik aplikasi ini: coba internet dulu (supaya selalu
     versi terbaru), kalau offline pakai salinan di cache.
   - Font Google: pakai salinan cache dulu, diperbarui diam-diam.
   - Data keuangan TIDAK lewat sini. Data ada di localStorage
     masing-masing perangkat dan tidak pernah dikirim ke mana pun.

   Kalau kamu menambah / mengganti nama file inti, perbarui daftar
   INTI di bawah. Ganti VERSI kalau mau memaksa cache dibuang.
   ================================================================ */

const VERSI = "keuangan-v1.3.1";

const INTI = [
  "./",
  "./keuangan.html",
  "./keuangan.css",
  "./storage.js",
  "./ui.js",
  "./halaman.js",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];

const HALAMAN_UTAMA = "./keuangan.html";
const HOST_FONT = ["fonts.googleapis.com", "fonts.gstatic.com"];


/* Pasang: simpan file inti satu per satu (satu gagal tidak membatalkan semua) */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(VERSI)
      .then((cache) => Promise.all(INTI.map((u) => cache.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

/* Aktif: buang cache versi lama */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nama) => Promise.all(nama.filter((n) => n.indexOf("keuangan-") === 0 && n !== VERSI).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Internet dulu, cache sebagai cadangan */
function internetDulu(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const salinan = res.clone();
        caches.open(VERSI).then((c) => c.put(req, salinan));
      }
      return res;
    })
    .catch(() => {
      /* Offline. Membuka alamat folder ("/") = halaman utama aplikasi */
      const navigasi = req.mode === "navigate";
      const keFolder = navigasi && new URL(req.url).pathname.slice(-1) === "/";
      const cari = keFolder ? caches.match(HALAMAN_UTAMA) : caches.match(req, { ignoreSearch: true });
      return cari
        .then((hit) => hit || caches.match(req, { ignoreSearch: true }))
        .then((hit) => {
          if (hit) return hit;
          if (navigasi) return caches.match(HALAMAN_UTAMA);
          return Response.error();
        });
    });
}

/* Cache dulu, perbarui di belakang layar (untuk font) */
function cacheDulu(req) {
  return caches.open(VERSI).then((cache) =>
    cache.match(req).then((hit) => {
      const baru = fetch(req)
        .then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone()); return res; })
        .catch(() => hit);
      return hit || baru;
    })
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    e.respondWith(internetDulu(req));
  } else if (HOST_FONT.indexOf(url.hostname) >= 0) {
    e.respondWith(cacheDulu(req));
  }
  /* selain itu: biarkan browser menangani sendiri */
});
