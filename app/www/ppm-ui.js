// Lista Inspekcji (ppm) i Kalendarz (cal) – dane dla ekranów Vue (moduly/szkielet/src/ekrany/Inspekcje.vue, Kalendarz.vue).
// Przeniesione 1:1 ze skryptu index.html (Grzegorz 23/11/2026: apka = moduły podpięte do wspólnych części).
// Ekran niczego nie liczy: ten moduł daje zwykłe obiekty w kształcie wspólnych części (Klocek, PasekDni), ekran tylko je pokazuje.
//
//   OESTPpmUI.ppmDane()            → { dni, filtry: [{ id, nazwa, kolor }], wybrane: [id], klocki: [klocek], pusto }
//   OESTPpmUI.dzien(k) / filtry(ids) / wybierz(klocek) / info(klocek)
//   OESTPpmUI.kalDane()            → { tytul, tydzien: [nazwa], kratki: [{ k, d, inny, praca, dzis, wybrany, n, plan }], klocki, brakGrafiku, wybrany }
//   OESTPpmUI.kalMiesiac(±1) / kalDzien(k)
//   OESTPpmUI.dniPaska(wybrany)    → pasek dni (ekran główny i lista Inspekcji)
//   OESTPpmUI.termin(due, left, done) → { tekst, ton } ; OESTPpmUI.czest(f) → '3M' / 'Y'
//   OESTPpmUI.licznikDzis()        → { today, late } (powiadomienia ekranu głównego)
//   OESTPpmUI.powrot()             → przywraca wybrany dzień / miesiąc po powrocie z inspekcji
(function (w) {
  "use strict";
  var P = w.OEST_PPM;
  function load(k, d) { try { var v = w.localStorage.getItem("oest." + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }
  function save(k, v) { try { w.localStorage.setItem("oest." + k, JSON.stringify(v)); } catch (e) {} }
  function zmiana() { w.dispatchEvent(new CustomEvent("oest:ppm-ui")); }

  // filtry (Grzegorz 03/11): kilka grup naraz + „Rozpoczęte”; brak wyboru = wszystkie; bez „Aktywa”
  var ppmSel = load("ppm.sel", null), ppmDay = "", ppmOpen = {};
  if (!Array.isArray(ppmSel)) { var og = load("ppm.group", "all"); ppmSel = og && og !== "all" && og !== "assets" ? [og] : []; }
  var DAYS = [["Nd", "Su"], ["Pn", "Mo"], ["Wt", "Tu"], ["Śr", "We"], ["Cz", "Th"], ["Pt", "Fr"], ["So", "Sa"]];
  function dayName(i) { return w.OESTT(DAYS[i][0], DAYS[i][1]); }
  function grp(id) { return P.groups.filter(function (g) { return g.id === id; })[0]; }
  function today() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }

  // termin i częstotliwość na klocku: jedna reguła w moduly/klocek (OESTKlocek.termin/czest) – „DD/MM za 4D”, „jutro”, „dziś”, „−3D”, od 31 dni „1M”
  function termin(due, left, done) { var x = w.OESTKlocek.termin(due, left, done); return { tekst: x.text, ton: x.tone }; }
  function czest(f) { return w.OESTKlocek.czest(f); }

  // grafik: jedno źródło – Ustawienia (kalendarz Google „SMART WORK”, zapasowo wersje grafiku)
  function calShift(iso) {
    try { var sc = w.OESTSettings.scheduleOn(iso); if (!sc) return false; return w.OESTCalendarCore.isWorkday(iso, function () { return sc; }); } catch (e) { return false; }
  }
  // klocek inspekcji (Grzegorz 07/11/2026; 23/11: pigułka w linii 2)
  function trybOf(st, late) { return !st ? (late ? "zalegla" : "nierozpoczeta") : st.s === "done" || st.s === "queued" || st.s === "sent" ? "gotowa" : st.s === "hold" ? "wstrzymana" : "wtrakcie"; }
  function kiData(t, due, left) {
    var st = P.stage ? P.stage(t) : null, nd = P.needs ? P.needs(t) : { q: true, p: true, f: false };
    var tryb = trybOf(st, left !== null && left < 0);
    var used = st && st.used != null ? st.used : st && st.total || 0, ok = st && st.ok != null ? st.ok : 0;
    return { st: st, nd: nd, tryb: tryb, done: tryb === "gotowa", loc: P.loc(t), freq: P.freqNow(t, due), photos: st ? st.photos || 0 : 0,
      qa: nd.q && st && used ? { ok: ok, all: used } : null, issues: nd.q && st && st.issues ? st.issues : 0,
      form: st && st.sheet ? "ok" : nd.f ? "blad" : "brak" };
  }
  // dane klocka (czesci/Klocek.vue): każde miejsce stałe, puste pola też mają miejsce
  function klocek(o) {
    var qa = o.qa && o.qa.all ? Math.min(o.qa.ok, 99) + "/" + Math.min(o.qa.all, 99) : "–";
    return { id: o.id, day: o.day || "", fam: o.fam || "", grupa: o.group || "", nazwa: o.name, znak: o.loc || "", czestotliwosc: czest(o.freq), formularz: o.form || "brak",
      status: { tryb: o.status }, termin: termin(o.due, o.left, o.dueDone),
      ikony: [{ rodzaj: "zdjecia", n: Math.min(o.photos || 0, 99) }, { rodzaj: "pytania", n: qa }].concat([{ rodzaj: "usterki", n: o.issues > 0 ? Math.min(o.issues, 99) : "", ton: "warning" }]) /* usterki: stałe miejsce także bez usterek */,
      numer: o.no || "", przygaszony: !!o.plan, akcja: o.go || "" };
  }
  function ppmCard(r) {
    var t = r.t, sh = P.short(t), k = kiData(t, r.due, r.left);
    var go = !k.st ? w.OESTT("Zacznij", "Start") : k.st.s === "prog" || k.st.s === "hold" ? w.OESTT("Kontynuuj", "Continue") : w.OESTT("Otwórz", "Open");
    // day: termin tego klocka (Gotowa zostaje w swoim dniu) – okno informacji pokazuje to samo zlecenie (uwaga Codex w PR #87)
    var job = r.due ? P.jobFor(t, P.iso(r.due)) : null; // numer zlecenia Vantify tego terminu (z pobrania z Vantify)
    return klocek({ id: t.id, group: t.group, no: job ? job.no : "", day: r.due ? P.iso(r.due) : "", name: sh.name, status: k.tryb, loc: k.loc.code, freq: k.freq, form: k.form,
      due: r.due, left: r.left, dueDone: k.done, photos: k.photos, qa: k.qa, issues: k.issues, go: go });
  }
  // wiersze listy Inspekcji: termin i dzień w pasku (Gotowa zostaje w swoim dniu, zaległe na dziś)
  function ppmRows() {
    var t0 = today();
    return P.tasks.map(function (t) {
      var due = P.due(t), next = due, st = P.stage && P.stage(t);
      if (st && st.period && (st.s === "done" || st.s === "queued" || st.s === "sent")) { var p = st.period.split("-"); due = new Date(+p[0], +p[1] - 1, +p[2]); }
      var left = P.daysLeft(due); return { t: t, due: due, next: next, left: left, day: due ? P.iso(left < 0 ? t0 : due) : "" };
    });
  }
  // licznik pod dniem (Grzegorz 05/11): zakończone / wszystkie na ten dzień – ten sam na głównej i w Inspekcjach
  function ppmDayCounts(rows) {
    var out = {};
    rows.forEach(function (r) { if (!r.day) return; var c = out[r.day] = out[r.day] || { done: 0, all: 0 }; c.all++; var x = P.stage && P.stage(r.t); if (x && (x.s === "done" || x.s === "queued" || x.s === "sent")) c.done++; });
    return out;
  }
  // jeden pasek dni (Grzegorz 07/11): wczoraj + 13 dni, dni pracy z grafiku, pogoda z ekranu głównego
  function dniPaska(wybrany) {
    var t = today(), k0 = P.iso(t), cnt = ppmDayCounts(ppmRows()), out = [];
    for (var i = -1; i < 13; i++) {
      var x = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i), k = P.iso(x), c = cnt[k];
      out.push({ k: k, nazwa: k === k0 ? w.OESTT("Dziś", "Today") : dayName(x.getDay()), numer: x.getDate(), pogoda: w.OESTPogoda.dzien(k),
        licznik: c && c.all ? (c.done || 0) + "/" + c.all : "", dzis: k === k0, minal: k < k0, praca: calShift(k), wybrany: wybrany === k });
    }
    return out;
  }
  function ppmDane() {
    var rows = ppmRows();
    var filtry = P.groups.map(function (g) { return { id: g.id, nazwa: w.OESTT(g.pl || g.name, g.name), kolor: g.color }; }).concat([{ id: "started", nazwa: w.OESTT("Rozpoczęte", "Started") }]);
    var gs = ppmSel.filter(function (x) { return x !== "started"; }), started = ppmSel.indexOf("started") >= 0;
    var list = rows.filter(function (r) {
      if (gs.length && gs.indexOf(r.t.group) < 0) return false;
      if (started) { var x = P.stage && P.stage(r.t); if (!x || (x.s !== "prog" && x.s !== "hold")) return false; }
      return !ppmDay || r.day === ppmDay;
    });
    // najpierw po terminie i najbliższe, na końcu bez daty
    var doneOf = function (r) { var x = P.stage && P.stage(r.t); return x && x.s === "sent" ? 1 : 0; };
    list.sort(function (a, b) { return doneOf(a) - doneOf(b) || (a.left === null) - (b.left === null) || (a.left || 0) - (b.left || 0) || a.t.name.localeCompare(b.t.name); });
    // rodzina (np. 18 DB): jedna karta grupy w miejscu najpilniejszej, rozwijana dotknięciem
    var fams = {}, out = [];
    list.forEach(function (r) {
      var f = r.t.fam; if (!f) { out.push(r); return; }
      if (!fams[f]) { fams[f] = { fam: f, rows: [], left: r.left, t: r.t }; out.push(fams[f]); }
      fams[f].rows.push(r);
    });
    var klocki = [];
    out.forEach(function (r) {
      if (!r.fam) { klocki.push(ppmCard(r)); return; }
      // grupa (np. 18 DB) – ten sam klocek: status z urządzeń, pytania = gotowe / wszystkie urządzenia
      var ks = r.rows.map(function (x) { return kiData(x.t, x.due, x.left); }), gd = ks.filter(function (x) { return x.done; }).length;
      var ft = gd === ks.length ? "gotowa" : ks.some(function (x) { return x.tryb === "wtrakcie"; }) ? "wtrakcie" : r.left !== null && r.left < 0 ? "zalegla" : ks.some(function (x) { return x.tryb === "wstrzymana"; }) ? "wstrzymana" : "nierozpoczeta";
      klocki.push(klocek({ fam: r.fam, group: r.t.group, name: r.fam + " (" + r.rows.length + ")", status: ft, loc: "", freq: P.freqNow(r.t, r.rows[0].due), form: "brak",
        due: r.rows[0].due, left: r.left, photos: ks.reduce(function (n, x) { return n + x.photos; }, 0), qa: { ok: gd, all: ks.length }, issues: ks.reduce(function (n, x) { return n + x.issues; }, 0),
        go: ppmOpen[r.fam] ? w.OESTT("Zwiń", "Collapse") : w.OESTT("Rozwiń", "Expand") }));
      if (ppmOpen[r.fam]) r.rows.forEach(function (x) { klocki.push(ppmCard(x)); });
    });
    return { dni: dniPaska(ppmDay), filtry: filtry, wybrane: ppmSel.slice(), klocki: klocki, pusto: w.OESTT("Brak inspekcji dla tego filtra.", "No inspections for this filter.") };
  }
  function dzien(k) { ppmDay = ppmDay === k ? "" : k; zmiana(); }
  function filtry(ids) { ppmSel = (ids || []).slice(); save("ppm.sel", ppmSel); zmiana(); }
  function ustawDzien(k) { ppmDay = k || ""; }
  // powrót na ekran główny zdejmuje wybór dnia (jak renderHome na main): następne wejście w Inspekcje = wszystkie dni
  w.document.addEventListener("oest:ekran", function (e) { if (e.detail && e.detail.trasa === "home") ppmDay = ""; });

  // Wstecz wraca tam, skąd przyszedłem (Grzegorz 03/11): przed wejściem do inspekcji zapamiętujemy ekran, wybrany dzień i przewinięcie
  function goInsp(url) {
    w.OESTPowrot.zapisz({ h: "#" + w.OESTEkrany.trasa(), day: ppmDay, cs: calSel, cm: calMonth && calMonth.getTime(), y: w.OESTEkrany.przewiniecie() }); // moduly/powrot
    w.OESTEkrany.otworzStrone(url);
  }
  function powrot() {
    var b = w.OESTPowrot.odczytaj(true);
    if (!b || b.h !== "#" + w.OESTEkrany.trasa()) return null;
    ppmDay = b.day || ""; calSel = b.cs || ""; if (b.cm) calMonth = new Date(b.cm);
    zmiana(); return b.y || 0;
  }
  function wybierz(k) {
    if (k.fam && !k.id) { ppmOpen[k.fam] = !ppmOpen[k.fam]; zmiana(); return; }
    if (k.id) goInsp("inspekcje/index.html#ppm=" + encodeURIComponent(k.id));
  }

  // okno informacji po przytrzymaniu klocka (Grzegorz 07/11/2026 19:36–19:40): wiersze [{ ikona, czesci: [{ t, b, kolor }] }]
  var FREQ = { "1W": ["co tydzień", "weekly"], "1M": ["co miesiąc", "monthly"], "3M": ["co kwartał", "quarterly"], "6M": ["co pół roku", "6-monthly"], "11M": ["co 11 miesięcy", "every 11 months"], "12M": ["co rok", "annual"] };
  function freqName(f) { return FREQ[f] ? w.OESTT(FREQ[f][0], FREQ[f][1]) : f; }
  function dlong(d) { return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
  function infoDane(id, dayIso) {
    var t = P.byId(id); if (!t) return null;
    var due = dayIso ? new Date(+dayIso.slice(0, 4), +dayIso.slice(5, 7) - 1, +dayIso.slice(8, 10)) : P.due(t), k = kiData(t, due, P.daysLeft(due));
    // inny termin niż bieżąca inspekcja (np. grudzień w Kalendarzu): bez jej zdjęć, odpowiedzi i usterek – jak na klocku (uwaga Codex w PR #87)
    var now = P.due(t), cur = !dayIso || (k.st && k.st.period === dayIso) || (now && P.iso(now) === dayIso);
    if (!cur) { k.st = null; k.photos = 0; k.qa = null; k.issues = 0; k.form = k.nd.f ? "blad" : "brak"; }
    var vt = P.vantifyTask(t, k.freq), job = due ? P.jobFor(t, P.iso(due)) : null, code = k.loc.code ? k.loc.code.split("/")[0] : "";
    var rows = [
      { ikona: "lok", czesci: k.loc.full ? (code ? [{ t: code, b: true }, { t: k.loc.full.slice(code.length) }] : [{ t: k.loc.full }]) : [{ t: w.OESTT("Lokalizacja nieprzypisana", "No location assigned") }] },
      { ikona: "czest", czesci: [{ t: czest(k.freq) || "–", b: true }, { t: (k.freq ? " – " + freqName(k.freq) : "") + (vt ? " · Vantify " + vt.no : "") }] },
      { ikona: "termin", czesci: due ? [{ t: w.OESTT("Kończy się ", "Due ") }, { t: dlong(due), b: true }, { t: job ? w.OESTT(" · zlecenie ", " · job ") + job.no : "" }] : [{ t: w.OESTT("Brak terminu", "No due date") }] },
      { ikona: "form-" + k.form, czesci: k.nd.f ? [{ t: w.OESTT("Wymaga zdjęcia ręcznie wypełnionego formularza", "Requires a photo of the hand-filled form") + " · " }, { t: k.form === "ok" ? w.OESTT("dodane", "added") : w.OESTT("brak", "missing"), b: true, kolor: k.form === "ok" ? "success" : "danger" }]
        : [{ t: w.OESTT("Zdjęcie formularza niewymagane", "Form photo not required") + (k.form === "ok" ? " · " + w.OESTT("dodane", "added") : "") }] },
      { ikona: "zdjecia", czesci: [{ t: (k.nd.p ? w.OESTT("Wymaga zdjęć", "Requires photos") : w.OESTT("Zdjęcia niewymagane", "Photos not required")) + " · " + w.OESTT("zrobiono ", "taken ") }, { t: String(k.photos), b: true }] },
      { ikona: k.qa ? (k.qa.ok === k.qa.all ? "pytania-ok" : "pytania-mid") : "pytania", czesci: !k.nd.q ? [{ t: w.OESTT("Pytania nieaktywne", "Questions not active") }] : k.qa ? [{ t: w.OESTT("Wymaga odpowiedzi na pytania", "Requires answers") + " · OK " }, { t: String(k.qa.ok), b: true }, { t: " / " }, { t: String(k.qa.all), b: true }] : [{ t: w.OESTT("Wymaga odpowiedzi na pytania · jeszcze nie zaczęta", "Requires answers · not started yet") }] }
    ];
    if (k.issues) rows.push({ ikona: "usterki", czesci: [{ t: w.OESTT("Usterki", "Defects") + ": " }, { t: String(k.issues), b: true }] });
    return { tytul: vt ? vt.name : t.name, wiersze: rows };
  }
  function info(k) { return k && k.id ? infoDane(k.id, k.day) : null; }

  // ---------- Kalendarz (widok miesiąca) ----------
  var calMonth = new Date(), calSel = "";
  calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
  // dzień → lista {t, job, plan} (P.occurrences: zlecenia Vantify, bieżący termin, dalej planowane)
  function calDue(from, to) {
    var by = {};
    P.tasks.forEach(function (t) { P.occurrences(t, from, to).forEach(function (e) { e.t = t; (by[e.d] = by[e.d] || []).push(e); }); });
    return by;
  }
  function kalDane() {
    // zawsze 6 pełnych tygodni (42 kratki): dni sąsiednich miesięcy przygaszone
    var y = calMonth.getFullYear(), m = calMonth.getMonth(), first = new Date(y, m, 1), lead = (first.getDay() + 6) % 7;
    var start = new Date(y, m, 1 - lead), end = new Date(y, m, 42 - lead);
    var by = calDue(P.iso(start), P.iso(end)), td = P.iso(new Date()), kratki = [];
    for (var i = 0; i < 42; i++) {
      var day = new Date(y, m, 1 - lead + i), k = P.iso(day), n = (by[k] || []).length;
      kratki.push({ k: k, d: day.getDate(), inny: day.getMonth() !== m, praca: calShift(k), dzis: k === td, wybrany: k === calSel, n: n, plan: !!n && (by[k] || []).every(function (e) { return e.plan; }) });
    }
    var klocki = (by[calSel] || []).map(function (e) {
      var t = e.t, due = P.due(t), cur = due && P.iso(due) === calSel, cd = calSel.split("-"), day = new Date(+cd[0], +cd[1] - 1, +cd[2]);
      // ten sam klocek co na liście Inspekcji; etap tylko dla bieżącego terminu
      var k = kiData(t, day, P.daysLeft(day)), tryb = cur ? k.tryb : "nierozpoczeta";
      return klocek({ id: t.id, group: t.group, no: (P.jobFor(t, calSel) || {}).no || "", day: calSel, name: P.short(t).name, status: tryb, loc: k.loc.code, freq: e.job ? (P.jobFor(t, calSel) || {}).f || k.freq : k.freq, form: cur ? k.form : (k.nd.f ? "blad" : "brak"),
        due: day, left: P.daysLeft(day), dueDone: tryb === "gotowa", photos: cur ? k.photos : 0, qa: cur ? k.qa : null, issues: cur ? k.issues : 0, go: w.OESTT("Otwórz", "Open"), plan: e.plan });
    });
    var hasShift = false; try { hasShift = w.OESTSettings.get().schedules.length > 0 || !!w.OESTSettings.scheduleOn(P.iso(new Date())); } catch (e2) {}
    return { tytul: first.toLocaleDateString(w.OESTBledy && w.OESTBledy.lang() === "en" ? "en-GB" : "pl-PL", { month: "long", year: "numeric" }),
      tydzien: [1, 2, 3, 4, 5, 6, 0].map(dayName), kratki: kratki, klocki: klocki, wybrany: calSel, brakGrafiku: !hasShift,
      pusto: w.OESTT("Brak inspekcji tego dnia.", "No inspections on this day.") };
  }
  function kalMiesiac(n) { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + n, 1); calSel = ""; zmiana(); }
  function kalDzien(k) { calSel = calSel === k ? "" : k; zmiana(); }

  // ekran główny: dzisiejsze i zaległe (powiadomienia)
  function licznikDzis() {
    var t = today(), out = {}, late = 0, k0 = P.iso(t);
    P.tasks.forEach(function (x) { var due = P.due(x); if (!due) return; var left = P.daysLeft(due), k = P.iso(left < 0 ? t : due); out[k] = (out[k] || 0) + 1; if (left < 0) late++; });
    return { today: out[k0] || 0, late: late };
  }
  // dynamicznie (Grzegorz 02/11): lista i kalendarz odświeżają się same po powrocie z inspekcji, wysłaniu i zmianie etapu/terminu
  ["oest:ppm-stage", "oest:ppm-due-changed", "oest:shifts-changed", "pageshow", "focus"].forEach(function (ev) { w.addEventListener(ev, zmiana); });
  w.addEventListener("storage", function (e) { if (!e.key || /^oest\.ppm\./.test(e.key)) zmiana(); });
  w.document.addEventListener("visibilitychange", function () { if (!w.document.hidden) zmiana(); });

  w.OESTPpmUI = { ppmDane: ppmDane, dzien: dzien, ustawDzien: ustawDzien, filtry: filtry, wybierz: wybierz, info: info, kalDane: kalDane, kalMiesiac: kalMiesiac, kalDzien: kalDzien,
    dniPaska: dniPaska, termin: termin, czest: czest, licznikDzis: licznikDzis, powrot: powrot, calShift: calShift, dayName: dayName, goInsp: goInsp };
})(window);
