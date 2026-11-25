"use strict";
// i-kolejka.js – podgląd raportu, wysyłka i kolejka.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: zasad wysyłki z docs/PRODUCT.md.
  // ---------- podgląd ----------
  function freeBuilt() { if (built) { built.pics.forEach(function (p) { URL.revokeObjectURL(p.url); }); if (built.logoUrl) URL.revokeObjectURL(built.logoUrl); built = null; } }
  $("toPreview").addEventListener("click", function () {
    if (queueing) return;
    var b = this; b.disabled = true; b.textContent = window.OESTT("Przygotowuję…", "Preparing…"); queueing = true;
    var from = { type: cur.type, mode: cur.mode, ppm: cur.ppm, day: NZ.dzienIso(reportDate()) };
    freeBuilt();
    buildAll().then(function (r) {
      r.from = from; built = r; renderPreview();
      // PDF nie powstał (brak silnika LibreOffice): pokazujemy wprost, co naprawdę pójdzie – nic nie udajemy

      show("preview");
    }).catch(function (e) {
      $("formHint").textContent = window.OESTT("Nie udało się przygotować raportu: ", "Could not prepare the report: ") + buildErr(e);
    }).then(function () { queueing = false; b.disabled = false; b.textContent = window.OESTT("Podgląd raportu", "Report preview"); });
  });
  // „Open Vantify” z klocka (inspekcje/vantify-klocek.js): stan strony podany jednym odczytem, raport budowany tym samym buildAll co wysyłka
  OESTVantifyKlocek.init({ $: $, T: window.OESTT, zbuduj: buildAll, dzien: NZ.dzienIso, blad: buildErr, stan: function () {
    return { typ: cur.type, tryb: cur.mode, ppm: cur.ppm, data: reportDate(), raport: cur.type && cur.type.flush ? flushReport(reportDate()) : null, blokada: $("toQueue").disabled, zajete: queueing }; } });
  function buildErr(e) { if (e && /^[A-Z][A-Z0-9_]{3,}$/.test(e.message || "")) return gErr(e); /* kod aplikacji (np. STORAGE_WRITE) → tekst z moduly/bledy (uwaga Codex #164) */ return (e && e.properties && e.properties.explanation) || (e && e.message) || String(e); }
  function renderPreview() {
    var d = built.data, i = built.info, title = (i.headerText || "Engineers Report").split("\n").pop(), pliki = [];
    var company = window.OESTT("(wzór firmy)", "(company template)");
    function plik(ext, opis) { pliki.push({ nazwa: built.name, rozszerzenie: ext, opis: opis || "" }); }
    var widok;
    if (d.temps) {
      widok = { rodzaj: "temperatury", tytul: d.tytul, podpis: "Date: " + d.data + " · Print name: " + d.inspektor, stan: d.stan_ogolny, zdjecia: [],
        wiersze: built.from.type.slots.map(function (slot, n) { return { nazwa: slot[0], opis: KIND[slot[1]], blad: tempBad(slot[1], d.temps[n]), wartosc: d.temps[n] ? d.temps[n] + " °C" : "–" }; }) };
      $("prevSub").textContent = d.urzadzenie + " · " + d.data;
      plik(".docx", " " + company); plik(".pdf");
    } else if (d.folder && d.flush) {
      var ff = d.flush;
      widok = { rodzaj: "flush", tytul: ff.title, podpis: (ff.points ? "" : OESTFlush.MONTHS[ff.month] + " " + ff.year + window.OESTT(" · tydzień ", " · week ") + ff.week + " · ") + d.data + " · " + ff.name, stan: d.stan_ogolny,
        wiersze: ff.taps.map(function (t, ti) { var gh = 0, gname = ""; (ff.groups || []).forEach(function (g) { if (gh === ti) gname = g.name; gh += g.n; }); return { grupa: gname, nazwa: t.name, blad: t.state === "no", wartosc: OESTFlush.LABEL[t.state], uwaga: t.note }; }),
        zdjecia: built.pics.map(function (p) { return { url: p.url, opis: p.tap != null && ff.taps[p.tap] ? ff.taps[p.tap].name : "" }; }) };
      $("prevSub").textContent = d.urzadzenie + " · " + d.data;
      if (!ff.points) plik(".docx", " " + company); plik(".pdf");
    } else if (d.folder) {
      widok = { rodzaj: "kartki", zdjecia: built.pics.map(function (p) { return { url: p.url }; }) };
      $("prevSub").textContent = d.urzadzenie + " · " + d.data + " · stron: " + built.pics.length;
      plik(".pdf");
    } else {
      widok = { rodzaj: "raport", raport: d, tytul: title, logo: built.logoUrl, stopka: i.footerText || "", numer: d["job number"] || "", miejsce: [d.building, d.level].filter(Boolean).join(" "),
        wiersze: (d.details || "").split("\n").map(function (l) { return l.indexOf("\t") < 0 ? { tekst: l } : { komorki: l.split("\t") }; }),
        zdjecia: built.pics.map(function (p, n) { return { url: p.url, alt: window.OESTT("Zdjęcie ", "Photo ") + (n + 1) }; }) };
      $("prevSub").textContent = d.urzadzenie + " · " + d.lokalizacja + " · " + d.data;
      plik(".docx"); plik(".pdf");
      if (cfg.drivePhotos && built.pics.length) pliki.push({ nazwa: built.name, rozszerzenie: " foto 1" + (built.pics.length > 1 ? "…" + built.pics.length : "") + ".jpg", opis: " " + window.OESTT("(tylko na Drive)", "(Drive only)") });
    }
    widokInspekcji("paper", "raport", widok);
    widokInspekcji("fname", "raport", { rodzaj: "pliki", pliki: built.bezPdf ? built.files : pliki, brakPdf: !!built.bezPdf, blad: built.bezPdf ? gErr(new Error("REPORT_PDF_MISSING")) : "" });
  }
  $("editBtn").addEventListener("click", function () { if (!queueing) show("form"); });

  // ---------- kolejka: raport gotowy w telefonie, wysyłka gdy jest sieć ----------
  var queue = [], sending = false;
  // OEST Raporty / budynek / rodzaj – nazwy po angielsku jak raporty
  // budynek z danych raportu (urządzenie / lokalizacja), rodzaj = rodzaj inspekcji bez znaczka budynku, np. „Distribution Boards”, „Weekly Flushing”
  function reportFolder(from, d) {
    var B = { "Tower A": 1, "Tower B": 1, "Pavilion": 1 }, t = from.ppm, b = d && (d.building || BUILDING[d.wieza] || d.wieza) || "";
    if (!B[b] && t && PPM && PPM.loc) { var l = PPM.loc(t).code.split("/")[0]; b = BUILDING[l] || ""; }
    var kind = String(from.type && (from.type.name || from.type.title) || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    return [B[b] ? b : "General", kind || "Other"];
  }
  // pozycja kolejki wysyłki z gotowego raportu (Wyślij) – ta sama służy do „Update” odzyskanej inspekcji (bez maila)
  function queueItem(r, from) {
    var d = r.data;
    var it = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      ppm: from.ppm ? from.ppm.id : "", created: Date.now(), acct: (OESTKonto.get() || {}).email || "", type: from.type.id, code: d.urzadzenie, name: r.name, folder: cfg.folder, to: cfg.email,
      subject: d.folder ? r.name : "Engineers Report – " + d.urzadzenie + " – " + d.lokalizacja + " – " + d.data + " – " + d.stan_ogolny,
      body: d.folder ? d.tytul + "\nDate: " + d.data + "\nEngineer: " + (d.inspektor || "—") + "\n" :
        d.tytul + "\n\n" + d.urzadzenie + " in " + d.lokalizacja + "\nDate: " + d.data + "\nEngineer: " + (d.inspektor || "—") +
        "\nOverall Condition: " + d.stan_ogolny + (d.quote ? "\nQuote Required: " + d.quote : "") + "\n\n" +
        d.punkty.map(function (p) { return "- " + p; }).join("\n") + (d.komentarz ? "\n\nComments: " + d.komentarz : "") + "\n",
      rpt: reportFolder(from, d), // folder raportu na Dysku: budynek / rodzaj (Grzegorz 08/11/2026)
      docx: r.docx, pdf: r.pdf, photos: cfg.drivePhotos ? r.pics.map(function (p) { return p.bytes; }) : [],
      files: r.files || null, toList: (function () { var n = needsNow(); return n ? recipientsFor(n).list : null; })(), // ⚙ ustawienia wysyłki: pliki i adresaci
      status: "wait", err: ""
    };
    it.job = d["job number"] || ""; // numer zlecenia Vantify zapisany przy raporcie (odzyskanie zachowuje numer, przegląd Codex #169)
    it.at = it.created; // czas przygotowania tej wersji: spóźniony mail z kolejki nie nadpisze nowszego Update (uwaga Codex #101)
    if (from.mode === "one") it.snap = archiveSnap(); // dane inspekcji do „Odzyskaj do edycji” (etap 2c)
    var tp = from.ppm; if (tp && PPM) it.card = { name: PPM.short ? PPM.short(tp).name : tp.name, loc: PPM.loc ? PPM.loc(tp).code : "", freq: (tp.freq || [])[0] || "" }; // opis klocka odzyskanej (moduł raportów nie czyta listy PPM)
    if (REC) { it.key = REC.key; it.ppmRef = it.ppm; it.ppm = ""; } // odzyskana: ten sam wpis w archiwum i ten sam plik na Dysku; klocek PPM bez zmian
    return it;
  }
  // szkic bez plików: zdjęcia tylko jako odnośniki do modułu zdjęć (bez kopii w archiwum), bez znacznika Gotowa
  function archiveSnap() {
    try { var d = draftSnap(); if (cur.ppm && PPM && PPM.needs) d.needs = PPM.needs(cur.ppm); delete d.fin; delete d.finPeriod;
      var all = (d.photos || []).filter(Boolean);
      d.photos = all.filter(function (p) { return p.zid; }).map(function (p) { var q = Object.assign({}, p); delete q.blob; return q; });
      d.lost = (d.lost || 0) + all.length - d.photos.length; // zdjęcia tylko w zapisie awaryjnym (bez modułu zdjęć): po odzyskaniu ich brakuje – Update/Wyślij nie nadpiszą raportu (uwaga Codex #101)
      return d; } catch (e) { return null; }
  }
  function enqueue(r, from) {
    var d = r.data;
    if (Array.isArray(r.files) && !r.files.length) return Promise.reject(new Error(window.OESTT("w ⚙ obok Wyślij nic nie jest zaznaczone do wysłania (albo zaznaczone części są puste)", "nothing to send is ticked in ⚙ next to Send (or the ticked parts are empty)")));
    var it = queueItem(r, from);
    if (sendBtn && sendBtn.step) sendBtn.step(window.OESTT("Dodaję do kolejki…", "Adding to the queue…"));
    return bazaJest().then(function (jest) {
      // bez pamięci telefonu raport nie trafia do kolejki ani nie „wychodzi od razu”: jawny błąd, formularz zostaje (D11)
      if (!jest) throw Error("STORAGE_WRITE");
      return qPut(it);
    }).then(function () {
      queue.push(it); lastQueued = it.code;
      if (!from.finish) {
        // „Wyślij” (Grzegorz 03/11 12:12, 04/11): raport idzie do kolejki, a inspekcja ZOSTAJE otwarta — szkic, zdjęcia, zlecenie
        // i termin bez zmian; można poprawić i wysłać jeszcze raz. Kończy dopiero „Zakończ inspekcję”.
        if (from.ppm && PPM.setStage) { if (!from.fix) ppmTrack(true); var r0 = PPM.stage(from.ppm); PPM.setStage(from.ppm, { s: r0 && r0.s !== "prog" ? (r0.s === "sent" || r0.s === "queued" || r0.s === "done" ? (it.status === "sent" ? "sent" : "queued") : r0.s) : "prog", mail: it.status === "sent" ? "sent" : "queued", mailId: it.id, mailAt: Date.now(), mailSig: from.sig || "", mailDate: d.data || "" }); }
        OESTSender.run({ login: true }); // jedna droga wysyłki: Gmail z konta (moduly/wysylka)
        lastMailHint = mailHint(it);
        return Promise.resolve(saveDraftNow()).then(function () { return sendBtn ? sendBtn.ok(mailState(it)) : null; }).then(function () { show("form"); renderPpmBar(); });
      }
      markDone(from.type, it.code);
      if (from.ppm && (!from.ppm.open || from.mode === "sum" || from.ppm.dev)) {
        // etap na klocku: zapisany termin okresu, zanim termin przesunie się na następny
        if (PPM.setStage && !from.fix) { ppmTrack(true); // ostatnie liczniki (usterki, zdjęcia) z formularza, który właśnie wyszedł
 var dd = PPM.due(from.ppm); PPM.setStage(from.ppm, { s: it.status === "sent" ? "sent" : "queued", mail: it.status === "sent" ? "sent" : "queued", mailId: it.id, mailAt: Date.now(), period: dd ? NZ.dzienIso(dd) : from.day, day: NZ.dzienIso(new Date()), manual: false }); }
        if (!from.fix && (!from.ppm.open || from.mode === "sum")) PPM.close(from.ppm, from.day);
      }
      return closeUp(from, d);
    });
  }
  // wspólne zakończenie inspekcji (Grzegorz 04/11 09:49: „nie ma znikać, ale ma być ładny napis, że się zakończyła”).
  // Inspekcja z listy PPM zostaje na ekranie i w telefonie (szkic z oznaczeniem fin) aż do następnego terminu; klocek pokazuje „✓ Zakończona”.
  function closeUp(from, d) {
    var done = Promise.resolve();
    if (from.queued !== false) { OESTSender.run({ login: true }); } // jedna droga wysyłki (moduly/wysylka)
    if (from.mode === "sum") {
      // izolatory: zlecenie musi się wyczyścić, żeby następne zaczęło się od zera
      if (from.type.ask) saveHist(from.type, d.data);
      done = clearBatch(from.type).catch(function (e) { say(window.OESTT("Raport jest w kolejce, ale zlecenie nie wyczyściło się (", "The report is queued, but the job did not clear (") + gErr(e) + window.OESTT("). Usuń je przyciskiem „Zacznij od nowa”.", "). Remove it with the “Start again” button.")); });
      return done.then(function () { return sendBtn ? sendBtn.ok(window.OESTT("Zakończona", "Finished")) : null; }).then(function () { freeBuilt(); resetForm(); cur.code = ""; show("list"); });
    }
    if (from.ppm && from.draft) {
      var snap = null; try { snap = draftSnap(); snap.fin = Date.now(); } catch (e) {}
      if (snap) done = kvSet(from.draft, snap).catch(function () {});
      return done.then(function () { return sendBtn ? sendBtn.ok(window.OESTT("Zakończona", "Finished")) : null; }).then(function () {
        show("form"); renderPpmBar(); lastMailHint = finHint();
      });
    }
    if (from.draft) done = done.then(function () { return dropDraft(from.draft); }); // bez karty PPM: nie ma gdzie pokazać „Zakończona”
    return done.then(function () { return sendBtn ? sendBtn.ok(window.OESTT("Zakończona", "Finished")) : null; }).then(function () { freeBuilt(); resetForm(); cur.code = ""; show("list"); });
  }
  function finHint() {
    var st = cur.ppm && PPM.stage ? PPM.stage(cur.ppm) : null; if (!st) return "";
    if (st.s !== "queued" && st.s !== "sent" && st.s !== "done") return "";
    return window.OESTT("✓ GOTOWA od ", "✓ READY since ") + NZ.data(new Date(st.at || Date.now())) + " · " +
      (st.s === "sent" ? window.OESTT("raport wysłany.", "report sent.") : st.s === "queued" ? window.OESTT("raport czeka w kolejce.", "report waiting in the queue.") : window.OESTT("raport jeszcze nie wysłany.", "report not sent yet.")) +
      window.OESTT(" Wszystko zostaje w telefonie.", " Everything stays on the phone.");
  }
  // stan raportu po „Wyślij”, prawdziwy — nigdy „wysłane”, dopóki mail nie wyszedł (zasada 03/11)
  function waitsWifi() { var c = navigator.connection; return gm() && cfg.wifiOnly !== false && !(c && (c.type === "wifi" || c.type === "ethernet")); }
  function mailState(it) { return it.status === "sent" ? window.OESTT("Wysłano", "Sent") : it.status === "shared" ? window.OESTT("Przekazano · niepotwierdzone", "Handed over · not confirmed") : !online() ? window.OESTT("W kolejce · brak sieci", "Queued · no network") : waitsWifi() ? window.OESTT("W kolejce · czeka na Wi‑Fi", "Queued · waiting for Wi‑Fi") : window.OESTT("W kolejce", "Queued"); }
  function mailHint(it) {
    var s = it.status === "sent" ? window.OESTT("Raport wysłany.", "Report sent.") : it.status === "shared" ? window.OESTT("Raport przekazany do wybranej apki, ale wysłania nikt nie potwierdził. Gdy mail wyjdzie: Kolejka → „Potwierdzam, wysłane”.", "Report handed over to the chosen app, but nobody confirmed it was sent. When the email goes out: Queue → “Confirm sent”.") : !online() ? window.OESTT("Raport czeka w kolejce — nie ma sieci. Wyjdzie sam, gdy wróci zasięg.", "The report is waiting in the queue — no network. It goes out by itself when the signal returns.") :
      waitsWifi() ? window.OESTT("Raport czeka w kolejce na Wi‑Fi (nie jest jeszcze wysłany). Przez dane: pasek na dole → „Wyślij przez dane”.", "The report is waiting in the queue for Wi‑Fi (not sent yet). Over mobile data: bar at the bottom → “Send over data”.") : window.OESTT("Raport w kolejce — stan wysyłki na pasku na dole.", "Report queued — sending status on the bar at the bottom.");
    if (cur.ppm && PPM.closed && PPM.closed(cur.ppm)) return s + window.OESTT(" Inspekcja zostaje oznaczona jako GOTOWA.", " The inspection stays marked READY.");
    return s + window.OESTT(" Inspekcja zostaje otwarta: możesz poprawić i wysłać ponownie. Gdy skończysz — „Zakończ inspekcję”.", " The inspection stays open: you can correct it and send again. When you are done — “Finish inspection”.");
  }
  // podpis treści formularza: czy po ostatnim „Wyślij” coś się zmieniło (wtedy „Zakończ” wysyła nową wersję)
  function formSig() {
    try {
      var sn = draftSnap(); sn.t = 0;
      sn.photos = sn.photos.map(function (p) { return [p.when, p.tap, p.width, p.height, p.sheet ? 1 : 0, p.blob ? p.blob.size : 0]; });
      var str = JSON.stringify(sn) + (cur.mode === "sum" ? JSON.stringify(batch.items) : ""), h = 5381;
      for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
      return cur.mode + ":" + (h >>> 0).toString(36) + ":" + str.length;
    } catch (e) { return ""; }
  }
  function mailSame(st) {
    if (!st || !st.mail || !st.mailSig || st.s === "queued" || st.s === "sent" || st.s === "done") return false;
    if (!queue.some(function (q) { return q.id === st.mailId; })) return false; // raport usunięty z kolejki: trzeba wysłać od nowa
    return st.mailSig === formSig();
  }
  var lastMailHint = "";
  var sendBtn = null; // wspólny przycisk akcji (moduly/przycisk): kręciołek → ✓ Gotowe, zanim formularz zniknie
  function sendOk() { return sendBtn ? sendBtn.ok() : null; }
  // odzyskana bez części zdjęć (nie ma ich już w telefonie): Wyślij / Update nadpisałyby pełny raport niepełnym – nie pozwalamy
  function recMissing() {
    var miss = keptSaved.length + recLost;
    if (!REC || !miss) return false;
    $("formHint").textContent = window.OESTT("Brakuje ", "Missing ") + miss + window.OESTT(" zdjęć z raportu (nie ma ich już w telefonie). Wyślij i Update nadpisałyby raport bez nich – raport w telefonie i na Dysku zostaje bez zmian.", " photos from the report (no longer on the phone). Send and Update would overwrite the report without them – the report on the phone and on Drive stays unchanged.");
    return true;
  }
  async function queueBtn(b, fromPreview, finish) {
    if (queueing || recMissing()) return;
    lastMailHint = "";
    // ⚙ bez adresata: nic nie wychodzi (nigdy po cichu „do mnie”, Codex #64)
    var nS = cur.mode === "one" ? needsNow() : null;
    if (nS && !nS.xp && !nS.xw) { say(window.OESTT("Zaznacz w ⚙ obok Wyślij format: PDF albo Word.", "Tick a format in ⚙ next to Send: PDF or Word.")); return; }
    if (nS && !recipientsFor(nS).list.length) { say(window.OESTT("Nie zaznaczono, do kogo wysłać (⚙ obok Wyślij) albo zaznaczona osoba nie ma adresu w Ustawieniach.", "No recipient ticked (⚙ next to Send), or the ticked person has no address in Settings.")); return; }
    // ta inspekcja jest już wysłana / zakończona w tym okresie: ponowne wysłanie tylko jako poprawka, termin się nie przesuwa
    var fix = !!(cur.ppm && PPM.closed && PPM.closed(cur.ppm));
    // „Gotowa” to tylko znacznik Grzegorza (04/11): ponowne Wyślij bez pytań; termin się nie przesuwa (fix)
    queueing = true; sendBtn = window.OESTPrzycisk ? OESTPrzycisk.start(b, { busy: window.OESTT("Przygotowuję raport", "Preparing the report"), keep: false }) : null;
    if (!sendBtn) { b.disabled = true; b.textContent = window.OESTT("Przygotowuję…", "Preparing…"); }
    var from = fromPreview && built ? built.from : { type: cur.type, mode: cur.mode, ppm: cur.ppm, day: NZ.dzienIso(reportDate()) }, fail = "";
    from = Object.assign({}, from, { fix: fix, finish: !!finish, sig: formSig(), draft: from.draft || (cur.mode === "one" ? draftKey() : "") });
    (fromPreview && built ? Promise.resolve(built) : (freeBuilt(), buildAll())).then(function (r) { return fitReport(r, buildAll); }).then(function (r) { return enqueue(r, from); }).catch(function (e) {
      fail = window.OESTT("Nie udało się przygotować raportu: ", "Could not prepare the report: ") + buildErr(e);
      if (fromPreview) show("form");
    }).then(function () {
      queueing = false; if (sendBtn) sendBtn.restore(); sendBtn = null; b.disabled = false; b.textContent = "Do kolejki"; updateFormHint();
      if (fail) $("formHint").textContent = fail; // błąd ma zostać widoczny, nie nadpisany zwykłą podpowiedzią
      else if (lastMailHint) $("formHint").textContent = lastMailHint; // po „Wyślij”: prawdziwy stan raportu (kolejka / Wi‑Fi / wysłany)
    });
  }
  // „✓ Zakończ inspekcję” (Grzegorz 04/11 10:00): TYLKO znacznik dla Grzegorza „gotowe, nie muszę tu zaglądać”.
  // Nic nie wysyła, o nic nie pyta, niczego nie kasuje. Na liście jaskrawe zielone „GOTOWA”.
  // Zdjęcie znacznika Gotowa/Zakończona (Grzegorz 05/11): to NIE reset. Odpowiedzi, zdjęcia, raport i stan wysyłki (✉) zostają;
  // inspekcja wraca do „W trakcie”, zlecenie z pliku Vantify znów jest otwarte (termin bez zmian, nic się nie przesuwa).
  function unready(t) {
    if (!t) return;
    var was = PPM.stage(t);
    // zapisany termin wraca na ten z zakończonej inspekcji (spoza pliku: podwykonawcy, za ostatnim zleceniem);
    // dla zleceń z pliku termin i tak bierze się z pliku – zapis tylko zapobiega podwójnemu przesunięciu po ostatnim zleceniu
    if (was && was.period) PPM.setDue(t, was.period);
    PPM.setStage(t, { s: "prog", manual: true });
    var dk = draftKey(); kvGet(dk).then(function (d) { if (d && d.fin) { delete d.fin; delete d.finPeriod; return kvSet(dk, d); } }).catch(function () {});
    renderPpmBar(); updateFormHint(); $("formHint").textContent = window.OESTT("Zdjęto znacznik Gotowa. Wszystko zostało bez zmian.", "Ready flag removed. Nothing else changed.");
  }
  $("finishIns").addEventListener("click", async function () {
    if (queueing) return;
    var t = cur.ppm, st = t && PPM.stage ? PPM.stage(t) : null;
    if (st && (st.s === "queued" || st.s === "sent" || st.s === "done")) { // już Gotowa → zdjęcie znacznika, najpierw „Na pewno?” (Grzegorz 25.11.2026: przypadkowe drugie dotknięcie cofało Gotową)
      if (await ask(window.OESTT("Zdjąć znacznik Gotowa? Inspekcja wróci do W trakcie.", "Remove the Ready flag? The inspection goes back to In progress."))) unready(t);
      return;
    }
    if (t) {
      var dd = PPM.due(t), day = NZ.dzienIso(reportDate());
      PPM.setStage(t, { s: st && st.mail === "sent" ? "sent" : st && st.mail === "queued" ? "queued" : "done", period: dd ? NZ.dzienIso(dd) : day, day: NZ.dzienIso(new Date()), manual: false });
      if (!t.open || cur.mode === "sum") PPM.close(t, day); // następny termin z grafiku/Vantify; ta inspekcja zostaje z napisem Gotowa
    }
    markDone(cur.type, cur.code);
    if (t && cur.mode === "one" && cur.type) { var k = draftKey(); try { await kvSet(k, draftSnap()); } catch (e) {} } // szkic z oznaczeniem Gotowa (fin + termin)
    renderPpmBar(); updateFormHint(); $("formHint").textContent = finHint() || window.OESTT("✓ Gotowa.", "✓ Ready.");
  });
  $("toQueue").addEventListener("click", function () {
    queueBtn(this, false);
  });
  $("prevQueue").addEventListener("click", function () { queueBtn(this, true); });

  // „shared” = przekazany do Gmaila przez Udostępnij, wysłania nikt nie potwierdził (audyt 19/11, P0): nie wychodzi drugi raz sam,
  // pliki zostają, PPM nie jest „wysłane” – dopiero „Potwierdzam, wysłane” (jak Reactive i Handover)
  function pending() { return queue.filter(function (q) { return q.status !== "sent" && q.status !== "shared"; }); }
  function unconfirmed() { return queue.filter(function (q) { return q.status === "shared"; }); }
  function renderNet() {
    var n = pending().length, off = !online();
    $("netTxt").color = off ? "danger" : "primary";
    $("netTxt").textContent = (off ? window.OESTT("Bez sieci", "No network") : "Online") + " · " + // i18n-ok: „Online” tak samo po polsku i po angielsku
      (n ? window.OESTT("w kolejce: ", "queued: ") + n + (sending ? window.OESTT(" (wysyłam…)", " (sending…)") : "") : window.OESTT("kolejka pusta", "queue empty"));
  }
  function qBusy() { return sending || (gm() && OESTSender.busy()); }
  function refresh() { OESTKolejkaWidok.powiadom(); renderNet(); if (!$("v-list").hidden) renderList(); } // ekran Kolejka rysuje część Vue (kolejka-widok.js)

  function markSent(it, r) {
    it.status = "sent"; it.sentAt = Date.now(); it.pdfUrl = r && r.pdfUrl || "";
    if (it.ppm && PPM && PPM.markSent) PPM.markSent(it.ppm, it.id);
    it.docx = new Uint8Array(0); it.photos = []; // pliki są już na Drive; PDF zostaje w telefonie (odtworzenie inspekcji, 04/11)
  }
  function myEmail() {
    if (cfg.email) return cfg.email;
    return OESTSender.myEmail(); // adres firmowy obecnego konta (moduly/wysylka; nigdy adres innego konta)
  }
  // Wysyłka: jedna droga – Gmail z konta (moduly/wysylka, OESTSender). „Udostępnij” Androida i skrypt Apps Script usunięte
  // (Grzegorz 25/11/2026: raporty wychodziły same w tle z Gmaila; dwie zapasowe drogi były martwe i rozjeżdżały wysyłkę).
  function sendQueue(manual) {
    return manual || cfg.auto ? OESTSender.run({ login: !!manual, anyNet: !!manual }) : Promise.resolve();
  }
  window.addEventListener("online", function () { renderTranslate(); refresh(); if (cfg.auto) sendQueue(); if (!serverTpl && !(APP && !cfg.api)) loadSetup(); });
  window.addEventListener("offline", function () { renderTranslate(); refresh(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && cfg.auto) sendQueue(); });
  setInterval(function () { if (cfg.auto && pending().length) sendQueue(); }, 60000);

