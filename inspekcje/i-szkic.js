"use strict";
// i-szkic.js – szkic inspekcji w telefonie (zapis każdej zmiany).
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: formatu zapisu – stare szkice muszą się otwierać.
  // ---------- szkic inspekcji (Grzegorz 03/11): każda zmiana od razu w telefonie, po ponownym otwarciu wszystko wraca ----------
  // Dotyczy inspekcji „jeden formularz” (AOV, Flush, DB, plant…). Izolatory mają własny zapis zlecenia (batch).
  // Szkic znika dopiero po wysłaniu raportu albo po „Wyczyść inspekcję” w menu ⋮.
  var draftOn = false, draftT = 0, draftSeq = 0;
  function draftKey(t, code) { if (REC && !t && code == null) return "rec_" + REC.id; /* odzyskana: własny szkic, inspekcja z listy PPM bez zmian */ t = t || cur.type; code = code == null ? cur.code : code; return t && code ? "draft_" + t.id + "|" + code : ""; }
  function draftFields() {
    // wszystkie pola formularza z id (data, podpis, Name/Date, Overall/Quote, komentarz…), bez plików i etapu klocka
    var fields = Array.prototype.filter.call($("v-form").querySelectorAll("ion-input[id],ion-textarea[id],ion-select[id],ion-checkbox[id],ion-datetime[id]"), function (el) {
      return el.type !== "file" && el.id !== "ppmStage" && el.id !== "flOn";
    });
    var day = $("dzien"); if (day && fields.indexOf(day) < 0) fields.push(day);
    return fields;
  }
  function draftSnap() {
    var f = {};
    draftFields().forEach(function (el) { f[el.id] = el.tagName === "ION-CHECKBOX" ? el.checked : el.value; });
    ["Satisfactory", "Requires attention", "Unsatisfactory"].forEach(function (v, i) { f["ov-" + (i + 1)] = f.ov === v; });
    ["", "No", "Yes"].forEach(function (v, i) { f["q-" + i] = f.quote === v; });
    delete f.ov; delete f.quote;
    if (f.nameOn === false && $("podpis").dataset.v) f.podpis = $("podpis").dataset.v; // Name odznaczone: podpis schowany, ale pamiętany
    return {
      v: 1, t: Date.now(), fin: cur.ppm && PPM.closed && PPM.closed(cur.ppm) ? Date.now() : undefined, finPeriod: cur.ppm && PPM.closed && PPM.closed(cur.ppm) ? PPM.stage(cur.ppm).period : undefined, qk: cur.type.checks.map(function (c) { return c.key; }),
      states: states.slice(), override: Object.assign({}, override), faultsOn: Object.assign({}, faultsOn), rsel: JSON.parse(JSON.stringify(rsel)),
      roomNotes: Object.assign({}, roomNotes), temps: temps.slice(), dateTouched: dateTouched, fields: f,
      fl: JSON.parse(JSON.stringify(fl)),
      photos: photos.map(savedPhoto).concat(keptSaved),
      lost: REC && recLost ? recLost : undefined,
      needs: REC && cur.ppm && PPM && PPM.needs ? PPM.needs(cur.ppm) : undefined // odzyskana: jej własne ustawienia pytań (karta PPM bez zmian)
    };
  }
  function saveDraftNow() {
    clearTimeout(draftT); draftT = 0;
    // w trakcie wczytywania zdjęć szkicu nie zapisujemy (zapis bez nich skasowałby zdjęcia w szkicu); po wczytaniu zapis rusza sam
    if (!draftOn || cur.mode !== "one" || !cur.type || queueing || restoring) return Promise.resolve();
    var k = draftKey(); if (!k) return Promise.resolve();
    var snap; try { snap = draftSnap(); } catch (e) { return Promise.resolve(); }
    busySpin(true);
    return kvSet(k, snap).catch(function (e) { $("formHint").textContent = window.OESTT("Nie zapisano szkicu w telefonie (", "Draft not saved on the phone (") + gErr(e) + ")."; })
      .then(function () { busySpin(pendingPh > 0 || !!restoring); });
  }
  function scheduleDraft() { if (!draftOn || cur.mode !== "one") return; clearTimeout(draftT); draftT = setTimeout(saveDraftNow, 300); }
  function dropDraft(k) { return k ? kvSet(k, null).catch(function () {}) : Promise.resolve(); }
  function loadDraft() {
    var my = ++draftSeq, tok = formSeq, k = draftKey(), code = cur.code;
    draftOn = false;
    kvGet(k).then(function (d) {
      if (my !== draftSeq || tok !== formSeq || cur.code !== code) return;
      // zakończona w poprzednim terminie (etap klocka już wygasł): nowy termin = pusty formularz
      // (openForm zakłada już nowy etap „W trakcie”, więc porównujemy termin, za który inspekcja była Gotowa)
      if (REC && d === undefined) { d = JSON.parse(JSON.stringify(REC.snap)); delete d.fin; delete d.finPeriod; }
      if (REC) recLost = d && d.lost > 0 ? d.lost : 0; // zdjęcia raportu, których nie było w module zdjęć (zapis awaryjny) // pierwsze otwarcie odzyskanej: dane z raportu (po „Wyczyść” szkic = null i zostaje pusty)
      if (!REC && d && d.v === 1 && d.fin && cur.ppm && d.finPeriod) { var sNow = PPM.stage(cur.ppm); if (!sNow || (sNow.period && sNow.period !== d.finPeriod)) {
        // nowy termin = pusty formularz; poprzednia inspekcja i jej notatki idą do archiwum (nic nie ginie, 04/11).
        // Stary szkic kasujemy dopiero po udanym przeniesieniu; błąd = komunikat, szkic zostaje i następne otwarcie ponowi archiwizację
        var arch = k + "@" + d.finPeriod;
        return Promise.all([kvSet(arch, d), window.OESTNotatki ? OESTNotatki.move(k, arch) : null]).then(function () { return dropDraft(k); }).then(function () {
          if (my === draftSeq && tok === formSeq && cur.code === code) draftReady(null, k, my, tok);
        }, function () { if (my === draftSeq && tok === formSeq) $("formHint").textContent = window.OESTT("Nie udało się przenieść poprzedniej inspekcji do archiwum. Nic nie skasowałem — otwórz inspekcję jeszcze raz.", "Could not move the previous inspection to the archive. Nothing was deleted — open the inspection again."); });
      } }
      draftReady(d, k, my, tok);
    }, function () { if (my === draftSeq && tok === formSeq) { $("formHint").textContent = window.OESTT("Nie udało się odczytać szkicu. Nie zapisuję zmian, żeby go nie nadpisać — otwórz inspekcję jeszcze raz.", "Could not read the draft. I am not saving changes so as not to overwrite it — open the inspection again."); } });
  }
  // szkic odczytany (albo nowy termin po archiwizacji): wypełnij formularz i włącz zapis
  function draftReady(d, k, my, tok) {
      if (d && d.v === 1) { restoreDraft(d, tok); if (cur.ppm && PPM.closed && PPM.closed(cur.ppm)) setTimeout(function () { if (tok === formSeq) $("formHint").textContent = finHint(); }, 0); }
      // po rozpoczęciu wczytywania szkicu (settle() czeka, aż jego zdjęcia będą na miejscu)
      draftOn = true; if (typeof ntRefresh === "function") ntRefresh();
  }
  function restoreDraft(d, tok) {
    var f = Object.assign({}, d.fields || {});
    ["Satisfactory", "Requires attention", "Unsatisfactory"].forEach(function (v, i) { if (f["ov-" + (i + 1)]) f.ov = v; });
    ["", "No", "Yes"].forEach(function (v, i) { if (f["q-" + i]) f.quote = v; });
    draftFields().forEach(function (el) {
      if (!(el.id in f)) return;
      if (el.tagName === "ION-CHECKBOX") el.checked = !!f[el.id]; else el.value = f[el.id];
    });
    var qk = d.qk || [], old = d.rsel || {};
    override = Object.assign({}, d.override); faultsOn = Object.assign({}, d.faultsOn); rsel = {};
    states = cur.type.checks.map(function (c, i) {
      var j = qk.indexOf(c.key); if (j < 0) return c.def;
      if (old[j]) rsel[i] = old[j].slice();
      return d.states[j];
    });
    roomNotes = Object.assign({}, d.roomNotes); dateTouched = !!d.dateTouched;
    if (d.temps && d.temps.length === temps.length) temps = d.temps.slice();
    var F = cur.type.flush;
    var mfl = F && window.OESTFlush ? OESTFlush.migrujSzkic(d.fl, F.taps) : null; // szkic sprzed zmiany listy kranów (TB bez apartamentów 21/11/2026): odpowiedzi zostają
    var mtap = mfl ? OESTFlush.mapaKranow(d.fl, F.taps) : null; // zdjęcia kranów idą za swoim kranem; usuniętego kranu → zdjęcie ogólne
    if (mfl) { fl = mfl; if (fl.on && cur.ppm && PPM.setNeeds && !(needsNow() || {}).q) PPM.setNeeds(cur.ppm, { q: true }); } // szkic z włączonym formularzem elektronicznym zostaje z nim
    renderChecks(); renderFaults(); renderTemps(); renderFlush(); applyNeeds();
    try { $("v-form").dispatchEvent(new CustomEvent("oest:restored")); } catch (e) {}
    var list = d.photos || [];
    if (!list.length) { updateFormHint(); return; }
    var my = restoring = ++restSeq;
    updateFormHint();
    if (mtap) list = list.map(function (sp) { if (sp.tap == null) return sp; var n = mtap[sp.tap]; return Object.assign({}, sp, { tap: n == null ? undefined : n }); });
    Promise.all(list.map(function (sp) { return photoFromSaved(sp).then(function (p) { if (sp.tap != null) p.tap = sp.tap; return p; }, function () { return { failed: sp }; }); })).then(function (ps) {
      var ok = ps.filter(function (p) { return !p.failed; });
      if (my !== restoring || tok !== formSeq) { ok.forEach(function (p) { URL.revokeObjectURL(p.url); }); return; }
      keptSaved = ps.filter(function (p) { return p.failed; }).map(function (p) { return p.failed; });
      photos = ok.concat(photos); restoring = 0; renderPhotos(); updateFormHint();
      $("formHint").textContent = window.OESTT("Wczytano zapisaną inspekcję (", "Saved inspection loaded (") + ok.length + " zdj.)." + (keptSaved.length ? window.OESTT(" Nie udało się pokazać ", " Could not show ") + keptSaved.length + window.OESTT(" zdjęć — zostają w zapisie.", " photos — they stay in the save.") : "");
    });
  }
  // zmiany w formularzu: kliknięcia (Yes/No, tydzień, przełączniki), wpisywanie, wybór daty
  // ręczne „Nie rozpoczęta” (07/11): dotknięcie, które coś w inspekcji zmieniło (odcisk przed / po), albo wpis = W trakcie
  var sigBefore = null;
  function unstartedNow() { return !!(cur.type && cur.ppm && PPM && PPM.unstarted && PPM.unstarted(cur.ppm)); }
  ["click", "input", "change"].forEach(function (ev) { $("v-form").addEventListener(ev, function (e) { if (ev === "click" && e.isTrusted && unstartedNow()) sigBefore = ppmSig(); }, true); });
  ["click", "input", "change"].forEach(function (ev) { $("v-form").addEventListener(ev, function (e) {
    var mine = (e.isTrusted || e.oestTrusted) && !(e.target && e.target.id === "ppmStage"), before = ev === "click" ? sigBefore : null;
    setTimeout(function () { scheduleDraft(); if (mine && unstartedNow() && (ev !== "click" || ppmSig() !== before)) ppmTrack(false, true); }, 0);
  }); });
  // apka schowana / zamykana: zapis od razu, bez czekania
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveDraftNow(); });
  window.addEventListener("pagehide", function () { saveDraftNow(); });
  // „Wyczyść inspekcję” (menu ⋮): kasuje szkic, zdjęcia i etap klocka
  window.OEST_clearInspection = async function () {
    if (cur.mode !== "one" || !cur.type || queueing) return; // raport właśnie się przygotowuje: nie czyścimy pod nim formularza
    if (!(await ask(window.OESTT("Wyczyścić tę inspekcję?\nZdjęcia, odpowiedzi i notatki z tego formularza zostaną usunięte (kopie zdjęć zostają w Settings → Zdjęcia).", "Clear this inspection?\nPhotos, answers and notes from this form will be removed (photo copies stay in Settings → Photos).")))) return;
    var k = draftKey(), code = cur.code;
    resetForm(); cur.code = "";
    // najpierw notatki; gdy ich usunięcie się nie uda, szkic zostaje, formularz wraca i nie piszemy „Wyczyszczono”
    (window.OESTNotatki ? OESTNotatki.clear(k) : Promise.resolve()).then(function () { return dropDraft(k).then(function () {
      if (cur.ppm && PPM && PPM.setStage) { var r = PPM.stage(cur.ppm); if (!r || r.s === "prog" || r.s === "hold") PPM.setStage(cur.ppm, null); }
      // pusty formularz po otwarciu ustawia „W trakcie” (openForm i odroczone liczniki odpowiedzi z renderChecks): po wyczyszczeniu klocek ma być
      // „Nie rozpoczęta”, więc cofamy to od razu i jeszcze raz po odroczonym liczeniu (test: app/tests/czyszczenie-ui-check.cjs)
      var t0 = cur.ppm, unstart = function () { if (t0 && cur.ppm === t0 && PPM && PPM.setStage) { var r2 = PPM.stage(t0); if (r2 && r2.s === "prog" && !r2.manual) { PPM.setStage(t0, null); renderPpmBar(); } } };
      openForm(code); unstart(); setTimeout(unstart, 0);
      renderPpmBar(); $("formHint").textContent = window.OESTT("Wyczyszczono. Formularz jest pusty.", "Cleared. The form is empty.");
    }); }, function () {
      openForm(code); OESTPrzycisk.alert(window.OESTT("Nie udało się usunąć notatek tej inspekcji, więc jej nie wyczyściłem. Spróbuj jeszcze raz.", "Could not delete this inspection’s notes, so it was not cleared. Try again.")); // okienko: podpowiedź pod formularzem nadpisuje wczytany szkic
    });
  };

