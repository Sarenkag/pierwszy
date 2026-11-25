"use strict";
// przywroc.js – strona inspekcji: „↺ Przywróć inspekcję” (offerRestore + przycisk #restoreIns w Formularz.vue).
// Plik obok strony (R27: logika poza <script> strony). Korzysta ze wspólnych nazw strony (i-rdzen.js, i-szkic.js, i-zdjecia.js,
// i-zbiorcze.js, i-zapis-zdjec.js, i-flushing.js, i-kolejka.js) dopiero w chwili wywołania. Ładować przed i-start.js (otwiera inspekcję).
  // „↺ Przywróć inspekcję” (jak na main; przywrócone 25.11.2026 – Grzegorz: usunięcie nie było zamierzone).
  // Pusty formularz (np. szkic skasowany po „Wyślij” w starej wersji) proponuje powrót tego, co już było:
  //  1) Flushing: odpowiedzi kranów, tydzień, notatki i zdjęcia przy kranach z ostatniego raportu tej inspekcji w kolejce wysyłki –
  //     z NASZYCH danych raportu (it.snap, ta sama kopia co „Odzyskaj” w Moich raportach), nie z PDF (PDF robi tylko silnik z Worda);
  //  2) inne: kopie zdjęć tej inspekcji z modułu zdjęć (kategoria + kod) z ostatnich dni.
  // Nic, co już jest w formularzu, się nie nadpisuje ani nie dubluje.
  var restoreList = [], restoreSnap = null;
  function offerRestore(tok) {
    var b = $("restoreIns"); if (!b) return;
    b.hidden = true; restoreList = []; restoreSnap = null;
    if (!Zd || cur.mode !== "one" || !cur.type) return;
    var ctx = copyCtx(), st = cur.ppm && PPM.stage ? PPM.stage(cur.ppm) : null;
    var y = NZ.dzienIso(new Date(Date.now() - 864e5)), from = st && st.day && st.day < y ? st.day : y; // od dnia wysłania, ale najpóźniej od wczoraj
    var fT = cur.type.flush, pid = cur.ppm && cur.ppm.id;
    var fromQ = !fT || !pid || !window.OESTFlush ? Promise.resolve(null) : qAll().then(function (all) {
      var me = OESTKonto.email(); // tylko raporty tego konta
      var since = Date.parse(from + "T00:00:00"); // tylko raport z tego okresu (od dnia etapu / wczoraj), nigdy zeszłotygodniowy
      var it = (all || []).filter(function (q) { return (q.ppm === pid || (!q.ppm && q.type === cur.type.id)) && q.snap && q.snap.fl && q.created >= since && (!q.acct || q.acct.toLowerCase() === me); })
        .sort(function (a, c) { return c.created - a.created; })[0];
      if (!it) return null;
      var s = it.snap, sfl = OESTFlush.migrujSzkic(s.fl, fT.taps) || s.fl, mtap = OESTFlush.mapaKranow(s.fl, fT.taps); // lista kranów mogła się zmienić od raportu
      return { created: it.created, week: sfl.week || 0, taps: (sfl.taps || []).map(function (t) { return { state: t.state, note: t.note || "" }; }),
        photos: (s.photos || []).filter(function (p) { return p && p.zid; }).map(function (p) { var t = p.tap == null ? null : mtap ? mtap[p.tap] : p.tap; return Object.assign({}, p, { tap: t == null ? null : t }); }) };
    }).catch(function () { return null; });
    var settle = function () { return new Promise(function (r) { (function w() { if (restoring || pendingPh) setTimeout(w, 200); else r(); })(); }); }; // szkic najpierw wczyta swoje zdjęcia
    Promise.all([Zd.list(), fromQ, settle()]).then(function (rs) {
      var all = rs[0];
      if (tok !== formSeq) return;
      // z raportu tylko krany, które w inspekcji nie mają jeszcze zdjęcia; zdjęcia bez kranu (np. kartka) tylko, gdy inspekcja nie ma jeszcze takiego
      var have = {}, loose = false; photos.forEach(function (p) { if (p.tap != null) have[p.tap] = 1; else loose = true; });
      var rp = rs[1]; if (rp) rp.photos = rp.photos.filter(function (p) { return p.tap != null ? !have[p.tap] : !loose; });
      // odpowiedzi też się liczą: jest co przywrócić, gdy raport ma zdjęcia brakujących kranów albo odpowiedź / notatkę / tydzień, których tu jeszcze nie ma
      var ans = rp && (rp.taps.some(function (x, i) { var c = fl.taps[i]; return c && c.state === "yes" && !c.note && (x.state !== "yes" || x.note); }) || (rp.week && !fl.week));
      restoreSnap = rp && (rp.photos.length || ans) ? rp : null;
      if (photos.length && !restoreSnap) return;
      restoreList = photos.length ? [] : all.filter(function (r) { return r.hasBlob && r.category === ctx.category && r.code === ctx.code && r.day >= from; })
        .sort(function (a, c) { return a.created < c.created ? -1 : 1; });
      if (!restoreList.length && !restoreSnap) return;
      b.hidden = false; b.textContent = window.OESTT("↺ Przywróć inspekcję (zdjęcia: ", "↺ Restore inspection (photos: ") + (restoreSnap ? restoreSnap.photos.length : restoreList.length) + ")";
    }).catch(function () {});
  }
  $("restoreIns").addEventListener("click", function () {
    var b = this, list = restoreList.slice(), tok = formSeq, rp = restoreSnap; if ((!list.length && !rp) || queueing) return;
    b.disabled = true;
    var t = cur.ppm, st = t && PPM.stage ? PPM.stage(t) : null;
    if (t && st && (st.s === "queued" || st.s === "sent" || st.s === "done")) {
      // okres znów otwarty: termin wraca, raport z kolejki zostaje (wyjdzie sam) jako ✉ przy otwartej inspekcji
      var q = queue.filter(function (x) { return x.ppm === t.id; }).sort(function (a, c) { return c.created - a.created; })[0];
      if (st.period) PPM.setDue(t, st.period);
      PPM.setStage(t, { s: "prog", manual: false, mail: q ? (q.status === "sent" ? "sent" : "queued") : "", mailId: q ? q.id : "", mailSig: "" });
      renderPpmBar();
    }
    var gotowe = function () { draftOn = true; b.hidden = true; b.disabled = false; restoreList = []; restoreSnap = null; };
    if (rp) { // z raportu w kolejce: odpowiedzi, tydzień, notatki i zdjęcia przy tych samych kranach co w raporcie
      fl.on = true; if (PPM.setNeeds && cur.ppm) PPM.setNeeds(cur.ppm, { q: true, t: true }); applyNeeds(); if (rp.week && !fl.week) fl.week = rp.week; // wybrany już tydzień zostaje
      // odpowiedź z raportu tylko tam, gdzie w inspekcji jest jeszcze domyślne Yes bez notatki (nic, co już wpisane, się nie nadpisuje)
      rp.taps.forEach(function (x, i) { var c = fl.taps[i]; if (c && c.state === "yes" && !c.note) { c.state = x.state; c.note = x.note; if (x.note) fl.open[i] = true; } });
      renderFlush(); updateFormHint();
      // zdjęcia: te same zdjęcia z modułu zdjęć (po id), bez drugiego zapisu
      Promise.all(rp.photos.map(function (sp) { return photoFromSaved(sp).then(function (p) { if (sp.tap != null) p.tap = sp.tap; return p; }, function () { return null; }); })).then(function (ps) {
        ps = ps.filter(Boolean); if (tok !== formSeq) { ps.forEach(function (p) { URL.revokeObjectURL(p.url); }); return; }
        if (Zd.keep) Zd.keep(ps.map(function (p) { return p.zid; }), HOLD).catch(function () {});
        gotowe(); photos = photos.concat(ps); renderPhotos(); renderFlush(); updateFormHint(); scheduleDraft();
        var nt = ps.filter(function (p) { return p.tap != null; }).length;
        $("formHint").textContent = window.OESTT("Przywrócono z raportu w kolejce: odpowiedzi kranów, tydzień " + (rp.week || "–") + ", zdjęcia przy kranach: " + nt + (ps.length - nt ? ", inne zdjęcia: " + (ps.length - nt) : "") + ". Możesz dodać brakujące zdjęcia.",
          "Restored from the queued report: outlet answers, week " + (rp.week || "–") + ", outlet photos: " + nt + (ps.length - nt ? ", other photos: " + (ps.length - nt) : "") + ". You can add the missing photos.");
      });
      return;
    }
    // kopie są już w folderze OEST: wracają do inspekcji jako te same zdjęcia (bez drugiego zapisu), znów trzymane przez inspekcję
    Promise.all(list.map(function (r) { return Zd.blob(r.id).then(function (bl) { return bl ? makePhoto(bl, { zid: r.id, width: r.width, height: r.height, when: new Date(Date.parse(r.created) || Date.now()) }) : null; }); }))
      .then(function (ps) {
        ps = ps.filter(Boolean); if (tok !== formSeq) { ps.forEach(function (p) { URL.revokeObjectURL(p.url); }); return; }
        if (Zd.keep) Zd.keep(ps.map(function (p) { return p.zid; }), HOLD).catch(function () {});
        gotowe();
        if (ps.length) needOn("p"); photos = photos.concat(ps); renderPhotos(); suggestDate(); scheduleDraft();
        $("formHint").textContent = window.OESTT("Przywrócono zdjęcia: ", "Photos restored: ") + ps.length + window.OESTT(". Inspekcja znów W trakcie — sprawdź odpowiedzi, potem Wyślij / Zakończ.", ". The inspection is In progress again — check the answers, then Send / Finish.");
      }, function (e) { b.disabled = false; $("formHint").textContent = window.OESTT("Nie udało się przywrócić zdjęć: ", "Could not restore the photos: ") + gErr(e); });
  });
