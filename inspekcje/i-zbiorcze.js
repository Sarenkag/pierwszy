"use strict";
// i-zbiorcze.js – zlecenie zbiorcze (izolatory), jeden raport na koniec.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: zapisu zlecenia (batch).
  // ---------- zlecenie zbiorcze (izolatory): każde urządzenie domyślnie OK, jeden raport na koniec ----------
  var batch = { items: {} };
  function batchKey(t) { return "batch_" + t.id; }
  // Postęp zlecenia także w localStorage, żeby ekran startowy pokazał „W trakcie 12/27” bez czytania bazy
  function saveBatch() {
    if (!batch.started) batch.started = Date.now();
    var t = cur.type;
    // Bez IndexedDB zapis zniknąłby po zamknięciu apki, a obiecujemy wznowienie: nie udaję, że się zapisało
    return bazaJest().then(function (jest) {
      if (!jest) throw new Error(window.OESTT("ta przeglądarka nie zapisuje danych na stałe, więc nie da się przerwać i wznowić inspekcji", "this browser does not keep data permanently, so the inspection cannot be paused and resumed"));
      return kvSet(batchKey(t), batch);
    }).then(function () { save("bprog_" + t.id, { n: Object.keys(batch.items).length, started: batch.started }); });
  }
  // Usterki z ostatniej inspekcji (per kod): { d: "dd/mm/rrrr", q: [klucze pytań], r: [id powodów] }
  function histOf(code) { var h = load("hist_" + cur.type.id, {}); return h[code] || null; }
  function saveHist(t, d) {
    var h = load("hist_" + t.id, {});
    (cur.sumDevs || devices(t)).forEach(function (dv) {
      if (!cur.restOk && !batch.items[dv.code]) return; // niesprawdzone: zostaje stara historia
      var it = batch.items[dv.code], q = [], r = [];
      // klucze pytań z chwili zapisu (lista pytań mogła się zmienić w trakcie zlecenia)
      var qk = it && (it.qk || t.checks.map(function (c) { return c.key; }));
      if (it) it.states.forEach(function (st, i) {
        if (st !== "fail" || !qk[i]) return;
        var sel = (it.rsel && it.rsel[i]) || [];
        if (sel.length) r = r.concat(sel); else q.push(qk[i]);
      });
      h[dv.code] = { d: d, q: q, r: r };
    });
    save("hist_" + t.id, h);
  }
  // Zlecenie znika z pamięci dopiero po udanym zapisie (inaczej po ponownym otwarciu wróciłyby stare wpisy)
  function clearBatch(t) {
    var empty = { items: {} };
    return kvSet(batchKey(t), empty).then(function () {
      if (cur.mode !== "one") cur.code = ""; // następne otwarcie formularza zaczyna od czystego: stare odpowiedzi i zdjęcia nie przejdą do nowego zlecenia
      batch = empty; save("bprog_" + t.id, null);
    });
  }
  function loadBatch(t) {
    return kvGet(batchKey(t)).then(function (b) { batch = b && b.items ? b : { items: {} }; }); // błąd odczytu ≠ brak zlecenia: nie zaczynamy od pustego, bo nadpisalibyśmy zapisane
  }
  function renderBatchBar() {
    var t = cur.type, bar = $("batchBar");
    bar.hidden = !t.batch; if (!t.batch) return;
    var all = devices(t), codes = Object.keys(batch.items), fails = codes.filter(function (c) { return batch.items[c].fails; }).length;
    var nextUp = all.filter(function (d) { return !batch.items[d.code]; })[0];
    widokInspekcji(bar, "fragment", { rodzaj: "batch", nazwa: t.batch, zapisane: codes.length, wznow: codes.length && nextUp ? nextUp.code : "",
      opis: window.OESTT("Zapisane:", "Saved:") + " " + codes.length + window.OESTT(" z ", " of ") + all.length + window.OESTT(" · z uwagami: ", " · with remarks: ") + fails + (batch.started ? window.OESTT(" · zaczęte ", " · started ") + NZ.data(new Date(batch.started)) : "")
    }, async function (akcja) {
      if (akcja === "koniec") return openSum();
      if (akcja === "wznow") return openForm(nextUp.code);
      if (akcja === "wyczysc" && await ask(window.OESTT("Usunąć wszystkie zapisy tego zlecenia?", "Delete all saves of this job?"))) clearBatch(t).then(renderList, function (e) { say(window.OESTT("Nie udało się usunąć zlecenia (", "Could not delete the job (") + gErr(e) + window.OESTT("). Zapisy zostają.", "). The saves stay.")); });
    });
  }
  // Pytanie z odpowiedzią NIE: wybrane powody (albo ogólne en) i czy to tylko obserwacja
  function askFinds() {
    var out = [];
    cur.type.checks.forEach(function (c, i) {
      if (states[i] !== "fail") return;
      var rs = (c.reasons || []).filter(function (r) { return (rsel[i] || []).indexOf(r.id) >= 0; });
      if (rs.length) rs.forEach(function (r) { out.push({ en: r.en, note: !!r.note }); });
      else out.push({ en: c.en, note: !!c.note });
    });
    return out;
  }
  function itemLines() {
    var out = [];
    if (cur.type.ask) {
      var f = askFinds(), bad = f.some(function (x) { return !x.note; });
      return f.length ? ["Isolator " + cur.code + ": " + f.map(function (x) { return x.en; }).join("; ") + "." + (bad ? " Requires attention." : "")] : [];
    }
    cur.type.checks.forEach(function (c, i) { if (states[i] === "fail") out.push(override[i] || c.fail); });
    return out.concat(extraFaults(true));
  }
  $("saveItem").addEventListener("click", function () {
    var b = this; b.disabled = true;
    var item = {
      qk: cur.type.checks.map(function (c) { return c.key; }),
      states: states.slice(), override: Object.assign({}, override), faultsOn: Object.assign({}, faultsOn),
      lines: itemLines(), fails: failCount(), rsel: JSON.parse(JSON.stringify(rsel)),
      photos: photos.map(savedPhoto).concat(keptSaved),
      t: Date.now()
    };
    var code = cur.code, prev = batch.items[code];
    batch.items[code] = item;
    var all = devices(cur.type), pos = all.map(function (d) { return d.code; }).indexOf(code);
    var next = all.slice(pos + 1).concat(all.slice(0, pos)).filter(function (d) { return !batch.items[d.code]; })[0];
    saveBatch().then(function () {
      b.disabled = false;
      if (cur.code !== code || cur.mode !== "item") return; // w międzyczasie otwarto coś innego: nie przeskakujemy
      resetForm(); cur.code = "";
      if (!next) { show("list"); return; }
      openForm(next.code);
      try { $("camIn").click(); } catch (e) {} // aparat od razu dla następnego (działa w ciągu kilku sekund od kliknięcia)
    }, function (e) {
      if (batch.items[code] === item) { if (prev) batch.items[code] = prev; else delete batch.items[code]; }
      b.disabled = false;
      if (cur.code !== code) { say(window.OESTT("Nie zapisano ", "Not saved ") + code + window.OESTT(" w telefonie (", " on the phone (") + gErr(e) + window.OESTT("). Otwórz go i zapisz ponownie.", "). Open it and save again.")); return; }
      $("formHint").textContent = window.OESTT("Nie zapisano w telefonie (", "Not saved on the phone (") + gErr(e) + window.OESTT("). Formularz zostaje — spróbuj ponownie albo usuń część zdjęć.", "). The form stays — try again or remove some photos.");
    });
  });
  // zapisane zdjęcie: nowe szkice mają tylko id (zid) w module zdjęć, starsze (sprzed 05/11) jeszcze własną kopię (blob)
  function photoFromSaved(sp, code, wh) {
    var get = sp.zid && Zd ? Zd.blob(sp.zid).then(function (b) { return b || sp.blob; }, function () { return sp.blob; }) : Promise.resolve(sp.blob);
    return get.then(function (b) {
      if (!b) throw new Error("PHOTO_MISSING");
      return makePhoto(b, { zid: sp.zid, width: sp.width, height: sp.height, when: new Date(sp.when), exif: sp.exif, sheet: sp.sheet || undefined, code: code, where: wh });
    });
  }
  // Zapis zablokowany, dopóki zdjęcia nie wrócą; wynik ignorowany, jeśli w międzyczasie otwarto inne urządzenie
  var restoring = 0, restSeq = 0, formSeq = 0, pendingPh = 0;
  var recLost = 0; // odzyskana: zdjęcia z raportu, których nie da się odtworzyć (nie były w module zdjęć)
  var keptSaved = []; // zapisane zdjęcia, których nie udało się odczytać: nie giną przy ponownym zapisie // restoring = numer trwającego wczytywania (rośnie, żeby stary wynik nie trafił do nowego formularza)
  function restoreItem(it) {
    override = Object.assign({}, it.override); faultsOn = Object.assign({}, it.faultsOn);
    // odpowiedzi wracają po kluczu pytania (lista pytań mogła się zmienić w trakcie zlecenia)
    var qk = it.qk || cur.type.checks.map(function (c) { return c.key; }), old = it.rsel || {};
    rsel = {};
    states = cur.type.checks.map(function (c, i) {
      var j = qk.indexOf(c.key); if (j < 0) return c.def;
      if (old[j]) rsel[i] = old[j].slice();
      return it.states[j];
    });
    renderChecks(); renderFaults();
    var my = restoring = ++restSeq, code = cur.code;
    $("saveItem").disabled = true;
    Promise.all((it.photos || []).map(function (sp) { return photoFromSaved(sp).catch(function () { return { failed: sp }; }); })).then(function (ps) {
      var ok = ps.filter(function (p) { return !p.failed; });
      if (my !== restoring || cur.code !== code) { ok.forEach(function (p) { URL.revokeObjectURL(p.url); }); return; }
      keptSaved = ps.filter(function (p) { return p.failed; }).map(function (p) { return p.failed; });
      photos = ok.concat(photos); restoring = 0; renderPhotos(); updateFormHint();
      if (keptSaved.length) $("formHint").textContent = window.OESTT("Nie udało się pokazać ", "Could not show ") + keptSaved.length + window.OESTT(" zapisanych zdjęć. Zostają w zapisie urządzenia.", " saved photos. They stay in the device save.");
    });
  }
  async function openSum() {
    var t = cur.type, all = devices(t), missing = all.filter(function (d) { return !batch.items[d.code]; });
    resetForm();
    cur.mode = "sum"; cur.formType = t.id; cur.code = t.batch;
    cur.sumDevs = all; // rejestr zamrożony na czas podsumowania (odświeżenie z Code.gs nie zmieni raportu po potwierdzeniu)
    cur.restOk = !missing.length || await ask(missing.length + window.OESTT(" urządzeń bez zapisu. Policzyć je jako sprawdzone bez uwag?\n\nOK = tak, sprawdziłem wszystkie\nAnuluj = wpisz je jako niesprawdzone", " devices without a save. Count them as checked with no remarks?\n\nOK = yes, I checked them all\nCancel = record them as not checked"));
    var locs = [];
    all.forEach(function (d) { if ((cur.restOk || batch.items[d.code]) && locs.indexOf(d.loc) < 0) locs.push(d.loc); });
    cur.loc = locs.join(", "); cur.where = cur.loc;
    $("formTitle").textContent = t.batch;
    $("formSub").textContent = cur.where + " · " + t.name;
    if (Object.keys(batch.items).some(function (c) { return batch.items[c].fails; })) $("ov-2").checked = true;
    formMode();
    var jobs = [];
    all.forEach(function (d) { var it = batch.items[d.code]; if (it) (it.photos || []).forEach(function (sp) { jobs.push(photoFromSaved(sp, d.code, where(d)).catch(function () { return null; })); }); });
    // Do końca wczytywania zdjęć raport jest zablokowany (inaczej poszedłby bez nich)
    var my = jobs.length ? (restoring = ++restSeq) : 0;
    if (my) Promise.all(jobs).then(function (ps) {
      var lost = ps.filter(function (p) { return !p; }).length; ps = ps.filter(Boolean);
      if (my !== restoring || cur.mode !== "sum") { ps.forEach(function (p) { URL.revokeObjectURL(p.url); }); return; }
      photos = ps.concat(photos); restoring = 0; renderPhotos(); suggestDate(); updateFormHint();
      if (lost) $("formHint").textContent = window.OESTT("Nie udało się odczytać ", "Could not read ") + lost + window.OESTT(" zapisanych zdjęć — raport pójdzie bez nich.", " saved photos — the report will go without them.");
    }, function () {
      if (my !== restoring) return;
      restoring = 0; updateFormHint(); $("formHint").textContent = window.OESTT("Nie udało się wczytać zapisanych zdjęć — raport pójdzie bez nich.", "Could not load the saved photos — the report will go without them.");
    });
    renderSum(); show("form"); updateFormHint();
  }
  function renderSum() {
    var d = batchData(reportDate());
    widokInspekcji("sumBox", "fragment", { rodzaj: "sum", punkty: d.punkty });
  }
  function batchData(w) {
    var t = cur.type, all = cur.sumDevs || devices(t), items = batch.items;
    var checked = all.filter(function (d) { return cur.restOk || items[d.code]; });
    var pts = ["Local isolators inspected: " + checked.length + "/" + all.length + "."], noted = 0;
    checked.forEach(function (d) { var it = items[d.code]; if (it && it.lines.length) { noted++; pts = pts.concat(it.lines); } });
    pts.push(noted ? "Remaining " + (checked.length - noted) + " isolator(s) – no defects found." : "No defects found on any inspected isolator.");
    var miss = all.filter(function (d) { return !cur.restOk && !items[d.code]; }).map(function (d) { return d.code; });
    if (miss.length) pts.push("Not inspected: " + miss.join(", ") + ".");
    var d = {
      data: dateTxt(w), inspektor: val("podpis"), urzadzenie: t.batch, lokalizacja: cur.where, wieza: cur.loc, pietro: "",
      tytul: t.title, punkty: pts, stan_ogolny: radio("ov"), quote: radio("quote"), site: cfg.site,
      komentarz: $("komentarz").value.trim(), zakres: cfg.scope ? t.scope : ""
    };
    d.obiekt = d.lokalizacja; d.stan = d.stan_ogolny; d.rodzaj = d.tytul; d.nr = ""; d.godzina = NZ.godzina(new Date());
    d.opis = pts.map(function (x) { return "• " + x; }).join("\n") + (d.komentarz ? "\n\nComments: " + d.komentarz : "");
    return english(d);
  }

