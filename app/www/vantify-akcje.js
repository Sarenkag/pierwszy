// Przyciski Vantify na karcie Reactive (Grzegorz 18/11/2026 „Tak”, PROD-038): założenie zlecenia, Commence + Complete z Job Sheet,
// odczyt statusu. Wszystko w ukrytym oknie Vantify (VantifyPlugin.action) z zalogowaniem Grzegorza; token zostaje w oknie.
// Skąd wiemy, co wysłać: zapis „Zbadaj” 18/11/2026 ukrywa wartości pól, więc apka uczy się od Grzegorza – gdy raz założy
// (albo zamknie) zlecenie w oknie Vantify w apce, „wzór” tego zapytania zostaje w telefonie (bez Summary, Description, dat
// i plików; te apka wstawia sama). Kolejne zlecenia apka wysyła z tym wzorem.
// Przebieg zamknięcia (twardy warunek Grzegorza 10/11/2026, PROD-035): świeży odczyt i porównanie z kartą → różnica = stop;
// Commence (gdy trzeba) → plik Job Sheet → Complete → ponowny odczyt: status zamknięty i plik przy zleceniu.
// Statusy Vantify z zapisu 18/11: approval_pending → acknowledged (_links.commence) → commenced (_links.complete) → completed (final).
// W testach (node) eksportuje czyste funkcje przez module.exports.
(function (g) {
  var OPS = { create: /\/sites\/\d+\/jobs\/reactive$/, commence: /\/sites\/\d+\/jobs\/\d+\/workflow\/operation\/commence$/, complete: /\/sites\/\d+\/jobs\/\d+\/workflow\/operation\/complete$/ };
  var API = /^https:\/\/[a-z0-9-]+-api\.cafm\.vantify\.com\//i;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function op(m, u) {
    if (String(m).toUpperCase() !== "POST" || !API.test(String(u))) return "";
    var p = String(u).split("?")[0];
    for (var k in OPS) if (OPS[k].test(p)) return k;
    return "";
  }
  // wzór zapytania: bez tekstów i plików tego zlecenia; próbka formatu daty zostaje (_date), żeby wysyłać daty tak samo jak strona
  function wzor(kind, body) {
    if (!body || typeof body !== "object" || !OPS[kind]) return null;
    var b = clone(body);
    if (kind === "create") { delete b.summary; delete b.description; b.files = { links: [] }; }
    if (kind === "commence") { b._date = typeof b.onSiteDate === "string" ? b.onSiteDate : ""; delete b.onSiteDate; b.files = { links: [] }; }
    if (kind === "complete") {
      b._date = typeof b.completionDate === "string" ? b.completionDate : ""; delete b.completionDate;
      var f = Array.isArray(b.files) ? b.files.filter(function (x) { return x && x._links && x._links.documentType; }) : [];
      if (!f.length) return null; // bez pliku z typem dokumentu nie wiadomo, jak dołączyć Job Sheet
      // wzór z załącznika Job Sheet (nazwa „REACTIVE …”), nie z przypadkowego pierwszego (np. zdjęcia) – przegląd Codex #146;
      // niejednoznacznie (różne typy dokumentów, żaden nie jest Job Sheet) = bez wzoru, następne zamknięcie znowu w oknie
      var typ = function (x) { return x._links.documentType.href; }, one = function (a) { return a.length && a.every(function (x) { return typ(x) === typ(a[0]); }); };
      var js = f.filter(function (x) { return /^REACTIVE\b/i.test(String(x.title || "")) || /^REACTIVE\b/i.test(String(x.filename || "")); });
      if (one(js)) f = js; else if (!one(f)) return null;
      var it = f[0]; delete it.id; delete it.title; delete it.description; delete it.documentDate; delete it.formFile; it._links.file = { href: "" };
      b._file = it; b.files = [];
    }
    return b;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  // data w tym samym zapisie co próbka ze strony Vantify (ISO z „Z” albo z przesunięciem strefy, z sekundami lub bez)
  function fmt(d, sample) {
    var s = String(sample || ""), iso = d.toISOString();
    if (/Z$/.test(s)) return /\.\d+Z$/.test(s) ? iso : iso.replace(/\.\d+Z$/, "Z");
    if (/T\d\d:\d\d(:\d\d)?[+-]\d\d:?\d\d$/.test(s)) {
      var o = -d.getTimezoneOffset(), sign = o < 0 ? "-" : "+", a = Math.abs(o), colon = /[+-]\d\d:\d\d$/.test(s) ? ":" : "", sec = /T\d\d:\d\d:\d\d/.test(s);
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + (sec ? ":" + pad(d.getSeconds()) : "") + sign + pad(Math.floor(a / 60)) + colon + pad(a % 60);
    }
    return iso.replace(/\.\d+Z$/, "+00:00");
  }
  function strip(t) { var b = clone(t); Object.keys(b).forEach(function (k) { if (k.charAt(0) === "_" && k !== "_links") delete b[k]; }); return b; }
  function create(t, o) { var b = strip(t); b.summary = String(o.summary || "").trim(); b.description = String(o.description || "").trim(); b.files = { links: [] }; return b; }
  function commence(t, o) { var b = strip(t); b.onSiteDate = fmt(o.date, t._date); b.files = { links: [] }; return b; }
  function complete(t, o) {
    var b = strip(t);
    b.completionDate = fmt(o.date, t._date);
    b.files = (o.files || []).map(function (f) { var it = clone(t._file); it.title = f.title; it.description = ""; it.documentDate = fmt(o.date, t._date); it._links.file = { href: f.href }; return it; });
    return b;
  }
  // świeży odczyt przed zamknięciem: to samo zlecenie, otwarte, zatwierdzone, ta sama nazwa co na karcie
  function check(job, exp) {
    if (!job || Number(job.id) !== Number(exp.id)) return "other";
    if (job.is_final_status) return "final";
    if (job.status === "approval_pending") return "approval";
    if (exp.summary && String(job.summary || "").trim() !== String(exp.summary).trim()) return "summary";
    if (!job._links || !(job._links.commence || job._links.complete)) return "state";
    // zlecenie wymaga innego typu dokumentu niż zapamiętany Job Sheet (np. certyfikat) → nie zgadywać, okno Vantify (przegląd Codex #146)
    if (exp.docType) { var need = docTypes(job); if (need.length && need.indexOf(exp.docType) < 0) return "doctype"; }
    return "";
  }
  function docTypes(job) {
    var r = job && job.requiredDocumentTypes, l = r && r.documentTypes; if (!r || !r.count) return [];
    l = Array.isArray(l) ? l : l && Array.isArray(l.items) ? l.items : l ? [l] : [];
    return l.map(function (d) { var h = d && d._links && d._links.self && (d._links.self.href || d._links.self); return typeof h === "string" && h.indexOf("/documenttypes/") >= 0 ? h.replace(/^https?:\/\/[^/]+/, "") : d && d.id != null ? "/documenttypes/" + d.id : ""; }).filter(Boolean);
  }
  function brief(j) { return j ? { id: j.id, status: j.status, final: !!j.is_final_status, summary: j.summary || "" } : null; }
  var api = { op: op, wzor: wzor, fmt: fmt, create: create, commence: commence, complete: complete, check: check, brief: brief };
  if (typeof window === "undefined" && typeof module === "object" && module.exports) { module.exports = api; return; }
  g.OESTVantifyAkcje = api;

  // ---------- okno Vantify w apce (VantifyActivity): nauka wzoru z działań Grzegorza ----------
  // Tylko udane zapytania (2xx) do trzech adresów. Do telefonu idzie wzór (bez tekstów) i numer zlecenia.
  var B = g.OESTVantifyBridge, X = g.XMLHttpRequest && g.XMLHttpRequest.prototype;
  if (B && B.wzor && X && !g.__oestWzor) {
    g.__oestWzor = 1;
    var o0 = X.open, s0 = X.send;
    X.open = function (m, u) { this.__oestOp = op(m, u); this.__oestUrl = String(u); return o0.apply(this, arguments); };
    X.send = function (body) {
      var x = this, kind = x.__oestOp;
      if (kind && typeof body === "string") x.addEventListener("loadend", function () {
        if (x.status < 200 || x.status > 299) return;
        try {
          var t = wzor(kind, JSON.parse(body)), id = null;
          if (kind === "create") { try { id = JSON.parse(x.responseText).id; } catch (e) {} }
          else id = Number((/\/jobs\/(\d+)\//.exec(x.__oestUrl) || [])[1]) || null;
          B.wzor(kind, t ? JSON.stringify(t) : "", String(id || ""));
        } catch (e) {}
      });
      return s0.apply(this, arguments);
    };
  }

  // ---------- ukryte okno (VantifyPlugin.action): wykonanie ----------
  // vantify-sync.js woła __oestAkcja(baza API, token, out), gdy strona Vantify już działa (zalogowanie sprawdzone).
  g.__oestAkcja = function (base, auth, out) {
    var a = g.__oestAction || {}, W = g.__oestWzory || {}, site = a.site || 6324, done = false;
    function end(r) { if (!done) { done = true; out(r); } }
    function req(m, u, body, form) {
      return new Promise(function (res, rej) {
        var x = new g.XMLHttpRequest(); x.open(m, /^https:/.test(u) ? u : base + u);
        if (!form) { x.setRequestHeader("Accept", "application/json"); if (API.test(/^https:/.test(u) ? u : base + u)) x.setRequestHeader("Authorization", auth); }
        if (body && !form) x.setRequestHeader("Content-Type", "application/json");
        x.onload = function () {
          var j = null; try { j = x.responseText ? JSON.parse(x.responseText) : null; } catch (e) {}
          if (x.status === 401) return rej({ code: "login" });
          if (x.status < 200 || x.status > 299) return rej({ code: "http" + x.status, msg: j && (j.message || j.title || j.detail) ? String(j.message || j.title || j.detail).slice(0, 200) : "" });
          res(j);
        };
        x.onerror = function () { rej({ code: "net" }); };
        x.timeout = 60000; x.ontimeout = function () { rej({ code: "timeout" }); };
        x.send(form || (body ? JSON.stringify(body) : null));
      });
    }
    function job(id) { return req("GET", "/sites/" + site + "/jobs/" + id); }
    // czy plik (Job Sheet) jest przy zleceniu: po adresie pliku albo po tytule (przegląd Codex #146 – sprawdzane też później, przy „sprawdź”)
    function hasFile(j, title, href) {
      var fl = j && j._links && j._links.files && j._links.files.href;
      if (!fl || (!title && !href)) return Promise.resolve(false);
      return req("GET", fl).then(function (r) { var list = (r && (r.files || r.items || (r._embedded && r._embedded.files))) || []; return list.some(function (f) { return f && (href && f._links && f._links.file && f._links.file.href === href || title && f.title === title); }); }, function () { return false; });
    }
    function fail(e) { end({ status: e && e.code === "login" ? "login" : "error", code: (e && e.code) || "error", msg: (e && e.msg) || "", step: step }); }
    var step = a.op || "";
    // to samo zadanie wysłane drugi raz (np. strona przeładowała się w trakcie) nie zakłada drugiego zlecenia
    try { if (a.nonce && g.sessionStorage.getItem("oestAkcja:" + a.nonce)) return end({ status: "error", code: "repeat" }); if (a.nonce) g.sessionStorage.setItem("oestAkcja:" + a.nonce, "1"); } catch (e) {}
    if (a.op === "status") {
      var ids = (a.ids || []).slice(0, 20), got = [];
      return ids.reduce(function (p, id) { return p.then(function () { return job(id).then(function (j) { var b = brief(j); if (!a.fileTitle) return got.push(b); return hasFile(j, a.fileTitle).then(function (s) { b.fileSeen = s; got.push(b); }); }, function (e) { if (e.code === "login") throw e; got.push({ id: id, error: e.code }); }); }); }, Promise.resolve())
        .then(function () { end({ status: "ok", jobs: got }); }, fail);
    }
    if (a.op === "create") {
      if (!W.create) return end({ status: "nowzor", op: "create" });
      step = "create";
      return req("POST", "/sites/" + site + "/jobs/reactive", create(W.create, a)).then(function (r) {
        var id = r && r.id; if (!id) return end({ status: "error", code: "noid" });
        step = "check";
        return job(id).then(function (j) { end({ status: "ok", id: id, job: brief(j) }); }, function () { end({ status: "ok", id: id, job: { id: id, status: r.status || "" } }); });
      }).catch(fail);
    }
    if (a.op === "close") {
      if (!W.commence || !W.complete) return end({ status: "nowzor", op: !W.commence ? "commence" : "complete" });
      var j0, href, d0 = new Date(a.onSite || Date.now()), d1 = new Date(a.done || Date.now());
      step = "read";
      return job(a.id).then(function (j) {
        j0 = j; var dt = W.complete._file && W.complete._file._links && W.complete._file._links.documentType && W.complete._file._links.documentType.href, why = check(j, { id: a.id, summary: a.summary, docType: dt });
        if (why === "doctype") { end({ status: "nowzor", op: "complete", why: why }); throw { stop: 1 }; }
        if (why) { end({ status: "differs", why: why, job: brief(j) }); throw { stop: 1 }; }
        if (!a.file || !a.file.b64) { end({ status: "error", code: "nofile" }); throw { stop: 1 }; }
        step = "upload";
        var bin = g.atob(a.file.b64), n = bin.length, u8 = new Uint8Array(n); for (var i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
        var blob = new g.Blob([u8], { type: a.file.type || "application/pdf" });
        return req("POST", "/files", { title: a.file.title, filename: a.file.name, type: blob.type, size: blob.size }).then(function (r) {
          href = r && r._links && r._links.file && r._links.file.href;
          var remote = r && r._links && r._links.remote && r._links.remote.href, pol = r && r.policy;
          if (!href || !remote || !pol) throw { code: "upload-shape" };
          var fd = new g.FormData(); Object.keys(pol).forEach(function (k) { fd.append(k, pol[k]); }); fd.append("file", blob, a.file.name);
          return req("POST", remote, null, fd);
        });
      }).then(function () {
        if (!j0._links.commence) return null;
        step = "commence";
        return req("POST", "/sites/" + site + "/jobs/" + a.id + "/workflow/operation/commence", commence(W.commence, { date: d0 }));
      }).then(function () {
        step = "complete";
        return req("POST", "/sites/" + site + "/jobs/" + a.id + "/workflow/operation/complete", complete(W.complete, { date: d1, files: [{ href: href, title: a.file.title }] }));
      }).then(function () {
        step = "verify";
        return job(a.id).then(function (j) {
          return hasFile(j, a.file.title, href).then(function (s) { end({ status: "ok", job: brief(j), closed: !!(j && j.is_final_status), fileSeen: s }); });
        });
      }).catch(function (e) { if (e && e.stop) return; fail(e); });
    }
    end({ status: "error", code: "op" });
  };
})(typeof window !== "undefined" ? window : this);
