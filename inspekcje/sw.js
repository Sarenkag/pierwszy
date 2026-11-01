// Service worker: apka otwiera się bez zasięgu. Strona z pamięci od razu, nowa wersja pobierana w tle
// (widać ją przy następnym otwarciu). Skrypt Google (wysyłka) nigdy nie idzie przez pamięć.
var CACHE = "inspekcje-v2";
var SHELL = ["./", "./index.html", "./tpl-temp-tb.js", "./tpl-oest-basic.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
var LIBS = [
  "https://cdn.jsdelivr.net/npm/pizzip@3.3.0/dist/pizzip.min.js",
  "https://cdn.jsdelivr.net/npm/docxtemplater@3.71.0/build/docxtemplater.min.js",
  "https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js"
];

self.addEventListener("install", function (e) {
  // strona musi wejść do pamięci; biblioteki najlepiej też, a jeśli CDN akurat nie odpowie, dobiorą się przy następnym otwarciu
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.addAll(SHELL).then(function () {
      return Promise.all(LIBS.map(function (u) { return c.add(u).catch(function () {}); }));
    });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  var same = url.origin === self.location.origin;
  if (same) {
    // strona i pliki apki: z pamięci od razu, odświeżane w tle
    var key = req.mode === "navigate" ? "./index.html" : req;
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(key, { ignoreSearch: true }).then(function (hit) {
        var net = fetch(req).then(function (r) { if (r.ok) c.put(key, r.clone()); return r; });
        if (hit) { e.waitUntil(net.catch(function () {})); return hit; }
        return net;
      });
    }));
    return;
  }
  if (/^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname)) {
    // biblioteki i czcionki mają wersję w adresie — wystarczy raz pobrać
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        return hit || fetch(req).then(function (r) { if (r.ok || r.type === "opaque") c.put(req, r.clone()); return r; });
      });
    }));
  }
});
