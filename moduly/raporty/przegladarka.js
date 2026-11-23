/* Przeglądarka raportów (moduly/raporty, etap 2b, Grzegorz 08/11/2026) – „Moje raporty” w Ustawieniach → Raporty.
 *
 *  - lista raportów z telefonu, najnowsze na górze, jako klocki (moduly/szkielet: czesci/Klocek.vue),
 *  - szukanie (kod, nazwa, budynek, rodzaj, data dd/mm/rrrr) i filtr budynku,
 *  - stuknięcie: okienko (OESTOkna.okno) z podglądem treści Worda i zdjęć, adresatami jak ⚙ wysyłki
 *    (prywatny / firmowy / inżynier / manager) i „Wyślij” – mail Word + PDF przez kolejkę (moduly/wysylka),
 *    bez ponownego zapisu do archiwum i bez zmiany pliku na Dysku,
 *  - „Otwórz na Dysku”, gdy raport już tam jest.
 *  - „Odzyskaj do edycji” (etap 2c): raport z zapisaną inspekcją wraca jako zwykły klocek inspekcji
 *    z fioletową pigułką „Odzyskana” na górze listy; stuknięcie otwiera inspekcję
 *    (inspekcje/index.html#rec=id) z edycją, Wyślij i Update.
 *
 * Moduł daje tylko dane i akcje (wygląd: moduly/szkielet/src/ekrany/Raporty.vue i RaportPodglad.vue):
 *   OESTRaportyUI.budynki()                 → [{ v, t }] opcje filtra budynku
 *   OESTRaportyUI.szukanie() / .szukaj({ q, b })   stan szukania (zostaje po zmianie języka i powrocie na ekran)
 *   OESTRaportyUI.lista()                   → Promise<{ odzyskane: [klocek], raporty: [klocek], pusto: tekst|'' }> (klocek jak w Klocek.vue)
 *   OESTRaportyUI.podglad(id)               → Promise<dane okienka podglądu | null>; dane.zwolnij() po zamknięciu
 *   OESTRaportyUI.wynik(id, { ok, dane })   → po zamknięciu podglądu: odzyskanie albo wysyłka do kolejki (komunikaty: OESTOkna.pytaj)
 *   OESTRaportyUI.otworzOdzyskana(id)       → otwiera odzyskaną inspekcję
 *   OESTRaportyUI.zmiany(fn)                → fn() po każdej zmianie archiwum (moduly/raporty onChange)
 */
