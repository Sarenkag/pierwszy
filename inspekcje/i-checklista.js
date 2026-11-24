"use strict";
// i-checklista.js – pomiary temperatur i checklisty.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: progów temperatur.
  // ---------- pomiary temperatur (wzór 024) ----------
  var temps = [];
  var KIND = { hot: "Hot outlet", cold: "Cold outlet", tmv: "TMV outlet (mixed)" };
  var LIMIT = { hot: "Hot > 50°C", cold: "Cold < 20°C", tmv: "TMV mixed 38–43°C" };
  function tempNum(v) { v = String(v || "").trim().replace(",", "."); return v !== "" && isFinite(v) ? +v : null; }
  function tempBad(kind, v) {
    var n = tempNum(v); if (n === null) return false;
    return kind === "hot" ? n <= 50 : kind === "cold" ? n >= 20 : n < 38 || n > 43;
  }
  var polaWidoki = {};
  function pokazPola(id, rodzaj, dane) {
    var widok = polaWidoki[id];
    if (!widok) {
      var sluchacze = OESTCzesci.sluchacze(dane);
      polaWidoki[id] = sluchacze;
      OESTCzesci.montuj($(id), "inspekcja/pola", { rodzaj: rodzaj, kontroler: { dane: dane, na: sluchacze.na } });
    } else widok.emit();
  }
  function tempsDane() {
    return { wiersze: !cur.type || !cur.type.temp ? [] : cur.type.slots.map(function (s, i) {
      return { i: i, blad: tempBad(s[1], temps[i]), nazwa: s[0], opis: KIND[s[1]] + " · " + LIMIT[s[1]], wartosc: temps[i], etykieta: s[0] + ", " + KIND[s[1]] };
    }) };
  }
  function renderTemps() { pokazPola("tempList", "temperatury", tempsDane); }
  $("tempList").addEventListener("input", function (e) {
    var el = e.target.closest("input[data-t]"); if (!el) return;
    var i = +el.getAttribute("data-t"); temps[i] = el.value;
    el.closest(".tp-row").classList.toggle("bad", tempBad(cur.type.slots[i][1], el.value));
    updateFormHint();
  });
  function tempData(w) {
    var slots = cur.type.slots, pts = [], outN = 0;
    slots.forEach(function (s, i) {
      var n = tempNum(temps[i]); if (n === null) return;
      var bad = tempBad(s[1], temps[i]); if (bad) outN++;
      pts.push(s[0] + " – " + KIND[s[1]] + ": " + n + "°C" + (bad ? " – out of range (" + LIMIT[s[1]] + ")" : ""));
    });
    var d = { data: dateTxt(w), inspektor: val("podpis"), urzadzenie: cur.code, lokalizacja: cur.where, wieza: cur.loc, pietro: "",
      tytul: cur.type.title, punkty: pts, quote: "", site: cfg.site, komentarz: "", zakres: "", temps: slots.map(function (s, i) { var n = tempNum(temps[i]); return n === null ? "" : String(n); }),
      stan_ogolny: outN ? outN + " reading(s) out of range – record in the Fault and Remedial Actions Log" : "All readings within range" };
    d.obiekt = d.lokalizacja; d.stan = d.stan_ogolny; d.rodzaj = d.tytul; d.nr = ""; d.godzina = NZ.godzina(new Date()); d.opis = pts.join("\n");
    d.rok = w.getFullYear(); d.miesiac = w.getMonth(); // zaznaczenie roku i miesiąca w formularzu = data inspekcji
    return d;
  }
  // Wzór firmy: kolejne pola {temp} dostają kolejne pomiary, {name} podpis, {data} datę; reszta tabeli bez zmian
  function fillTempDocx(d) {
    var zip = new PizZip(OESTWzory.bajty(cur.type.wzor)), xml = zip.file("word/document.xml").asText(), i = 0;
    function x(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    xml = xml.replace(/\{temp\}/g, function () { return x(d.temps[i++] || ""); }).split("{name}").join(x(d.inspektor || "")).split("{data}").join(x(d.data));
    xml = markPeriod(xml, d.rok, d.miesiac);
    zip.file("word/document.xml", xml);
    return zip.generate({ type: "uint8array", compression: "DEFLATE", mimeType: MIME_DOCX });
  }
  // Tabela lat i miesięcy we wzorze QHS-031: żadnego stałego zaznaczenia – zielone tło tylko na roku i miesiącu daty inspekcji
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function markPeriod(xml, rok, mies) {
    var want = [String(rok), MONTHS_EN[mies]];
    return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, function (p) {
      var t = (p.match(/<w:t(?: [^>]*)?>[^<]*/g) || []).map(function (s) { return s.replace(/^<w:t[^>]*>/, ""); }).join("").trim();
      if (!/^20\d\d$/.test(t) && MONTHS_EN.indexOf(t) < 0) return p;
      p = p.replace(/<w:highlight w:val="[^"]*"\/>/g, "");
      if (want.indexOf(t) < 0) return p;
      return p.replace(/<w:r(?=[ >])([^>]*)>([\s\S]*?)<\/w:r>/g, function (r, a, b) {
        if (!/<w:t[ >]/.test(b)) return r;
        var h = '<w:highlight w:val="green"/>';
        if (/<w:rPr>/.test(b)) b = b.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/, function (m, c) {
          var k = c.search(/<w:(u|effect|bdr|shd|fitText|vertAlign|rtl|cs|em|lang|eastAsianLayout|specVanish|oMath)[ \/>]/);
          return "<w:rPr>" + (k < 0 ? c + h : c.slice(0, k) + h + c.slice(k)) + "</w:rPr>";
        });
        else b = "<w:rPr>" + h + "</w:rPr>" + b;
        return "<w:r" + a + ">" + b + "</w:r>";
      });
    });
  }
  var susN = {}; // numer sugestii modelu przy pytaniu (i → n)
  var rsel = {}; // wybrane powody pod pytaniem (i → [id])
  // Widok Vue dostaje tylko gotowe wiersze. Reguły odpowiedzi, raportu i zapisu zostają tutaj.
  var widokChecks = null, checksSluchacze = [];
  function checksDane() {
    var pytania = !!cur.type.ask, cks = cur.type.checks;
    var idx = cks.map(function (c, i) { return i; });
    if (pytania) idx.sort(function (a, b) { return (states[b] === "sus") - (states[a] === "sus"); });
    var last = pytania && histOf(cur.code);
    return { pytania: pytania, wiersze: idx.map(function (i) {
      var c = cks[i], st = states[i];
      var was = !!(last && (last.q.indexOf(c.key) >= 0 || (c.reasons || []).some(function (r) { return last.r.indexOf(r.id) >= 0; })));
      var rs = pytania && c.reasons && c.reasons.length && (st !== "ok" || was) ? c.reasons : [];
      return {
        i: i, stan: st, tekst: pytania ? window.OESTT(c.q, c.qen || c.q) : c.room ? c.cp : st === "fail" ? (override[i] || c.fail) : c.ok,
        poprzednio: pytania && was, data: was ? last.d : "", sugestia: pytania ? susN[i] : null,
        etykieta: pytania ? window.OESTT(c.q, c.qen || c.q) : "Punkt " + (i + 1),
        przyciski: pytania ? [
          { stan: "ok", klasa: "ok", tekst: "TAK" }, { stan: "fail", klasa: "fail", tekst: "NIE" }
        ] : [
          { stan: "ok", klasa: "ok", tekst: "✓", etykieta: "OK" },
          { stan: "fail", klasa: "fail", tekst: "✗", etykieta: window.OESTT("Nie OK", "Not OK") },
          { stan: "na", klasa: "na", tekst: "–", etykieta: window.OESTT("Pomiń", "Skip") }
        ],
        powody: rs.map(function (r) { return { id: r.id, tekst: window.OESTT(r.pl, r.en ? r.en.charAt(0).toUpperCase() + r.en.slice(1) : r.pl), poprzednio: !!(last && last.r.indexOf(r.id) >= 0), wybrany: (rsel[i] || []).indexOf(r.id) >= 0 }; }),
        pokoj: !pytania && c.room && (!i || cks[i - 1].room !== c.room) ? { nazwa: c.roomName, miejsce: c.roomLoc } : null,
        uwaga: !pytania && c.room && (i === cks.length - 1 || cks[i + 1].room !== c.room) && roomFails(c.room).length ? {
          id: c.room, tekst: roomNotes[c.room] || "", podpowiedz: window.OESTT("Co jest nie tak? (trafi do raportu)", "What is wrong? (goes to the report)"), etykieta: window.OESTT("Uwagi: ", "Remarks: ") + c.roomName
        } : null
      };
    }) };
  }
  function renderChecks() {
    if (cur.type && cur.ppm) setTimeout(function () { ppmTrack(false); }, 0);
    if (!widokChecks) {
      widokChecks = OESTCzesci.montuj($("ck"), "inspekcja/checklista", { kontroler: {
        dane: checksDane,
        na: function (fn) { checksSluchacze.push(fn); return function () { checksSluchacze = checksSluchacze.filter(function (f) { return f !== fn; }); }; }
      } });
    } else {
      var dane = checksDane(); checksSluchacze.slice().forEach(function (fn) { fn(dane); });
    }
  }
  // plant roomy: uwaga do pomieszczenia (jedna na pomieszczenie), pokazuje się, gdy coś jest ✗
  var roomNotes = {};
  function roomFails(room) { return cur.type.checks.filter(function (c, i) { return c.room === room && states[i] === "fail"; }).map(function (c) { return c.cp; }); }
  $("ck").addEventListener("input", function (e) { var el = e.target.closest("input[data-room]"); if (el) roomNotes[el.getAttribute("data-room")] = el.value; });
  function checkIdx(key) { if (!key) return -1; for (var i = 0; i < cur.type.checks.length; i++) if (cur.type.checks[i].key === key) return i; return -1; }
  function renderFaults() {
    pokazPola("faults", "usterki", faultsDane);
  }
  function faultsDane() {
    return { wiersze: RD.usterkiDla(cur.type).map(function (f) {
      return { id: f.id, wybrany: !!faultsOn[f.id], tekst: window.OESTT(f.pl, f.enl) };
    }) };
  }
  $("faults").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-f]"); if (!b) return;
    setFault(b.getAttribute("data-f"), !faultsOn[b.getAttribute("data-f")]);
  });
  function setFault(id, on) {
    var f = FAULTS.filter(function (x) { return x.id === id; })[0], i = checkIdx(f.key);
    faultsOn[f.id] = on;
    if (i >= 0) {
      if (faultsOn[f.id]) { states[i] = "fail"; override[i] = f.en; }
      else {
        // inna aktywna usterka z tym samym punktem trzyma go dalej na ✗
        var other = RD.usterkiDla(cur.type).filter(function (x) { return x.key === f.key && faultsOn[x.id]; })[0];
        if (other) override[i] = other.en;
        else { delete override[i]; states[i] = cur.type.checks[i].def === "na" ? "na" : "ok"; }
      }
      renderChecks();
    }
    if (faultsOn[f.id] && !f.note) $("ov-2").checked = true;
    renderFaults(); suggestOverall(); updateFormHint();
  }
  // usterki bez pasującego punktu checklisty idą jako osobne zdania
  function extraFaults(notes) {
    return RD.usterkiDla(cur.type).filter(function (f) { return faultsOn[f.id] && checkIdx(f.key) < 0 && (notes || !f.note); }).map(function (f) { return f.en; });
  }
  $("ck").addEventListener("click", function (e) {
    var r = e.target.closest("button[data-r]");
    if (r) {
      var ri = +r.getAttribute("data-ri"), id = r.getAttribute("data-r"), arr = rsel[ri] = rsel[ri] || [];
      if (arr.indexOf(id) >= 0) arr.splice(arr.indexOf(id), 1); else arr.push(id);
      // jedno kliknięcie w powód = NIE z gotowym zdaniem; odznaczenie ostatniego powodu wraca na TAK
      if (arr.length) { states[ri] = "fail"; delete susN[ri]; }
      else if (states[ri] === "fail") states[ri] = "ok";
      renderChecks(); suggestOverall(); updateFormHint(); return;
    }
    var b = e.target.closest("button[data-i]"); if (!b) return;
    var i = +b.getAttribute("data-i"), key = cur.type.checks[i].key;
    states[i] = b.getAttribute("data-s"); delete override[i]; delete susN[i];
    if (states[i] === "ok") delete rsel[i];
    FAULTS.forEach(function (f) { if (f.key === key) faultsOn[f.id] = false; });
    renderChecks(); renderFaults(); suggestOverall(); updateFormHint();
  });
  $("allOk").addEventListener("click", function () {
    states = states.map(function (s) { return s === "na" ? "na" : "ok"; }); override = {}; rsel = {}; susN = {};
    FAULTS.forEach(function (f) { if (checkIdx(f.key) >= 0) faultsOn[f.id] = false; });
    renderChecks(); renderFaults(); suggestOverall(); updateFormHint();
  });
  function failCount() {
    if (cur.type.ask) return askFinds().filter(function (x) { return !x.note; }).length;
    return states.filter(function (s) { return s === "fail"; }).length + extraFaults().length;
  }
  function suggestOverall() {
    var fails = failCount();
    if (fails && radio("ov") === "Satisfactory") $("ov-2").checked = true;
    if (!fails && radio("ov") === "Requires attention") $("ov-1").checked = true;
  }


