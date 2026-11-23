"use strict";
// i-zdjecia.js – dodawanie zdjęć i sugestie.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: rozmiary zdjęć są w moduly/zdjecia, nie tutaj.
  // ---------- zdjęcia ----------
  function addFiles(input, tap, sheet) {
    var files = Array.isArray(input) ? input : Array.prototype.slice.call(input.files || []); if (!Array.isArray(input)) input.value = "";
    if (!files.length) return;
    var tok = formSeq, ctx = copyCtx(); pendingPh++; updateFormHint();
    ctx.point = tap != null ? tapName(tap) : ""; // zdjęcie przy kranie / punkcie: nazwa punktu w folderze OEST
    ctx.kind = photoKind(tap, sheet);
    $("photoInfo").textContent = T("Zmniejszam…", "Reducing…");
    files.reduce(function (p, f) {
      return p.then(function () {
        return OESTZdjecia.exifDate(f).then(function (ex) {
          var when = ex || (f.lastModified && f.lastModified <= Date.now() + 60000 ? new Date(f.lastModified) : new Date());
          return storePhoto(f, when, ctx).then(function (ph) {
            if (tok !== formSeq) { URL.revokeObjectURL(ph.url); return; } // formularz zmienił się w trakcie: zdjęcie nie trafia do innego urządzenia
            ph.exif = !!ex; if (tap != null) ph.tap = tap;
            // zdjęcia formularza zawsze na końcu (ostatnie strony raportu), zwykłe przed nimi
            needOn(sheet ? "f" : tap != null ? "t" : "p");
            if (sheet) { ph.sheet = true; photos.push(ph); } else { var at = photos.findIndex(function (q) { return q.sheet; }); if (at < 0) photos.push(ph); else photos.splice(at, 0, ph); }
            renderPhotos(); suggestDate(); if (tap == null && !sheet) analyze(ph);
          });
        });
      });
    }, Promise.resolve()).then(function () {
      if (tok === formSeq) scheduleDraft();
      $("photoInfo").textContent = photos.length ? T("Zdjęć: ", "Photos: ") + photos.length + T(" · zapisane raz w folderze OEST.", " · saved once in the OEST folder.") : T("Zdjęcia są zmniejszane od razu po dodaniu.", "Photos are reduced straight after adding.");
    }).catch(function () { $("photoInfo").textContent = T("Nie udało się wczytać zdjęcia.", "Could not load the photo."); })
      .then(function () { if (tok === formSeq) { pendingPh--; updateFormHint(); } });
  }
  // Zdjęcie przez wspólny moduł aparatu (zdjęcie → podgląd OK / Edytuj / Powtórz); w przeglądarce zwykły wybór pliku
  $("camIn").addEventListener("click", function (e) {
    if (!(window.OESTAparat && OESTAparat.available())) return;
    e.preventDefault();
    OESTAparat.take(camOpts(photoKind(null, false))).then(function (b) { if (b) addFiles([new File([b], "zdjecie.jpg", { type: "image/jpeg", lastModified: Date.now() })]); }, function (er) { $("photoInfo").textContent = er.message; });
  });
  $("camIn").addEventListener("change", function () { addFiles(this); });
  $("galIn").addEventListener("change", function () { addFiles(this); });
  $("shCamIn").addEventListener("click", function (e) {
    if (!(window.OESTAparat && OESTAparat.available())) return;
    e.preventDefault();
    OESTAparat.take(camOpts(photoKind(null, true))).then(function (b) { if (b) addFiles([new File([b], "formularz.jpg", { type: "image/jpeg", lastModified: Date.now() })], null, true); }, function (er) { $("sheetInfo").textContent = er.message; });
  });
  $("shCamIn").addEventListener("change", function () { addFiles(this, null, true); });
  $("shGalIn").addEventListener("change", function () { addFiles(this, null, true); });
  function renderPhotos() {
    $("photos").innerHTML = ""; $("sheetPhotos").innerHTML = ""; if (cur.type) ppmTrack(false);
    photos.forEach(function (p, i) {
      if (p.tap != null) return; // zdjęcie kranu (Flushing): pokazane przy kranie
      var grid = p.sheet ? $("sheetPhotos") : $("photos");
      var d = document.createElement("div"); d.className = "thumb";
      d.innerHTML = '<img alt="' + T('Zdjęcie ', 'Photo ') + (i + 1) + '" src="' + p.url + '"><span class="n">' + (i + 1) + '</span><button type="button" aria-label="' + T('Usuń zdjęcie ', 'Delete photo ') + (i + 1) + '">×</button>' +
        (p.sugs || []).map(function (sg) { return sg.x != null ? '<span class="mk" style="left:' + (sg.x * 100) + "%;top:" + (sg.y * 100) + '%">' + sg.n + "</span>" : ""; }).join("");
      d.querySelector("button").addEventListener("click", function () { URL.revokeObjectURL(p.url); photos.splice(i, 1); renderPhotos(); suggestDate(); });
      if (window.OESTAparat && OESTAparat.available()) {
        var eb = document.createElement("button"); eb.type = "button"; eb.className = "ed"; eb.textContent = "✏️"; eb.setAttribute("aria-label", T("Edytuj zdjęcie ", "Edit photo ") + (i + 1));
        eb.addEventListener("click", function () {
          var tok = formSeq; pendingPh++; updateFormHint(); // zapis wstrzymany, dopóki poprawione zdjęcie nie wróci
          OESTAparat.edit(p.blob, camOpts()).then(function (nb) {
            if (!nb) return;
            var ectx = copyCtx(); ectx.point = p.tap != null ? tapName(p.tap) : ""; ectx.kind = photoKind(p.tap, p.sheet);
            ectx.stamp = false; // data i godzina (opcja w module zdjęć) wpisywana tylko przy zrobieniu zdjęcia – poprawione zdjęcie nie dostaje drugiej
            return storePhoto(nb, p.when, ectx).then(function (np) {
              var at = photos.indexOf(p);
              if (tok !== formSeq || at < 0) { URL.revokeObjectURL(np.url); return; } // formularz się zmienił: nie podmieniamy cudzego zdjęcia
              URL.revokeObjectURL(p.url); np.code = p.code; np.where = p.where; np.sugs = p.sugs; np.exif = p.exif; photos[at] = np; renderPhotos(); ppmTrack(false, true); // poprawione zdjęcie = zmiana
            });
          }).catch(function (e) { say(e.message); }).then(function () { if (tok === formSeq) { pendingPh--; updateFormHint(); } });
        });
        d.appendChild(eb);
      }
      grid.appendChild(d);
    });
    var shn = sheetPhotos().length, Z = window.OESTZnacznik, nd = typeof needsNow === "function" ? needsNow() : null, req = !!(nd && nd.f);
    var fst = shn ? "ok" : req ? "blad" : "";
    $("sheetState").innerHTML = Z && fst ? Z.formularz(fst) : "";
    // wymóg formularza widać na samym przycisku „Formularz” (Grzegorz 04/11) – bez dodatkowego okna, układ ten sam w każdej inspekcji
    var fb = $("shCamIn").closest("label"), fbd = fb.querySelector(".fbadge");
    if (!fbd) { fbd = document.createElement("span"); fbd.className = "fbadge"; fb.appendChild(fbd); }
    fbd.innerHTML = Z && fst ? Z.formularz(fst) : ""; fb.classList.toggle("req", fst === "blad");
    $("sheetInfo").textContent = shn ? T("Dodane: ", "Added: ") + shn + T(" — w raporcie na końcu.", " — at the end of the report.") : T("Zrób zdjęcie wypełnionego formularza (kartki). Idzie na koniec raportu.", "Take a photo of the filled-in paper form. It goes at the end of the report.");
    photoSizeShow();
    var fp = photos.filter(function (q) { return q.tap == null && !q.sheet; }).length; if (window.OESTZnacznik) $("photoCount").innerHTML = OESTZnacznik.licznik(fp, "accent inline"); else $("photoCount").textContent = fp ? "(" + fp + ")" : "";
    if (cur.type && cur.type.flush) renderFlush();
    if ($("sugBox").innerHTML) renderSugs();
    updateFormHint(); scheduleDraft();
  }
  // Data raportu: apka proponuje datę z pierwszego zdjęcia, dopóki nie zmienisz jej ręcznie
  function suggestDate() {
    var p = photos[0], box = $("dateSug");
    if (!p) { box.hidden = true; updateFormHint(); return; }
    var pd = NZ.dzienIso(p.when), today = NZ.dzienIso(new Date());
    if (!dateTouched) $("dzien").value = pd;
    box.hidden = false;
    box.innerHTML = "<span>" + (p.exif ? T("Zdjęcie zrobione ", "Photo taken ") : T("Plik zdjęcia z ", "Photo file from ")) + esc(NZ.data(p.when) + " " + NZ.godzina(p.when)) + ".</span>" +
      ($("dzien").value !== pd ? '<button class="btn" type="button" data-day="' + pd + '">Ustaw ' + esc(NZ.data(p.when)) + "</button>" : "") +
      ($("dzien").value !== today ? '<button class="btn" type="button" data-day="' + today + '">'+T('Ustaw dziś', 'Set today')+'</button>' : "");
    updateFormHint();
  }
  $("dateSug").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-day]"); if (!b) return;
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
    $("photoInfo").textContent = T("Sprawdzam zdjęcie…", "Checking the photo…");
    bitmap(ph.blob).then(function (img) {
      var c = document.createElement("canvas"); c.width = img.width; c.height = img.height; c.getContext("2d").drawImage(img, 0, 0); if (img.close) img.close();
      return window.INSP_ANALYZE(c, cur.type.id);
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
      $("photoInfo").textContent = ph.sugs.length ? T("Sprawdź sugestie pod zdjęciami.", "Check the suggestions under the photos.") : T("Na zdjęciu nic podejrzanego.", "Nothing suspicious in the photo.");
    }).catch(function () { $("photoInfo").textContent = T("Nie udało się sprawdzić zdjęcia — zaznacz ręcznie.", "Could not check the photo — mark it by hand."); });
  }
  function renderSugs() {
    var open = [];
    photos.forEach(function (p) { (p.sugs || []).forEach(function (sg) { if (sg.open) open.push(sg); }); });
    $("sugBox").hidden = !open.length;
    $("sugBox").innerHTML = open.map(function (sg) {
      var f = FAULTS.filter(function (x) { return x.id === sg.fault; })[0];
      return '<div class="sug"><div><span class="n">' + sg.n + "</span>" + esc(T(f.pl, f.enl)) + '?</div><div class="row">' +
        '<button class="btn" type="button" data-sg="' + sg.n + '" data-ok="1">'+T('Tak', 'Yes')+'</button><button class="btn" type="button" data-sg="' + sg.n + '" data-ok="0">'+T('Nie', 'No')+'</button></div></div>';
    }).join("");
  }
  $("sugBox").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-sg]"); if (!b) return;
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

  function loadImage(file) {
    function viaImg() { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = URL.createObjectURL(file); }); }
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return createImageBitmap(file); }).catch(viaImg);
    return viaImg();
  }
  // kopia do folderu OEST (moduł zdjęć: jakość z ustawień, limit, wysyłka na Dysk); błąd kopii nie blokuje inspekcji
  // kontekst zapamiętany przy wyborze zdjęć: przejście do innego urządzenia w trakcie nie zmienia opisu kopii
  function copyCtx() {
    var t = cur.type || {};
    return { source: "inspekcja", category: t.name || t.title || "Inspekcja", code: cur.mode === "sum" ? "" : cur.code, location: cur.where || cur.loc || "" };
  }
