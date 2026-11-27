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
  function renderTemps() { pokazPola("tempList", "temperatury", tempsDane); }
  $("tempList").addEventListener("input", function (e) {
    var el = e.target.closest("ion-input[data-t]"); if (!el) return;
    var i = +el.getAttribute("data-t"); temps[i] = el.value;
    el.color = tempBad(cur.type.slots[i][1], el.value) ? "danger" : undefined;
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
    // środek „grupy” w ramce basic (Grzegorz 27/11/2026, zamiast wzoru QHS-031): grupa = miejsce, punkt = rodzaj kranu z odczytem °C, ☒ poza progiem
    var gr = [];
    slots.forEach(function (s, i) {
      var n = tempNum(temps[i]); if (n === null) return;
      var bad = tempBad(s[1], temps[i]), g = gr[gr.length - 1];
      if (!g || g.nazwa !== s[0]) gr.push(g = { nazwa: s[0], punkty: [] });
      g.punkty.push({ nazwa: KIND[s[1]], stan: bad ? "no" : "ok", uwaga: n + "°C" + (bad ? " – out of range (" + LIMIT[s[1]] + ")" : "") });
    });
    Object.assign(d, OESTWzory.grupy(gr, { szare: [d.stan_ogolny + ".", "Limits: " + LIMIT.hot + " · " + LIMIT.cold + " · " + LIMIT.tmv + "."] }));
    return english(d);
  }
  var susN = {}; // numer sugestii modelu przy pytaniu (i → n)
  var rsel = {}; // wybrane powody pod pytaniem (i → [id])
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
  $("ck").addEventListener("input", function (e) { var el = e.target.closest("ion-input[data-room]"); if (el) roomNotes[el.getAttribute("data-room")] = el.value; });
  function checkIdx(key) { if (!key) return -1; for (var i = 0; i < cur.type.checks.length; i++) if (cur.type.checks[i].key === key) return i; return -1; }
  function renderFaults() {
    pokazPola("faults", "usterki", faultsDane);
  }
  $("faults").addEventListener("change", function (e) {
    var b = e.target.closest("ion-checkbox[data-f]"); if (!b) return;
    setFault(b.getAttribute("data-f"), b.checked);
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
    if (faultsOn[f.id] && !f.note) $("ov").value = "Requires attention";
    renderFaults(); suggestOverall(); updateFormHint();
  }
  // usterki bez pasującego punktu checklisty idą jako osobne zdania
  function extraFaults(notes) {
    return RD.usterkiDla(cur.type).filter(function (f) { return faultsOn[f.id] && checkIdx(f.key) < 0 && (notes || !f.note); }).map(function (f) { return f.en; });
  }
  $("ck").addEventListener("change", function (e) {
    var r = e.target.closest("ion-checkbox[data-r]");
    if (r) {
      var ri = +r.getAttribute("data-ri"), id = r.getAttribute("data-r"), arr = rsel[ri] = rsel[ri] || [];
      if (arr.indexOf(id) >= 0) arr.splice(arr.indexOf(id), 1); else arr.push(id);
      // jedno kliknięcie w powód = NIE z gotowym zdaniem; odznaczenie ostatniego powodu wraca na TAK
      if (arr.length) { states[ri] = "fail"; delete susN[ri]; }
      else if (states[ri] === "fail") states[ri] = "ok";
      renderChecks(); suggestOverall(); updateFormHint(); return;
    }
    var b = e.target.closest("ion-select[data-i]"); if (!b) return;
    var i = +b.getAttribute("data-i"), key = cur.type.checks[i].key;
    states[i] = b.value; delete override[i]; delete susN[i];
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
    if (fails && radio("ov") === "Satisfactory") $("ov").value = "Requires attention";
    if (!fails && radio("ov") === "Requires attention") $("ov").value = "Satisfactory";
  }


