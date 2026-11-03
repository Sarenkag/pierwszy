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
  // komunikat trzymany jako para [pl, en]: po zmianie języka pokazuje się od razu w nowym (bez rysowania ekranu)
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  var lastStatus = ["", ""], bannerTxt = null;
  function setStatus(pl, en) { lastStatus = [pl, en == null ? pl : en]; var e = document.getElementById("updStatus"); if (e) e.textContent = T(lastStatus[0], lastStatus[1]); }
  function setBanner(pl, en) { bannerTxt = [pl, en]; var b = document.getElementById("updBanner"); if (b) b.textContent = T(pl, en); }
  w.addEventListener("oest:lang", function () {
    setStatus(lastStatus[0], lastStatus[1]);
    var b = document.getElementById("updBanner"); if (b && bannerTxt) b.textContent = T(bannerTxt[0], bannerTxt[1]);
    var i = document.getElementById("updInstall"); if (i && latest) i.textContent = T("Pobierz i zainstaluj wersję ", "Download and install version ") + latest.n;
  });
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
    bannerTxt = ["Nowa wersja " + latest.n + " – dotknij, żeby zainstalować", "New version " + latest.n + " – tap to install"]; b.textContent = T(bannerTxt[0], bannerTxt[1]);
    b.onclick = function () { install(); };
    document.body.appendChild(b);
  }
  function check(manual) {
    if (!native()) { if (manual) setStatus("Aktualizacja działa w aplikacji Android.", "Updates work in the Android app."); return Promise.resolve(); }
    if (manual) setStatus("Sprawdzam…", "Checking…");
    return Promise.all([current(), fetchLatest()]).then(function (r) {
      var have = r[0], l = r[1];
      if (!l) { if (manual) setStatus("Nie znalazłem pliku APK w najnowszym wydaniu.", "No APK file in the latest release."); return; }
      if (l.n > have) { banner(true); if (manual) { setStatus("Jest nowa wersja " + l.n + " (masz " + have + ").", "New version " + l.n + " available (you have " + have + ")."); showInstallBtn(l.n); install(); } }
      else { banner(false); if (manual) setStatus("Masz najnowszą wersję (" + have + ").", "You have the latest version (" + have + ")."); }
    }).catch(function (e) { if (manual) var em = w.OESTBledy ? w.OESTBledy.text(e) : (e && e.message || e); setStatus("Nie udało się sprawdzić: " + em, "Check failed: " + (w.OESTBledy ? w.OESTBledy.text(e, "en") : em)); });
  }
  var busySince = 0;
  function install() {
    if (busy && Date.now() - busySince > 180000) busy = false; // poprzednie pobieranie utknęło (>3 min) – pozwól zacząć od nowa
    if (busy) { setStatus("Pobieranie już trwa – postęp widać na pasku na dole ekranu głównego.", "Download already running – progress is on the bar at the bottom of the home screen."); return; }
    if (!latest) return; var p = api(); if (!p) return;
    if (!w.confirm(T("Pobrać i zainstalować wersję ", "Download and install version ") + latest.n + " (" + Math.round((latest.size || 0) / 1048576) + " MB)?")) { dismissed = true; banner(false); return; }
    busy = true; busySince = Date.now(); setStatus("Pobieram wersję " + latest.n + "…", "Downloading version " + latest.n + "…");
    var b = document.getElementById("updBanner"); if (b) setBanner("Pobieram wersję " + latest.n + "…", "Downloading version " + latest.n + "…");
    // procenty na pasku i w Ustawieniach (58 MB na danych mobilnych trwa – bez postępu wyglądało na zawieszone)
    var sub = null, mb = Math.round((latest.size || 0) / 1048576);
    try { sub = p.addListener && p.addListener("progress", function (ev) {
      var got = ev && ev.percent >= 0 ? ev.percent + "%" : Math.round((ev && ev.done || 0) / 1048576) + " MB";
      setStatus("Pobieram wersję " + latest.n + " – " + got + (ev && ev.percent >= 0 ? " z " + mb + " MB" : ""), "Downloading version " + latest.n + " – " + got + (ev && ev.percent >= 0 ? " of " + mb + " MB" : ""));
      var bb = document.getElementById("updBanner"); if (bb) { setBanner(lastStatus[0], lastStatus[1]); bb.style.background = "linear-gradient(90deg,#3b82f6 " + Math.max(0, ev.percent || 0) + "%,#8b5cf6 " + Math.max(0, ev.percent || 0) + "%)"; }
    }); } catch (er) { sub = null; }
    function unsub() { try { if (sub && sub.then) sub.then(function (h) { h.remove(); }); else if (sub && sub.remove) sub.remove(); } catch (er) {} }
    p.install({ url: latest.url, name: "OEST-" + latest.n + ".apk" }).then(function () {
      unsub(); setStatus("Otwieram instalator…", "Opening the installer…"); banner(false);
    }).catch(function (e) {
      unsub(); b = document.getElementById("updBanner"); if (b) b.style.background = "linear-gradient(90deg,#3b82f6,#8b5cf6)";
      var m = e && e.message || String(e), perm = /PERMISSION/.test(m);
      var why = m.replace(/^Pobieranie nie powiodło się: /, ""); // i18n-ok: tekst z wtyczki Androida
      if (perm) setStatus("Zezwól OEST na instalowanie aplikacji (otworzyłem ustawienia), wróć i dotknij jeszcze raz.", "Allow OEST to install apps (settings are open), come back and tap again.");
      else setStatus("Nie udało się pobrać (" + why + "). Dotknij, żeby spróbować jeszcze raz.", "Download failed (" + why + "). Tap to try again.");
      if (b) { if (perm) setBanner("Nowa wersja " + latest.n + " – dotknij, żeby zainstalować", "New version " + latest.n + " – tap to install"); else setBanner("Pobieranie przerwane – dotknij, żeby ponowić", "Download stopped – tap to retry"); }
    }).then(function () { busy = false; });
  }
  // w Ustawieniach: osobny przycisk „Pobierz i zainstaluj”, żeby po anulowaniu/błędzie dało się ponowić bez szukania paska
  function showInstallBtn(n) {
    var st = document.getElementById("updStatus"); if (!st || document.getElementById("updInstall")) return;
    var b = document.createElement("button"); b.id = "updInstall"; b.type = "button"; b.className = "btn"; b.setAttribute("data-upd", "install");
    b.textContent = T("Pobierz i zainstaluj wersję ", "Download and install version ") + n; st.before(b);
  }
  function panelHtml() {
    return '<div class="panel"><b>' + T("Aktualizacja aplikacji", "App update") + '</b>' +
      '<p class="hint">' + T("Wersja w telefonie: ", "Version on the phone: ") + '<b id="updMine">' + esc(mine === null ? "…" : mine) + '</b></p>' +
      '<button class="btn" type="button" data-upd="check">' + T("Sprawdź aktualizację", "Check for update") + '</button>' +
      (latest && mine !== null && latest.n > mine ? '<button id="updInstall" class="btn" type="button" data-upd="install">' + T("Pobierz i zainstaluj wersję ", "Download and install version ") + esc(latest.n) + '</button>' : '') +
      '<p class="hint" id="updStatus">' + esc(T(lastStatus[0], lastStatus[1])) + '</p></div>';
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
