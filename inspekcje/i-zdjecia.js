"use strict";
// i-zdjecia.js – dodawanie zdjęć i sugestie.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: rozmiary zdjęć są w moduly/zdjecia, nie tutaj.
  // ---------- zdjęcia ----------
  function addFiles(input, tap, sheet, zrodlo) {
    var files = Array.isArray(input) ? input : Array.prototype.slice.call(input.files || []); if (!Array.isArray(input)) input.value = "";
    if (!files.length) return;
    var tok = formSeq, ctx = copyCtx(); pendingPh++; updateFormHint();
    ctx.point = tap != null ? tapName(tap) : ""; // zdjęcie przy kranie / punkcie: nazwa punktu w folderze OEST
    ctx.kind = photoKind(tap, sheet);
    $("photoInfo").textContent = window.OESTT("Zmniejszam…", "Reducing…");
    files.reduce(function (p, f) {
      return p.then(function () {
        return OESTZdjecia.exifDate(f).then(function (ex) {
          var when = ex || (f.lastModified && f.lastModified <= Date.now() + 60000 ? new Date(f.lastModified) : new Date());
          return storePhoto(f, when, ctx).then(function (ph) {
            if (tok !== formSeq) { URL.revokeObjectURL(ph.url); return; } // formularz zmienił się w trakcie: zdjęcie nie trafia do innego urządzenia
            ph.exif = !!ex; if (tap != null) ph.tap = tap; if (zrodlo) ph.zrodlo = zrodlo; // „camIn” / „galIn”: który kafelek świeci na zielono
            // zdjęcia formularza zawsze na końcu (ostatnie strony raportu), zwykłe przed nimi
            needOn(sheet ? "f" : tap != null ? "t" : "p");
            if (sheet) { ph.sheet = true; photos.push(ph); } else { var at = photos.findIndex(function (q) { return q.sheet; }); if (at < 0) photos.push(ph); else photos.splice(at, 0, ph); }
            renderPhotos(); suggestDate(); if (tap == null && !sheet) analyze(ph);
          });
        });
      });
    }, Promise.resolve()).then(function () {
      if (tok === formSeq) scheduleDraft();
      $("photoInfo").textContent = photos.length ? window.OESTT("Zdjęć: ", "Photos: ") + photos.length + window.OESTT(" · zapisane raz w folderze OEST.", " · saved once in the OEST folder.") : window.OESTT("Zdjęcia są zmniejszane od razu po dodaniu.", "Photos are reduced straight after adding.");
    }).catch(function () { $("photoInfo").textContent = window.OESTT("Nie udało się wczytać zdjęcia.", "Could not load the photo."); })
      .then(function () { if (tok === formSeq) { pendingPh--; updateFormHint(); } });
  }
  // Jeden wybór zdjęć w DodajZdjecie.vue; tu wyłącznie kontekst i zapis istniejącą ścieżką.
  document.addEventListener("oest:wybor-zdjec", function (e) {
    var id = e.target.id;
    if (["camIn", "galIn", "shCamIn", "flCam"].indexOf(id) < 0) return;
    var sheet = id === "shCamIn", tap = id === "flCam" ? flTap : null;
    e.detail.seq = formSeq; e.detail.tap = tap; e.detail.sheet = sheet; e.detail.zrodlo = id;
    e.detail.opcje = camOpts(photoKind(tap, sheet));
  });
  document.addEventListener("oest:zdjecia", function (e) {
    var c = e.detail.kontekst;
    if (c.seq !== formSeq) return;
    addFiles(e.detail.lista, c.tap, c.sheet, c.zrodlo);
  });
  document.addEventListener("oest:blad-zdjec", function (e) {
    if (e.detail.kontekst.seq !== formSeq) return;
    $(e.detail.kontekst.sheet ? "sheetInfo" : "photoInfo").textContent = e.detail.blad.message;
  });
  function renderPhotos() {
    if (cur.type) ppmTrack(false);
    function akcja(nazwa, i) {
      var p = photos[i]; if (!p) return;
      if (nazwa === "usun") { URL.revokeObjectURL(p.url); photos.splice(i, 1); renderPhotos(); suggestDate(); return; }
      if (nazwa === "edytuj") {
          var tok = formSeq; pendingPh++; updateFormHint(); // zapis wstrzymany, dopóki poprawione zdjęcie nie wróci
          OESTAparat.edit(p.blob, camOpts()).then(function (nb) {
            if (!nb) return;
            var ectx = copyCtx(); ectx.point = p.tap != null ? tapName(p.tap) : ""; ectx.kind = photoKind(p.tap, p.sheet);
            return storePhoto(nb, p.when, ectx).then(function (np) {
              var at = photos.indexOf(p);
              if (tok !== formSeq || at < 0) { URL.revokeObjectURL(np.url); return; } // formularz się zmienił: nie podmieniamy cudzego zdjęcia
              URL.revokeObjectURL(p.url); np.code = p.code; np.where = p.where; np.sugs = p.sugs; np.exif = p.exif; np.zrodlo = p.zrodlo; photos[at] = np; renderPhotos(); ppmTrack(false, true); // poprawione zdjęcie = zmiana
            });
          }).catch(function (e) { say(e.message); }).then(function () { if (tok === formSeq) { pendingPh--; updateFormHint(); } });
      }
    }
    [false, true].forEach(function (sheet) {
      widokInspekcji(sheet ? "sheetPhotos" : "photos", "fragment", { rodzaj: "zdjecia", edycja: !!(window.OESTAparat && OESTAparat.available()), lista: photos.map(function (p, i) {
        return { i: i, sheet: !!p.sheet, tap: p.tap, url: p.url, sugestie: p.sugs || [], alt: window.OESTT("Zdjęcie ", "Photo ") + (i + 1) };
      }).filter(function (p) { return p.tap == null && p.sheet === sheet; }) }, akcja);
    });
    var shn = sheetPhotos().length, Z = window.OESTZnacznik, nd = typeof needsNow === "function" ? needsNow() : null, req = !!(nd && nd.f);
    var fst = shn ? "ok" : req ? "blad" : "";
    widokInspekcji("sheetState", "fragment", { rodzaj: "znacznik", html: Z && fst ? Z.formularz(fst) : "" });
    // wymóg formularza widać na samym przycisku „Formularz” (Grzegorz 04/11) – bez dodatkowego okna, układ ten sam w każdej inspekcji
    var fb = $("shCamIn"); // sama czerwona ramka, bez ⊗ (Grzegorz 25.11.2026)
    if (fst === "blad") fb.dataset.alarm = ""; else delete fb.dataset.alarm; // czerwona ramka kafelka (czesci/KafelZdjecia.vue)
    $("sheetInfo").textContent = shn ? window.OESTT("Dodane: ", "Added: ") + shn + window.OESTT(" — w raporcie na końcu.", " — at the end of the report.") : window.OESTT("Zrób zdjęcie wypełnionego formularza (kartki). Idzie na koniec raportu.", "Take a photo of the filled-in paper form. It goes at the end of the report.");
    photoSizeShow();
    var ogolne = photos.filter(function (q) { return q.tap == null && !q.sheet; }), fp = ogolne.length;
    var zGal = ogolne.some(function (q) { return q.zrodlo === "galIn"; }), zCam = ogolne.some(function (q) { return q.zrodlo === "camIn"; });
    // zielona ramka kafelka tylko za jego własne zdjęcia (Grzegorz 25.11.2026): Z galerii → z galerii, Zrób zdjęcie → z aparatu, Formularz → zdjęcie formularza
    [[$("galIn"), zGal], [$("camIn"), zCam], [fb, shn]].forEach(function (k) { if (k[1]) k[0].dataset.ok = ""; else delete k[0].dataset.ok; });
    widokInspekcji("photoCount", "fragment", { rodzaj: "znacznik", html: window.OESTZnacznik ? OESTZnacznik.licznik(fp, "accent inline") : fp ? "(" + fp + ")" : "" });
    if (cur.type && cur.type.flush) renderFlush();
    if ($("sugBox").__inspKontroler && $("sugBox").__inspKontroler.stan.lista.length) renderSugs();
    updateFormHint(); scheduleDraft();
  }
  // Data raportu: apka proponuje datę z pierwszego zdjęcia, dopóki nie zmienisz jej ręcznie
  function suggestDate() {
    var p = photos[0], box = $("dateSug");
    if (!p) { box.hidden = true; updateFormHint(); return; }
    var pd = NZ.dzienIso(p.when), today = NZ.dzienIso(new Date());
    if (!dateTouched) $("dzien").value = pd;
    box.hidden = false;
    var przyciski = [];
    if ($("dzien").value !== pd) przyciski.push({ dzien: pd, tekst: "Ustaw " + NZ.data(p.when) });
    if ($("dzien").value !== today) przyciski.push({ dzien: today, tekst: window.OESTT("Ustaw dziś", "Set today") });
    widokInspekcji(box, "fragment", { rodzaj: "data", tekst: (p.exif ? window.OESTT("Zdjęcie zrobione ", "Photo taken ") : window.OESTT("Plik zdjęcia z ", "Photo file from ")) + NZ.data(p.when) + " " + NZ.godzina(p.when) + ".", przyciski: przyciski });
    updateFormHint();
  }
  $("dateSug").addEventListener("click", function (e) {
    var b = e.target.closest("ion-button[data-day]"); if (!b) return;
    $("dzien").value = b.getAttribute("data-day"); dateTouched = true; suggestDate();
  });
  $("dzien").addEventListener("change", function () { dateTouched = true; suggestDate(); });
  // ---------- sugestie ze zdjęcia (miejsce na model; bez modelu nic się nie pokazuje) ----------
  // Model podpina się jako window.INSP_ANALYZE(canvas, typId) → Promise<[{ fault: "enclosure", x: 0..1, y: 0..1 }]>; fault = id usterki albo key pytania (izolatory).
  // Każda sugestia czeka na Twoje Tak/Nie; do raportu trafia tylko to, co potwierdzisz.
  var sugN = 0;
  function analyze(ph) {
    if (typeof window.INSP_ANALYZE !== "function") return;
    var ask = !!cur.type.ask, code = cur.code;
    var ids = ask ? [].concat.apply([], cur.type.checks.map(function (c) { return [c.key].concat((c.reasons || []).map(function (r) { return r.id; })); })) : RD.usterkiDla(cur.type).map(function (f) { return f.id; });
    function qOf(id) { for (var i = 0; i < cur.type.checks.length; i++) { var c = cur.type.checks[i]; if (c.key === id || (c.reasons || []).some(function (r) { return r.id === id; })) return i; } return -1; }
    $("photoInfo").textContent = window.OESTT("Sprawdzam zdjęcie…", "Checking the photo…");
    bitmap(ph.blob).then(function (img) {
      return window.INSP_ANALYZE(Zd.plotno(img, 0), cur.type.id); // pełny rozmiar, płótno z modułu zdjęć
    }).then(function (list) {
      if (cur.code !== code) return;
      ph.sugs = (list || []).filter(function (sg) { return ids.indexOf(sg.fault) >= 0 && (ask ? states[qOf(sg.fault)] !== "fail" : !faultsOn[sg.fault]); })
        .map(function (sg) { return { fault: sg.fault, x: sg.x, y: sg.y, n: ++sugN, open: !ask }; });
      // podpowiedź: pytanie na górę z numerem, powód wstępnie zaznaczony; liczy się dopiero Twoje TAK/NIE
      if (ask) ph.sugs.forEach(function (sg) {
        var i = qOf(sg.fault); states[i] = "sus"; susN[i] = susN[i] || sg.n;
        if (sg.fault !== cur.type.checks[i].key) { rsel[i] = rsel[i] || []; if (rsel[i].indexOf(sg.fault) < 0) rsel[i].push(sg.fault); }
      });
      renderPhotos(); renderSugs(); renderChecks(); updateFormHint();
      $("photoInfo").textContent = ph.sugs.length ? window.OESTT("Sprawdź sugestie pod zdjęciami.", "Check the suggestions under the photos.") : window.OESTT("Na zdjęciu nic podejrzanego.", "Nothing suspicious in the photo.");
    }).catch(function () { $("photoInfo").textContent = window.OESTT("Nie udało się sprawdzić zdjęcia — zaznacz ręcznie.", "Could not check the photo — mark it by hand."); });
  }
  function renderSugs() {
    var open = [];
    photos.forEach(function (p) { (p.sugs || []).forEach(function (sg) { if (sg.open) open.push(sg); }); });
    $("sugBox").hidden = !open.length;
    widokInspekcji("sugBox", "fragment", { rodzaj: "sugestie", lista: open.map(function (sg) {
      var f = FAULTS.filter(function (x) { return x.id === sg.fault; })[0];
      return { n: sg.n, tekst: window.OESTT(f.pl, f.enl) };
    }) });
  }
  $("sugBox").addEventListener("click", function (e) {
    var b = e.target.closest("ion-button[data-sg]"); if (!b) return;
    var n = +b.getAttribute("data-sg");
    photos.forEach(function (p) {
      (p.sugs || []).forEach(function (sg) {
        if (sg.n !== n) return;
        sg.open = false;
        if (b.getAttribute("data-ok") === "1") setFault(sg.fault, true);
        else p.sugs = p.sugs.filter(function (x) { return x !== sg; }); // odrzucone: znika też kropka
      });
    });
    renderPhotos(); renderSugs();
  });

  // kopia do folderu OEST (moduł zdjęć: jakość z ustawień, limit, wysyłka na Dysk); błąd kopii nie blokuje inspekcji
  // kontekst zapamiętany przy wyborze zdjęć: przejście do innego urządzenia w trakcie nie zmienia opisu kopii
  function copyCtx() {
    var t = cur.type || {};
    return { source: "inspekcja", category: t.name || t.title || "Inspekcja", code: cur.mode === "sum" ? "" : cur.code, location: cur.where || cur.loc || "" };
  }
