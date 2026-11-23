"use strict";
// i-zapis-zdjec.js – jeden zapis zdjęcia w module zdjęć.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: zasady jednego zapisu.
  // ---------- jeden zapis zdjęcia (Grzegorz 04/11/2026: „wystarczy, że się raz zapisze”) ----------
  // Zdjęcie zapisuje się RAZ w module zdjęć (folder OEST, z nazwą kranu / punktu, trzymane przez inspekcję, więc sprzątanie
  // go nie skasuje). Szkic, zlecenie i raport mają tylko jego id. W pamięci jest mała miniatura, duże zdjęcie czyta się z pliku
  // dopiero do raportu i modelu (wcześniej każde zdjęcie trzymało ok. 11 MB pamięci, przy Flushing TB setki MB).
  // aparat / edytor: zdjęcie od razu w największym rozmiarze, jaki moduł zdjęć zapisze (bez JPEG 12 MP po edycji)
  // kind podany = zdjęcie z aparatu zmniejsza się w tle już w czasie podglądu (OESTZdjecia.prepare), zapis po „OK” bierze gotowy wynik
  function camOpts(kind) { var Z = window.OESTZdjecia; return { max: Z && Z.maxPx ? Z.maxPx(kind) : 0, prepare: kind && Z && Z.prepare ? function (b) { Z.prepare(b, kind); } : null }; }
  var Zd = window.OESTZdjecia, HOLD = "inspekcja", THUMB_PX = 400, thumbQ = Promise.resolve();
  // Rozmiar zdjęć ogólnych (Duże / Średnie / Małe) – przełącznik z modułu zdjęć (jeden dla całej apki)
  if ($("photoSize") && Zd && Zd.sizeSwitch) $("photoSize").innerHTML = Zd.sizeSwitch();
  // przełącznik rozmiaru tylko tam, gdzie są zdjęcia ogólne (w formularzach papierowych przyciski dodają kartki – zawsze 1920)
  function photoSizeShow() { var b = $("photoSize"); if (b) b.classList.toggle("off", photoKind(null, false) !== "ogolne"); }
  // rodzaj = rozmiar zapisu (moduł zdjęć): formularz 1920 px (cała strona A4), ogólne 1600 px, przy pytaniu / kranie 1280 px.
  // Inspekcja „z kartki” (folder bez listy kranów): każde jej zdjęcie to strona formularza.
  // Krany / punkty Flushingu i AOV oraz izolatory: zdjęcie tylko na dowód wykonania (Grzegorz 05/11) → 960 px, jak w raporcie.
  function photoKind(tap, sheet) {
    if (sheet || (cur.type && cur.type.folder && !cur.type.flush && tap == null)) return "formularz";
    if (tap != null || (cur.type && cur.type.batch)) return "dowod";
    return "ogolne";
  }
  function tapName(tap) { var F = cur.type && cur.type.flush, x = F && F.taps[tap]; return x ? (x.name != null ? x.name : String(x)) : ""; }
  function savedPhoto(p) { return { zid: p.zid || undefined, blob: p.zid ? undefined : p.blob, width: p.width, height: p.height, when: p.when, exif: p.exif, tap: p.tap, sheet: p.sheet || undefined }; }
  function bitmap(blob) { return loadImage(blob); } // ten sam odczyt co przy dodawaniu (także zapas przez <img> bez createImageBitmap)
  // miniatury po kolei (jedno duże zdjęcie naraz w pamięci); przy błędzie podgląd z samego pliku
  function thumbUrl(blob) {
    var job = thumbQ.then(function () {
      return bitmap(blob).then(function (img) {
        var k = Math.min(1, THUMB_PX / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); if (img.close) img.close();
        return new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.8); });
      }).then(function (tb) { return URL.createObjectURL(tb || blob); }, function () { return URL.createObjectURL(blob); });
    });
    thumbQ = job.catch(function () {});
    return job;
  }
  function makePhoto(blob, o, thumb) { return (thumb ? Promise.resolve(URL.createObjectURL(thumb)) : thumbUrl(blob)).then(function (url) { return Object.assign({ blob: blob, url: url }, o); }); }
  function storePhoto(file, when, ctx) {
    if (!Zd) return processPhoto(file, when);
    return Zd.save(file, Object.assign({}, ctx, { when: when, hold: HOLD })).then(function (r) {
      return makePhoto(r.blob, { zid: r.id, width: r.width, height: r.height, when: when }, r.thumb);
    }, function () { return processPhoto(file, when); }); // folder OEST nie przyjął zdjęcia (np. brak miejsca): zostaje w samej inspekcji
  }
  // zapas bez modułu zdjęć: własna kopia w szkicu (jak przed 05/11)
  function processPhoto(file, when) {
    return loadImage(file).then(function (img) {
      var w = img.width, h = img.height, MAX = 1920;
      var s = Math.min(1, MAX / Math.max(w, h)); w = Math.round(w * s); h = Math.round(h * s);
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      if (img.close) img.close();
      return new Promise(function (res) { c.toBlob(res, "image/jpeg", 0.72); }).then(function (blob) {
        return makePhoto(blob, { width: w, height: h, when: when });
      });
    });
  }
  // zdjęcia, których żadna zapisana inspekcja już nie używa (usunięte z inspekcji, wyczyszczony szkic), po 30 dniach
  // od wyczyszczenia (Grzegorz 08/11/2026: „niech trzyma przez miesiąc”; liczone od chwili, gdy zniknęły z inspekcji) przestają być trzymane: zostają w folderze OEST i podlegają zwykłemu limitowi (najpierw muszą być na Dysku)
  function releaseUnused() {
    if (!Zd || !Zd.release) return;
    bazaJest().then(function (jest) {
      if (!jest) return; // bez bazy nie wiemy, co jest w szkicach: nic nie zwalniamy
      // odzyskane inspekcje (klocek Raporty) trzymają swoje zdjęcia także przed pierwszym otwarciem (uwaga Codex #101)
      var R = window.OESTRaporty, rec = R && R.recovered ? R.recovered().then(function (rs) { return rs.map(function (r) { return r.snap; }); }, function () { return null; }) : Promise.resolve([]);
      return Promise.all([kvAll(), rec]).then(function (all) {
        if (all[1] === null) return; // nie odczytano archiwum: nic nie zwalniamy
        var vals = [all[0], all[1]], ids = new Set();
        (function walk(v, depth) {
          if (!v || typeof v !== "object" || depth > 8 || v instanceof Blob || ArrayBuffer.isView(v) || v instanceof ArrayBuffer) return;
          if (typeof v.zid === "string") ids.add(v.zid);
          Object.keys(v).forEach(function (k) { walk(v[k], depth + 1); });
        })(vals, 0);
        return Zd.release(HOLD, ids, 30 * 864e5);
      });
    }).catch(function () {});
  }
  setTimeout(releaseUnused, 15000);
  // Zdjęcie do raportu (jedno miejsce dla wszystkich inspekcji): ok. 25 KB na zdjęcie (Grzegorz 04/11: dwa razy izolatory z 28/10),
  // żeby raport z kilkunastoma zdjęciami był mały i przechodził przez Gmaila (Flushing TB 04/11: 13 zdjęć ≈ 10 MB nie przeszło).
  // zdjęcie kartki formularza idzie na całą stronę → więcej pikseli, żeby dało się przeczytać pismo
  // Rozmiar zdjęcia w siatce wg rodzaju inspekcji (Grzegorz 04/11): zwykłe (izolatory itd.) ok. 25 KB, Flushing ok. 60 KB.
  // Zdjęcia w raporcie (Grzegorz 05/11/2026 08:09): raport Word i PDF poniżej 1 MB. Przy pytaniach / kranach / izolatorach
  // (12 na stronę, ok. 4,5 cm) 480 px ≈ 270 dpi, ok. 10–20 KB. Ogólne na pół A4 1000 px, ok. 45–70 KB. Kartka formularza 1600 px (czytelna).
  var REPORT_SIZE = { zwykla: { px: 480, q: 0.55 }, flush: { px: 480, q: 0.55 } }, SHEET_PX = 1600, SHEET_Q = 0.7;
  var HALF_PX = 1000, HALF_Q = 0.6; // zdjęcie ogólne na pół strony A4: bez rozciągania
  function reportSize() { return (cur.type && cur.type.flush) ? REPORT_SIZE.flush : REPORT_SIZE.zwykla; }
  // Raport ponad 1 MB (Grzegorz 05/11/2026 08:20): przed wysłaniem pytamy, czy zmniejszyć zdjęcia, czy zostawić.
  // „Zmniejsz” = mniejsze zdjęcia TYLKO w tym raporcie (kartka formularza bez zmian, zdjęcia w folderze bez zmian).
  var REPORT_LIMIT = 1024 * 1024, reportShrink = 1;
  function bigFile(r) { return (r && r.files || []).reduce(function (m, f) { return f.bytes && f.bytes.length > m ? f.bytes.length : m; }, 0); }
  function mb1(n) { return (n / 1048576).toFixed(1).replace(".", window.OESTT(",", ".")); }
  async function fitReport(r, rebuild) {
    var big = bigFile(r); if (big < REPORT_LIMIT) return r;
    var yes = window.OESTPrzycisk && OESTPrzycisk.confirm ? await OESTPrzycisk.confirm(
      window.OESTT("Plik raportu będzie miał " + mb1(big) + " MB (limit 1 MB). Zmniejszyć zdjęcia w raporcie, czy zostawić je tak, jak są?",
        "The report file will be " + mb1(big) + " MB (limit 1 MB). Make the photos in the report smaller, or keep them as they are?"),
      { ok: window.OESTT("Zmniejsz zdjęcia", "Make smaller"), cancel: window.OESTT("Zostaw tak", "Keep as is"), danger: false }) : false;
    if (!yes) return r;
    try {
      for (var i = 0; i < 4 && big >= REPORT_LIMIT; i++) {
        reportShrink = Math.max(0.35, reportShrink * Math.sqrt(REPORT_LIMIT * 0.9 / big));
        if (r === built) freeBuilt(); else (r.pics || []).forEach(function (p) { if (p.url) URL.revokeObjectURL(p.url); });
        r = await rebuild(); big = bigFile(r);
      }
    } finally { reportShrink = 1; }
    return r;
  }
  // Zdjęcie do raportu zmniejszane RAZ (audyt wydajności 07/11/2026): wynik zapamiętany przy samym zdjęciu (WeakMap po blobie),
  // więc Podgląd → Wyślij, „Zmniejsz zdjęcia” i ponowne budowanie nie liczą go od nowa. Klucz = wszystko, od czego zależy wynik
  // (rozmiar, jakość, stempel); inne ustawienie = nowe zmniejszenie. Usunięte / poprawione zdjęcie = inny blob, stary wynik znika sam.
  var finalCache = typeof WeakMap === "function" ? new WeakMap() : null;
  function finalOpts(p, d) {
    var general = !p.sheet && p.tap == null && !p.code && !p.small, rs = general ? { px: HALF_PX, q: HALF_Q } : reportSize();
    var px = p.sheet ? SHEET_PX : Math.round(rs.px * reportShrink), q = p.sheet ? SHEET_Q : rs.q;
    var stamp = cfg.stamp ? NZ.data(p.when) + " " + NZ.godzina(p.when) + " · " + (p.code || d.urzadzenie) + " · " + (p.where || d.lokalizacja) : "";
    return { px: px, q: q, stamp: stamp, key: px + "|" + q + "|" + stamp };
  }
  function finalPhoto(p, d) {
    var o = finalOpts(p, d), byKey = finalCache && p.blob && typeof p.blob === "object" ? finalCache.get(p.blob) : null, hit = byKey && byKey[o.key];
    if (!hit) {
      hit = bitmap(p.blob).then(function (src) { return finalFrom(src, o); });
      if (finalCache && p.blob && typeof p.blob === "object") { if (!byKey) { byKey = {}; finalCache.set(p.blob, byKey); } byKey[o.key] = hit; hit.catch(function () { delete byKey[o.key]; }); }
    }
    // każdy raport dostaje własny adres podglądu (freeBuilt go zwalnia), bajty JPEG są wspólne
    return hit.then(function (r) { return { bytes: r.bytes, width: r.width, height: r.height, url: URL.createObjectURL(r.blob) }; });
  }
  // zdjęcia raportu po kilka naraz (kolejność zachowana); 3 naraz = ok. 3 zdekodowane zdjęcia w pamięci
  function mapLimit(list, n, fn) {
    var out = new Array(list.length), i = 0;
    function next() { if (i >= list.length) return Promise.resolve(); var at = i++; return fn(list[at]).then(function (r) { out[at] = r; return next(); }); }
    var run = []; for (var k = 0; k < Math.min(n, list.length); k++) run.push(next());
    return Promise.all(run).then(function () { return out; });
  }
  function finalFrom(src, o) {
    var k = Math.min(1, o.px / Math.max(src.width, src.height)), w = Math.round(src.width * k), h = Math.round(src.height * k);
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var g = c.getContext("2d"); g.drawImage(src, 0, 0, w, h); if (src.close) src.close();
    if (o.stamp) {
      var txt = o.stamp;
      var fs = Math.max(16, Math.round(w / 40));
      g.font = "600 " + fs + "px Barlow, system-ui, sans-serif";
      var tw = Math.min(g.measureText(txt).width, w - fs * 2.2), pw = tw + fs, ph = fs * 1.8;
      g.fillStyle = "rgba(10,16,20,0.62)"; g.fillRect(w - pw - fs * 0.6, h - ph - fs * 0.6, pw, ph);
      g.fillStyle = "#ffffff"; g.textBaseline = "middle"; g.fillText(txt, w - pw - fs * 0.1, h - ph / 2 - fs * 0.6, tw);
    }
    return new Promise(function (res) { c.toBlob(res, "image/jpeg", o.q); }).then(function (blob) {
      return blob.arrayBuffer().then(function (buf) { return { bytes: new Uint8Array(buf), width: w, height: h, blob: blob }; });
    });
  }
  // kółko „trwa zapis” na środku ekranu: zdjęcie się zmniejsza / zapisuje albo wczytuje się szkic (Grzegorz 03/11)
  // okienka apki zamiast systemowych (moduly/przycisk): rosną z miejsca stuknięcia, Wstecz = Anuluj (Grzegorz 04/11)
  function ask(t) { return window.OESTPytaj ? OESTPytaj(t) : Promise.resolve(window.confirm(t)); }
  function say(t) { if (window.OESTKomunikat) OESTKomunikat(t); else window.alert(t); }
  function busySpin(on) {
    // jedno kółko w całej apce (moduly/ladowanie); stare #busySpin tylko jako zapas
    if (window.OESTLadowanie) { if (on) { if (!busySpin.on) OESTLadowanie.show(window.OESTT('Zapisuję…', 'Saving…')); } else if (busySpin.on) OESTLadowanie.hide(); busySpin.on = !!on; return; }
    var el = $("busySpin");
    if (!el) { el = document.createElement("div"); el.id = "busySpin"; el.setAttribute("role", "status"); el.innerHTML = '<span class="ring"></span><b>'+window.OESTT('Zapisuję…', 'Saving…')+'</b>'; document.body.appendChild(el); }
    el.classList.toggle("on", !!on);
  }
  function updateFormHint() { updateFormHint0(); syncFinish(); OESTVantifyKlocek.render(); var u = $("recUpdate"); if (u && REC && !queueing) u.disabled = $("toQueue").disabled || !!restoring || pendingPh > 0; } // Update czeka na zdjęcia tak samo jak Wyślij (uwaga Codex #101)
  // „Zakończ” (Grzegorz 03/11 12:12): osobny od „Wyślij”; dostępny wtedy, gdy da się wysłać raport
  function syncFinish() {
    var f = $("finishIns"), q = $("toQueue"); if (!f || !q) return;
    var st = cur.ppm && PPM && PPM.stage ? PPM.stage(cur.ppm) : null;
    var ready = !!(st && (st.s === "queued" || st.s === "sent" || st.s === "done"));
    f.classList.toggle("ready", ready); f.disabled = false; // Gotowa: dotknięcie zdejmuje znacznik (Grzegorz 05/11)
    f.title = ready ? window.OESTT("Dotknij, aby zdjąć znacznik Gotowa", "Tap to remove the Ready flag") : "";
    if (ready) { f.textContent = window.OESTT("✓ GOTOWA ", "✓ READY ") + NZ.data(new Date(st.at || Date.now())); return; }
    f.textContent = window.OESTT("✓ Zakończ inspekcję", "✓ Finish inspection");
  }
  function updateFormHint0() {
    busySpin(pendingPh > 0 || !!restoring || (draftT && draftOn));
    var h = [];
    $("toQueue").classList.remove("compact");
    if (cur.type && cur.type.temp) {
      var filled = temps.filter(function (v) { return tempNum(v) !== null; }).length, bad = temps.filter(function (v) { return String(v).trim() && tempNum(v) === null; }).length;
      var outN = cur.type.slots.filter(function (s, i) { return tempBad(s[1], temps[i]); }).length;
      var tx = function () { return window.OESTT("Wpisano ", "Filled in ") + filled + "/" + temps.length + "." + (bad ? window.OESTT(" Popraw ", " Fix ") + bad + window.OESTT(" pole (tylko liczba).", " field(s) (number only).") : "") +
        (outN ? window.OESTT(" Poza zakresem: ", " Out of range: ") + outN + window.OESTT(" — wpis do Fault and Remedial Actions Log.", " — record in the Fault and Remedial Actions Log.") : "") + (filled < temps.length ? window.OESTT(" Puste pola zostaną puste w raporcie.", " Empty fields will stay empty in the report.") : ""); };
      $("formHint").textContent = tx();
      if (window.OESTPodmien && window.OESTBledy && OESTBledy.wJezyku) OESTPodmien.miejsce($("formHint"), OESTBledy.wJezyku(OESTBledy.drugi(), tx)); // PL i EN w tym samym miejscu
      var blk = !filled || bad > 0;
      $("toPreview").disabled = blk; $("toQueue").disabled = blk;
      $("toQueue").textContent = window.OESTT("Wyślij · ", "Send · ") + NZ.data(reportDate()); return;
    }
    if (cur.type && cur.type.flush && fl.on) {
      var cnt = { yes: 0, no: 0, na: 0 }; fl.taps.forEach(function (t) { cnt[t.state]++; });
      var pts = !!cur.type.flush.points, fpn = sheetPhotos().length, fbk = !!restoring || pendingPh > 0 || (!pts && !fl.week);
      $("formHint").textContent = pendingPh ? window.OESTT("Zmniejszam zdjęcie…", "Reducing the photo…") : !pts && !fl.week ? window.OESTT("Wybierz tydzień miesiąca (1–5) — tak jak na formularzu.", "Choose the week of the month (1–5) — as on the form.") :
        (pts ? (cur.type.flush.ui === "checks" ? window.OESTT("Punkty: ", "Checks: ") : window.OESTT("Przyciski: ", "Call points: ")) : window.OESTT("Formularz: ", "Form: ")) + cnt.yes + " Yes" + (cnt.no ? ", " + cnt.no + " No" : "") + (cnt.na ? ", " + cnt.na + " N/A" : "") + (pts ? "" : window.OESTT(" · tydzień ", " · week ") + fl.week) + (fpn ? window.OESTT(" · zdjęć kartek: ", " · form photos: ") + fpn : "") + (cnt.no ? " — wpis do Fault and Remedial Actions Log." : "");
      $("toPreview").disabled = fbk; $("toQueue").disabled = fbk;
      $("toQueue").textContent = window.OESTT("Wyślij · ", "Send · ") + NZ.data(reportDate()); return;
    }
    if (cur.type && cur.type.folder) {
      var none = !sheetPhotos().length;
      $("formHint").textContent = pendingPh ? window.OESTT("Zmniejszam zdjęcie…", "Reducing the photo…") : none ? window.OESTT("Zrób zdjęcie wypełnionej kartki (może być kilka) — każde będzie osobną stroną PDF.", "Take a photo of the filled-in form (can be several) — each becomes a separate PDF page.") : window.OESTT("Zdjęć: ", "Photos: ") + photos.filter(function (p) { return p.tap == null; }).length + window.OESTT(" → jeden PDF, strona na zdjęcie.", " → one PDF, a page per photo.");
      var fb = !!restoring || pendingPh > 0; // bez zdjęć przycisk otwiera aparat (nie jest martwy)
      $("toPreview").disabled = fb || none; $("toQueue").disabled = fb;
      $("toQueue").textContent = none ? window.OESTT("Dodaj zdjęcie formularza", "Add form photo") : window.OESTT("Wyślij · ", "Send · ") + NZ.data(reportDate());
      $("toQueue").classList.toggle("compact", none); return; // przed zdjęciem zgrabny przycisk, nie wielki (Grzegorz 03/11)
    }
    if (cur.mode === "item") {
      var sus = states.indexOf("sus") >= 0;
      $("formHint").textContent = sus ? window.OESTT("Odpowiedz na pytania z numerem — zdjęcie sugeruje problem.", "Answer the numbered questions — the photo suggests a problem.") : window.OESTT("Zdjęcie nieobowiązkowe. Zapis zostaje w telefonie do zakończenia zlecenia.", "Photo optional. The save stays on the phone until the job is finished.");
      if (pendingPh) $("formHint").textContent = window.OESTT("Zmniejszam zdjęcie…", "Reducing the photo…");
      $("saveItem").disabled = sus || !!restoring || pendingPh > 0;
      $("saveItem").textContent = (failCount() ? window.OESTT("Zapisz ", "Save ") : window.OESTT("Wszystko OK · ", "All OK · ")) + cur.code + window.OESTT(" → następny", " → next"); return;
    }
    if (restoring) h.push(window.OESTT("Wczytuję zapisane zdjęcia…", "Loading saved photos…"));
    $("formHint").textContent = h.join(" ");
    if (pendingPh) h.push(window.OESTT("Zmniejszam zdjęcie…", "Reducing the photo…"));
    var block = !!restoring || pendingPh > 0;
    $("toPreview").disabled = block; $("toQueue").disabled = block;
    $("toQueue").textContent = block && h.length ? h[0] : window.OESTT("Wyślij · ", "Send · ") + NZ.data(reportDate());
  }

