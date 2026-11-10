// Eksport Vantify (CSV „Job”) → plan zleceń planowych: numer zlecenia, termin (completeBy), częstotliwość.
// Jedno źródło (Grzegorz 10/11/2026): to samo liczy wczytanie pliku w telefonie i skrypt app/scripts/vantify-plan.cjs.
// Terminy DOKŁADNIE z pliku – moduł niczego nie przelicza ani nie przesuwa (PROD-010). Bez danych osobowych w wyniku.
// Moduł nie zna OEST: dopasowanie zadania do karty (match) i poprzednie karty (prevCards) podaje wywołujący.
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.OESTEksportVantify = api;
})(typeof window !== "undefined" ? window : null, function () {
  // CSV wg RFC 4180: pola w cudzysłowach, "" w środku, przecinki i nowe linie w polu. Pierwszy wiersz = nagłówki.
  function parseCsv(text) {
    text = String(text || "").replace(/^﻿/, "");
    var rows = [], row = [], f = "", q = false, i = 0, c;
    for (; i < text.length; i++) {
      c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ",") { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(f); f = ""; rows.push(row); row = [];
      } else f += c;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    var head = (rows.shift() || []).map(function (h) { return h.trim(); });
    return rows.filter(function (r) { return r.length > 1 || r[0] !== ""; }).map(function (r) {
      var o = {}; head.forEach(function (h, k) { o[h] = r[k] == null ? "" : r[k]; }); return o;
    });
  }
  // nazwy zadań Vantify vs karty: skróty budynków i drobne różnice pisowni
  function norm(s) {
    s = String(s || "").split("Pavillion").join("P").split("Tower A").join("TA").split("Tower B").join("TB")
      .split("Roof 1").join("R1").split("Roof 2").join("R2").split("Operation Testing").join("Operation Test");
    return s.replace(/\s+/g, " ").trim().toLowerCase();
  }
  function matcher(cards) { // cards: [[id, nazwa], ...]
    var by = {}; (cards || []).forEach(function (c) { by[norm(c[1])] = c[0]; });
    return function (name) { return by[norm(name)] || null; };
  }
  function hash8(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ("0000000" + h.toString(16)).slice(-8); }
  function sortedJson(o) { return JSON.stringify(Object.keys(o).sort().reduce(function (a, k) { a[k] = o[k]; return a; }, {})); }
  var NEED = ["id", "jobType", "task", "completeBy", "frequency", "createdAt"];
  // rows: wynik parseCsv. Zwraca { exported, date, jobs: {karta: [{no, due, f}]}, cards, missing, planned }.
  // Błędy: VANTIFY_FORMAT (brak kolumn eksportu Job), VANTIFY_EMPTY (brak zleceń planowych).
  function plan(rows, opt) {
    opt = opt || {};
    var match = opt.match || function () { return null; };
    if (!rows.length || NEED.some(function (k) { return !(k in rows[0]); })) throw new Error("VANTIFY_FORMAT");
    var planned = rows.filter(function (x) { return x.jobType === "Planned"; });
    if (!planned.length) throw new Error("VANTIFY_EMPTY");
    var jobs = {}, miss = {}, date = "";
    planned.forEach(function (x) {
      var d = String(x.createdAt).slice(0, 10); if (d > date) date = d;
      var id = match(x.task);
      if (!id) { miss[x.task] = 1; return; }
      (jobs[id] = jobs[id] || []).push({ no: String(x.id), due: String(x.completeBy).slice(0, 10), f: x.frequency });
    });
    Object.keys(jobs).forEach(function (k) { jobs[k].sort(function (a, b) { return a.due < b.due ? -1 : a.due > b.due ? 1 : 0; }); });
    // Eksport ma tylko otwarte zlecenia: karta, której Vantify zamknął wszystkie zlecenia, zostaje kartą Vantify (bez terminu).
    var cards = {}; (opt.prevCards || []).concat(Object.keys(jobs)).forEach(function (k) { cards[k] = 1; });
    return { exported: date + "-" + hash8(sortedJson(jobs)), date: date, jobs: jobs, cards: Object.keys(cards).sort(), missing: Object.keys(miss).sort(), planned: planned.length };
  }
  // Co się zmienia: zlecenia nowe w pliku i zlecenia, których już nie ma (zamknięte w Vantify). Po numerze zlecenia.
  function changes(oldJobs, newJobs) {
    function flat(j) { var m = {}; Object.keys(j || {}).forEach(function (id) { j[id].forEach(function (x) { m[x.no] = { id: id, no: x.no, due: x.due }; }); }); return m; }
    var a = flat(oldJobs), b = flat(newJobs), by = function (x, y) { return x.due < y.due ? -1 : x.due > y.due ? 1 : x.id < y.id ? -1 : 1; };
    return {
      added: Object.keys(b).filter(function (k) { return !a[k]; }).map(function (k) { return b[k]; }).sort(by),
      closed: Object.keys(a).filter(function (k) { return !b[k]; }).map(function (k) { return a[k]; }).sort(by),
      total: Object.keys(b).length
    };
  }
  // Dzień w czasie brytyjskim (Vantify One Eastside): API podaje czas UTC, eksport CSV – czas lokalny.
  function ukDay(iso) {
    var d = new Date(iso); if (!iso || isNaN(d)) return String(iso || "").slice(0, 10);
    try { return d.toLocaleDateString("en-CA", { timeZone: "Europe/London" }); } catch (e) { return String(iso).slice(0, 10); }
  }
  // Lista zleceń z API Vantify (GET /users/{id}/jobs, zapis „Zbadaj” 10/11/2026) → te same wiersze co eksport Job,
  // żeby plan liczył się jedną drogą. summary = task (w eksporcie z 10/11 tak jest dla każdego zlecenia Planned),
  // completionDueAt = completeBy (dzień UK), createdAt = dzień pobrania (lista go nie podaje; dane są aktualne na ten dzień).
  function fromApi(items, day) {
    return (items || []).map(function (j) {
      return { id: String(j.id), jobType: j.type === "planned" ? "Planned" : String(j.type || ""), task: String(j.summary || ""),
        completeBy: ukDay(j.completionDueAt), frequency: String(j.frequency || ""), createdAt: String(day || "") };
    });
  }
  return { parseCsv: parseCsv, norm: norm, matcher: matcher, plan: plan, changes: changes, fromApi: fromApi };
});
