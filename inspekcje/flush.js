// Weekly Flushing (TA / TB / P): wypełnianie wspólnego wzoru Word (moduly/wzory/flush.docx) — czyste funkcje, bez DOM.
// Tydzień miesiąca wybiera inżynier (apka nie liczy go z daty, Grzegorz 02/11/2026).
(function (root) {
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var LABEL = { yes: "Yes", no: "No", na: "N/A" };
  var GREEN = "92D050";
  var tools = root.OESTNarzedzia || (typeof require === "function" && require("../moduly/narzedzia/narzedzia.js"));
  var x = tools.esc, pad = tools.pad; // moduly/narzedzia (audyt nr 53)
  // d: { noDate (Date odznaczone), building: "A"|"B"|"Pavilion", year, month (0–11), week (1–5), date: Date, name, taps: [{ name, state, note }] }
  function fill(xml, d) {
    var parts = xml.split("<!--ROW-->");
    if (parts.length !== 3) throw Error("FLUSH_TPL");
    var dateTxt = d.noDate ? "" : pad(d.date.getDate()) + "." + pad(d.date.getMonth() + 1) + "." + d.date.getFullYear(); // „Date” odznaczone w nagłówku → puste
    var rows = d.taps.map(function (t) {
      var v = { o: t.name, c11: d.name, c12: t.note || "" };
      v["c" + (2 * d.week - 1)] = LABEL[t.state] || "";
      v["c" + 2 * d.week] = t.state === "na" ? "" : dateTxt;
      return parts[1].replace(/\{(o|c\d+)\}/g, function (_, k) { return x(v[k] || ""); });
    }).join("");
    var out = parts[0] + rows + parts[2];
    for (var i = 0; i < 6; i++) {
      out = out.split("{y" + i + "}").join(String(d.year + i)).split("{yf" + i + "}").join(i === 0 ? GREEN : "auto");
    }
    for (var m = 11; m >= 0; m--) out = out.split("{mf" + m + "}").join(m === d.month ? GREEN : "auto");
    return out;
  }
  function header(xml, building) { var tower = building.length === 1; return tower ? xml.split("{twr}").join("TOWER").split("{bld}").join(x(building)) : xml.split("{twr}").join(x(building.toUpperCase())).split(" {bld}").join("").split("{bld}").join(""); }
  function summary(d) {
    var no = d.taps.filter(function (t) { return t.state === "no"; }).length, na = d.taps.filter(function (t) { return t.state === "na"; }).length;
    return no ? no + " outlet(s) not flushed – record in the Fault and Remedial Actions Log" : "All outlets flushed" + (na ? " (" + na + " N/A)" : "");
  }

  // ---- basic form Flushing ze strefami (Grzegorz 21/11/2026, wzory moduly/wzory/flush-basic-*.docx) ----
  // Zdanie pod strefami, bajt w bajt od Grzegorza: wszystkie krany Yes → ALL, inaczej (No albo N/A) → PART.
  var STATEMENT = {
    all: "All listed Outlets flushed in accordance with the site Legionella Control procedures. Water drawn through each to prevent stagnation.",
    part: "Outlets marked as flushed were flushed in accordance with the site Legionella Control procedures. Water drawn through each to prevent stagnation."
  };
  // f: { taps:[{name,state,note}], strefy:[[nazwa,[krany]]] } → pola wzoru: ok/no/na/note i (numer kranu na liście, od 1), zone k, statement
  function basicPola(f) {
    var o = {}, all = true;
    f.taps.forEach(function (t, i) {
      var n = i + 1; o["ok" + n] = t.state === "yes" ? "\u2611" : ""; o["no" + n] = t.state === "no" ? "\u2612" : ""; o["na" + n] = t.state === "na" ? "N/A" : "";
      o["note" + n] = t.note ? " \u2013 " + t.note : ""; if (t.state !== "yes") all = false;
    });
    (f.strefy || []).forEach(function (z, k) {
      var idx = z[1].map(function (nm) { for (var i = 0; i < f.taps.length; i++) if (f.taps[i].name === nm) return i; throw Error("FLUSH_ZONE"); });
      o["zone" + (k + 1)] = idx.filter(function (i) { return f.taps[i].state === "yes"; }).length + "/" + idx.length;
    });
    var st = f.statement || [STATEMENT.all, STATEMENT.part]; // zdanie z konfiguracji typu (Generator), domyślnie Flushing
    o.statement = all ? st[0] : st[1];
    return o;
  }
  // Szkic Flushingu po zmianie listy kranów (DATA-002, uwaga Codex #187): odpowiedzi i notatki zostają przy swoich kranach.
  // Szkic z nazwami (od 21/11/2026) – po nazwie; starszy bez nazw – po kolejności, gdy lista tylko skrócona na końcu (TB: apartamenty 17–20).
  // Krany nowe na liście dostają domyślne Yes. Wynik: nowy stan formularza albo null (nie da się bezpiecznie przenieść).
  // mapaKranow: stary indeks kranu → nowy indeks albo null (kranu już nie ma na liście); null, gdy szkicu nie da się przenieść.
  // Zdjęcia usuniętych kranów stają się zwykłymi zdjęciami (widoczne i usuwalne w edytorze), nie giną i nie wiszą bez podpisu.
  // nowa lista: wszystko Yes; domyslne (Generator) = wartość wpisana od razu, do poprawy (Grzegorz 21/11/2026)
  function start(F) { var t = F.taps || []; return { on: false, week: 0, open: {}, names: t.map(String), taps: t.map(function (nm) { return { state: "yes", note: (F.domyslne && F.domyslne[nm]) || "" }; }) }; }
  function mapaKranow(dfl, names) {
    if (!dfl || !dfl.taps || !names) return null;
    var old = dfl.names;
    if (old && old.length === dfl.taps.length) return old.map(function (n) { var i = names.indexOf(n); return i < 0 ? null : i; });
    if (!old && dfl.taps.length >= names.length) return dfl.taps.map(function (t, i) { return i < names.length ? i : null; });
    return null;
  }
  function migrujSzkic(dfl, names) {
    var m = mapaKranow(dfl, names); if (!m) return null;
    var taps = names.map(function () { return { state: "yes", note: "" }; });
    m.forEach(function (n, i) { if (n != null) taps[n] = dfl.taps[i]; });
    var out = {}; Object.keys(dfl).forEach(function (k) { out[k] = dfl[k]; });
    out.taps = taps; out.names = names.map(String); out.open = {};
    return out;
  }
  var api = { start: start, fill: fill, migrujSzkic: migrujSzkic, mapaKranow: mapaKranow, header: header, summary: summary, basicPola: basicPola, STATEMENT: STATEMENT, MONTHS: MONTHS, LABEL: LABEL };
  if (typeof module === "object" && module.exports) module.exports = api; else root.OESTFlush = api;
})(this);
