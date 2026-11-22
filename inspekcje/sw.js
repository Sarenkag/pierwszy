// Service worker: apka otwiera się bez zasięgu. Strona z pamięci od razu, nowa wersja pobierana w tle
// (widać ją przy następnym otwarciu). Skrypt Google (wysyłka) nigdy nie idzie przez pamięć.
var CACHE = "inspekcje-v2";
var SHELL = ["./", "./index.html", "./insp.css", "./flush.js", "./rodzaje.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
var LIBS = [
  "https://cdn.jsdelivr.net/npm/pizzip@3.3.0/dist/pizzip.min.js",
  "https://cdn.jsdelivr.net/npm/docxtemplater@3.71.0/build/docxtemplater.min.js",
  "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"
];

var SHELL_URL = SHELL.map(function (u) { return new URL(u, self.location).href; });

// cały komplet strony z sieci; do pamięci tylko wtedy, gdy każdy plik przyszedł poprawnie
function odswiezKomplet(c) {
  return Promise.all(SHELL.map(function (u) {
    return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(u); return r; });
  })).then(function (rs) {
    // najpierw części, strona na końcu: póki nie ma wszystkich części, w pamięci zostaje stara strona
    var strona = function (u) { return u === "./" || u === "./index.html"; };
    return Promise.all(rs.map(function (r, i) { return strona(SHELL[i]) ? null : c.put(SHELL[i], r); })).then(function () {
      return Promise.all(rs.map(function (r, i) { return strona(SHELL[i]) ? c.put(SHELL[i], r) : null; }));
    });
  });
}

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
    // strona i pliki apki: z pamięci od razu, odświeżane w tle.
    // Strona i jej części (SHELL) odświeżają się tylko RAZEM: zapis do pamięci dopiero, gdy pobrał się cały komplet.
    // Inaczej przy słabym zasięgu nowa strona mogłaby trafić do pamięci bez nowej części (np. insp.css, i-*.js) i offline nie działać.
    var nav = req.mode === "navigate", wSHELL = SHELL_URL.indexOf(url.origin + url.pathname) >= 0;
    var key = nav ? "./index.html" : req;
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(key, { ignoreSearch: true }).then(function (hit) {
        if (hit) {
          if (nav) e.waitUntil(odswiezKomplet(c).catch(function () {}));
          else if (!wSHELL) e.waitUntil(fetch(req).then(function (r) { if (r.ok) return c.put(key, r); }).catch(function () {}));
          return hit;
        }
        return fetch(req).then(function (r) { if (r.ok && !nav && !wSHELL) c.put(key, r.clone()); return r; });
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
