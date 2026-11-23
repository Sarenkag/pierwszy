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
      if (r.bezPdf) $("fname").innerHTML = r.files.map(function (f) { return esc(f.name); }).join("<br>") + "<br><b>" + esc(gErr(new Error("REPORT_PDF_MISSING"))) + "</b>";
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
    var d = built.data, i = built.info, title = (i.headerText || "Engineers Report").split("\n").pop();
    if (d.temps) {
      $("paper").innerHTML = "<b>" + esc(d.tytul) + "</b><p>Date: " + esc(d.data) + " · Print name: " + esc(d.inspektor) + "</p><table>" +
        built.from.type.slots.map(function (s, n) { return '<tr><td class="k">' + esc(s[0]) + "<br><small>" + esc(KIND[s[1]]) + "</small></td><td" + (tempBad(s[1], d.temps[n]) ? ' style="color:var(--bad)"' : "") + ">" + esc(d.temps[n] ? d.temps[n] + " °C" : "–") + "</td></tr>"; }).join("") +
        "</table><p><b>" + esc(d.stan_ogolny) + ".</b></p>";
      $("prevSub").textContent = d.urzadzenie + " · " + d.data;
      $("fname").innerHTML = esc(built.name) + "<em>.docx</em> "+window.OESTT("(wzór firmy)", "(company template)")+"<br>" + esc(built.name) + "<em>.pdf</em>";
      return;
    }
    if (d.folder && d.flush) {
      var ff = d.flush;
      $("paper").innerHTML = "<b>" + esc(ff.title) + "</b><p>" + (ff.points ? "" : esc(OESTFlush.MONTHS[ff.month] + " " + ff.year) + window.OESTT(" · tydzień ", " · week ") + ff.week + " · ") + esc(d.data) + " · " + esc(ff.name) + "</p><table>" +
        ff.taps.map(function (t, ti) { var gh = 0, gname = ""; (ff.groups || []).forEach(function (g) { if (gh === ti) gname = g.name; gh += g.n; });
          return (gname ? '<tr><td colspan="2"><b>' + esc(gname) + "</b></td></tr>" : "") + '<tr><td class="k">' + esc(t.name) + "</td><td" + (t.state === "no" ? ' style="color:var(--bad)"' : "") + ">" + esc(OESTFlush.LABEL[t.state]) + (t.note ? "<br><small>" + esc(t.note) + "</small>" : "") + "</td></tr>"; }).join("") +
        "</table><p><b>" + esc(d.stan_ogolny) + ".</b></p>" +
        built.pics.map(function (p) { return '<div class="pimg"><img alt="" src="' + p.url + '">' + (p.tap != null && ff.taps[p.tap] ? "<small>" + esc(ff.taps[p.tap].name) + "</small>" : "") + "</div>"; }).join("");
      $("prevSub").textContent = d.urzadzenie + " · " + d.data;
      $("fname").innerHTML = (ff.points ? "" : esc(built.name) + "<em>.docx</em> "+window.OESTT("(wzór firmy)", "(company template)")+"<br>") + esc(built.name) + "<em>.pdf</em>";
      return;
    }
    if (d.folder) {
      $("paper").innerHTML = built.pics.map(function (p, n) { return '<div class="pimg"><img alt="Strona ' + (n + 1) + '" src="' + p.url + '"></div>'; }).join("");
      $("prevSub").textContent = d.urzadzenie + " · " + d.data + " · stron: " + built.pics.length;
      $("fname").innerHTML = esc(built.name) + "<em>.pdf</em>";
      return;
    }
    function head() { return '<div class="ph">' + (built.logoUrl ? '<img alt="" src="' + built.logoUrl + '">' : "") + "<div>" + esc(title) + "</div></div>"; }
    var foot = '<div class="foot">' + esc(i.footerText || "") + "</div>";
    var html = head() + "<table>" +
      '<tr><td class="k">Site</td><td>' + esc(d.site) + "</td></tr>" +
      // nowy wzór basic (20/11/2026): ID = nr zlecenia Vantify obok daty, Location obok inżyniera – jak w Wordzie i PDF
      '<tr><td class="k">Date</td><td>' + esc(d.data) + '<span style="float:right"><b>ID:</b> ' + esc(d["job number"] || "") + "</span></td></tr>" +
      '<tr><td class="k">Engineer</td><td>' + esc(d.inspektor) + '<span style="float:right"><b>Location:</b> ' + esc([d.building, d.level].filter(Boolean).join(" ")) + "</span></td></tr>" +
      '<tr><td colspan="2" class="big"><p style="text-align:center"><b>' + esc(d.tytul) + "</b></p>" +
      "<p>Overall Condition: " + esc(d.stan_ogolny) + "</p>" +
      '<div style="white-space:pre-wrap">' + (d.details || "").split("\n").map(function (l) {
        return l.indexOf("\t") < 0 ? esc(l) : l.split("\t").map(function (c) { return '<span style="display:inline-block;width:33%;line-height:2.2">' + esc(c) + "</span>"; }).join("");
      }).join("\n") + "</div>" +
      (d.zakres ? '<div class="scope">' + esc(d.zakres) + "</div>" : "") + "</td></tr>" +
      '<tr><td colspan="2">Works Complete: ' + esc(d.data) + "</td></tr>" +
      '<tr><td colspan="2">Quote Required: ' + esc(d.quote) + "</td></tr>" +
      '<tr><td colspan="2" style="height:44px">Signed: ' + esc(d.inspektor) + "</td></tr></table>" + foot +
      built.pics.map(function (p, n) { return '<div class="pimg">' + head() + '<img alt="' + window.OESTT('Zdjęcie ', 'Photo ') + (n + 1) + '" src="' + p.url + '"></div>'; }).join("");
    $("paper").innerHTML = html;
    $("prevSub").textContent = d.urzadzenie + " · " + d.lokalizacja + " · " + d.data;
    $("fname").innerHTML = esc(built.name) + "<em>.docx</em><br>" + esc(built.name) + "<em>.pdf</em>" +
      (cfg.drivePhotos && built.pics.length ? "<br>" + esc(built.name) + "<em> foto 1" + (built.pics.length > 1 ? "…" + built.pics.length : "") + ".jpg</em> "+window.OESTT("(tylko na Drive)", "(Drive only)")+"" : "");
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
        if (gm()) OESTSender.run({ login: true }); else if (shareApi()) shareSend(it); else if (cfg.auto) sendQueue();
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
    if (from.queued !== false) { if (gm()) OESTSender.run({ login: true }); else if (shareApi()) shareSend(queue[queue.length - 1]); else if (cfg.auto) sendQueue(); }
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
    if (st && (st.s === "queued" || st.s === "sent" || st.s === "done")) { unready(t); return; } // już Gotowa → zdjęcie znacznika
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
    if (cur.type && cur.type.folder && !(cur.type.flush && fl.on) && !sheetPhotos().length) { $("shCamIn").click(); return; } // „Dodaj zdjęcie kartki”
    queueBtn(this, false);
  });
  $("prevQueue").addEventListener("click", function () { queueBtn(this, true); });

  // „shared” = przekazany do Gmaila przez Udostępnij, wysłania nikt nie potwierdził (audyt 19/11, P0): nie wychodzi drugi raz sam,
  // pliki zostają, PPM nie jest „wysłane” – dopiero „Potwierdzam, wysłane” (jak Reactive i Handover)
  function pending() { return queue.filter(function (q) { return q.status !== "sent" && q.status !== "shared"; }); }
  function unconfirmed() { return queue.filter(function (q) { return q.status === "shared"; }); }
  function renderNet() {
    var n = pending().length, off = !online();
    $("netbar").className = "netbar" + (off ? " off" : "");
    $("netTxt").textContent = (off ? window.OESTT("Bez sieci", "No network") : "Online") + " · " + // i18n-ok: „Online” tak samo po polsku i po angielsku
      (n ? window.OESTT("w kolejce: ", "queued: ") + n + (sending ? window.OESTT(" (wysyłam…)", " (sending…)") : "") : window.OESTT("kolejka pusta", "queue empty"));
  }
  function qBusy() { return sending || (gm() && OESTSender.busy()); }
  function renderQueue() {
    var n = pending().length, busy = qBusy();
    var list = queue.slice().sort(function (a, b) { return b.created - a.created; });
    var nu = unconfirmed().length;
    $("qSub").textContent = n ? window.OESTT("Do wysłania: ", "To send: ") + n + (nu ? window.OESTT(" · do potwierdzenia: ", " · to confirm: ") + nu : "") : nu ? window.OESTT("Do potwierdzenia: ", "To confirm: ") + nu : window.OESTT("Wszystko wysłane", "All sent");
    $("qList").innerHTML = list.length ? list.map(function (q) {
      var st = q.status === "sent" ? '<span class="st ok">'+window.OESTT('✓ wysłane', '✓ sent')+' ' + esc(NZ.godzina(new Date(q.sentAt))) + "</span>" :
        q.status === "sending" ? '<span class="st">'+window.OESTT('wysyłam…', 'sending…')+'</span>' :
        q.status === "err" ? '<span class="st err">'+window.OESTT('błąd', 'error')+'</span>' :
        q.status === "shared" ? '<span class="st">'+window.OESTT('przekazano · niepotwierdzone', 'handed over · not confirmed')+'</span>' : '<span class="st">czeka</span>';
      return '<div class="qitem"><div><div class="code">' + esc(q.code) + "</div><small>" + esc(q.name) + " · " + NZ.kb(q.docx.length + q.pdf.length) +
        (q.err ? " · " + esc(q.err) : "") + (q.pdfUrl ? ' · <a href="' + esc(q.pdfUrl) + '" target="_blank" rel="noopener">PDF</a>' : "") +
        (q.status === "shared" && !busy ? ' · <button class="btn" type="button" data-akcja="potwierdz-wyslane" data-ok="' + esc(q.id) + '">'+window.OESTT('Potwierdzam, wysłane', 'Confirm sent')+'</button>' +
          ' · <button class="btn" type="button" data-akcja="wyslij-ponownie" data-again="' + esc(q.id) + '">'+window.OESTT('Wyślij ponownie', 'Send again')+'</button>' : "") +
        (q.status !== "sent" && !busy ? ' · <button class="btn" type="button" data-del="' + esc(q.id) + '">'+window.OESTT('Usuń', 'Delete')+'</button>' : "") +
        "</small></div>" + st + "</div>";
    }).join("") : '<p class="hint">'+window.OESTT('Pusto. Raporty dodane „Do kolejki” czekają tu na wysłanie.', 'Empty. Reports added “To queue” wait here to be sent.')+'</p>';
    $("qSend").disabled = busy || !n;
    $("qSend").textContent = busy ? window.OESTT("Wysyłam…", "Sending…") : window.OESTT("Wyślij wszystko", "Send all");
    $("qHint").textContent = gm() ? window.OESTT("Idzie prosto z Twojego Gmaila na ", "Goes straight from your Gmail to ") + (myEmail() || window.OESTT("adres z Ustawień", "the address in Settings")) + window.OESTT(". Stan wysyłki widać na pasku na dole.", ". Sending status shows on the bar at the bottom.") : shareApi() ? window.OESTT("Appka nie jest zalogowana do Google, więc Wyślij otwiera wybór apki. Żeby raporty szły same: Ustawienia → Konto → Wyloguj i zaloguj przez Google.", "The app is not signed in to Google, so Send opens the app chooser. To send reports automatically: Settings → Account → Sign out and sign in with Google.") : !cfg.email ? window.OESTT("Ustaw e-mail w Ustawieniach.", "Set the email in Settings.") :
      (!online() ? window.OESTT("Bez sieci — wyślę, gdy wróci zasięg (apka musi być otwarta).", "No network — I will send when the signal returns (the app must be open).") : window.OESTT("Idzie z Twojego Gmaila na ", "Goes from your Gmail to ") + cfg.email + window.OESTT(" i do folderu „", " and to the folder “") + cfg.folder + window.OESTT("” na Drive.", "” on Drive."));
    renderNet();
  }
  $("qList").addEventListener("click", async function (e) {
    var ok = e.target.closest("button[data-ok]"), again = e.target.closest("button[data-again]");
    if ((ok || again) && !qBusy()) {
      var sid = (ok || again).getAttribute(ok ? "data-ok" : "data-again"), sit = queue.filter(function (q) { return q.id === sid && q.status === "shared"; })[0];
      if (!sit) return;
      if (ok) markSent(sit, null); else { sit.status = "wait"; sit.err = ""; } // ponownie = znów w kolejce, wychodzi przez „Wyślij”
      return qPut(sit).then(refresh);
    }
    var b = e.target.closest("button[data-del]"); if (!b || qBusy()) return;
    if (!await ask(window.OESTT("Usunąć ten raport z kolejki? Nie zostanie wysłany.", "Remove this report from the queue? It will not be sent."))) return;
    // w czasie pytania mogła ruszyć wysyłka w tle (sieć wróciła, minutnik): wtedy nie usuwamy raportu, który już wychodzi
    if (qBusy()) { say(window.OESTT("Wysyłka właśnie ruszyła — spróbuj usunąć raport, gdy się skończy.", "Sending has just started — try removing the report when it finishes.")); return; }
    var id = b.getAttribute("data-del");
    var gone = queue.filter(function (q) { return q.id === id; })[0];
    qDel(id).then(function () {
      queue = queue.filter(function (q) { return q.id !== id; }); renderQueue();
      // usunięty niewysłany raport: klocek PPM wraca z „W kolejce” (okres znów otwarty)
      if (gone && gone.ppm && gone.status !== "sent" && PPM && PPM.unqueue) PPM.unqueue(gone.ppm, gone.id);
    });
  });
  $("qSend").addEventListener("click", function () { sendQueue(true); });
  $("qNext").addEventListener("click", function () { show("list"); });
  function refresh() { if (!$("v-queue").hidden) renderQueue(); else renderNet(); if (!$("v-list").hidden) renderList(); }

  // Po kolei, jeden raport na raz. Id raportu chroni przed podwójnym mailem, gdy odpowiedź zginie po drodze.
  function submitArg(it) {
    return { id: it.id, name: it.name, folder: it.folder, to: it.to, subject: it.subject, body: it.body,
      docx: NZ.bytesToB64(it.docx), pdf: NZ.bytesToB64(it.pdf), photos: it.photos.map(NZ.bytesToB64) };
  }
  function markSent(it, r) {
    it.status = "sent"; it.sentAt = Date.now(); it.pdfUrl = r && r.pdfUrl || "";
    if (it.ppm && PPM && PPM.markSent) PPM.markSent(it.ppm, it.id);
    it.docx = new Uint8Array(0); it.photos = []; // pliki są już na Drive; PDF zostaje w telefonie (odtworzenie inspekcji, 04/11)
  }
  // Bez wdrożonego Apps Script: raport idzie przez Androidowe „Udostępnij” (Gmail itp.) z plikami jako załącznikami.
  var reportShare = null;
  function shareApi() {
    if (IN_GAS || cfg.api || !window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return null;
    if (!reportShare) reportShare = Capacitor.registerPlugin ? Capacitor.registerPlugin("ReportShare") : Capacitor.Plugins && Capacitor.Plugins.ReportShare;
    return reportShare || null;
  }
  function myEmail() {
    if (cfg.email) return cfg.email;
    return OESTSender.myEmail(); // adres firmowy obecnego konta (moduly/wysylka; nigdy adres innego konta)
  }
  function shareSend(it) {
    if (sending || !it) return Promise.resolve(); // jedno przekazanie naraz
    var files = [];
    if (Array.isArray(it.files)) it.files.forEach(function (f) { files.push({ name: f.name, data: NZ.bytesToB64(f.bytes) }); }); // ⚙ ustawienia wysyłki
    else {
      if (it.pdf && it.pdf.length) files.push({ name: it.name + ".pdf", data: NZ.bytesToB64(it.pdf) });
      if (it.docx && it.docx.length) files.push({ name: it.name + ".docx", data: NZ.bytesToB64(it.docx) });
    }
    var to = Array.isArray(it.toList) ? it.toList : [it.to || myEmail()].filter(Boolean);
    sending = true; it.status = "sending"; refresh(); // blokada na całe sprawdzanie sieci i przekazanie (drugie „Wyślij wszystko” nie otwiera wyboru drugi raz)
    // najpierw połączenie (zasada wysyłki): bez internetu nie otwieramy wyboru apki, raport czeka w kolejce
    var net = window.OESTSender && OESTSender.reachable ? OESTSender.reachable() : Promise.resolve(online());
    return net.then(function (up) {
      if (!up) { it.status = "wait"; say(window.OESTT("Brak połączenia z internetem. Raport czeka w kolejce.", "No internet connection. The report waits in the queue.")); return qPut(it).then(refresh); }
      return shareApi().share({ subject: it.subject, body: it.body, to: to, files: files }).then(function () {
      // Android mówi tylko, że okno wyboru apki się otworzyło – nie, że mail wyszedł: nic nie kasujemy, PPM nie jest „wysłane”
      it.status = "shared"; it.sharedAt = Date.now(); it.err = ""; return qPut(it);
    }, function (e) { it.status = "err"; it.err = gErr(e); say(window.OESTT("Nie udało się otworzyć Gmaila: ", "Could not open Gmail: ") + it.err + window.OESTT(". Raport czeka w kolejce.", ". The report waits in the queue.")); return qPut(it); }).then(refresh);
    }).then(function () { sending = false; refresh(); }, function (e) { sending = false; refresh(); throw e; });
  }
  function sendQueue(manual) {
    if (gm()) return manual || cfg.auto ? OESTSender.run({ login: !!manual, anyNet: !!manual }) : Promise.resolve();
    if (shareApi()) { var p = pending()[0]; return manual && p && !sending ? shareSend(p) : Promise.resolve(); }
    if (sending || !cfg.email) return Promise.resolve();
    if (!online() && !manual) { refresh(); return Promise.resolve(); }
    var todo = pending();
    if (!todo.length) return Promise.resolve();
    sending = true; refresh();
    return todo.reduce(function (p, it) {
      return p.then(function (stop) {
        if (stop) return true;
        it.status = "sending"; it.err = ""; refresh();
        return api("submit", submitArg(it)).then(function (r) {
          markSent(it, r);
          return qPut(it).then(function () { refresh(); return false; });
        }, function (e) {
          it.status = "err"; it.err = gErr(e);
          return qPut(it).then(function () { refresh(); return true; }); // przerwij, spróbuję później
        });
      });
    }, Promise.resolve(false)).catch(function (e) {
      $("qHint").textContent = window.OESTT("Błąd zapisu kolejki w telefonie: ", "Phone queue save error: ") + gErr(e);
    }).then(function () { sending = false; refresh(); });
  }
  window.addEventListener("online", function () { renderTranslate(); refresh(); if (cfg.auto) sendQueue(); if (!serverTpl && !(APP && !cfg.api)) loadSetup(); });
  window.addEventListener("offline", function () { renderTranslate(); refresh(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && cfg.auto) sendQueue(); });
  setInterval(function () { if (cfg.auto && pending().length) sendQueue(); }, 60000);

