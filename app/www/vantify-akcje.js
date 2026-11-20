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
  var OPS = { create: /\/sites\/\d+\/jobs\/reactive$/, commence: /\/sites\/\d+\/jobs\/\d+\/workflow\/operation\/commence$/, complete: /\/sites\/\d+\/jobs\/\d+\/workflow\/operation\/complete$/, attach: /\/sites\/\d+\/jobs\/\d+\/files$/ };
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
    // dodanie pliku do istniejącego zlecenia (Files → Add, zapis „Zbadaj” 18/11): bez tytułu, opisu i pliku; próbka daty zostaje
    if (kind === "attach") {
      if (!b._links || typeof b._links !== "object") return null;
      b._date = typeof b.documentDate === "string" ? b.documentDate : "";
      delete b.id; delete b.title; delete b.description; delete b.documentDate; b._links.file = { href: "" };
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
  // zdjęcia przed przy zakładaniu (Grzegorz 20/11/2026: „przy zakładaniu zdjęcie i opis, Job Sheet po wykonaniu”) – pozycja jak w zapisie „Zbadaj” 18/11:
  // {_links:{file, resource}, title, filename, type, href}; file/resource z odpowiedzi POST /files
  function link(f) { return { _links: { file: f.file || { href: f.href }, resource: f.resource || {} }, title: f.title, filename: f.name, type: f.type, href: f.href }; }
  // priorytet wybrany przy zakładaniu (Grzegorz 20/11/2026: dłuższy termin niż P5); bez wyboru zostaje ten ze wzoru
  function create(t, o) { var b = strip(t); b.summary = String(o.summary || "").trim(); b.description = String(o.description || "").trim(); b.files = { links: (o.files || []).map(link) }; if (o.priority) { var was = t._links && t._links.priority && t._links.priority.href || ""; b._links = b._links || {}; b._links.priority = { href: /^https?:/.test(was) ? String(o.priority) : path(o.priority) }; } return b; }
  // lista priorytetów tego samego rodzaju co priorytet ze wzoru: {href, name, days, label}; dni = termin wykonania
  function hrefOf(x) { var h = x && x._links && x._links.self && (x._links.self.href || x._links.self); return typeof h === "string" ? h : ""; }
  function path(h) { return String(h || "").replace(/^https?:\/\/[^/]+/, ""); }
  function priorities(list, entityType) {
    return (Array.isArray(list) ? list : []).filter(function (p) { return p && p.active !== false && (!entityType || p.entityType === entityType) && hrefOf(p); })
      .map(function (p) { var sec = p.completePeriod && Number(p.completePeriod.period) || 0; return { href: hrefOf(p), name: String(p.name || ""), days: Math.round(sec / 86400 * 10) / 10, label: String(p.completePeriodDisplayValue || "") }; });
  }
  function commence(t, o) { var b = strip(t); b.onSiteDate = fmt(o.date, t._date); b.files = { links: [] }; return b; }
  function complete(t, o) {
    var b = strip(t);
    b.completionDate = fmt(o.date, t._date);
    b.files = (o.files || []).map(function (f) { var it = clone(t._file); it.title = f.title; it.description = ""; it.documentDate = fmt(o.date, t._date); it._links.file = { href: f.href }; return it; });
    return b;
  }
  // dosłanie zdjęcia przed do już założonego zlecenia (przegląd Codex #166): ten sam wzór, tytuł i adres pliku z wysyłki
  function attach(t, o) { var b = strip(t); b.title = String(o.title || ""); b.description = ""; b.documentDate = fmt(o.date, t._date); b._links = clone(t._links || {}); b._links.file = { href: o.href }; return b; }
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
  var api = { op: op, wzor: wzor, fmt: fmt, create: create, priorities: priorities, path: path, commence: commence, complete: complete, attach: attach, check: check, brief: brief };
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
          // dodanie pliku: do karty idzie też adres dodanego pliku („numer|adres”), żeby apka potwierdziła go odczytem (przegląd Codex #167)
          if (kind === "attach" && id) { var fb = JSON.parse(body), fh = fb && fb._links && fb._links.file && fb._links.file.href; id = fh ? id + "|" + fh : null; }
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
    // które z wysłanych plików (po adresie) widać przy zleceniu – jeden odczyt listy plików;
    // nieudany odczyt = null („nie wiadomo”), nie pusta lista – inaczej apka dosłałaby zdjęcia, które już są (przegląd Codex #167)
    function seenOf(j, hrefs) {
      if (!hrefs || !hrefs.length) return Promise.resolve([]);
      var fl = j && j._links && j._links.files && j._links.files.href;
      if (!fl) return Promise.resolve(null);
      return req("GET", fl).then(function (r) { var list = (r && (r.files || r.items || (r._embedded && r._embedded.files))) || [], have = list.map(function (f) { return f && f._links && f._links.file && f._links.file.href; }); return hrefs.filter(function (h) { return have.indexOf(h) >= 0; }); }, function (e) { if (e && e.code === "login") throw e; return null; });
    }
    // plik do Vantify jak strona: POST /files (opis) → formularz do Google Storage z polityką z odpowiedzi; wynik: adres pliku i linki
    function upload(f) {
      var bin = g.atob(f.b64), n = bin.length, u8 = new Uint8Array(n); for (var i = 0; i < n; i++) u8[i] = bin.charCodeAt(i);
      var blob = new g.Blob([u8], { type: f.type });
      return req("POST", "/files", { title: f.title, filename: f.name, type: blob.type, size: blob.size }).then(function (r) {
        var href = r && r._links && r._links.file && r._links.file.href, remote = r && r._links && r._links.remote && r._links.remote.href, pol = r && r.policy;
        if (!href || !remote || !pol) throw { code: "upload-shape" };
        var fd = new g.FormData(); Object.keys(pol).forEach(function (k) { fd.append(k, pol[k]); }); fd.append("file", blob, f.name);
        return req("POST", remote, null, fd).then(function () { return { href: href, file: r._links.file, resource: r._links.resource || {} }; });
      });
    }
    function fail(e) { end({ status: e && e.code === "login" ? "login" : "error", code: (e && e.code) || "error", msg: (e && e.msg) || "", step: step }); }
    var step = a.op || "";
    // to samo zadanie wysłane drugi raz (np. strona przeładowała się w trakcie) nie zakłada drugiego zlecenia
    try { if (a.nonce && g.sessionStorage.getItem("oestAkcja:" + a.nonce)) return end({ status: "error", code: "repeat" }); if (a.nonce) g.sessionStorage.setItem("oestAkcja:" + a.nonce, "1"); } catch (e) {}
    if (a.op === "status") {
      var ids = (a.ids || []).slice(0, 20), got = [];
      return ids.reduce(function (p, id) { return p.then(function () { return job(id).then(function (j) { var b = brief(j); return (a.fileTitle ? hasFile(j, a.fileTitle).then(function (s) { b.fileSeen = s; }) : Promise.resolve()).then(function () { return a.fileHrefs ? seenOf(j, a.fileHrefs).then(function (l) { b.seenHrefs = l; }) : null; }).then(function () { got.push(b); }); }, function (e) { if (e.code === "login") throw e; got.push({ id: id, error: e.code }); }); }); }, Promise.resolve())
        .then(function () { end({ status: "ok", jobs: got }); }, fail);
    }
    if (a.op === "priorities") {
      var cur = W.create && W.create._links && W.create._links.priority && W.create._links.priority.href;
      if (!cur) return end({ status: "nowzor", op: "create" });
      step = "priorities";
      var items = function (r) { return (r && (r.priorities || (r._embedded && r._embedded.priorities))) || []; };
      return req("GET", path(cur)).then(function (p) {
        var et = p && p.entityType || "";
        return req("GET", "/priorities?active=true&order=name&limit=100" + (et ? "&entityTypes=" + encodeURIComponent(et) : "")).then(function (r) {
          var list = priorities(items(r), et);
          if (!list.some(function (x) { return path(x.href) === path(cur); })) list.unshift({ href: cur, name: String(p && p.name || ""), days: priorities([p], "")[0] ? priorities([p], "")[0].days : 0, label: String(p && p.completePeriodDisplayValue || "") });
          end({ status: "ok", current: cur, list: list });
        });
      }).catch(fail);
    }
    if (a.op === "create") {
      if (!W.create) return end({ status: "nowzor", op: "create" });
      // najpierw pliki (zdjęcia przed), dopiero potem zlecenie: błąd przy plikach = zlecenie na pewno nie powstało (step "upload")
      var sent = [];
      step = "upload";
      return (a.files || []).reduce(function (p, f) { return p.then(function () { return upload(f).then(function (u) { sent.push({ href: u.href, file: u.file, resource: u.resource, title: f.title, name: f.name, type: f.type || "image/jpeg" }); }); }); }, Promise.resolve()).then(function () {
        step = "create";
        return req("POST", "/sites/" + site + "/jobs/reactive", create(W.create, { summary: a.summary, description: a.description, files: sent, priority: a.priority }));
      }).then(function (r) {
        var id = r && r.id, hrefs = sent.map(function (f) { return f.href; }); if (!id) return end({ status: "error", code: "noid" });
        step = "check";
        // ile zdjęć widać przy zleceniu (po adresie pliku) – karta mówi, gdy czegoś brakuje
        return job(id).then(function (j) {
          // po założeniu każdy błąd sprawdzenia (też wygasłe logowanie) = „nie wiadomo”, numer zlecenia zawsze wraca (przegląd Codex #167)
          return seenOf(j, hrefs).catch(function () { return null; }).then(function (l) { end({ status: "ok", id: id, job: brief(j), photos: sent.length, photosSeen: l ? l.length : 0, hrefs: hrefs, seenHrefs: l }); });
        }, function () { end({ status: "ok", id: id, job: { id: id, status: r.status || "" }, photos: sent.length, photosSeen: 0, hrefs: hrefs, seenHrefs: [] }); });
      }).catch(fail);
    }
    // dosłanie zdjęć przed do istniejącego zlecenia (przegląd Codex #166): wysyłka pliku → Files → Add → odczyt, co widać
    if (a.op === "attach") {
      if (!W.attach) return end({ status: "nowzor", op: "attach" });
      var put = [], now = new Date();
      step = "read";
      return job(a.id).then(function (j) {
        if (!j || Number(j.id) !== Number(a.id)) throw { code: "other" };
        step = "upload";
        return (a.files || []).reduce(function (p, f) { return p.then(function () { return upload(f).then(function (u) { step = "attach"; return req("POST", "/sites/" + site + "/jobs/" + a.id + "/files", attach(W.attach, { title: f.title, href: u.href, date: now })).then(function () { put.push(u.href); step = "upload"; }); }); }); }, Promise.resolve());
      }).then(function () {
        step = "check";
        return job(a.id).then(function (j) { return seenOf(j, (a.known || []).concat(put)); }).then(function (l) { end({ status: "ok", sent: put, seenHrefs: l }); });
      }).catch(function (e) { if (!put.length) return fail(e); end({ status: e && e.code === "login" ? "login" : "error", code: (e && e.code) || "error", msg: (e && e.msg) || "", step: step, sent: put }); });
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
        return upload({ b64: a.file.b64, name: a.file.name, title: a.file.title, type: a.file.type || "application/pdf" }).then(function (u) { href = u.href; });
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
