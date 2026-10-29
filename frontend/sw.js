/* Service worker de Sinapsis: guarda la interfaz para que abra rápido, se pueda instalar y reciba notificaciones.
 * Los datos (/api) siempre van al servidor: nunca se guardan en caché. */
const VERSION = "sinapsis-v0.3.3";
const ARCHIVOS = [
  "/", "/index.html", "/styles.css", "/app.js", "/manifest.webmanifest",
  "/assets/deersystems-isotipo.svg", "/assets/vendor/html5-qrcode.min.js",
  "/assets/icono-192.png", "/assets/icono-512.png", "/assets/insignia-96.png", "/assets/neurologico-logo-claro.png",
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

// Notificaciones push: el servidor envía {titulo, cuerpo, url}; se muestran con el ícono de la app.
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { cuerpo: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titulo || "Sinapsis", {
    body: d.cuerpo || "", icon: "/assets/icono-192.png", badge: "/assets/insignia-96.png", lang: "es-CO",
    tag: "sinapsis-alertas", renotify: true, data: { url: d.url || "/#/alertas" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (ventanas) => {
    const abierta = ventanas.find((v) => v.url.startsWith(self.location.origin));
    if (!abierta) return self.clients.openWindow(url);
    await abierta.focus();
    try { await abierta.navigate(url); } catch {}
  }));
});