(function (w) {
  "use strict";
  var BLD = { "Tower A": "TA", "Tower B": "TB", "Pavilion": "P" };
  var state = { q: "", b: "" };
  function T(pl, en) { return w.OESTT(pl, en); }
  function blad(e) { return w.OESTBledy ? w.OESTBledy.text(e) : String(e && e.message || e); }
  function komunikat(tytul, tresc) { return w.OESTOkna && w.OESTOkna.pytaj ? w.OESTOkna.pytaj({ tytul: tytul, tresc: tresc, tylkoOk: true }) : Promise.resolve(true); }
  function budynki() { return [["", T("Wszystkie", "All")], ["Tower A", "Tower A"], ["Tower B", "Tower B"], ["Pavilion", "Pavilion"], ["General", T("Ogólne", "General")], ["Reactive", "Reactive"]].map(function (o) { return { v: o[0], t: o[1] }; }); }
  function dd(d) { return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
  // odzyskana inspekcja jako zwykły klocek inspekcji: dane z zapisu inspekcji w raporcie (bez nowego układu)
  function recCard(r) {
    var m = r.meta || {}, c = m.card || {}, s = r.snap || {}, f = s.fields || {}; // c: opis klocka zapisany przez apkę przy wysyłce
    var st = s.states || [], used = st.filter(function (x) { return x !== "na"; }).length, ok = st.filter(function (x) { return x === "ok"; }).length;
    var ph = s.photos || [], dz = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.dzien || ""), n = st.filter(function (x) { return x === "fail"; }).length;
    var ikony = [{ rodzaj: "zdjecia", n: Math.min(ph.filter(function (p) { return !p.sheet; }).length, 99) },
      { rodzaj: "pytania", n: used ? Math.min(ok, 99) + "/" + Math.min(used, 99) : "–", ton: used ? (ok === used ? "success" : "warning") : undefined }];
    if (n > 0) ikony.push({ rodzaj: "usterki", n: Math.min(n, 99), ton: "warning" });
    return { id: r.id, nazwa: c.name || m.code || r.name, status: { tryb: "odzyskana" }, opis: c.loc || "", czestotliwosc: c.freq === "12M" ? "Y" : String(c.freq || "").slice(0, 3),
      formularz: ph.some(function (p) { return p.sheet; }) ? "ok" : "brak", termin: { tekst: dz ? dd(new Date(+dz[1], +dz[2] - 1, +dz[3])) : "–" }, ikony: ikony, akcja: T("Otwórz", "Open") };
  }
  function card(R, r) {
    var f = r.folder || [], drive = r.driveId && !r.dirty;
    return { id: r.id, nazwa: r.name, znak: BLD[f[0]], status: { tekst: drive ? T("Na Dysku", "On Drive") : T("Czeka na Dysk", "Waiting for Drive"), ton: drive ? 2 : 1 },
      opis: f.join(" · ") || "—", termin: { tekst: T("Wysłany ", "Sent ") + R.day(r) + (r.versions > 1 ? " · " + T("wersja ", "version ") + r.versions : "") }, akcja: T("Otwórz", "Open") };
  }
  var seq = 0;
  function lista() {
    var R = w.OESTRaporty, my = ++seq;
    if (!R) return Promise.resolve({ odzyskane: [], raporty: [], pusto: T("Archiwum raportów niedostępne.", "Report archive unavailable.") });
    var rec = R.recovered ? R.recovered().catch(function () { return []; }) : Promise.resolve([]);
    return Promise.all([rec, R.list()]).then(function (x) {
      var all = x[1], hit = R.find(all, state.q, { building: state.b });
      return { aktualne: my === seq, odzyskane: x[0].map(recCard), raporty: hit.map(function (r) { return card(R, r); }),
        pusto: !all.length ? T("Brak raportów w telefonie. Każdy wysłany raport pojawi się tutaj.", "No reports on this phone yet. Every sent report appears here.") : !hit.length ? T("Nic nie pasuje do szukania.", "Nothing matches your search.") : "" };
    }, function (e) { return { aktualne: my === seq, odzyskane: [], raporty: [], pusto: blad(e) }; });
  }
  function otworzOdzyskana(id) {
    // Wstecz z odzyskanej inspekcji wraca tutaj (inspekcje/index.html → #settings/reports)
    w.OESTPowrot.zapisz({ h: location.hash || "#settings/reports" }); // moduly/powrot
    (w.OESTEkrany ? w.OESTEkrany.otworzStrone : function (u) { location.href = u; })("inspekcje/index.html#rec=" + encodeURIComponent(id));
  }
  function reactiveR(r) { return (r.meta && r.meta.type) === "reactive" || (r.folder || [])[0] === "Reactive"; }
  // dane okienka podglądu: tekst Worda, zdjęcia (adresy obrazków), link do Dysku, adresaci jak ⚙ wysyłki
  function podglad(id) {
    var R = w.OESTRaporty, S = w.OESTSender;
    return R.get(id).then(function (r) {
      if (!r || r.gone) return null;
      var urls = [], pv = null;
      try { pv = w.PizZip ? R.docxPreview(r.docx, w.PizZip) : null; } catch (e) { pv = null; }
      var to = S && S.recipients ? S.recipients({ sp: 1, sm: 1, se: 1, sg: 1 }) : { priv: "", me: "", eng: "", man: "" };
      // Reactive wysyłamy tylko na firmowy e-mail (PROD-025) – tak jak przy pierwszej wysyłce
      var reactive = reactiveR(r), only = T("Reactive: tylko firmowy e-mail", "Reactive: work email only");
      function cb(k, label, addr, missing) { var off = !addr || (reactive && k !== "sm"); return { k: k, tekst: label, adres: reactive && k !== "sm" ? only : addr || missing, wylaczony: off, zaznaczony: k === "sm" && !!addr }; }
      var zdjecia = pv ? pv.images.map(function (i) { var u = URL.createObjectURL(new Blob([i.bytes], { type: i.type })); urls.push(u); return u; }) : [];
      return {
        tytul: r.name,
        meta: (r.folder || []).join(" · ") + " · " + T("wysłany ", "sent ") + R.day(r) + " · Word + PDF",
        linie: pv ? pv.lines : [T("Nie udało się otworzyć podglądu. Raport można wysłać.", "Could not open the preview. The report can still be sent.")],
        zdjecia: zdjecia,
        odzyskaj: r.snap && !reactive ? (r.rec ? T("Otwórz odzyskaną inspekcję", "Open recovered inspection") : T("Odzyskaj do edycji", "Recover for editing")) : "",
        dysk: r.driveId ? { adres: "https://drive.google.com/file/d/" + encodeURIComponent(r.driveId) + "/view", tekst: T("Otwórz na Dysku", "Open on Drive") } : null,
        adresaciTytul: T("Do kogo", "Send to"),
        adresaci: [
          cb("sp", T("Mój prywatny e-mail", "My private email"), to.priv, T("brak adresu w Mój profil", "no address in My Profile")),
          cb("sm", T("Mój firmowy e-mail", "My work email"), to.me, T("brak adresu w Mój profil", "no address in My Profile")),
          cb("se", T("Inżynier", "Engineer"), to.eng, T("ustaw w Ustawienia → Wysyłka", "set in Settings → Mail")),
          cb("sg", T("Manager", "Manager"), to.man, T("ustaw w Ustawienia → Wysyłka", "set in Settings → Mail"))],
        ok: T("Wyślij", "Send"), anuluj: T("Zamknij", "Close"),
        zwolnij: function () { urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = []; }
      };
    });
  }
  // po zamknięciu podglądu: wynik = { ok, dane: { adresaci: { sp, sm, se, sg }, odzyskaj } }
  function wynik(id, o) {
    var R = w.OESTRaporty, S = w.OESTSender, d = (o && o.dane) || {};
    return R.get(id).then(function (r) {
      if (!r) return;
      if (d.odzyskaj) return R.setRec(r.id, true).then(function () { otworzOdzyskana(r.id); }, function (e) { return komunikat(T("Nie odzyskano", "Not recovered"), blad(e)); });
      if (!o || !o.ok) return;
      var sel = {}, a = d.adresaci || { sm: true }; Object.keys(a).forEach(function (k) { if (a[k]) sel[k] = true; });
      if (reactiveR(r)) sel = { sm: !!sel.sm };
      var list = S && S.recipients ? S.recipients(sel).list : [];
      if (!S || !S.active || !S.active() || !S.enqueue) return komunikat(T("Wysyłka niedostępna", "Sending unavailable"), T("Zaloguj się do Google w apce.", "Sign in to Google in the app."));
      if (!list.length) return komunikat(T("Brak adresata", "No recipient"), T("Zaznacz, do kogo wysłać.", "Tick who to send it to."));
      return S.enqueue({ type: "archive", code: r.name, name: r.name, subject: r.name, body: r.name + "\n" + T("Raport z archiwum OEST", "Report from the OEST archive") + " (" + R.day(r) + ")\n",
        docx: r.docx, pdf: r.pdf || new Uint8Array(0), toList: list, noArchive: true, rpt: r.folder }).then(function () {
        return komunikat(T("W kolejce", "Queued"), T("Raport czeka w kolejce – pasek na dole pokaże wysyłkę.", "The report is queued – the bar at the bottom shows sending."));
      }, function (e) {
        // nie trafił do kolejki (np. brak miejsca w telefonie): mówimy wprost, nic nie udajemy; ponowienie = otworzyć raport i Wyślij jeszcze raz
        return komunikat(T("Nie wysłano", "Not sent"), T("Nie udało się dodać raportu do kolejki: ", "Could not add the report to the queue: ") + blad(e) + T("\nOtwórz raport i spróbuj ponownie.", "\nOpen the report and try again."));
      });
    });
  }
  var sluchacze = [], podpiety = false;
  function zmiany(fn) {
    sluchacze.push(fn);
    if (!podpiety && w.OESTRaporty && w.OESTRaporty.onChange) { podpiety = true; w.OESTRaporty.onChange(function () { sluchacze.forEach(function (f) { try { f(); } catch (e) {} }); }); }
    return function () { var i = sluchacze.indexOf(fn); if (i >= 0) sluchacze.splice(i, 1); };
  }

  w.OESTRaportyUI = { budynki: budynki, szukanie: function () { return { q: state.q, b: state.b }; }, szukaj: function (o) { if (o && "q" in o) state.q = String(o.q || ""); if (o && "b" in o) state.b = String(o.b || ""); },
    lista: lista, podglad: podglad, wynik: wynik, otworzOdzyskana: otworzOdzyskana, zmiany: zmiany };
})(window);
