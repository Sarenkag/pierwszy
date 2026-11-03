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
  // ostatni komunikat pamiętamy: przełączenie PL/EN albo powrót do Ustawień rysuje panel od nowa i nie może zgubić postępu (Grzegorz 03/11)
  var lastStatus = "";
  function setStatus(t) { lastStatus = t; var e = document.getElementById("updStatus"); if (e) e.textContent = t; }
  // pasek tylko na ekranie głównym (nie zasłania przycisków na dole innych ekranów); po „Anuluj” znika do następnego uruchomienia
  var dismissed = false, wanted = false;
  function onHome() { var h = location.hash.replace(/^#/, ""); return h === "" || h === "home"; }
  function recheck() { setTimeout(function () { banner(wanted); }, 0); } // nawigacja apki zmienia adres przez history API (bez hashchange)
  w.addEventListener("hashchange", recheck); w.addEventListener("popstate", recheck); document.addEventListener("click", recheck, true);
  function banner(show) {
    wanted = !!show;
    var b = document.getElementById("updBanner");
    if (!show || dismissed || !onHome()) { if (b) b.remove(); return; }
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
      if (l.n > have) { banner(true); if (manual) { setStatus("Jest nowa wersja " + l.n + " (masz " + have + ")."); showInstallBtn(l.n); install(); } }
      else { banner(false); if (manual) setStatus("Masz najnowszą wersję (" + have + ")."); }
    }).catch(function (e) { if (manual) setStatus("Nie udało się sprawdzić: " + (e && e.message || e)); });
  }
  var busySince = 0;
  function install() {
    if (busy && Date.now() - busySince > 180000) busy = false; // poprzednie pobieranie utknęło (>3 min) – pozwól zacząć od nowa
    if (busy) { setStatus("Pobieranie już trwa – postęp widać na pasku na dole ekranu głównego."); return; }
    if (!latest) return; var p = api(); if (!p) return;
    if (!w.confirm("Pobrać i zainstalować wersję " + latest.n + " (" + Math.round((latest.size || 0) / 1048576) + " MB)?")) { dismissed = true; banner(false); return; }
    busy = true; busySince = Date.now(); setStatus("Pobieram wersję " + latest.n + "…");
    var b = document.getElementById("updBanner"); if (b) b.textContent = "Pobieram wersję " + latest.n + "…";
    // procenty na pasku i w Ustawieniach (58 MB na danych mobilnych trwa – bez postępu wyglądało na zawieszone)
    var sub = null, mb = Math.round((latest.size || 0) / 1048576);
    try { sub = p.addListener && p.addListener("progress", function (ev) {
      var t = ev && ev.percent >= 0 ? "Pobieram wersję " + latest.n + " – " + ev.percent + "% z " + mb + " MB" : "Pobieram wersję " + latest.n + " – " + Math.round((ev && ev.done || 0) / 1048576) + " MB";
      setStatus(t); var bb = document.getElementById("updBanner"); if (bb) { bb.textContent = t; bb.style.background = "linear-gradient(90deg,#3b82f6 " + Math.max(0, ev.percent || 0) + "%,#8b5cf6 " + Math.max(0, ev.percent || 0) + "%)"; }
    }); } catch (er) { sub = null; }
    function unsub() { try { if (sub && sub.then) sub.then(function (h) { h.remove(); }); else if (sub && sub.remove) sub.remove(); } catch (er) {} }
    p.install({ url: latest.url, name: "OEST-" + latest.n + ".apk" }).then(function () {
      unsub(); setStatus("Otwieram instalator…"); banner(false);
    }).catch(function (e) {
      unsub(); b = document.getElementById("updBanner"); if (b) b.style.background = "linear-gradient(90deg,#3b82f6,#8b5cf6)";
      var m = e && e.message || String(e);
      if (/PERMISSION/.test(m)) m = "Zezwól OEST na instalowanie aplikacji (otworzyłem ustawienia), wróć i dotknij jeszcze raz.";
      if (!/PERMISSION|Zezwól/.test(m)) m = "Nie udało się pobrać (" + m.replace(/^Pobieranie nie powiodło się: /, "") + "). Dotknij, żeby spróbować jeszcze raz.";
      setStatus(m); if (b) b.textContent = /Zezwól/.test(m) ? "Nowa wersja " + latest.n + " – dotknij, żeby zainstalować" : "Pobieranie przerwane – dotknij, żeby ponowić";
    }).then(function () { busy = false; });
  }
  // w Ustawieniach: osobny przycisk „Pobierz i zainstaluj”, żeby po anulowaniu/błędzie dało się ponowić bez szukania paska
  function showInstallBtn(n) {
    var st = document.getElementById("updStatus"); if (!st || document.getElementById("updInstall")) return;
    var b = document.createElement("button"); b.id = "updInstall"; b.type = "button"; b.className = "btn"; b.setAttribute("data-upd", "install");
    b.textContent = "Pobierz i zainstaluj wersję " + n; st.before(b);
  }
  function panelHtml() {
    return '<div class="panel"><b>Aktualizacja aplikacji</b>' +
      '<p class="hint">Wersja w telefonie: <b id="updMine">' + esc(mine === null ? "…" : mine) + '</b></p>' +
      '<button class="btn" type="button" data-upd="check">Sprawdź aktualizację</button>' +
      (latest && mine !== null && latest.n > mine ? '<button id="updInstall" class="btn" type="button" data-upd="install">Pobierz i zainstaluj wersję ' + esc(latest.n) + '</button>' : '') +
      '<p class="hint" id="updStatus">' + esc(lastStatus) + '</p></div>';
  }
  document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest && e.target.closest("[data-upd]"); if (!t) return;
    e.preventDefault(); if (t.getAttribute("data-upd") === "install") { dismissed = false; install(); } else check(true);
  });
  current().then(function (v) { var e = document.getElementById("updMine"); if (e) e.textContent = v || "?"; });
  // przy starcie: ciche sprawdzenie (raz na uruchomienie), pasek na dole, gdy jest nowsza wersja
  if (native()) setTimeout(function () { check(false); }, 4000);
  w.OESTUpdate = { check: check, install: install, panelHtml: panelHtml };
})(window);
