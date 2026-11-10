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
  var seen = [], auth = null, list = null, done = false, t0 = Date.now(), renav = 0, tried = false, triedAt = 0;
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
    try { this.__oestU = String(u); if (API.test(this.__oestU) && seen.length < 60) seen.push(this.__oestU); if (/^get$/i.test(m) && API.test(this.__oestU) && LIST.test(this.__oestU)) list = this.__oestU; } catch (e) {}
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
  // „Zbadaj automatycznie” (Grzegorz 10/11/2026: „bot, który wyklika więcej niż ja pokazałem”): zamiast klikać, czyta.
  // Tylko GET, tylko adresy API Vantify, idzie po linkach _links z odpowiedzi (HAL) od użytkownika i budynku; każdy wzór adresu
  // najwyżej 2 razy (dwa przykłady z listy), limit zapytań i czasu. Pomija adresy, które mogłyby coś zmienić (export, approve…).
  // Zapis jak „Zbadaj” (vantify-rejestr.js): adres i KSZTAŁT odpowiedzi, bez danych osób, haseł i tokenów.
  // Do tego kod strony Vantify (pliki .js): wywołania POST/PUT/PATCH/DELETE i ścieżki API – jak strona zamyka zlecenia, dodaje pliki.
  var MAX_REQ = g.__oestExploreMax || 300, UNSAFE = /export|download|logout|log-out|sign-?out|delete|remove|approve|reject|accept|decline|complete|close|cancel|send|email|notify|print|pdf|mark|read-all|subscribe|unsubscribe|reset|token|password/i;
  function ids() {
    var u = null, s = null;
    seen.concat(list ? [list] : []).forEach(function (x) { var a = /\/users\/(\d+)/.exec(x), b = /[?&]site=(\d+)|\/sites\/(\d+)/.exec(x); if (a && !u) u = a[1]; if (b && !s) s = b[1] || b[2]; });
    var base = /^https:\/\/[^/]+/.exec(list || seen[0] || "");
    return u && s && base ? { base: base[0], user: u, site: s } : null;
  }
  function tpl(u) { return u.replace(/^https:\/\/[^/]+/, "").split("?")[0].replace(/\/\d+(?=\/|$)/g, "/{id}"); }
  function links(o, d, acc) {
    if (!o || typeof o !== "object" || d > 4) return acc;
    if (Array.isArray(o)) { o.slice(0, 2).forEach(function (x) { links(x, d + 1, acc); }); return acc; }
    Object.keys(o).forEach(function (k) {
      var v = o[k];
      if (k === "_links" && v && typeof v === "object") Object.keys(v).forEach(function (r) { [].concat(v[r]).slice(0, 2).forEach(function (l) { if (l && typeof l.href === "string") acc.push(l.href); }); });
      else if (v && typeof v === "object") links(v, d + 1, acc);
    });
    return acc;
  }
  function code(origin) {
    var d = g.document, srcs = [].slice.call((d && d.scripts) || []).map(function (s) { return s.src; }).filter(function (s) { return s && s.indexOf(origin) === 0; }).slice(0, 12), found = {};
    return srcs.reduce(function (p, src) {
      return p.then(function () {
        return new Promise(function (res) {
          var x = new g.XMLHttpRequest(); open.call(x, "GET", src);
          x.onload = function () {
            var t = String(x.responseText || ""), m, re = /\.(post|put|patch|delete)\s*\(\s*([^;]{1,160})/gi, str = /["'`](\/[a-z][a-zA-Z0-9_\-\/{}$.]{2,80})["'`]/g;
            while ((m = re.exec(t)) && Object.keys(found).length < 1500) found[m[1].toUpperCase() + " " + m[2].replace(/[^\w./{}$+"'`?=&: -]/g, "").slice(0, 160)] = 1;
            while ((m = str.exec(t)) && Object.keys(found).length < 1500) found["PATH " + m[1]] = 1;
            res();
          };
          x.onerror = function () { res(); }; x.send();
        });
      });
    }, Promise.resolve()).then(function () { return Object.keys(found).sort().map(function (k) { var i = k.indexOf(" "); return { k: "code", m: k.slice(0, i), u: k.slice(i + 1) }; }); });
  }
  function explore(id) {
    var R = g.__oestRejestr, log = [], queue = [], count = {}, n = 0, started = Date.now();
    function add(u) {
      try { u = new URL(String(u).replace(/\{[^}]*\}/g, ""), id.base + "/").href; } catch (e) { return; }
      if (u.indexOf(id.base + "/") !== 0 || UNSAFE.test(u.replace(id.base, ""))) return;
      var t = tpl(u); if ((count[t] = (count[t] || 0) + 1) > 2) return;
      queue.push(u);
    }
    // start: to, co widać w zapisach „Zbadaj” 10/11 (użytkownik, alerty, budynek, zlecenia, urządzenia, pliki), dalej po linkach
    var U = id.base + "/users/" + id.user;
    [U, U + "/alerts", id.base + "/sites/" + id.site, U + "/jobs?page=1&site=" + id.site, U + "/assets?page=1&site=" + id.site, U + "/files?page=1&site=" + id.site].forEach(add);
    if (list) add(withPage(list, 1));
    function shapeOf(r) { return R ? R.shape(r, 0, false) : null; }
    function step() {
      if (!queue.length || n >= MAX_REQ || Date.now() - started > 200000) {
        var front = (g.location && g.location.origin) || "";
        return code(front).then(function (c) { out({ status: "ok", count: n, log: log.concat(c) }); });
      }
      var u = queue.shift(); n++;
      return get(u).then(function (r) { log.push({ t: Date.now(), k: "auto", m: "GET", u: R ? R.url(u) : tpl(u), st: 200, res: shapeOf(r) }); links(r, 0, []).forEach(add); },
        function (e) { log.push({ t: Date.now(), k: "auto", m: "GET", u: R ? R.url(u) : tpl(u), st: e.message }); if (e.message === "login") queue = []; })
        .then(function () { return new Promise(function (res) { setTimeout(res, 150); }); }).then(step);
    }
    step();
  }
  function onList() { return String(g.location.hash || "").indexOf("#/user/jobs") === 0; }
  (function tick() {
    if (done) return;
    var h = String(g.location.hash || "");
    if (/^#\/login/.test(h)) {
      if (g.__oestLoginBad) return out({ status: "login", code: "bad" }); // zapisane hasło już odrzucone: nie próbuj, poproś o nowe
      var c = g.__oestLogin;
      if (!c || !c.u || !c.p) return out({ status: "login" });
      if (!tried) { if (login(c)) { tried = true; triedAt = Date.now() || 1; try { g.sessionStorage.setItem("oestVantifyTried", String(triedAt)); } catch (e) {} } else if (Date.now() - t0 > WAIT) return out({ status: "login" }); }
      else if (Date.now() - triedAt > LOGIN_WAIT) return out({ status: "login", code: "bad" }); // jedna próba, bez blokady konta
      return setTimeout(tick, 300);
    }
    if (tried && !auth) t0 = Math.max(t0, triedAt); // po zalogowaniu strona zaczyna od nowa: pełny czas na listę
    if (g.__oestMode === "explore" && auth && ids()) return explore(ids());
    if (g.__oestMode !== "explore" && auth && list) return fetchAll(list);
    var wait = Date.now() - t0;
    if (wait > WAIT) return out(auth ? { status: "error", code: g.__oestMode === "explore" ? "noids" : "nolist" } : { status: "login" });
    // lista zleceń otwiera się tylko na ekranie Jobs; gdy strona pokazała co innego albo zapytała, zanim byliśmy gotowi – przejdź jeszcze raz
    if (!onList() && h.indexOf("#/user/") === 0) g.location.hash = "#/user/jobs";
    else if (onList() && !list && wait > 6000 * (renav + 1) && renav < 3) { renav++; g.location.hash = "#/user/dashboard"; }
    setTimeout(tick, 300);
  })();
})(typeof window !== "undefined" ? window : this);
