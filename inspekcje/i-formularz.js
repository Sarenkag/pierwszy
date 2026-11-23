"use strict";
// i-formularz.js – formularz inspekcji: punkty, usterki, stan.
// Korzysta z: 2–4 (numery z tabeli w docs/podzial-modulow.md).
// Nie ruszać: struktury states/override – zapisuje ją szkic.
  // ---------- formularz ----------
  var states = [], override = {}, faultsOn = {}, photos = [], built = null, trOriginal = null, dateTouched = false;
  // cur.mode: "one" — raport na urządzenie; "item" — urządzenie w zleceniu zbiorczym; "sum" — zakończenie zlecenia
  function openForm(code) {
    var mode = cur.type.batch ? "item" : "one";
    var fresh = cur.code !== code || cur.formType !== cur.type.id || cur.mode !== mode;
    if (fresh) { noTrack = true; try { resetForm(); } finally { noTrack = false; } } // czyszczenie formularza nie może nadpisać klocka poprzedniej rozdzielnicy
    // inna rozdzielnica z listy urządzeń po wejściu z karty PPM: klocek tej rozdzielnicy (albo żaden), nie pierwszej
    if (cur.ppm && cur.ppm.dev && cur.ppm.dev !== code && PPM) cur.ppm = PPM.tasks.filter(function (t) { return t.open === cur.type.id && t.dev === code; })[0] || null;
    cur.code = code; cur.formType = cur.type.id; cur.mode = mode;
    var d = devOf(code);
    cur.loc = d.loc; cur.where = where(d);
    $("formTitle").textContent = code;
    $("formSub").textContent = cur.where + " · " + cur.type.name;
    $("ckTitle").textContent = cur.type.title;
    if (fresh && mode === "item" && batch.items[code]) restoreItem(batch.items[code]); // ten sam formularz: zdjęcia już są, nie dublować
    formMode(); renderChecks(); renderFaults(); show("form"); updateFormHint();
    ppmTrack(true);
    if (fresh && mode === "one") loadDraft(); else if (mode === "one") draftOn = true;
  }
  // etap inspekcji na klocku listy PPM: otwarcie = W trakcie (jeśli nie wysłana w tym okresie), zdjęcia i usterki na bieżąco
  var thumbFor = null, noTrack = false;
  // liczniki na klocek (Grzegorz 04/11): zdjęcie formularza (jest / brak), zdjęcia bez formularza, OK / pytania w użyciu (jak licznik w formularzu – N/A się nie liczy)
  function ppmCounts() {
    var ck = cur.type && cur.type.checks;
    // formularz = tylko zdjęcia z przycisku „Formularz” (Grzegorz 12/11/2026: zdjęcie call pointu z „Zrób zdjęcie” to nie formularz)
    return { photos: photos.filter(function (p) { return !p.sheet; }).length,
      sheet: sheetPhotos().length, issues: ck ? (function () { try { return failCount(); } catch (e) { return 0; } })() : 0, total: ck ? ck.length : 0,
      ok: ck ? states.filter(function (x) { return x === "ok"; }).length : 0, used: ck ? states.filter(function (x) { return x !== "na"; }).length : 0 };
  }
  // odcisk całej treści inspekcji (to samo, co idzie do szkicu: pola raportu, odpowiedzi, powody, notatki, krany, pomiary, zdjęcia),
  // bez znaczników czasu; służy tylko do sprawdzenia, czy dotknięcie Grzegorza coś w inspekcji zmieniło
  function ppmSig() {
    try { var d = draftSnap(); delete d.t; delete d.fin; delete d.finPeriod; if (d.fl) delete d.fl.open; /* rozwinięcie notatki to nie zmiana */ var j = JSON.stringify(d), h = 0; for (var i = 0; i < j.length; i++) h = (h * 31 + j.charCodeAt(i)) | 0; return j.length + ":" + h; } catch (e) { return ""; }
  }
  // user = zmiana zrobiona przez Grzegorza (dotknięcie/wpis w formularzu, poprawione zdjęcie), a nie wczytanie zapisanej inspekcji
  function ppmTrack(open, user) {
    var t = cur.ppm; if (noTrack || !t || !PPM || !PPM.setStage || cur.mode === "sum") return;
    var r = PPM.stage(t);
    var patch = Object.assign({ s: r ? r.s : "prog" }, ppmCounts());
    if (r && (r.s === "queued" || r.s === "sent")) return; // wysłana: klocek pokazuje to, co poszło w raporcie
    // Gotowa: liczniki (zdjęcia, usterki) zawsze aktualne, status zostaje. Nie rozpoczęta + zmiana (np. zdjęcie kranu) = W trakcie.
    // ręcznie „Nie rozpoczęta” (07/11): otwarcie i wczytywanie zapisanej inspekcji (szkic, urządzenie izolatorów) nic nie zmienia.
    // W trakcie dopiero po zmianie zrobionej przez Grzegorza (user) albo po nowym zdjęciu ponad to, co było przy ustawieniu.
    var u = !r && PPM.unstarted ? PPM.unstarted(t) : null;
    if (u) {
      if (open || restoring || (cur.mode === "one" && !draftOn)) return;
      var c = ppmCounts(); if (!user && !(c.photos > u.photos || c.sheet > u.sheet)) return;
    } else if (!r && !open && !photos.length && !ppmCounts().used) return;
    var first = photos[0];
    if (!first) { patch.thumb = ""; thumbFor = null; }
    PPM.setStage(t, patch); if (open) renderPpmBar();
    if (first && thumbFor !== first.url) {
      thumbFor = first.url; var img = new Image();
      img.onload = function () { try { var c = document.createElement("canvas"), k = 96 / Math.max(img.width, img.height); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); if (PPM.stage(t)) PPM.setStage(t, { thumb: c.toDataURL("image/jpeg", 0.6) }); } catch (e) {} };
      img.src = first.url;
    }
  }
  // Pokazuje tylko panele potrzebne w danym trybie
  function formMode() {
    var m = cur.mode;
    document.querySelectorAll("[data-m]").forEach(function (el) { el.hidden = el.getAttribute("data-m").split(" ").indexOf(m) < 0; });
    var ask = !!cur.type.ask && m !== "sum", quick = !!cur.type.quick; // quick: inspekcja z listy PPM bez własnych pytań
    if (ask || quick) $("faults").closest(".panel").hidden = true;
    $("photos").closest(".panel").style.order = ""; // kolejność daje form-ui.js: Imię/Data → zdjęcia → pytania (tak samo w każdej inspekcji)
    $("allOk").textContent = ask ? T("Wszystko TAK", "All YES") : T("Wszystkie zaznaczone → OK", "All marked → OK");
    $("legend").hidden = !!cur.type.ask;
    // formularz pomiarów (024): tylko temperatury, data i podpis
    var temp = !!cur.type.temp;
    $("tempBox").hidden = !temp || m === "sum";
    if (temp) [$("faults"), $("ck"), $("photos"), $("sheetPhotos"), $("ov-1"), $("komentarz")].forEach(function (el) { el.closest(".panel").hidden = true; }); // raport pomiarów nie ma zdjęć
    if (cur.type.plain) $("faults").closest(".panel").hidden = true;
    if (cur.type.folder) [$("faults"), $("ck"), $("ov-1"), $("komentarz")].forEach(function (el) { el.closest(".panel").hidden = true; });
    $("flushBox").hidden = !cur.type.flush || m === "sum";
    applyNeeds();
  }
  // ---------- co ta inspekcja wymaga (Grzegorz 04/11): pytania aktywne, zdjęcia, zdjęcie formularza ----------
  // Zapis na stałe dla tej inspekcji z listy PPM (ppm.js → P.needs). Pytania wyłączone: checklista schowana, wszystkie „–” (nie idą do raportu).
  var qSaved = null;
  function needsNow() { return cur.ppm && PPM && PPM.needs ? PPM.needs(cur.ppm) : null; }
  function applyNeeds(toggled) { // toggled = Grzegorz właśnie włączył pytania (tylko wtedy wracają domyślne odpowiedzi)
    var n = needsNow(), F = cur.type && cur.type.flush;
    if (!n) { syncSendHint(); return; }
    // Flushing / AOV: „Nasz raport” = formularz elektroniczny (wcześniej osobny przełącznik w Flushingu)
    if (F) { if (fl.on !== !!n.q) { fl.on = !!n.q; renderFlush(); } syncSendHint(); return; }
    syncSendHint();
    if (!RD.pytaniaMozliwe(cur.type) || cur.mode !== "one") return;
    var ckp = $("ck").closest(".panel");
    if (!n.q) {
      ckp.hidden = true; $("faults").closest(".panel").hidden = true;
      if (states.some(function (x) { return x !== "na"; })) { qSaved = states.slice(); states = states.map(function () { return "na"; }); renderChecks(); renderFaults(); }
    } else {
      ckp.hidden = false;
      if (qSaved && states.every(function (x) { return x === "na"; })) { states = qSaved; renderChecks(); renderFaults(); }
      else if (toggled && states.length && states.every(function (x) { return x === "na"; })) { states = cur.type.checks.map(function (c) { return c.def; }); renderChecks(); renderFaults(); }
      qSaved = null;
    }
  }
  // ---------- ustawienia wysyłki: ⚙ obok Wyślij (Grzegorz 04/11 11:37) ----------
  // Okienko (to samo co „Na pewno?”) z tick boxami: co wysłać, scalone / osobno, PDF / Word, do kogo.
  // „Zapisz jako domyślne” = zapamiętane dla tej inspekcji; Wyślij wysyła jednym stuknięciem wg zapisanych ustawień.
  function sendParts() { // co ta inspekcja w ogóle ma do wysłania (reszta w okienku wyszarzona)
    var F = cur.type && cur.type.flush;
    return { q: RD.pytaniaMozliwe(cur.type) || !!F, t: !!F, qLabel: F ? (F.points ? T("Nasz raport (lista punktów)", "Our report (point list)") : T("Nasz raport (formularz elektroniczny)", "Our report (electronic form)")) : T("Pytania w raporcie", "Questions in the report") };
  }
  function hasWord() { var F = cur.type && cur.type.flush; return !!cur.type && !cur.type.temp ? true : !!(cur.type && cur.type.temp); } // czy ta inspekcja ma raport w Wordzie
  function syncSendHint() {
    var n = needsNow(), h = $("sendHint"); if (!h) return;
    if (!n || cur.mode !== "one") { h.textContent = ""; return; }
    function txt() {
    var to = recipientsFor(n), what = [], off = [];
    if (n.q && sendParts().q) what.push(T("raport", "report"));
    if (n.f) what.push(T("zdjęcia formularza", "form photos"));
    if (n.p || n.t) what.push(T("zdjęcia", "photos"));
    if (!n.f && sheetPhotos().length) off.push(T("zdjęcia formularza", "form photos") + " (" + sheetPhotos().length + ")");
    if (!n.p && genPhotos().length) off.push(T("zdjęcia ogólne", "general photos") + " (" + genPhotos().length + ")");
    if (!n.t && photos.some(function (p) { return p.tap != null; })) off.push(T("zdjęcia do pytań", "question photos") + " (" + photos.filter(function (p) { return p.tap != null; }).length + ")");
    return "⚙ " + (what.join(" + ") || T("nic", "nothing")) + " · " + (n.one ? T("jeden dokument", "one document") : T("osobne pliki", "separate files")) + " · " +
      [n.xp && "PDF", n.xw && hasWord() && "Word"].filter(Boolean).join(" + ") + " → " + (to.list.join(", ") || T("brak adresata", "no recipient")) +
      (off.length ? T(". Odznaczone, nie pójdą: ", ". Unticked, will not go: ") + off.join(", ") : "") + ".";
    }
    h.textContent = txt();
    if (window.OESTPodmien && window.OESTBledy && OESTBledy.wJezyku) OESTPodmien.miejsce(h, OESTBledy.wJezyku(OESTBledy.drugi(), txt)); // PL i EN zajmują tyle samo miejsca
  }
  $("sendCfg").addEventListener("click", function () {
    var n = needsNow(); if (!n || !window.OESTPrzycisk) return;
    var sp = sendParts(), to = recipientsFor({ sp: 1, sm: 1, se: 1, sg: 1 });
    function cb(k, label, dis, note) { return '<label class="need' + (dis ? " dis" : "") + '"><input type="checkbox" data-sn="' + k + '"' + (n[k] && !dis ? " checked" : "") + (dis ? " disabled" : "") + "><span>" + esc(label) + (note ? " <small>" + esc(note) + "</small>" : "") + "</span></label>"; }
    var box = document.createElement("div"); box.className = "sendcfg-box";
    box.innerHTML = '<div class="sct">' + T("Co wysłać", "What to send") + "</div>" +
      cb("f", T("Zdjęcia formularza (całość, strona po stronie)", "Form photos (whole form, page by page)")) +
      cb("q", sp.qLabel, !sp.q) +
      cb("p", T("Zdjęcia z inspekcji (ogólne)", "Inspection photos (general)")) +
      cb("t", T("Zdjęcia do pytań (z nazwą punktu)", "Question photos (with the point name)"), !sp.t) +
      '<div class="sct">' + T("Jak", "How") + "</div>" +
      '<label class="need"><input type="radio" name="sn-one" value="1"' + (n.one ? " checked" : "") + "><span>" + T("Scalone w jeden dokument", "Merged into one document") + "</span></label>" +
      '<label class="need"><input type="radio" name="sn-one" value="0"' + (n.one ? "" : " checked") + "><span>" + T("Osobne pliki (formularz, raport, zdjęcia)", "Separate files (form, report, photos)") + "</span></label>" +
      '<div class="sct">' + T("Format", "Format") + "</div>" + cb("xp", "PDF") + cb("xw", "Word", false, T("(tylko raport; zdjęcia zawsze w PDF)", "(report only; photos always PDF)")) +
      '<div class="sct">' + T("Do kogo", "To") + "</div>" +
      cb("sp", T("Mój prywatny e-mail", "My private email"), !to.priv, to.priv || T("brak adresu w Mój profil", "no address in My Profile")) +
      cb("sm", T("Mój firmowy e-mail", "My work email"), !to.me, to.me || T("brak adresu w Mój profil", "no address in My Profile")) +
      cb("se", T("Inżynier", "Engineer"), !to.eng, to.eng || T("ustaw w Ustawienia → Wysyłka", "set in Settings → Mail")) +
      cb("sg", T("Manager", "Manager"), !to.man, to.man || T("ustaw w Ustawienia → Wysyłka", "set in Settings → Mail"));
    OESTPrzycisk.ask({ title: T("Ustawienia wysyłki", "Sending settings"), node: box, ok: T("Zapisz jako domyślne", "Save as default"), cancel: T("Zamknij", "Close") }).then(function (save) {
      if (!save || !cur.ppm || !PPM.setNeeds) return;
      var patch = {}; box.querySelectorAll("input[data-sn]:not(:disabled)").forEach(function (el) { patch[el.getAttribute("data-sn")] = el.checked; });
      var r = box.querySelector('input[name="sn-one"]:checked'); patch.one = !r || r.value === "1";
      var qWas = !!n.q; PPM.setNeeds(cur.ppm, patch);
      if (patch.q != null && patch.q !== qWas && !cur.type.flush) formMode();
      applyNeeds(patch.q && !qWas); ppmTrack(false); try { suggestOverall(); } catch (e) {} updateFormHint(); scheduleDraft();
    });
  });
  // dodane zdjęcie = chcę je w raporcie: odznaczona kategoria zaznacza się sama (Grzegorz 04/11 11:28)
  function needOn(k) { var n = needsNow(); if (n && !n[k] && cur.ppm && PPM.setNeeds) { var p = {}; p[k] = true; PPM.setNeeds(cur.ppm, p); applyNeeds(); } }
  function resetForm() {
    if (draftT && cur.type && cur.formType === cur.type.id) saveDraftNow(); // zmiana sprzed chwili (przed upływem 300 ms) idzie do szkicu poprzedniego formularza, zanim go wyczyścimy
    draftOn = false; clearTimeout(draftT); draftT = 0; if ($("restoreIns")) { $("restoreIns").hidden = true; restoreList = []; restorePdf = null; }
    roomNotes = {};
    restoring = 0; formSeq++; cur.sumDevs = null; pendingPh = 0; keptSaved = []; recLost = 0; built = null; trOriginal = null; override = {}; faultsOn = {}; dateTouched = false; susN = {}; rsel = {};
    photos.forEach(function (p) { URL.revokeObjectURL(p.url); }); photos = []; renderPhotos(); $("sugBox").hidden = true;
    states = cur.type.checks.map(function (c) { return c.def; }); renderChecks(); renderFaults();
    $("dzien").value = NZ.dzienIso(new Date()); $("podpis").value = cfg.insp; $("dateSug").hidden = true;
    $("komentarz").value = ""; $("undoTr").hidden = true; $("trHint").textContent = ""; mdSeq++; $("mdBox").hidden = true; $("mdRun").disabled = false;
    if ($("ntN")) { $("ntN").textContent = "0"; $("ntJoin").hidden = true; }
    $("ov-1").checked = true; $("q-0").checked = true;
    temps = (cur.type.slots || []).map(function () { return ""; }); renderTemps();
    fl = OESTFlush.start(cur.type.flush || {}); renderFlush();
  }
