// Weekly Flushing (TA / TB / P): wypełnianie wspólnego wzoru Word (moduly/wzory/flush.docx) — czyste funkcje, bez DOM.
// Tydzień miesiąca wybiera inżynier (apka nie liczy go z daty, Grzegorz 02/11/2026).
(function (root) {
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  var LABEL = { yes: "Yes", no: "No", na: "N/A" };
  var GREEN = "92D050";
  function x(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
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

  // Odczyt raportu Flushing z PDF-a (raport z kolejki wysyłki, Grzegorz 04/11): odpowiedzi kranów, tydzień i zdjęcia
  // przy właściwych kranach — po to, żeby odtworzyć inspekcję, która zniknęła po „Wyślij” w starej wersji.
  // PDF z jsPDF (bez kompresji): tekst w czcionce DejaVu (kody glifów + ToUnicode), zdjęcia JPEG (DCTDecode).
  // names: nazwy kranów w kolejności formularza. Wynik: { week, name, taps:[{state, note}], photos:[{tap|null, bytes, width, height}] } albo null.
  function fromPdf(bytes, names) {
    if (!bytes || !bytes.length) return null;
    var S = ""; for (var i = 0; i < bytes.length; i += 0x8000) S += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    var objs = {}, re = /(\d+) 0 obj\s*([\s\S]*?)endobj/g, m;
    while ((m = re.exec(S))) {
      var body = m[2], at = m.index + m[0].indexOf(m[2]), st = body.search(/\bstream\r?\n/), o = { dict: st < 0 ? body : body.slice(0, st) };
      if (st >= 0) {
        var a = st + body.slice(st).match(/^stream\r?\n/)[0].length, len = (o.dict.match(/\/Length (\d+)(?! 0 R)/) || [])[1];
        var e = len ? a + +len : body.lastIndexOf("endstream"); o.s = at + a; o.e = at + e; o.data = body.slice(a, e);
      }
      objs[m[1]] = o;
    }
    function ref(d, key) { var r = d.match(new RegExp("/" + key + "\\s+(\\d+) 0 R")); return r ? objs[r[1]] : null; }
    function dictRefs(d, key) { var r = d.match(new RegExp("/" + key + "\\s*<<([\\s\\S]*?)>>")), out = {}; if (!r) return out; r[1].replace(/\/([\w.+-]+)\s+(\d+) 0 R/g, function (_, n, id) { out[n] = objs[id]; }); return out; }
    function hex(h) { return parseInt(h, 16); }
    // czcionki: kod glifu → znak (ToUnicode)
    var cmaps = {};
    Object.keys(objs).forEach(function (id) {
      var d = objs[id].dict; if (!/\/Type\s*\/Font/.test(d)) return;
      var tu = ref(d, "ToUnicode"), map = {}; if (!tu || !tu.data) return;
      tu.data.replace(/beginbfchar([\s\S]*?)endbfchar/g, function (_, b) { b.replace(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g, function (_, g, u) { map[hex(g)] = String.fromCharCode(hex(u)); }); });
      tu.data.replace(/beginbfrange([\s\S]*?)endbfrange/g, function (_, b) { b.replace(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g, function (_, x0, x1, u) { for (var k = hex(x0); k <= hex(x1); k++) map[k] = String.fromCharCode(hex(u) + k - hex(x0)); }); });
      cmaps[id] = map;
    });
    var pagesRoot = null; Object.keys(objs).forEach(function (id) { if (/\/Type\s*\/Pages/.test(objs[id].dict)) pagesRoot = pagesRoot || objs[id]; });
    if (!pagesRoot) return null;
    var kids = []; (pagesRoot.dict.match(/\/Kids\s*\[([^\]]*)\]/) || ["", ""])[1].replace(/(\d+) 0 R/g, function (_, id) { kids.push(objs[id]); });
    var fontsByName = {}, imgsByName = {};
    function res(d) {
      var r = ref(d, "Resources"), rd = r ? r.dict : (d.match(/\/Resources\s*<<([\s\S]*)>>/) || ["", ""])[1];
      var f = dictRefs(rd, "Font"), x = dictRefs(rd, "XObject");
      Object.keys(f).forEach(function (n) { var id = Object.keys(objs).filter(function (k) { return objs[k] === f[n]; })[0]; fontsByName[n] = cmaps[id] || null; });
      Object.keys(x).forEach(function (n) { imgsByName[n] = x[n]; });
    }
    res(pagesRoot.dict);
    var items = []; // {page, kind:'t'|'i', x, y, text | img}
    kids.forEach(function (pg, pi) {
      if (!pg) return;
      var mb = (pg.dict.match(/\/MediaBox\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/) || []).slice(1).map(Number);
      if (mb.length === 4 && mb[2] - mb[0] > mb[3] - mb[1]) return; // strona pozioma = pełny formularz firmy (04/11): odpowiedzi czytamy z listy basic form
      res(pg.dict);
      var cs = []; (pg.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/) || ["", ""])[1].replace(/(\d+) 0 R/g, function (_, id) { if (objs[id] && objs[id].data != null) cs.push(objs[id].data); });
      var src = cs.join("\n"), tok = /<([0-9a-fA-F]*)>|\((?:\\.|[^\\)])*\)|\[|\]|\/[^\s/<>\[\]()]+|[-+]?\d*\.?\d+|[A-Za-z*'"]+/g, t, stack = [], font = null, tx = 0, ty = 0, tl = 0, cm = [1, 0, 0, 1, 0, 0], arr = null;
      function dec(str, isHex) {
        if (isHex) { var map = font || {}, out = ""; for (var k = 0; k + 4 <= str.length; k += 4) { var c = hex(str.substr(k, 4)); out += map[c] != null ? map[c] : ""; } return out; }
        return str.slice(1, -1).replace(/\\([\\()])/g, "$1");
      }
      function emit(s) { if (s) items.push({ page: pi, kind: "t", x: tx, y: ty, text: s }); }
      while ((t = tok.exec(src))) {
        var v = t[0];
        if (v === "[") { arr = []; continue; }
        if (v === "]") { stack.push(arr); arr = null; continue; }
        if (arr) { if (v[0] === "<") arr.push(dec(t[1], true)); else if (v[0] === "(") arr.push(dec(v)); continue; }
        if (/^[A-Za-z*'"]+$/.test(v) && !/^(true|false|null)$/.test(v)) {
          var op = v;
          if (op === "BT") { tx = 0; ty = 0; }
          else if (op === "Tf") font = fontsByName[String(stack[stack.length - 2] || "").slice(1)] || null;
          else if (op === "TL") tl = +stack[stack.length - 1];
          else if (op === "Td" || op === "TD") { tx += +stack[stack.length - 2]; ty += +stack[stack.length - 1]; }
          else if (op === "Tm") { tx = +stack[stack.length - 2]; ty = +stack[stack.length - 1]; }
          else if (op === "T*") ty -= tl;
          else if (op === "Tj" || op === "'") { if (op === "'") ty -= tl; var sv = stack[stack.length - 1]; emit(sv && sv.h != null ? dec(sv.h, true) : sv && sv.s ? dec(sv.s) : ""); }
          else if (op === "TJ") { var av = stack[stack.length - 1]; emit(Array.isArray(av) ? av.join("") : ""); }
          else if (op === "cm") cm = stack.slice(-6).map(Number);
          else if (op === "Do") { var im = imgsByName[String(stack[stack.length - 1]).slice(1)]; if (im && /DCTDecode/.test(im.dict)) items.push({ page: pi, kind: "i", x: cm[4], y: cm[5], w: cm[0], img: im }); }
          stack = []; continue;
        }
        stack.push(v[0] === "<" ? { h: t[1] } : v[0] === "(" ? { s: v } : v);
      }
    });
    var PT = 72 / 25.4, near = function (a, b) { return Math.abs(a - b) < 3; };
    var out = { week: 0, name: "", taps: [], photos: [] };
    items.forEach(function (it) { var w = it.kind === "t" && it.text.match(/Week (\d) in month/); if (w) out.week = +w[1]; var n = it.kind === "t" && it.text.match(/Name: (.*)$/); if (n) out.name = n[1].trim(); });
    var REV = {}; Object.keys(LABEL).forEach(function (k) { REV[LABEL[k]] = k; });
    var states = items.filter(function (it) { return it.kind === "t" && near(it.x, 110 * PT) && REV[it.text] != null; });
    if (states.length !== names.length) return null; // inny układ: nie zgadujemy
    // notatka kranu: wszystkie kawałki z kolumny Notes od jego odpowiedzi do odpowiedzi następnego kranu (także na następnej stronie)
    var pos = states.map(function (s) { return items.indexOf(s); });
    out.taps = states.map(function (s, k) {
      var end = k + 1 < pos.length ? pos[k + 1] : items.length, part = [];
      for (var j = pos[k] - 2 < 0 ? 0 : pos[k] - 2; j < end; j++) { var it = items[j]; if (it.kind === "t" && near(it.x, 135 * PT) && (j > pos[k] || (it.page === s.page && Math.abs(it.y - s.y) < 1))) part.push(it.text); }
      return { state: REV[s.text], note: part.join(" ").trim() };
    });
    var pf = {}; items.forEach(function (it) { if (it.kind === "t" && / – photos$/.test(it.text)) pf[it.page] = 1; });
    var used = {};
    items.forEach(function (it, k) {
      if (it.kind !== "i") return;
      var o = it.img, d = o.dict, wpx = +(d.match(/\/Width (\d+)/) || [])[1], hpx = +(d.match(/\/Height (\d+)/) || [])[1];
      var jpg = bytes.slice(o.s, o.e), tap = null;
      if (pf[it.page]) {
        var cap = items.slice(k + 1).filter(function (c) { return c.kind === "t" && c.page === it.page; })[0], txt = cap ? cap.text : "";
        // najpierw dokładna nazwa; skrócony podpis tylko, gdy pasuje do jednego kranu
        var ex = [], pre = []; names.forEach(function (n, j) { if (n === txt) ex.push(j); else if (txt && n.indexOf(txt) === 0) pre.push(j); });
        var cand = ex.length ? ex : pre.length === 1 ? pre : [];
        cand.forEach(function (j) { if (tap == null && !used[j]) tap = j; }); if (tap == null && cand.length) tap = cand[0];
        if (tap == null) return; // zdjęcie bez rozpoznanego kranu: pomijamy (zostaje w module zdjęć)
        used[tap] = 1;
      }
      out.photos.push({ tap: tap, bytes: jpg, width: wpx, height: hpx });
    });
    return out;
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
  // PDF basic form: te same strefy co Word (nagłówek strefy, 2 krany w wierszu, kratka / N/A, zdanie w szarej ramce).
  // pdf: jsPDF z czcionką „DV”; x, w: komórka ramki (mm); y: start; room(h): łamie stronę, gdy trzeba, i zwraca nowy y albo null.
  // Kolejność w PDF: najpierw obramowania i tła (warstwa 0), potem tekst i kratki (warstwa 1) w kolejności Worda – po kratce
  // od razu następny tekst (jak w Wordzie: kratka, potem kolejny kran / strefa / zdanie), bez ramek pomiędzy.
  function rysujStrefy(pdf, f, x, y, w, room) {
    var p = basicPola(f), gap = 3.4, X = x + 1.9, Wd = w - 3.8, cn = Wd * 12 / 155.2, cw = Wd / 2 - cn, RH = 6.2, HH = 6.2, ops = [];
    function pg() { return pdf.getCurrentPageInfo().pageNumber; }
    function d(l, fn) { ops.push({ p: pg(), l: l, fn: fn }); }
    function at(h) { var ny = room(y, h); if (ny != null) y = ny; }
    function box(cx, cy, s) { // kratka rysowana: font PDF nie ma ☑/☒
      var b = 3.4, bx = cx - b / 2, by = cy - b / 2; pdf.setLineWidth(0.25);
      if (s === "na") { pdf.setFont("DV", "bold"); pdf.setFontSize(8.5); pdf.setTextColor(89, 89, 89); pdf.text("N/A", cx, cy + 1.1, { align: "center" }); pdf.setTextColor(0, 0, 0); return; }
      var c = s === "yes" ? [30, 138, 60] : [198, 40, 40]; pdf.setDrawColor(c[0], c[1], c[2]); pdf.rect(bx, by, b, b); pdf.setLineWidth(0.45);
      if (s === "yes") pdf.lines([[0.95, 1.05], [1.7, -2.1]], bx + 0.6, by + 1.7);
      else { pdf.line(bx + 0.7, by + 0.7, bx + b - 0.7, by + b - 0.7); pdf.line(bx + b - 0.7, by + 0.7, bx + 0.7, by + b - 0.7); }
      pdf.setDrawColor(0); pdf.setLineWidth(0.4);
    }
    (f.strefy || []).forEach(function (z, k) {
      var nr = Math.ceil(z[1].length / 2); at(gap + HH + RH * Math.min(nr, 2)); y += gap;
      var hy = y, ht = z[0].toUpperCase() + "   \u00b7   " + p["zone" + (k + 1)];
      d(0, function () { pdf.setFillColor(31, 78, 95); pdf.rect(X, hy, Wd, HH, "F"); });
      d(1, function () { pdf.setFont("DV", "bold"); pdf.setFontSize(9.5); pdf.setTextColor(255, 255, 255); pdf.text(ht, X + 1.5, hy + 4.3); pdf.setTextColor(0, 0, 0); });
      y += HH;
      for (var r = 0; r < nr; r++) {
        pdf.setFont("DV", "normal"); pdf.setFontSize(9.5);
        var cells = [0, 1].map(function (c) { var nm = z[1][r * 2 + c], t = nm == null ? null : f.taps.filter(function (q) { return q.name === nm; })[0];
          return t ? { t: t, ls: pdf.splitTextToSize((f.etykieta ? nm.replace(new RegExp(f.etykieta), "") : nm) + (t.note ? " \u2013 " + t.note : ""), cw - 3) } : null; });
        // notatka łamie się w komórce jak w Wordzie; bardzo długa – w partiach po 30 linii na kolejnych stronach (jak {details})
        var nl = Math.max.apply(null, cells.map(function (q) { return q ? q.ls.length : 1; }));
        for (var j = 0; j * 30 < nl; j++) {
          var rh = Math.max(RH, Math.min(30, nl - j * 30) * 4.2 + 2);
          at(rh);
          cells.forEach(function (q, c) {
            var cx = X + c * (cw + cn), ry = y, jj = j, hh = rh;
            d(0, function () { pdf.setDrawColor(176, 183, 187); pdf.setLineWidth(0.2); pdf.rect(cx, ry, cw, hh); pdf.rect(cx + cw, ry, cn, hh); pdf.setDrawColor(0); pdf.setLineWidth(0.4); });
            if (!q) return;
            var part = q.ls.slice(jj * 30, jj * 30 + 30);
            d(1, function () {
              if (part.length) { pdf.setFont("DV", "normal"); pdf.setFontSize(9.5); pdf.text(part, cx + 1.5, ry + 4.2); }
              if (!jj) box(cx + cw + cn / 2, ry + hh / 2, q.t.state);
            });
          });
          y += rh;
        }
      }
    });
    pdf.setFont("DV", "normal"); pdf.setFontSize(9.5);
    var ls = pdf.splitTextToSize(p.statement, Wd - 3), sh = ls.length * 4.2 + 3.6; at(gap + sh); y += gap;
    var sy = y;
    d(0, function () { pdf.setFillColor(242, 242, 242); pdf.setDrawColor(176, 183, 187); pdf.setLineWidth(0.2); pdf.rect(X, sy, Wd, sh, "FD"); pdf.setDrawColor(0); pdf.setLineWidth(0.4); });
    d(1, function () { pdf.setFont("DV", "normal"); pdf.setFontSize(9.5); pdf.text(ls, X + 1.5, sy + 4.6); });
    y += sh;
    var last = pg(), strony = [];
    ops.forEach(function (o) { if (strony.indexOf(o.p) < 0) strony.push(o.p); });
    strony.forEach(function (s) { pdf.setPage(s); [0, 1].forEach(function (l) { ops.forEach(function (o) { if (o.p === s && o.l === l) o.fn(); }); }); });
    pdf.setPage(last);
    return y + 2;
  }
  // Szkic Flushingu po zmianie listy kranów (DATA-002, uwaga Codex #187): odpowiedzi i notatki zostają przy swoich kranach.
  // Szkic z nazwami (od 21/11/2026) – po nazwie; starszy bez nazw – po kolejności, gdy lista tylko skrócona na końcu (TB: apartamenty 17–20).
  // Krany nowe na liście dostają domyślne Yes. Wynik: nowy stan formularza albo null (nie da się bezpiecznie przenieść).
  // mapaKranow: stary indeks kranu → nowy indeks albo null (kranu już nie ma na liście); null, gdy szkicu nie da się przenieść.
  // Zdjęcia usuniętych kranów stają się zwykłymi zdjęciami (widoczne i usuwalne w edytorze), nie giną i nie wiszą bez podpisu.
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
  var api = { fill: fill, migrujSzkic: migrujSzkic, mapaKranow: mapaKranow, header: header, summary: summary, fromPdf: fromPdf, basicPola: basicPola, rysujStrefy: rysujStrefy, STATEMENT: STATEMENT, MONTHS: MONTHS, LABEL: LABEL };
  if (typeof module === "object" && module.exports) module.exports = api; else root.OESTFlush = api;
})(this);
