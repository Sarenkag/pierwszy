"use strict";
  // ---------- Weekly Flushing (TA/TB/P): tydzień, formularz elektroniczny, lista kranów ----------
  var fl = { on: false, week: 0, open: {}, taps: [] };
  // zdjęcie wypełnionego formularza (osobny przycisk w inspekcji, Grzegorz 04/11) – w raporcie na końcu, po zdjęciach z inspekcji
  function sheetPhotos() { return photos.filter(function (p) { return p.sheet; }); }
  function tapPhotos(i) { return photos.filter(function (p) { return p.tap === i; }); }
  function genPhotos() { return photos.filter(function (p) { return p.tap == null && !p.sheet; }); } // zdjęcia ogólne (bez kranu / punktu, nie formularz)
  function recipientsFor(n) { return window.OESTSender && OESTSender.recipients ? OESTSender.recipients(n) : { list: cfg.email ? [cfg.email] : [], me: cfg.email }; }
  function renderFlush() {
    var F = cur.type && cur.type.flush;
    if (!F) { $("flList").innerHTML = ""; return; }
    if (fl.taps.length !== F.taps.length) fl = OESTFlush.start(F);
    $("flOn").checked = fl.on; $("flList").classList.toggle("off", !fl.on);
    // lista punktów (AOV): bez tygodnia, nagłówki grup (klapy), inne podpowiedzi
    $("flWeekL").hidden = $("flWeek").hidden = !!F.points;
    if (F.ui === "checks") { // lista potwierdzeń (Weekly Spa Checks, Weekly Generator Check): bez przycisków AOV; podpowiedź z konfiguracji typu
      $("flOnL").textContent = T("Lista sprawdzeń (z apki)", "Check list (in the app)");
      $("flHint").textContent = F.hint ? T(F.hint[0], F.hint[1]) : T("Zaznacz, co potwierdzasz (domyślnie Yes). Do raportu idzie lista i zdjęcia z plant roomów. Zdjęcie kartki nie jest wymagane – przycisk „Formularz” zostaje na zaś.", "Mark what you confirm (Yes by default). The report gets the list and the plant room photos. A form photo is not required – the “Form” button stays just in case.");
    } else {
    $("flOnL").textContent = F.points ? T("Lista przycisków (sprawdzenie z apki)", "Call point list (check in the app)") : T("Formularz elektroniczny", "Electronic form");
    $("flHint").textContent = F.points ? T("„Nasz raport” w ⚙ obok Wyślij wyłączony: do raportu idą tylko zdjęcia kartki. Włączony: w raporcie jest też tabela przycisków (Yes = klapy otworzyły się z tego przycisku i zamknęły po resecie) i zdjęcia przy przyciskach.", "“Our report” in ⚙ next to Send off: only photos of the paper form go to the report. On: the report also has a call point table (Yes = vents opened from this call point and closed after reset) and photos per call point.") :
      T("„Nasz raport” w ⚙ obok Wyślij wyłączony: do raportu idą tylko zdjęcia wypełnionych kartek. Włączony: idzie wypełniony formularz Word, zdjęcia kartek są dodatkiem.", "“Our report” in ⚙ next to Send off: only photos of the filled-in forms go to the report. On: the filled-in Word form goes, with form photos as an extra.");
    }
    var heads = {}, at = 0; (F.groups || []).forEach(function (g) { heads[at] = g.name; at += g.n; });
    $("flWeek").querySelectorAll("button").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-w") === fl.week); });
    $("flList").innerHTML = F.taps.map(function (name, i) {
      var t = fl.taps[i], pics = tapPhotos(i), odczyt = (F.odczyty || []).indexOf(name) >= 0, open = fl.open[i] || t.note || odczyt;
      return (heads[i] ? '<div class="fl-grp">' + esc(heads[i]) + "</div>" : "") + '<div class="fl-row ' + t.state + '"><div class="fl-line"><div class="txt">' + esc(F.etykieta ? name.replace(new RegExp(F.etykieta), "") : name) + '</div><div class="seg">' +
        [["yes", "Yes", "ok"], ["no", "No", "fail"], ["na", "N/A", "na"]].map(function (o) { return '<button type="button" data-fl="' + i + '" data-s="' + o[0] + '" class="' + o[2] + (t.state === o[0] ? " on" : "") + '">' + o[1] + "</button>"; }).join("") +
        '</div><button type="button" class="fl-ic" data-flcam="' + i + '" aria-label="' + T('Zdjęcie: ', 'Photo: ') + esc(name) + '">📷' + (pics.length ? "<b>" + pics.length + "</b>" : "") + '</button>' +
        '<button type="button" class="fl-ic" data-flnote="' + i + '" aria-label="' + T('Notatka: ', 'Note: ') + esc(name) + '">📝</button></div>' +
        (open ? '<input class="fl-note" type="text" data-fln="' + i + '" value="' + esc(t.note) + '" placeholder="' + (odczyt ? T('Odczyt', 'Reading') : T('Notatka (trafi do kolumny NOTES)', 'Note (goes to the NOTES column)')) + '"' + (odczyt ? ' inputmode="decimal"' : "") + '>' : "") +
        (pics.length ? '<div class="fl-pics">' + pics.map(function (p) { return '<span><img alt="" src="' + p.url + '"><button type="button" data-fldel="' + photos.indexOf(p) + '" aria-label="'+T('Usuń zdjęcie', 'Delete photo')+'">×</button></span>'; }).join("") + "</div>" : "") + "</div>";
    }).join("");
  }
  var flTap = null;
  $("flushBox").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-w")) { var w = +b.getAttribute("data-w"); fl.week = fl.week === w ? 0 : w; renderFlush(); updateFormHint(); return; }
    if (b.hasAttribute("data-fl")) { fl.taps[+b.getAttribute("data-fl")].state = b.getAttribute("data-s"); renderFlush(); updateFormHint(); return; }
    if (b.hasAttribute("data-flnote")) { var n = +b.getAttribute("data-flnote"); fl.open[n] = true; renderFlush(); var el = $("flList").querySelector('[data-fln="' + n + '"]'); if (el) el.focus(); return; }
    if (b.hasAttribute("data-fldel")) { var at = +b.getAttribute("data-fldel"), p = photos[at]; if (p) { URL.revokeObjectURL(p.url); photos.splice(at, 1); renderPhotos(); } return; }
    if (b.hasAttribute("data-flcam")) {
      var tap = +b.getAttribute("data-flcam");
      if (window.OESTAparat && OESTAparat.available()) {
        OESTAparat.take(camOpts(photoKind(tap, false))).then(function (bl) { if (bl) addFiles([new File([bl], "zdjecie.jpg", { type: "image/jpeg", lastModified: Date.now() })], tap); }, function (er) { $("flHint").textContent = er.message; });
      } else { flTap = tap; $("flCam").click(); }
    }
  });
  $("flCam").addEventListener("change", function () { var t = flTap; flTap = null; if (t != null) addFiles(this, t); });
  $("flushBox").addEventListener("input", function (e) { var el = e.target.closest("input[data-fln]"); if (el) fl.taps[+el.getAttribute("data-fln")].note = el.value; });
  $("flOn").addEventListener("change", function () { fl.on = this.checked; renderFlush(); updateFormHint(); });
  function flushReport(w) {
    var F = cur.type.flush;
    return { points: !!F.points, ui: F.ui || "", summary: F.summary || null, statement: F.statement || null, podtytul: F.podtytul || "", etykieta: F.etykieta || "", col: F.col, groups: F.groups || null, strefy: F.strefy || null, wzorBasic: F.wzorBasic || "", building: F.building, title: F.title, year: w.getFullYear(), month: w.getMonth(), week: fl.week, date: w, noDate: !dateOn(), name: val("podpis"),
      taps: F.taps.map(function (n, i) { return { name: n, state: fl.taps[i].state, note: (fl.taps[i].note || "").trim() }; }) };
  }
