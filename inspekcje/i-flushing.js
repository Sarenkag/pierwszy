"use strict";
// i-flushing.js – Weekly Flushing TA/TB/P: tydzień i lista kranów.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: lista kranów jest w rodzaje.js/flush.js – tu tylko wyświetlana.
  // ---------- Weekly Flushing (TA/TB/P): tydzień, formularz elektroniczny, lista kranów ----------
  var fl = { on: false, week: 0, open: {}, taps: [] };
  // zdjęcie wypełnionego formularza (osobny przycisk w inspekcji, Grzegorz 04/11) – w raporcie na końcu, po zdjęciach z inspekcji
  function sheetPhotos() { return photos.filter(function (p) { return p.sheet; }); }
  function tapPhotos(i) { return photos.filter(function (p) { return p.tap === i; }); }
  function genPhotos() { return photos.filter(function (p) { return p.tap == null && !p.sheet; }); } // zdjęcia ogólne (bez kranu / punktu, nie formularz)
  function recipientsFor(n) { return window.OESTSender && OESTSender.recipients ? OESTSender.recipients(n) : { list: cfg.email ? [cfg.email] : [], me: cfg.email }; }
  function renderFlush() {
    var F = cur.type && cur.type.flush;
    if (!F) { widokInspekcji("flList", "fragment", { rodzaj: "flush", lista: [] }); return; }
    if (fl.taps.length !== F.taps.length) fl = OESTFlush.start(F);
    $("flOn").checked = fl.on; $("flList").inert = !fl.on;
    // lista punktów (AOV): bez tygodnia, nagłówki grup (klapy), inne podpowiedzi
    $("flWeekL").hidden = $("flWeek").hidden = !!F.points;
    if (F.ui === "checks") { // lista potwierdzeń (Weekly Spa Checks, Weekly Generator Check): bez przycisków AOV; podpowiedź z konfiguracji typu
      $("flOnL").textContent = window.OESTT("Lista sprawdzeń (z apki)", "Check list (in the app)");
      $("flHint").textContent = F.hint ? window.OESTT(F.hint[0], F.hint[1]) : window.OESTT("Zaznacz, co potwierdzasz (domyślnie Yes). Do raportu idzie lista i zdjęcia z plant roomów. Zdjęcie kartki nie jest wymagane – przycisk „Formularz” zostaje na zaś.", "Mark what you confirm (Yes by default). The report gets the list and the plant room photos. A form photo is not required – the “Form” button stays just in case.");
    } else {
    $("flOnL").textContent = F.points ? window.OESTT("Lista przycisków (sprawdzenie z apki)", "Call point list (check in the app)") : window.OESTT("Formularz elektroniczny", "Electronic form");
    $("flHint").textContent = F.points ? window.OESTT("„Nasz raport” w ⚙ obok Wyślij wyłączony: do raportu idą tylko zdjęcia kartki. Włączony: w raporcie jest też tabela przycisków (Yes = klapy otworzyły się z tego przycisku i zamknęły po resecie) i zdjęcia przy przyciskach.", "“Our report” in ⚙ next to Send off: only photos of the paper form go to the report. On: the report also has a call point table (Yes = vents opened from this call point and closed after reset) and photos per call point.") :
      window.OESTT("„Nasz raport” w ⚙ obok Wyślij wyłączony: do raportu idą tylko zdjęcia wypełnionych kartek. Włączony: idzie wypełniony formularz Word, zdjęcia kartek są dodatkiem.", "“Our report” in ⚙ next to Send off: only photos of the filled-in forms go to the report. On: the filled-in Word form goes, with form photos as an extra.");
    }
    var heads = {}, at = 0; (F.groups || []).forEach(function (g) { heads[at] = g.name; at += g.n; });
    $("flWeek").value = fl.week;
    widokInspekcji("flList", "fragment", { rodzaj: "flush", opcje: [["yes", "Yes", "ok"], ["no", "No", "fail"], ["na", "N/A", "na"]], lista: F.taps.map(function (name, i) {
      var t = fl.taps[i], pics = tapPhotos(i), odczyt = (F.odczyty || []).indexOf(name) >= 0;
      return { i: i, grupa: heads[i], stan: t.state, tekst: F.etykieta ? name.replace(new RegExp(F.etykieta), "") : name,
        aparat: window.OESTT("Zdjęcie: ", "Photo: ") + name, notatka: window.OESTT("Notatka: ", "Note: ") + name,
        otwarty: !!(fl.open[i] || t.note || odczyt), uwaga: t.note, odczyt: odczyt,
        placeholder: odczyt ? window.OESTT("Odczyt", "Reading") : window.OESTT("Notatka (trafi do kolumny NOTES)", "Note (goes to the NOTES column)"),
        zdjecia: pics.map(function (p) { return { i: photos.indexOf(p), url: p.url }; }) };
    }) });
  }
  var flTap = null;
  $("flushBox").addEventListener("click", function (e) {
    var b = e.target.closest("ion-button"); if (!b) return;
    if (b.hasAttribute("data-w")) { var w = +b.getAttribute("data-w"); fl.week = fl.week === w ? 0 : w; renderFlush(); updateFormHint(); return; }
    if (b.hasAttribute("data-fl")) { fl.taps[+b.getAttribute("data-fl")].state = b.getAttribute("data-s"); renderFlush(); updateFormHint(); return; }
    if (b.hasAttribute("data-flnote")) { var n = +b.getAttribute("data-flnote"); fl.open[n] = true; renderFlush(); queueMicrotask(function () { var el = $("flList").querySelector('[data-fln="' + n + '"]'); if (el) el.setFocus(); }); return; }
    if (b.hasAttribute("data-fldel")) { var at = +b.getAttribute("data-fldel"), p = photos[at]; if (p) { URL.revokeObjectURL(p.url); photos.splice(at, 1); renderPhotos(); } return; }
    if (b.hasAttribute("data-flcam")) { flTap = +b.getAttribute("data-flcam"); $("flCam").click(); }
  });
  $("flushBox").addEventListener("input", function (e) { var el = e.target.closest("ion-input[data-fln]"); if (el) fl.taps[+el.getAttribute("data-fln")].note = el.value; });
  $("flOn").addEventListener("change", function () { fl.on = this.checked; renderFlush(); updateFormHint(); });
  function flushReport(w) {
    var F = cur.type.flush;
    return { points: !!F.points, ui: F.ui || "", summary: F.summary || null, statement: F.statement || null, podtytul: F.podtytul || "", etykieta: F.etykieta || "", col: F.col, groups: F.groups || null, strefy: F.strefy || null, wzorBasic: F.wzorBasic || "", building: F.building, title: F.title, year: w.getFullYear(), month: w.getMonth(), week: fl.week, date: w, noDate: !dateOn(), name: val("podpis"),
      taps: F.taps.map(function (n, i) { return { name: n, state: fl.taps[i].state, note: (fl.taps[i].note || "").trim() }; }) };
  }

  $("flWeek").addEventListener("change", function () { fl.week = +this.value; renderFlush(); updateFormHint(); });
  $("flList").addEventListener("change", function (e) { var el = e.target.closest("ion-select[data-fl]"); if (el) { fl.taps[+el.dataset.fl].state = el.value; renderFlush(); updateFormHint(); } });
