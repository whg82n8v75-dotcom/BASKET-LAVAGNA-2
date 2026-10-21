const VERSION = "btm-v1";
const CORE = ["/", "/index.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-64.png"];
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

async function precache() {
  const cache = await caches.open(VERSION);
  await cache.addAll(CORE);
  try {
    const html = await (await fetch("/index.html", { cache: "no-store" })).text();
    const assets = [...html.matchAll(/(?:src|href)="(\/static\/[^"]+)"/g)].map((m) => m[1]);
    await cache.addAll(assets);
  } catch (e) {}
  try {
    const am = await (await fetch("/asset-manifest.json", { cache: "no-store" })).json();
    const files = Object.values(am.files || {}).filter((u) => typeof u === "string" && !u.endsWith(".map"));
    await cache.addAll(files);
  } catch (e) {}
}

self.addEventListener("install", (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("btm-") && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(req, fallbackKey) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(fallbackKey || req, res.clone());
    return res;
  } catch (e) {
    const hit = (await cache.match(fallbackKey || req, { ignoreSearch: !!fallbackKey })) || (fallbackKey && (await cache.match("/")));
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith("/api") || url.pathname.includes("hot-update") || url.pathname.startsWith("/ws") || url.pathname.includes("sockjs")) return;
    if (req.mode === "navigate") e.respondWith(networkFirst(req, "/index.html"));
    else e.respondWith(networkFirst(req));
  } else if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(req));
  }
});
