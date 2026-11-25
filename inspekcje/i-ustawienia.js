"use strict";
// i-ustawienia.js – ustawienia strony inspekcji.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: kluczy ustawień w pamięci telefonu.
  // ---------- ustawienia ----------
  function fillSettings() {
    $("s-email").value = cfg.email; $("s-folder").value = cfg.folder; $("s-pattern").value = cfg.pattern;
    $("s-site").value = cfg.site; $("s-insp").value = cfg.insp; $("s-scope").checked = !!cfg.scope; $("s-dphotos").checked = !!cfg.drivePhotos;
    $("s-api").value = cfg.api; $("s-key").value = cfg.key; $("s-auto").checked = !!cfg.auto; $("s-wifi").checked = cfg.wifiOnly !== false;
    $("apiBox").hidden = IN_GAS;
  }
  function readSettings() {
    var apiChanged = cfg.api !== val("s-api") || cfg.key !== val("s-key");
    cfg.email = val("s-email"); cfg.folder = val("s-folder") || DEFAULTS.folder; cfg.pattern = val("s-pattern") || DEFAULTS.pattern;
    cfg.site = val("s-site"); cfg.insp = val("s-insp"); cfg.scope = $("s-scope").checked; cfg.drivePhotos = $("s-dphotos").checked;
    cfg.api = val("s-api"); cfg.key = val("s-key"); cfg.auto = $("s-auto").checked; cfg.wifiOnly = $("s-wifi").checked;
    save("cfg", cfg); renderHome();
    if (apiChanged && cfg.api && cfg.key) loadSetup();
    $("setToast").textContent = window.OESTT("Zapisano w tej przeglądarce", "Saved in this browser");
    clearTimeout(readSettings.t); readSettings.t = setTimeout(function () { $("setToast").textContent = ""; }, 1800);
  }
  ["s-email", "s-folder", "s-pattern", "s-site", "s-insp", "s-scope", "s-dphotos", "s-api", "s-key", "s-auto", "s-wifi"].forEach(function (id) { $(id).addEventListener("change", readSettings); });
  $("s-wifi").addEventListener("change", function () { if (gm()) { OESTSender.render(); if (cfg.auto) OESTSender.run(); } }); // wyłączone czekanie od razu puszcza kolejkę
  fillSettings();
  // Word z samych zdjęć formularza (kartki, także małe zdjęcia Fire Test): OESTWord.zdjeciaKartki (moduly/word)
  function fillFlushDocx(f) {
    return OESTWord.zmien(OESTWzory.bajty("flush"), {
      "word/document.xml": function (x) { return OESTFlush.fill(x, f); },
      "word/header1.xml": function (x) { return OESTFlush.header(x, f.building); }
    });
  }
  // AOV i inne listy punktów: podsumowanie po angielsku do raportu
  // basic form Smart w Wordzie (wzór OEST-basic) dla Flushingu: lista kranów + zdjęcia, zdjęcie przy kranie podpisane jego nazwą
  var basicRaz = new WeakMap(); // raz na zestaw zdjęć danego raportu: PDF z silnika powstaje z TYCH SAMYCH bajtów basic form, które idą mailem (zip Worda ma datę zapisu)
  function flushBasicDocx(d, pics) {
    var k = "", raz = basicRaz.get(d) || {}; basicRaz.set(d, raz);
    for (var i = 0; i < pics.length; i++) k += pics[i].url + "|";
    if (raz[k]) return raz[k];
    var b = flushBasic(d, pics); return (raz[k] = OESTWord.wypelnij(OESTWzory.bajty(d.flush.wzorBasic || "basic"), b.d, b.pics));
  }
  // dane basic form dla Flushingu — te same dla Worda i PDF-u (identyczne wersje)
  function flushBasic(d, pics) {
    var f = d.flush, dd = Object.assign({}, d), sum = f.points ? pointsSummary(f) : OESTFlush.summary(f);
    // pole Overall Condition jest w jednym wierszu z Location: krótko; pełne zdanie zostaje pod listą
    dd.condition = dd.stan_ogolny = f.taps.some(function (t) { return t.state === "no"; }) ? "Requires attention" : "Satisfactory"; dd.title = dd.tytul = d.tytul || f.title;
    var heads = {}, at = 0; (f.groups || []).forEach(function (g) { heads[at] = g.name; at += g.n; });
    dd.details = dd.opis = [(f.points ? "" : OESTFlush.MONTHS[f.month] + " " + f.year + " · Week " + f.week + " in month · ") + "Date: " + d.data + " · Name: " + (f.name || ""), ""]
      .concat([].concat.apply([], f.taps.map(function (t, i) { return (heads[i] ? ["", heads[i] + ":"] : []).concat([t.name + ": " + OESTFlush.LABEL[t.state] + (t.note ? " – " + t.note : "")]); })))
      .concat(["", sum + "."]).join("\n");
    // Flushing ze strefami (Grzegorz 21/11/2026): wzór flush-basic-* – strefy, kratki i stałe zdanie zamiast listy w {details}
    if (f.strefy && f.wzorBasic) { Object.assign(dd, OESTFlush.basicPola(f)); dd.details = dd.opis = ""; }
    var ph = pics.filter(function (p) { return p.sheet; }).concat(pics.filter(function (p) { return !p.sheet; })).map(function (p) {
      return p.tap != null && f.taps[p.tap] ? Object.assign({}, p, { caption: f.taps[p.tap].name }) : p;
    });
    return { d: dd, pics: ph };
  }
  function pointsSummary(f) {
    if (f.ui === "checks") { var bad = f.taps.filter(function (t) { return t.state === "no"; }).length, sm = f.summary || []; // Spa, Generator: tekst z konfiguracji typu
      return bad ? bad + " " + (sm[1] || "check(s) not satisfactory – record in the Fault and Remedial Actions Log") : (sm[0] || "Spa checked – all items satisfactory, no issues observed"); }
    var no = f.taps.filter(function (t) { return t.state === "no"; }).length, na = f.taps.filter(function (t) { return t.state === "na"; }).length;
    var yes = f.taps.length - no - na;
    if (no) return no + " call point(s) failed – AOVs did not operate correctly; record in the Fault and Remedial Actions Log";
    if (!yes) return "No call points tested (all N/A)";
    return (na ? yes + " of " + f.taps.length + " call points tested – AOVs opened and reset correctly (" + na + " N/A, not tested)" : "All call points tested – AOVs opened and reset correctly");
  }
  // Raport wg ustawień wysyłki (⚙, Grzegorz 04/11): co wysłać (zdjęcia formularza / nasz raport / zdjęcia ogólne / zdjęcia do pytań),
  // scalone w jeden dokument albo osobne pliki, PDF / Word. r.files = to, co faktycznie idzie mailem; r.pdf = pełny PDF do archiwum.
  // PDF TYLKO z Worda przez silnik LibreOffice (Grzegorz 20/11 i 21/11/2026: „mamy profesjonalny sprzęt” – własny rysownik PDF usunięty).
  // Każdy plik PDF niesie listę Wordów (z), z których powstaje (Flushing: formularz firmy + basic form, sklejone – moduly/word-pdf → zWordow).
  // Bez silnika albo gdy zawiedzie: PDF-a nie ma i apka tego nie udaje – idzie Word (r.bezPdf, komunikat w podglądzie).
  function buildAll(opt) {
    // wzory Word z modułu Wzory: przed każdym raportem (po błędzie przy starcie – ponowna próba); błąd idzie do zwykłej obsługi (uwaga Codex #186)
    return OESTWzory.wczytaj().then(function () { return buildAllWordy(opt); }).then(function (r) {
      var pdfy = r.files.filter(function (f) { return f.z; }), silnik = !!(window.OESTWordPdf && OESTWordPdf.dostepny());
      return pdfy.reduce(function (p, f) {
        return p.then(function () { return silnik ? OESTWordPdf.zWordow(f.z) : null; }).then(function (b) { f.bytes = b; });
      }, Promise.resolve()).then(function () {
        // archiwum: pełny PDF (wszystkie zdjęcia) – ten sam co mailowy, gdy mail ma wszystkie zdjęcia; inaczej osobno z pełnych Wordów
        var glowny = pdfy.filter(function (f) { return f.name === r.name + ".pdf" || f.name === r.name + " - report.pdf"; })[0];
        return r.wordPelny && glowny ? glowny.bytes : silnik && r.archiwum ? OESTWordPdf.zWordow(r.archiwum) : null;
      }).then(function (arch) {
        r.pdf = arch || new Uint8Array(0);
        var bez = pdfy.filter(function (f) { return !f.bytes; });
        r.bezPdf = bez.length > 0;
        // PDF nie powstał: zamiast niego jego Wordy (jeśli jeszcze nie idą), żeby raport nie zginął
        bez.forEach(function (f) {
          var baza = f.name.slice(0, -4), i = r.files.indexOf(f);
          var zast = f.z.filter(function (d) { return d && d.length; }).map(function (d, k) { return { name: baza + (k ? " - basic" : "") + ".docx", mime: MIME_DOCX, bytes: d }; })
            .filter(function (w) { return !r.files.some(function (g) { return g.name === w.name; }); });
          r.files.splice.apply(r.files, [i, 1].concat(zast));
        });
        r.files.forEach(function (f) { delete f.z; });
        return r;
      });
    });
  }
  function buildAllWordy(opt) {
    var d = formData(), name = makeName(cfg.pattern, d, reportDate()), n = needsNow() || { q: true, p: true, t: true, f: true, xp: true, xw: true, one: true };
    if (opt && opt.word) n = Object.assign({}, n, { xw: true }); // Update: Word do archiwum i na Dysk zawsze, niezależnie od ⚙ maila (uwaga Codex #101)
    var small = !!(cur.type.folder && !cur.type.flush); // inspekcja z kartki (Fire Test itp.)
    function file(suffix, bytes) { return { name: name + suffix + ".docx", mime: MIME_DOCX, bytes: bytes }; }
    function pdfZ(suffix, docs) { return { name: name + suffix + ".pdf", mime: "application/pdf", z: docs }; }
    function pick(pics) { return pics.filter(function (p) { return p.sheet ? n.f : p.tap != null ? n.t : n.p; }); }
    // Word samych zdjęć: przy kranach / punktach podpisane ich nazwą; formularz (kartka) pierwszy
    function zdjecia(pics) {
      var F = d.flush || cur.type.flush, ph = pics.filter(function (p) { return p.sheet; }).concat(pics.filter(function (p) { return !p.sheet; }));
      if (F) ph = ph.map(function (p) { var t = p.tap != null && F.taps[p.tap]; return t ? Object.assign({}, p, { caption: t.name != null ? t.name : String(t) }) : p; });
      return OESTWord.zdjeciaKartki(ph, small);
    }
    function done(r, form) { // form: { docs: fn(pics) → Wordy raportu z tymi zdjęciami (z nich PDF), docx: Word firmy | pusty, basic: fn(pics) | brak }
      var sel = pick(r.pics), files = [], sh = sel.filter(function (p) { return p.sheet; }), rest = sel.filter(function (p) { return !p.sheet; });
      var word = n.xw && form && ((form.docx && form.docx.length) || form.basic), main = form && form.docx && form.docx.length;
      r.archiwum = form ? form.docs(r.pics) : r.pics.length ? [zdjecia(r.pics)] : null;
      if (n.one) { // jeden dokument: raport → zdjęcia formularza → zdjęcia (Word nie scala zdjęć: idzie obok, gdy zaznaczony)
        var fw = !form && sel.length ? zdjecia(sel) : null; // sam formularz ze zdjęć: ten sam Word i PDF z niego
        if (n.xp || !word) { var docs = form ? form.docs(sel) : fw ? [fw] : null; if (docs) files.push(pdfZ("", docs)); }
        else if (sel.length) files.push(pdfZ(" - photos", [zdjecia(sel)]));
        if (fw && n.xw) files.push(file("", fw));
        if (word && main) files.push(file("", form.docx));
        if (word && form.basic) files.push(file(main ? " - basic" : "", form.basic(sel))); // Flushing: basic form Smart z listą kranów i zdjęciami
      } else {
        if (form && n.xp) files.push(pdfZ(" - report", form.docs([])));
        if (word && main) files.push(file(" - report", form.docx));
        if (word && form.basic) files.push(file(main ? " - basic" : " - report", form.basic([])));
        if (sh.length) { var fsh = OESTWord.zdjeciaKartki(sh, small); files.push(pdfZ(" - form", [fsh])); if (n.xw) files.push(file(" - form", fsh)); }
        if (rest.length) files.push(pdfZ(" - photos", [zdjecia(rest)]));
      }
      r.files = files; return r;
    }
    function fin(ph) { return finalPhoto(small && ph.tap == null && !ph.sheet ? Object.assign({}, ph, { small: true }) : ph, d).then(function (f) { f.tap = ph.tap; f.sheet = ph.sheet; if (ph.code && ph.tap == null && !ph.sheet) f.caption = ph.code + (ph.where ? " · " + ph.where : ""); return f; }); }
    if (cur.type.temp) return Promise.resolve().then(function () {
      // formularz firmy QHS-031: Word, PDF z niego
      var docx = fillTempDocx(d);
      return { name: name, data: d, docx: docx, pics: [], info: {}, logoUrl: "", wordPelny: true, archiwum: [docx], files: [n.xp || !n.xw ? pdfZ("", [docx]) : null, n.xw ? file("", docx) : null].filter(Boolean) };
    });
    if (cur.type.folder) {
      // Flushing / AOV / zdjęcia kartki: wszystkie zdjęcia z oznaczeniem (kran / formularz / ogólne)
      return mapLimit(photos, 3, fin).then(function (pics) {
        // formularz (zdjęcia z przycisku „Formularz”) zawsze pierwszy, zdjęcia za nim – niezależnie od kolejności robienia (Grzegorz 12/11/2026)
        if (small) pics = pics.filter(function (p) { return p.sheet; }).concat(pics.filter(function (p) { return !p.sheet; }));
        var pelny = !!n.one && pick(pics).length === pics.length;
        if (!d.flush) return done({ name: name, data: d, docx: new Uint8Array(0), pics: pics, info: {}, logoUrl: "", wordPelny: pelny }, null);
        d.stan_ogolny = d.stan = d.flush.points ? pointsSummary(d.flush) : OESTFlush.summary(d.flush);
        d.punkty = d.flush.taps.map(function (t) { return t.name + ": " + OESTFlush.LABEL[t.state] + (t.note ? " – " + t.note : ""); });
        var docx = d.flush.points ? new Uint8Array(0) : fillFlushDocx(d.flush), basic = function (sel) { return flushBasicDocx(d, sel); };
        // PDF = formularz firmy (jeśli jest) + basic form z tymi samymi zdjęciami
        return done({ name: name, data: d, docx: docx, pics: pics, info: {}, logoUrl: "", wordPelny: pelny }, { docx: docx, basic: basic, docs: function (sel) { return [docx, basic(sel)]; } });
      });
    }
    var tpl = templateBytes(), info = OESTWord.info(tpl);
    return mapLimit(photos, 3, fin).then(function (pics) {
      var sel = pick(pics), fill = function (s2) { return OESTWord.wypelnij(tpl, scopeForWord(tpl, d), s2); };
      var docx = fill(n.one ? sel : []);
      var logoUrl = info.logo ? URL.createObjectURL(new Blob([info.logo], { type: info.logoType === "PNG" ? "image/png" : "image/jpeg" })) : "";
      // PDF z tego samego Worda co mail (te same zdjęcia); archiwum z pełnego Worda tylko, gdy mail nie ma wszystkich zdjęć
      return done({ name: name, data: d, docx: docx, pics: pics, info: info, logoUrl: logoUrl, wordPelny: !!n.one && sel.length === pics.length }, { docx: docx, docs: function (s2) { return [s2 === pics ? (n.one && sel.length === pics.length ? docx : fill(pics)) : docx]; } });
    });
  }

