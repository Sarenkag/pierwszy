// Pobranie listy zleceń z Vantify bez klikania (Grzegorz 10/11/2026: „Zacznij od automatycznego updatu”).
// Skrypt wstrzykuje VantifyPlugin.sync() do ukrytego okna Vantify (tylko strony *.vantify.com). Okno korzysta z
// zalogowania Grzegorza zapamiętanego w WebView (logowanie ważne 24 h); apka nie zna loginu ani hasła (PROD-035).
// Jak to działa (zapisy „Zbadaj” 10/11/2026):
//  1. strona Vantify sama wywołuje swoje API – przechwytujemy nagłówek Authorization (tylko w pamięci tej strony)
//     i adres listy zleceń GET https://<firma>-api.cafm.vantify.com/users/<id>/jobs?… (filtr ustawiony w Vantify),
//  2. pobieramy wszystkie strony tej listy (TYLKO odczyt, GET) i oddajemy do apki: numer, typ, nazwa zadania,
//     status, terminy, częstotliwość. Bez danych osób, bez tokenu.
// Wynik przez most OESTVantifySync.result(json): {status:"ok", count, jobs} | {status:"login", code?} | {status:"error", code}.
// Logowanie wygasło, a w Ustawieniach są zapisane login i hasło (VantifyLogin wstawia je jako window.__oestLogin):
// skrypt wpisuje je w formularz logowania Vantify i loguje się RAZ. Nadal ekran logowania → {status:"login", code:"bad"}.
(function (g) {
  if (g.__oestVantifySync) return;
  g.__oestVantifySync = 1;
  var API = /^https:\/\/[a-z0-9-]+-api\.cafm\.vantify\.com\//i, LIST = /\/users\/\d+\/jobs\?/;
  var X = g.XMLHttpRequest && g.XMLHttpRequest.prototype, open = X && X.open, setHeader = X && X.setRequestHeader;
  var auth = null, list = null, done = false, t0 = Date.now(), renav = 0, tried = false, triedAt = 0;
  var WAIT = g.__oestSyncWait || 45000, MAX_PAGES = 60, LOGIN_WAIT = g.__oestLoginWait || 20000;

  // jedna próba logowania także wtedy, gdy strona przeładuje się po wysłaniu formularza (sesja tego okna)
  try { var was = Number(g.sessionStorage && g.sessionStorage.getItem("oestVantifyTried")); if (was) { tried = true; triedAt = was; } } catch (e) {}
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
  function fetchAll(u) {
    var jobs = [], p = 1;
    (function next() {
      get(withPage(u, p)).then(function (r) {
        var page = Array.isArray(r && r.jobs) ? r.jobs : [];
        jobs = jobs.concat(page.map(pick));
        var pages = Number(r && r.pages) || 1, count = Number(r && r.count);
        if (p < pages && p < MAX_PAGES) { p++; return next(); }
        // niepełna lista byłaby gorsza niż żadna: zamknięte zlecenia pokazałyby się jako „zamknięte w Vantify”
        if (!isNaN(count) && count !== jobs.length) return out({ status: "error", code: "partial" });
        out({ status: "ok", count: jobs.length, jobs: jobs });
      }).catch(function (e) { out(e.message === "login" ? { status: "login" } : { status: "error", code: e.message }); });
    })();
  }
  // wpisanie jak przez człowieka: setter wartości + zdarzenia input/change (Angular widzi zmianę)
  function type(el, v) {
    var d = Object.getOwnPropertyDescriptor(g.HTMLInputElement.prototype, "value");
    if (d && d.set) d.set.call(el, v); else el.value = v;
    ["input", "change", "blur"].forEach(function (n) { el.dispatchEvent(new g.Event(n, { bubbles: true })); });
  }
  function login(c) {
    var d = g.document, pw = d.querySelector("input[type=password]");
    if (!pw) return false; // formularz jeszcze się nie wyrysował
    var form = pw.form || d, fields = [].slice.call(form.querySelectorAll("input")), at = fields.indexOf(pw), user = null;
    for (var i = at - 1; i >= 0 && !user; i--) if (/^(text|email|)$/i.test(fields[i].getAttribute("type") || "")) user = fields[i];
    if (!user) return false;
    type(user, c.u); type(pw, c.p);
    var btn = form.querySelector("button[type=submit],input[type=submit]") || form.querySelector("button");
    if (btn) btn.click(); else if (pw.form && pw.form.requestSubmit) pw.form.requestSubmit();
    return true;
  }
  function onList() { return String(g.location.hash || "").indexOf("#/user/jobs") === 0; }
  (function tick() {
    if (done) return;
    var h = String(g.location.hash || "");
    if (/^#\/login/.test(h)) {
      var c = g.__oestLogin;
      if (!c || !c.u || !c.p) return out({ status: "login" });
      if (!tried) { if (login(c)) { tried = true; triedAt = Date.now() || 1; try { g.sessionStorage.setItem("oestVantifyTried", String(triedAt)); } catch (e) {} } else if (Date.now() - t0 > WAIT) return out({ status: "login" }); }
      else if (Date.now() - triedAt > LOGIN_WAIT) return out({ status: "login", code: "bad" }); // jedna próba, bez blokady konta
      return setTimeout(tick, 300);
    }
    if (tried && !auth) t0 = Math.max(t0, triedAt); // po zalogowaniu strona zaczyna od nowa: pełny czas na listę
    if (auth && list) return fetchAll(list);
    var wait = Date.now() - t0;
    if (wait > WAIT) return out(auth ? { status: "error", code: "nolist" } : { status: "login" });
    // lista zleceń otwiera się tylko na ekranie Jobs; gdy strona pokazała co innego albo zapytała, zanim byliśmy gotowi – przejdź jeszcze raz
    if (!onList() && h.indexOf("#/user/") === 0) g.location.hash = "#/user/jobs";
    else if (onList() && !list && wait > 6000 * (renav + 1) && renav < 3) { renav++; g.location.hash = "#/user/dashboard"; }
    setTimeout(tick, 300);
  })();
})(typeof window !== "undefined" ? window : this);
