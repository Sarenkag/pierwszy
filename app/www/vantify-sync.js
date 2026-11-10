// Pobranie listy zleceń z Vantify bez klikania (Grzegorz 10/11/2026: „Zacznij od automatycznego updatu”).
// Skrypt wstrzykuje VantifyPlugin.sync() do ukrytego okna Vantify (tylko strony *.vantify.com). Okno korzysta z
// zalogowania Grzegorza zapamiętanego w WebView (logowanie ważne 24 h); apka nie zna loginu ani hasła (PROD-035).
// Jak to działa (zapisy „Zbadaj” 10/11/2026):
//  1. strona Vantify sama wywołuje swoje API – przechwytujemy nagłówek Authorization (tylko w pamięci tej strony)
//     i adres listy zleceń GET https://<firma>-api.cafm.vantify.com/users/<id>/jobs?… (filtr ustawiony w Vantify),
//  2. pobieramy wszystkie strony tej listy (TYLKO odczyt, GET) i oddajemy do apki: numer, typ, nazwa zadania,
//     status, terminy, częstotliwość. Bez danych osób, bez tokenu.
// Wynik przez most OESTVantifySync.result(json): {status:"ok", count, jobs} | {status:"login"} | {status:"error", code}.
(function (g) {
  if (g.__oestVantifySync) return;
  g.__oestVantifySync = 1;
  var API = /^https:\/\/[a-z0-9-]+-api\.cafm\.vantify\.com\//i, LIST = /\/users\/\d+\/jobs\?/;
  var X = g.XMLHttpRequest && g.XMLHttpRequest.prototype, open = X && X.open, setHeader = X && X.setRequestHeader;
  var auth = null, list = null, done = false, t0 = Date.now(), renav = 0;
  var WAIT = g.__oestSyncWait || 45000, MAX_PAGES = 60;

  function out(o) {
    if (done) return;
    done = true;
    try { if (g.OESTVantifySync) g.OESTVantifySync.result(JSON.stringify(o)); } catch (e) {}
  }
  if (!X) { out({ status: "error", code: "xhr" }); return; }
  X.open = function (m, u) {
    try { this.__oestU = String(u); if (/^get$/i.test(m) && API.test(this.__oestU) && LIST.test(this.__oestU)) list = this.__oestU; } catch (e) {}
    return open.apply(this, arguments);
  };
  X.setRequestHeader = function (k, v) {
    try { if (/^authorization$/i.test(k) && this.__oestU && API.test(this.__oestU) && v) auth = String(v); } catch (e) {}
    return setHeader.apply(this, arguments);
  };

  function withPage(u, p) { return /([?&])page=\d+/.test(u) ? u.replace(/([?&])page=\d+/, "$1page=" + p) : u + (u.indexOf("?") < 0 ? "?" : "&") + "page=" + p; }
  function get(u) {
    return new Promise(function (res, rej) {
      var x = new g.XMLHttpRequest();
      open.call(x, "GET", u);
      setHeader.call(x, "Accept", "application/json");
      setHeader.call(x, "Authorization", auth);
      x.onload = function () {
        if (x.status === 401 || x.status === 403) return rej(new Error("login"));
        if (x.status !== 200) return rej(new Error("http" + x.status));
        try { res(JSON.parse(x.responseText)); } catch (e) { rej(new Error("json")); }
      };
      x.onerror = function () { rej(new Error("net")); };
      x.send();
    });
  }
  function pick(j) {
    return { id: j.id, type: j.type, summary: j.summary, status: j.status, attendanceDueAt: j.attendanceDueAt, completionDueAt: j.completionDueAt, frequency: j.frequency };
  }
  // liczba zleceń i stron z PIERWSZEJ strony; każda strona musi mieć listę jobs, inaczej błąd (przegląd Codex #135):
  // niepełna lista byłaby gorsza niż żadna – brakujące zlecenia pokazałyby się jako „zamknięte w Vantify”
  function fetchAll(u) {
    var jobs = [], p = 1, expected = null, pages = 1;
    (function next() {
      get(withPage(u, p)).then(function (r) {
        if (!r || !Array.isArray(r.jobs)) return out({ status: "error", code: "shape" });
        if (p === 1) {
          expected = Number(r.count); pages = Number(r.pages) || 1;
          if (isNaN(expected) || r.count == null) return out({ status: "error", code: "shape" });
        }
        jobs = jobs.concat(r.jobs.map(pick));
        if (p < pages && p < MAX_PAGES) { p++; return next(); }
        if (jobs.length !== expected) return out({ status: "error", code: "partial" });
        out({ status: "ok", count: jobs.length, jobs: jobs });
      }).catch(function (e) { out(e.message === "login" ? { status: "login" } : { status: "error", code: e.message }); });
    })();
  }
  function onList() { return String(g.location.hash || "").indexOf("#/user/jobs") === 0; }
  (function tick() {
    if (done) return;
    var h = String(g.location.hash || "");
    if (/^#\/login/.test(h)) return out({ status: "login" });
    if (auth && list) return fetchAll(list);
    var wait = Date.now() - t0;
    if (wait > WAIT) return out(auth ? { status: "error", code: "nolist" } : { status: "login" });
    // lista zleceń otwiera się tylko na ekranie Jobs; gdy strona pokazała co innego albo zapytała, zanim byliśmy gotowi – przejdź jeszcze raz
    if (!onList() && h.indexOf("#/user/") === 0) g.location.hash = "#/user/jobs";
    else if (onList() && !list && wait > 6000 * (renav + 1) && renav < 3) { renav++; g.location.hash = "#/user/dashboard"; }
    setTimeout(tick, 300);
  })();
})(typeof window !== "undefined" ? window : this);
