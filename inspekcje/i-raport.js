"use strict";
// i-raport.js – dane raportu i szablon Worda.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: wzorów – źródło to moduly/wzory.
  // ---------- dane raportu ----------
  function dateOn() { var c = document.getElementById("dateOn"); return !c || c.checked; }
  // data w raporcie; odzyskana inspekcja z zaznaczonym „Updated” (Grzegorz 08/11/2026 12:53, domyślnie wyłączone): „06/11/2026 (Updated 08/11/2026)”
  function updTxt() { var c = document.getElementById("updOn"); return REC && c && c.checked ? "Updated " + NZ.data(new Date()) : ""; }
  function dateTxt(w) { var a = dateOn() ? NZ.data(w) : "", u = updTxt(); return a && u ? a + " (" + u + ")" : a || u; }
  function reportDate() {
    var v = $("dzien").value, n = new Date();
    if (!v) return n;
    var p = v.split("-"); return new Date(+p[0], +p[1] - 1, +p[2], n.getHours(), n.getMinutes());
  }
  function formData() { var d = formData0(); if (d && d["job number"] == null) d["job number"] = jobNo(); return d; } // każdy rodzaj raportu (także QHS-031) ma nr zlecenia w nazwie pliku
  function formData0() {
    var w = reportDate(), pts = [];
    if (cur.mode === "sum") return batchData(w);
    if (cur.type.temp) return tempData(w);
    if (cur.type.rooms) return roomsData(w);
    if (cur.type.folder) return english({ data: dateTxt(w), inspektor: val("podpis"), urzadzenie: cur.code, lokalizacja: cur.where, wieza: cur.loc, pietro: "",
      tytul: cur.type.title, punkty: [], stan_ogolny: "", quote: "", site: cfg.site, komentarz: "", zakres: "", folder: true,
      obiekt: cur.where, stan: "", rodzaj: cur.type.title, nr: "", godzina: NZ.godzina(new Date()), opis: "", flush: cur.type.flush && fl.on ? flushReport(w) : null });
    cur.type.checks.forEach(function (c, i) { if (states[i] === "ok") pts.push(c.ok); else if (states[i] === "fail") pts.push(override[i] || c.fail); });
    pts = pts.concat(extraFaults(true));
    if (!pts.length) pts = ["Visual inspection carried out."]; // wszystko N/A: sama inspekcja wzrokowa
    var d = {
      data: dateTxt(w), inspektor: val("podpis"), urzadzenie: cur.code, lokalizacja: cur.where, wieza: cur.loc, pietro: RD.pietro(cur.code),
      tytul: cur.type.title, punkty: pts, stan_ogolny: radio("ov"), quote: radio("quote"), site: cfg.site,
      komentarz: $("komentarz").value.trim(), zakres: cfg.scope ? cur.type.scope : ""
    };
    d.obiekt = d.lokalizacja; d.stan = d.stan_ogolny; d.rodzaj = d.tytul; d.nr = ""; d.godzina = NZ.godzina(new Date());
    var head = cur.type.plain ? "" : deviceHead(d.tytul, cur.code), body; // PPM: kod = nazwa zadania, już w tytule/lokalizacji
    if (cur.type.checks.length && cur.type.checks.every(function (c) { return c.cp; })) body = checkpointText(cur.type.checks);
    else body = pts.map(function (s) { return "• " + s; }).join("\n");
    d.opis = (head ? head + "\n\n" : "") + body + (d.komentarz ? "\n\nComments: " + d.komentarz : "");
    // środek „grupy” (Grzegorz 27/11/2026): krótki punkt przy ☑/☒, przy ☒ szara uwaga = pełne zdanie usterki; N/A pominięte jak dotąd
    var pk = [], nNo = 0, extra = extraFaults(true);
    cur.type.checks.forEach(function (c, i) {
      if (states[i] === "ok") pk.push({ nazwa: punkt(c), stan: "ok" });
      else if (states[i] === "fail") { nNo++; pk.push({ nazwa: punkt(c), stan: "no", uwaga: override[i] || c.fail || powody(c, i) }); }
    });
    Object.assign(d, OESTWzory.grupy([{ nazwa: head || cur.code || cur.type.name, punkty: pk }], { szare: [ogolny(d)].concat(extra.map(function (s) { return "Fault: " + s; }),
      [pk.length || extra.length ? summaryLine(nNo + extra.length) : "Visual inspection carried out.", d.komentarz ? "Comments: " + d.komentarz : "", d.zakres]) }));
    return english(d);
  }
  // nazwa punktu w raporcie: krótki tekst zatwierdzony przez Grzegorza (27/11/2026, pole short), inaczej hasło z ekranu
  function punkt(c) { return c.short || c.cp || c.qen || c.ok || ""; }
  // pytanie z powodami (izolatory): wybrane powody po angielsku, inaczej ogólne zdanie pytania
  function powody(c, i) { var rs = (c.reasons || []).filter(function (r) { return (rsel[i] || []).indexOf(r.id) >= 0; }); return rs.length ? rs.map(function (r) { return r.en; }).join("; ") : c.en || ""; }
  // pierwszy akapit szarej ramki: wiersza „Overall Condition” w środku grup nie ma (jak we Flushingu), stan idzie tutaj
  function ogolny(d) { return d.stan_ogolny ? "Overall condition: " + d.stan_ogolny + "." : ""; }
  // plant roomy: dane środka „grupy” (Word i PDF z niego) i tekst opisu (podgląd, Vantify)
  function roomsData(w) {
    var d = english({ data: dateTxt(w), inspektor: val("podpis"), urzadzenie: cur.code, lokalizacja: cur.where, wieza: cur.loc, pietro: "",
      tytul: cur.type.title, punkty: [], stan_ogolny: radio("ov"), quote: radio("quote"), site: cfg.site, komentarz: $("komentarz").value.trim(), zakres: "" });
    d.obiekt = d.lokalizacja; d.stan = d.stan_ogolny; d.rodzaj = d.tytul; d.nr = ""; d.godzina = NZ.godzina(new Date());
    // 01/11 Grzegorz: w pomieszczeniach same kratki (układ się nie rozjeżdża), usterki pełnymi zdaniami + uwagi dopiero na końcu
    var seen = {}, rooms = [], issues = [];
    cur.type.checks.forEach(function (c) {
      if (seen[c.room]) return; seen[c.room] = 1;
      var cells = [];
      cur.type.checks.forEach(function (x, i) { if (x.room !== c.room) return; if (states[i] === "ok") cells.push("\u2611 " + x.cp); else if (states[i] === "fail") cells.push("\u2612 " + x.cp); });
      var fails = roomFails(c.room), note = (roomNotes[c.room] || "").trim().replace(/\.?$/, ".");
      fails.forEach(function (f) { issues.push(c.roomName + " (" + c.roomLoc + "): " + f + " check failed \u2013 " + (note.length > 1 ? note : "requires attention.")); }); // każde odznaczenie osobnym zdaniem
      var pk = [];
      cur.type.checks.forEach(function (x, i) { if (x.room !== c.room) return; if (states[i] === "ok") pk.push({ nazwa: punkt(x), stan: "ok" }); else if (states[i] === "fail") pk.push({ nazwa: punkt(x), stan: "no", uwaga: note.length > 1 ? note : "requires attention." }); });
      rooms.push({ name: c.roomName, loc: c.roomLoc, cells: cells, punkty: pk });
    });
    var end = issues.length ? ["Issues found:"].concat(issues.map(function (t) { return "\u2022 " + t; })) : [];
    if (d.komentarz) end.push("Comments: " + d.komentarz);
    rooms = rooms.filter(function (r) { return r.cells.length; }); // pomieszczenie całe na N/A: nie pokazuj pustego nagłówka
    if (!rooms.length) end.unshift("Visual inspection carried out."); // wszystko N/A: sama inspekcja wzrokowa
    // środek „grupy” (Grzegorz 27/11/2026): grupa = pomieszczenie z lokalizacją, przy ☒ szara uwaga pomieszczenia
    Object.assign(d, OESTWzory.grupy(rooms.map(function (r) { return { nazwa: r.name + " \u2013 " + r.loc, punkty: r.punkty }; }),
      { szare: [ogolny(d)].concat(rooms.length ? [] : ["Visual inspection carried out."], d.komentarz ? ["Comments: " + d.komentarz] : []) }));
    d.opis = d.details = rooms.map(function (r) { return r.name + " \u2013 Location: " + r.loc + "\n" + r.cells.join(", "); }).concat(end).join("\n");
    return d;
  }
  // pola wzoru OEST-basic (po angielsku); polskie zostają dla starszych szablonów
  var BUILDING = { TA: "Tower A", TB: "Tower B", P: "Pavilion", PV: "Pavilion" };
  // kod urządzenia jako nagłówek treści (jak nazwa pomieszczenia w plant roomach), żeby raporty różnych rozdzielnic dało się odróżnić;
  // pomijany, gdy tytuł już go zawiera (np. „ATS”)
  // checkpointy: siatka ☑ krótkich haseł po 3 w wierszu (tabulatory), N/A pominięte; usterki pełnym zdaniem pod siatką
  function checkpointText(checks) {
    // jedno miejsce: wiersz na checkpoint – kratka z hasłem | krótkie zdanie (Grzegorz 01/11); N/A pominięte
    var rows = [], n = 0;
    checks.forEach(function (c, i) {
      if (states[i] === "ok") rows.push("\u2611 " + c.cp + "\t" + c.ok);
      else if (states[i] === "fail") { rows.push("\u2612 " + c.cp + "\t" + (override[i] || c.fail)); n++; }
    });
    var extra = extraFaults(true);
    if (!rows.length && !extra.length) return "Visual inspection carried out."; // wszystko N/A: bez zdania „All items checked…”
    var t = rows.length ? rows.join("\n") : "Visual inspection carried out.";
    return t + (extra.length ? "\n\nFaults:\n" + extra.map(function (s) { return "• " + s; }).join("\n") : "") + "\n\n" + summaryLine(n + extra.length);
  }
  // zdanie podsumowania pod checkpointami (Grzegorz 01/11: same kratki wyglądają biednie)
  function summaryLine(nFaults) {
    var what = String(cur.code || cur.type.name || "the equipment").replace(/\s*\(.*\)\s*$/, "");
    if (!nFaults) return "Visual inspection of " + what + " completed. All items checked were found in satisfactory condition and no defects or signs of damage were observed. No further action required at this time.";
    return "Visual inspection of " + what + " completed. The defect" + (nFaults > 1 ? "s" : "") + " listed above require" + (nFaults > 1 ? "" : "s") + " attention; all other items checked were found in satisfactory condition.";
  }
  function deviceHead(title, code) {
    var c = String(code || "").replace(/\s*\(.*\)\s*$/, "").trim();
    return c && String(title || "").toLowerCase().indexOf(c.toLowerCase()) < 0 ? c : "";
  }
  // zakres („Scope: visual inspection only…”) ma być i w PDF, i w Wordzie; wzór bez znacznika {zakres} dostaje go na końcu opisu
  function scopeForWord(tpl, d) {
    if (!d.zakres) return d;
    var x = ""; try { x = OESTWord.tekst(tpl); } catch (_) {}
    return x.indexOf("zakres") >= 0 ? d : Object.assign({}, d, { details: (d.details ? d.details + "\n" : "") + d.zakres });
  }
  function english(d) {
    d.site = d.site || "One Eastside Tower"; d.date = d.data; d.engineer = d.inspektor; d.title = d.tytul; d.condition = d.stan_ogolny;
    var m = /\((TA|TB|P)(?:,\s*([^)]+))?\)/.exec(d.urzadzenie || ""); // np. „ATS (TB, L13)”, „Weekly Flushing (P)”
    d.building = BUILDING[d.wieza] || (m && BUILDING[m[1]]) || (d.wieza === "One Eastside" ? "" : d.wieza) || "";
    d.level = d.pietro || (m && m[2]) || ""; d.details = d.opis; d.quote = d.quote || "No";
    if (d["job number"] == null) d["job number"] = jobNo(); return d;
  }
  // numer zlecenia Vantify dla tej inspekcji (Grzegorz 20/11/2026: „ID” we wzorze i w nazwie pliku). Termin zlecenia = ten sam,
  // który dostaje etap przy wysyłce (PPM.due), a dla już zakończonej – zapisany okres; karta bez zlecenia Vantify → puste pole.
  function jobNo() {
    // odzyskana inspekcja: numer zlecenia z jej raportu w archiwum, nie z bieżącego terminu karty (przegląd Codex #169)
    if (REC) return (REC.meta && REC.meta.job) || "";
    var t = cur.ppm; if (!t || !PPM || !PPM.jobFor) return "";
    var st = PPM.stage && PPM.stage(t), dd = PPM.due(t);
    var day = st && st.period && (st.s === "done" || st.s === "queued" || st.s === "sent") ? st.period : dd ? NZ.dzienIso(dd) : "";
    var j = day ? PPM.jobFor(t, day) : null; return j && j.no ? String(j.no) : "";
  }

  // ---------- szablon (z Google Drive, kopia w telefonie na offline) ----------
  function templateBytes() {
    if (cur.type && cur.type.wzor) return OESTWzory.bajty(cur.type.wzor); // wzór wskazany w opisie inspekcji (moduly/wzory)
    // w apce bez skryptu Google zawsze wbudowany wzór (stara kopia z Drive w telefonie nie może go podmieniać):
    // ramka basic + środek „grupy” (Grzegorz 27/11/2026: wszystkie inspekcje w stylu Flushing/Generator)
    if (APP && !cfg.api) return OESTWzory.bajty("grupy-basic");
    return serverTpl ? serverTpl.bytes : OESTWzory.bajty("grupy-basic");
  }
  function tplState(err) {
    var n = $("tplNotice");
    if (serverTpl) {
      n.hidden = !err; if (err) widokInspekcji(n, "fragment", { rodzaj: "komunikat", tytul: window.OESTT("Bez połączenia z Google:", "No Google connection:"), tekst: " " + err + window.OESTT(". Działam na zapisanym szablonie.", ". Working with the saved template.") });
      $("tplName").textContent = window.OESTT("Używany: ", "In use: ") + serverTpl.name + window.OESTT(" (kopia z Google Drive)", " (copy from Google Drive)");
      return;
    }
    if (err) { n.hidden = false; widokInspekcji(n, "fragment", { rodzaj: "komunikat", tytul: window.OESTT("Szablon:", "Template:"), tekst: " " + err }); $("tplName").textContent = window.OESTT("Brak — używany przykładowy wzór.", "None — the sample template is used."); }
  }
  function applySetup(r) {
    if (!cfg.email) cfg.email = r.email || "";
    if (!cfg.folder) cfg.folder = r.folder || "";
    if (!cfg.site) cfg.site = r.site || "";
    if (!cfg.insp) cfg.insp = r.engineer || "";
    var dv = r.devices;
    if (Array.isArray(dv)) dv = { db: dv }; // stary Code.gs: tylko rozdzielnice
    TYPES.forEach(function (t) { if (dv && Array.isArray(dv[t.id])) t.devices = dv[t.id]; }); // pusta lista też obowiązuje
    // pytania z Code.gs (CFG.questions[typ] = [{ q, en, note? }]) zastępują wbudowane
    var qs = r.questions || {};
    TYPES.forEach(function (t) {
      if (!t.ask || !Array.isArray(qs[t.id])) return;
      if (!t.baseChecks) t.baseChecks = t.checks;
      var old = t.checks;
      // pusta lista w Code.gs = wracamy do pytań wbudowanych (także gdy telefon pamiętał wcześniejsze własne)
      t.checks = !qs[t.id].length ? t.baseChecks : qs[t.id].map(function (x, i) {
        // klucze z treści (nie z kolejności), żeby przestawienie pytań w CFG nie zmieniło znaczenia zapisanych odpowiedzi
        var k = x.key || x.q;
        return { key: k, q: x.q, qen: x.qen, en: x.en, note: !!x.note, def: "ok", reasons: (x.reasons || []).map(function (r) { return { id: r.id || k + "|" + r.pl, pl: r.pl, en: r.en, note: !!r.note }; }) };
      });
      // otwarty formularz tego rodzaju: odpowiedzi idą za kluczem pytania, nie za pozycją
      if (cur.type === t && cur.code && old !== t.checks) {
        var ok = old.map(function (c) { return c.key; }), st = states, rs = rsel, sn = susN;
        rsel = {}; susN = {};
        states = t.checks.map(function (c, i) {
          var j = ok.indexOf(c.key); if (j < 0) return c.def;
          if (rs[j]) rsel[i] = rs[j]; if (sn[j] != null) susN[i] = sn[j];
          return st[j];
        });
        renderChecks(); updateFormHint();
      }
    });
  }
  function loadSetup() {
    $("tplName").textContent = window.OESTT("Ładuję z Google Drive…", "Loading from Google Drive…");
    return api("getSetup", cfg.folder || "").then(function (r) {
      applySetup(r);
      save("cfg", cfg); fillSettings();
      save("setup", { email: r.email, folder: r.folder, site: r.site, engineer: r.engineer, devices: r.devices, questions: r.questions });
      if (r.error) tplState(r.error);
      else {
        serverTpl = { name: r.templateName, bytes: NZ.b64ToBytes(r.template) }; tplState();
        kvSet("tpl", serverTpl).catch(function () {});
      }
      renderHome(); updateFormHint();
    }).catch(function (e) { tplState(gErr(e)); });
  }
  $("tplReload").addEventListener("click", loadSetup);

