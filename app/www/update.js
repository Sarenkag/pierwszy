// Aktualizacja apki z GitHub Releases: sprawdza najnowsze „apk-N”, pobiera OEST-N.apk i otwiera instalator Androida.
(function (w) {
  "use strict";
  var API = "https://api.github.com/repos/Sarenkag/pierwszy/releases/latest";
  var plugin = null, mine = null, latest = null, busy = false;
  function native() { return !!(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform()); }
  function api() { if (!plugin && native()) plugin = w.Capacitor.registerPlugin ? w.Capacitor.registerPlugin("AppUpdate") : w.Capacitor.Plugins.AppUpdate; return plugin; }
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function current() {
    if (mine !== null) return Promise.resolve(mine);
    var p = api(); if (!p) return Promise.resolve(0);
    return p.info().then(function (r) { mine = +r.versionCode || 0; return mine; }).catch(function () { return 0; });
  }
  function fetchLatest() {
    return fetch(API, { headers: { Accept: "application/vnd.github+json" }, cache: "no-store" }).then(function (r) {
      if (!r.ok) throw Error("GitHub " + r.status); return r.json();
    }).then(function (j) {
      var n = +String(j.tag_name || "").replace(/^apk-/, "") || 0;
      var a = (j.assets || []).filter(function (x) { return /\.apk$/i.test(x.name); })[0];
      latest = a ? { n: n, url: a.browser_download_url, size: a.size } : null; return latest;
    });
  }
  function setStatus(t) { var e = document.getElementById("updStatus"); if (e) e.textContent = t; }
  function banner(show) {
    var b = document.getElementById("updBanner");
    if (!show) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement("button"); b.id = "updBanner"; b.type = "button";
    b.style.cssText = "position:fixed;left:12px;right:12px;bottom:14px;z-index:50;padding:12px 14px;border-radius:14px;border:0;font:inherit;font-weight:700;color:#fff;background:linear-gradient(90deg,#3b82f6,#8b5cf6);box-shadow:0 6px 20px rgba(0,0,0,.35)";
    b.textContent = "Nowa wersja " + latest.n + " – dotknij, żeby zainstalować";
    b.onclick = function () { install(); };
    document.body.appendChild(b);
  }
  function check(manual) {
    if (!native()) { if (manual) setStatus("Aktualizacja działa w aplikacji Android."); return Promise.resolve(); }
    if (manual) setStatus("Sprawdzam…");
    return Promise.all([current(), fetchLatest()]).then(function (r) {
      var have = r[0], l = r[1];
      if (!l) { if (manual) setStatus("Nie znalazłem pliku APK w najnowszym wydaniu."); return; }
      if (l.n > have) { banner(true); if (manual) setStatus("Jest nowa wersja " + l.n + " (masz " + have + ")."); if (manual) install(); }
      else { banner(false); if (manual) setStatus("Masz najnowszą wersję (" + have + ")."); }
    }).catch(function (e) { if (manual) setStatus("Nie udało się sprawdzić: " + (e && e.message || e)); });
  }
  function install() {
    if (busy || !latest) return; var p = api(); if (!p) return;
    if (!w.confirm("Pobrać i zainstalować wersję " + latest.n + " (" + Math.round((latest.size || 0) / 1048576) + " MB)?")) return;
    busy = true; setStatus("Pobieram wersję " + latest.n + "…");
    var b = document.getElementById("updBanner"); if (b) b.textContent = "Pobieram wersję " + latest.n + "…";
    p.install({ url: latest.url, name: "OEST-" + latest.n + ".apk" }).then(function () {
      setStatus("Otwieram instalator…"); banner(false);
    }).catch(function (e) {
      var m = e && e.message || String(e);
      if (/PERMISSION/.test(m)) m = "Zezwól OEST na instalowanie aplikacji (otworzyłem ustawienia), wróć i dotknij jeszcze raz.";
      setStatus(m); if (b) b.textContent = "Nowa wersja " + latest.n + " – dotknij, żeby zainstalować";
    }).then(function () { busy = false; });
  }
  function panelHtml() {
    return '<div class="panel"><b>Aktualizacja aplikacji</b>' +
      '<p class="hint">Wersja w telefonie: <b id="updMine">' + esc(mine === null ? "…" : mine) + '</b></p>' +
      '<button class="btn" type="button" data-upd="check">Sprawdź aktualizację</button>' +
      '<p class="hint" id="updStatus"></p></div>';
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-upd]"); if (!t) return;
    e.preventDefault(); check(true);
  });
  current().then(function (v) { var e = document.getElementById("updMine"); if (e) e.textContent = v || "?"; });
  // przy starcie: ciche sprawdzenie (raz na uruchomienie), pasek na dole, gdy jest nowsza wersja
  if (native()) setTimeout(function () { check(false); }, 4000);
  w.OESTUpdate = { check: check, install: install, panelHtml: panelHtml };
})(window);
