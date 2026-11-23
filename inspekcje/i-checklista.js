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
  function renderTemps() {
    if (!cur.type || !cur.type.temp) { $("tempList").innerHTML = ""; return; }
    $("tempList").innerHTML = cur.type.slots.map(function (s, i) {
      return '<div class="tp-row' + (tempBad(s[1], temps[i]) ? " bad" : "") + '"><div class="txt">' + esc(s[0]) + "<small>" + esc(KIND[s[1]]) + " · " + esc(LIMIT[s[1]]) + "</small></div>" +
        '<input type="text" inputmode="decimal" autocomplete="off" data-t="' + i + '" value="' + esc(temps[i]) + '" aria-label="' + esc(s[0] + ", " + KIND[s[1]]) + '"></div>';
    }).join("");
  }
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
  function renderChecks() {
    if (cur.type && cur.ppm) setTimeout(function () { ppmTrack(false); }, 0); // każda zmiana odpowiedzi (też „wszystko OK”, powody) → liczniki na klocku
    if (cur.type.ask) {
      var idx = cur.type.checks.map(function (c, i) { return i; });
      idx.sort(function (a, b) { return (states[b] === "sus") - (states[a] === "sus"); }); // podejrzane na górę
      var last = histOf(cur.code);
      $("ck").innerHTML = idx.map(function (i) {
        var c = cur.type.checks[i], st = states[i];
        var was = last && (last.q.indexOf(c.key) >= 0 || (c.reasons || []).some(function (r) { return last.r.indexOf(r.id) >= 0; }));
        // powody zwinięte, dopóki NIE / podpowiedź / usterka z ostatniej inspekcji
        var rs = c.reasons && c.reasons.length && (st !== "ok" || was) ?
          '<div class="chips rs">' + c.reasons.map(function (r) {
            var prev = last && last.r.indexOf(r.id) >= 0;
            return '<button type="button" class="rchip' + (prev ? " prev" : "") + '" data-ri="' + i + '" data-r="' + esc(r.id) + '" aria-pressed="' + ((rsel[i] || []).indexOf(r.id) >= 0) + '">' + esc(T(r.pl, r.en ? r.en.charAt(0).toUpperCase() + r.en.slice(1) : r.pl)) + "</button>";
          }).join("") + "</div>" : "";
        return '<div class="ck-row ' + st + '"><div class="txt' + (was ? " prevq" : "") + '">' + (susN[i] ? '<span class="mkn">' + susN[i] + "</span>" : "") + esc(T(c.q, c.qen || c.q)) +
          (was ? '<small class="was">ostatnio NIE (' + esc(last.d) + ")</small>" : "") + "</div>" +
          '<div class="seg" role="group" aria-label="' + esc(T(c.q, c.qen || c.q)) + '">' +
          '<button type="button" class="ok' + (st === "ok" ? " on" : "") + '" data-i="' + i + '" data-s="ok" aria-pressed="' + (st === "ok") + '" style="width:58px">TAK</button>' +
          '<button type="button" class="fail' + (st === "fail" ? " on" : "") + '" data-i="' + i + '" data-s="fail" aria-pressed="' + (st === "fail") + '" style="width:58px">NIE</button>' +
          "</div>" + rs + "</div>";
      }).join("");
      return;
    }
    var cks = cur.type.checks;
    $("ck").innerHTML = cks.map(function (c, i) {
      var s = states[i], head = "", tail = "";
      if (c.room && (!i || cks[i - 1].room !== c.room)) head = '<div class="room-h"><b>' + esc(c.roomName) + "</b><span>" + esc(c.roomLoc) + "</span></div>";
      if (c.room && (i === cks.length - 1 || cks[i + 1].room !== c.room) && roomFails(c.room).length)
        tail = '<input class="room-note" type="text" data-room="' + esc(c.room) + '" value="' + esc(roomNotes[c.room] || "") + '" placeholder="'+T('Co jest nie tak? (trafi do raportu)', 'What is wrong? (goes to the report)')+'" aria-label="' + T('Uwagi: ', 'Remarks: ') + esc(c.roomName) + '">';
      return head + '<div class="ck-row ' + s + '"><div class="txt">' + esc(c.room ? c.cp : s === "fail" ? (override[i] || c.fail) : c.ok) + "</div>" +
        '<div class="seg" role="group" aria-label="Punkt ' + (i + 1) + '">' +
        '<button type="button" class="ok' + (s === "ok" ? " on" : "") + '" data-i="' + i + '" data-s="ok" aria-label="OK" aria-pressed="' + (s === "ok") + '">✓</button>' +
        '<button type="button" class="fail' + (s === "fail" ? " on" : "") + '" data-i="' + i + '" data-s="fail" aria-label="'+T('Nie OK', 'Not OK')+'" aria-pressed="' + (s === "fail") + '">✗</button>' +
        '<button type="button" class="na' + (s === "na" ? " on" : "") + '" data-i="' + i + '" data-s="na" aria-label="'+T('Pomiń', 'Skip')+'" aria-pressed="' + (s === "na") + '">–</button>' +
        "</div></div>" + tail;
    }).join("");
  }
  // plant roomy: uwaga do pomieszczenia (jedna na pomieszczenie), pokazuje się, gdy coś jest ✗
  var roomNotes = {};
  function roomFails(room) { return cur.type.checks.filter(function (c, i) { return c.room === room && states[i] === "fail"; }).map(function (c) { return c.cp; }); }
  $("ck").addEventListener("input", function (e) { var el = e.target.closest("input[data-room]"); if (el) roomNotes[el.getAttribute("data-room")] = el.value; });
  function checkIdx(key) { if (!key) return -1; for (var i = 0; i < cur.type.checks.length; i++) if (cur.type.checks[i].key === key) return i; return -1; }
  function renderFaults() {
    $("faults").innerHTML = RD.usterkiDla(cur.type).map(function (f) {
      return '<button type="button" class="fault" data-f="' + f.id + '" aria-pressed="' + !!faultsOn[f.id] + '">' + esc(T(f.pl, f.enl)) + "</button>";
    }).join("");
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


