"use strict";
// i-szkic.js – szkic inspekcji w telefonie (zapis każdej zmiany).
// Korzysta z: 3–5 (numery z tabeli w docs/podzial-modulow.md).
// Nie ruszać: formatu zapisu – stare szkice muszą się otwierać.
  // ---------- szkic inspekcji (Grzegorz 03/11): każda zmiana od razu w telefonie, po ponownym otwarciu wszystko wraca ----------
  // Dotyczy inspekcji „jeden formularz” (AOV, Flush, DB, plant…). Izolatory mają własny zapis zlecenia (batch).
  // Szkic znika dopiero po wysłaniu raportu albo po „Wyczyść inspekcję” w menu ⋮.
  var draftOn = false, draftT = 0, draftSeq = 0;
  function draftKey(t, code) { if (REC && !t && code == null) return "rec_" + REC.id; /* odzyskana: własny szkic, inspekcja z listy PPM bez zmian */ t = t || cur.type; code = code == null ? cur.code : code; return t && code ? "draft_" + t.id + "|" + code : ""; }
  function draftFields() {
    // wszystkie pola formularza z id (data, podpis, Name/Date, Overall/Quote, komentarz…), bez plików i etapu klocka
    return Array.prototype.filter.call($("v-form").querySelectorAll("input[id],textarea[id],select[id]"), function (el) {
      return el.type !== "file" && el.id !== "ppmStage" && el.id !== "flOn";
    });
  }
  function draftSnap() {
    var f = {};
    draftFields().forEach(function (el) { f[el.id] = el.type === "checkbox" || el.type === "radio" ? el.checked : el.value; });
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
    return kvSet(k, snap).catch(function (e) { $("formHint").textContent = T("Nie zapisano szkicu w telefonie (", "Draft not saved on the phone (") + gErr(e) + ")."; })
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
        }, function () { if (my === draftSeq && tok === formSeq) $("formHint").textContent = T("Nie udało się przenieść poprzedniej inspekcji do archiwum. Nic nie skasowałem — otwórz inspekcję jeszcze raz.", "Could not move the previous inspection to the archive. Nothing was deleted — open the inspection again."); });
      } }
      draftReady(d, k, my, tok);
    }, function () { if (my === draftSeq && tok === formSeq) { $("formHint").textContent = T("Nie udało się odczytać szkicu. Nie zapisuję zmian, żeby go nie nadpisać — otwórz inspekcję jeszcze raz.", "Could not read the draft. I am not saving changes so as not to overwrite it — open the inspection again."); } });
  }
  // szkic odczytany (albo nowy termin po archiwizacji): wypełnij formularz i włącz zapis
  function draftReady(d, k, my, tok) {
      // brak szkicu ALBO szkic bez zdjęć (pusty zapis po otwarciu w starej wersji, Grzegorz 04/11): pokaż „Przywróć inspekcję”
      if (d && d.v === 1) { restoreDraft(d, tok); if (cur.ppm && PPM.closed && PPM.closed(cur.ppm)) setTimeout(function () { if (tok === formSeq) $("formHint").textContent = finHint(); }, 0); }
      // po rozpoczęciu wczytywania szkicu (settle() czeka, aż jego zdjęcia będą na miejscu)
      if (!REC && (!d || !(d.photos && d.photos.length) || cur.type.flush)) offerRestore(tok); // Flushing: także gdy coś już jest (brakujące krany z raportu w kolejce)
      draftOn = true; if (typeof ntRefresh === "function") ntRefresh();
  }
  function restoreDraft(d, tok) {
    var f = d.fields || {};
    draftFields().forEach(function (el) {
      if (!(el.id in f)) return;
      if (el.type === "checkbox" || el.type === "radio") el.checked = !!f[el.id]; else el.value = f[el.id];
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
      $("formHint").textContent = T("Wczytano zapisaną inspekcję (", "Saved inspection loaded (") + ok.length + " zdj.)." + (keptSaved.length ? T(" Nie udało się pokazać ", " Could not show ") + keptSaved.length + T(" zdjęć — zostają w zapisie.", " photos — they stay in the save.") : "");
    });
  }
  // ---------- odzyskanie inspekcji skasowanej przez starą wersję „Wyślij” (04/11/2026) ----------
  // Stara wersja po „Wyślij” kasowała szkic. Kopie zdjęć zostały w module zdjęć (kategoria + kod tej inspekcji),
  // więc pusty formularz z kopiami z ostatnich dni proponuje „↺ Przywróć inspekcję”: zdjęcia wracają, inspekcja znów W trakcie.
  var restoreList = [];
  function offerRestore(tok) {
    var b = $("restoreIns"); b.hidden = true; restoreList = []; restorePdf = null;
    if (!window.OESTZdjecia || cur.mode !== "one" || !cur.type) return;
    var ctx = copyCtx(), st = cur.ppm && PPM.stage ? PPM.stage(cur.ppm) : null;
    var y = NZ.dzienIso(new Date(Date.now() - 864e5)), from = st && st.day && st.day < y ? st.day : y; // od dnia wysłania, ale najpóźniej od wczoraj
    // Flushing: najpierw raport z kolejki wysyłki (PDF ma odpowiedzi kranów i zdjęcia przy kranach), potem kopie zdjęć
    var fT = cur.type.flush, pid = cur.ppm && cur.ppm.id;
    var fromQ = !fT || !pid || !window.OESTFlush || !OESTFlush.fromPdf ? Promise.resolve(null) : qAll().then(function (all) {
      var me = (function () { try { return ((JSON.parse(localStorage.getItem("oest.account") || "null") || {}).email || "").toLowerCase(); } catch (e) { return ""; } })(); // tylko raporty tego konta
      var since = Date.parse(from + "T00:00:00"); // tylko raport z tego okresu (od dnia etapu / wczoraj), nigdy zeszłotygodniowy
      var it = (all || []).filter(function (q) { return (q.ppm === pid || (!q.ppm && q.type === cur.type.id)) && q.pdf && q.pdf.length && q.created >= since && (!q.acct || q.acct.toLowerCase() === me); }).sort(function (a, c) { return c.created - a.created; })[0];
      var rr = it ? OESTFlush.fromPdf(new Uint8Array(it.pdf), fT.taps.map(function (x) { return x && x.name != null ? x.name : String(x); })) : null;
      if (rr) rr.created = it.created; // czas raportu = czas zdjęć (nie dzień przywrócenia)
      return rr;
    }).catch(function () { return null; });
    var settle = function () { return new Promise(function (r) { (function w() { if (restoring || pendingPh) setTimeout(w, 200); else r(); })(); }); }; // szkic najpierw wczyta swoje zdjęcia
    Promise.all([OESTZdjecia.list(), fromQ, settle()]).then(function (rs) {
      var all = rs[0];
      if (tok !== formSeq) return;
      // z raportu tylko krany, które w inspekcji nie mają jeszcze zdjęcia (nic się nie dubluje)
      // zdjęcia bez kranu (np. karta papierowa) tylko wtedy, gdy inspekcja nie ma jeszcze żadnego takiego zdjęcia
      var have = {}, loose = false; photos.forEach(function (p) { if (p.tap != null) have[p.tap] = 1; else loose = true; });
      var rp = rs[1]; if (rp) { rp.photos = rp.photos.filter(function (p) { return p.tap != null ? !have[p.tap] : !loose; }); }
      // odpowiedzi też się liczą (e-formularz nie wymaga zdjęć): jest co przywrócić, gdy raport ma zdjęcia brakujących kranów
      // albo odpowiedź / notatkę / tydzień, których w inspekcji jeszcze nie ma
      var ans = rp && (rp.taps.some(function (x, i) { var c = fl.taps[i]; return c && c.state === "yes" && !c.note && (x.state !== "yes" || x.note); }) || (rp.week && !fl.week));
      restorePdf = rp && (rp.photos.length || ans) ? rp : null;
      if (photos.length && !restorePdf) return;
      restoreList = photos.length ? [] : all.filter(function (r) { return r.hasBlob && r.category === ctx.category && r.code === ctx.code && r.day >= from; })
        .sort(function (a, c) { return a.created < c.created ? -1 : 1; });
      if (!restoreList.length && !restorePdf) return;
      b.hidden = false; b.textContent = T("↺ Przywróć inspekcję (zdjęcia: ", "↺ Restore inspection (photos: ") + (restorePdf ? restorePdf.photos.length : restoreList.length) + ")";
      var hd = document.querySelector("#v-form .ihead"); if (hd && b.previousElementSibling !== hd) hd.after(b); // na górze, od razu widoczny (Grzegorz 04/11: „nie ma takich przycisków”)
    }).catch(function () {});
  }
  var restorePdf = null;
  $("restoreIns").addEventListener("click", function () {
    var b = this, list = restoreList.slice(), tok = formSeq, rp = restorePdf; if ((!list.length && !rp) || queueing) return;
    b.disabled = true;
    var t = cur.ppm, st = t && PPM.stage ? PPM.stage(t) : null;
    if (t && st && (st.s === "queued" || st.s === "sent" || st.s === "done")) {
      // okres znów otwarty: termin wraca, raport z kolejki zostaje (wyjdzie sam) jako ✉ przy otwartej inspekcji
      var q = queue.filter(function (x) { return x.ppm === t.id; }).sort(function (a, c) { return c.created - a.created; })[0];
      if (st.period) PPM.setDue(t, st.period);
      PPM.setStage(t, { s: "prog", manual: false, mail: q ? (q.status === "sent" ? "sent" : "queued") : "", mailId: q ? q.id : "", mailSig: "" });
      renderPpmBar();
    }
    if (rp) { // z raportu w kolejce: odpowiedzi, tydzień, notatki i zdjęcia przy tych samych kranach co w raporcie
      fl.on = true; if (PPM.setNeeds && cur.ppm) PPM.setNeeds(cur.ppm, { q: true, t: true }); applyNeeds(); if (rp.week && !fl.week) fl.week = rp.week; // wybrany już tydzień zostaje
      // odpowiedź z raportu tylko tam, gdzie w inspekcji jest jeszcze domyślne Yes bez notatki (nic, co już wpisane, się nie nadpisuje)
      rp.taps.forEach(function (x, i) { var c = fl.taps[i]; if (c && c.state === "yes" && !c.note) { c.state = x.state; c.note = x.note; if (x.note) fl.open[i] = true; } });
      renderFlush(); updateFormHint();
      draftOn = true; b.hidden = true; b.disabled = false; restoreList = []; restorePdf = null;
      rp.photos.forEach(function (p, i) { addFiles([new File([p.bytes], "kran " + (i + 1) + ".jpg", { type: "image/jpeg", lastModified: rp.created || Date.now() })], p.tap, false); });
      var nt = rp.photos.filter(function (p) { return p.tap != null; }).length;
      $("formHint").textContent = T("Przywrócono z raportu w kolejce: odpowiedzi kranów, tydzień " + (rp.week || "–") + ", zdjęcia przy kranach: " + nt + (rp.photos.length - nt ? ", inne zdjęcia: " + (rp.photos.length - nt) : "") + ". Możesz dodać brakujące zdjęcia.",
        "Restored from the queued report: outlet answers, week " + (rp.week || "–") + ", outlet photos: " + nt + (rp.photos.length - nt ? ", other photos: " + (rp.photos.length - nt) : "") + ". You can add the missing photos.");
      return;
    }
    // kopie są już w folderze OEST: wracają do inspekcji jako te same zdjęcia (bez drugiego zapisu), znów trzymane przez inspekcję
    Promise.all(list.map(function (r) { return OESTZdjecia.blob(r.id).then(function (bl) { return bl ? makePhoto(bl, { zid: r.id, width: r.width, height: r.height, when: new Date(Date.parse(r.created) || Date.now()) }) : null; }); }))
      .then(function (ps) {
        ps = ps.filter(Boolean); var files = ps; if (tok !== formSeq) { ps.forEach(function (p) { URL.revokeObjectURL(p.url); }); return; }
        if (Zd.keep) Zd.keep(ps.map(function (p) { return p.zid; }), HOLD).catch(function () {});
        draftOn = true; b.hidden = true; b.disabled = false; restoreList = [];
        if (ps.length) needOn("p"); photos = photos.concat(ps); renderPhotos(); suggestDate();
        $("formHint").textContent = T("Przywrócono zdjęcia: ", "Photos restored: ") + files.length + T(". Inspekcja znów W trakcie — sprawdź odpowiedzi, potem Wyślij / Zakończ.", ". The inspection is In progress again — check the answers, then Send / Finish.");
      }, function (e) { b.disabled = false; $("formHint").textContent = T("Nie udało się przywrócić zdjęć: ", "Could not restore the photos: ") + gErr(e); });
  });
  // zmiany w formularzu: kliknięcia (Yes/No, tydzień, przełączniki), wpisywanie, wybór daty
  // ręczne „Nie rozpoczęta” (07/11): dotknięcie, które coś w inspekcji zmieniło (odcisk przed / po), albo wpis = W trakcie
  var sigBefore = null;
  function unstartedNow() { return !!(cur.type && cur.ppm && PPM && PPM.unstarted && PPM.unstarted(cur.ppm)); }
  ["click", "input", "change"].forEach(function (ev) { $("v-form").addEventListener(ev, function (e) { if (ev === "click" && e.isTrusted && unstartedNow()) sigBefore = ppmSig(); }, true); });
  ["click", "input", "change"].forEach(function (ev) { $("v-form").addEventListener(ev, function (e) {
    var mine = e.isTrusted && !(e.target && e.target.id === "ppmStage"), before = ev === "click" ? sigBefore : null;
    setTimeout(function () { scheduleDraft(); if (mine && unstartedNow() && (ev !== "click" || ppmSig() !== before)) ppmTrack(false, true); }, 0);
  }); });
  // apka schowana / zamykana: zapis od razu, bez czekania
  document.addEventListener("visibilitychange", function () { if (document.hidden) saveDraftNow(); });
  window.addEventListener("pagehide", function () { saveDraftNow(); });
  // „Wyczyść inspekcję” (menu ⋮): kasuje szkic, zdjęcia i etap klocka
  window.OEST_clearInspection = async function () {
    if (cur.mode !== "one" || !cur.type || queueing) return; // raport właśnie się przygotowuje: nie czyścimy pod nim formularza
    if (!(await ask(T("Wyczyścić tę inspekcję?\nZdjęcia, odpowiedzi i notatki z tego formularza zostaną usunięte (kopie zdjęć zostają w Settings → Zdjęcia).", "Clear this inspection?\nPhotos, answers and notes from this form will be removed (photo copies stay in Settings → Photos).")))) return;
    var k = draftKey(), code = cur.code;
    resetForm(); cur.code = "";
    // najpierw notatki; gdy ich usunięcie się nie uda, szkic zostaje, formularz wraca i nie piszemy „Wyczyszczono”
    (window.OESTNotatki ? OESTNotatki.clear(k) : Promise.resolve()).then(function () { return dropDraft(k).then(function () {
      if (cur.ppm && PPM && PPM.setStage) { var r = PPM.stage(cur.ppm); if (!r || r.s === "prog" || r.s === "hold") PPM.setStage(cur.ppm, null); }
      // pusty formularz po otwarciu ustawia „W trakcie” (openForm i odroczone liczniki odpowiedzi z renderChecks): po wyczyszczeniu klocek ma być
      // „Nie rozpoczęta”, więc cofamy to od razu i jeszcze raz po odroczonym liczeniu (test: app/tests/czyszczenie-ui-check.cjs)
      var t0 = cur.ppm, unstart = function () { if (t0 && cur.ppm === t0 && PPM && PPM.setStage) { var r2 = PPM.stage(t0); if (r2 && r2.s === "prog" && !r2.manual) { PPM.setStage(t0, null); renderPpmBar(); } } };
      openForm(code); unstart(); setTimeout(unstart, 0);
      renderPpmBar(); $("formHint").textContent = T("Wyczyszczono. Formularz jest pusty.", "Cleared. The form is empty.");
    }); }, function () {
      openForm(code); OESTPrzycisk.alert(T("Nie udało się usunąć notatek tej inspekcji, więc jej nie wyczyściłem. Spróbuj jeszcze raz.", "Could not delete this inspection’s notes, so it was not cleared. Try again.")); // okienko: podpowiedź pod formularzem nadpisuje wczytany szkic
    });
  };

