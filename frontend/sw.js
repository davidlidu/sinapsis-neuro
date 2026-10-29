/* Service worker de Sinapsis: guarda la interfaz para que abra rápido y se pueda instalar.
 * Los datos (/api) siempre van al servidor: nunca se guardan en caché. */
const VERSION = "sinapsis-v0.1.1";
const ARCHIVOS = [
  "/", "/index.html", "/styles.css", "/app.js", "/manifest.webmanifest",
  "/assets/deersystems-isotipo.svg", "/assets/vendor/html5-qrcode.min.js",
  "/assets/icono-192.png", "/assets/icono-512.png",
  "/assets/fonts/inter-latin-400-normal.woff2", "/assets/fonts/inter-latin-500-normal.woff2",
  "/assets/fonts/inter-latin-600-normal.woff2", "/assets/fonts/montserrat-latin-600-normal.woff2",
  "/assets/fonts/montserrat-latin-700-normal.woff2", "/assets/fonts/jetbrains-mono-latin-500-normal.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api") || url.pathname.startsWith("/docs")) return;
  // Red primero (para recibir versiones nuevas); si no hay red, la copia guardada.
  e.respondWith(fetch(e.request).then((r) => {
    const copia = r.clone();
    caches.open(VERSION).then((c) => c.put(e.request, copia));
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match("/"))));
});
