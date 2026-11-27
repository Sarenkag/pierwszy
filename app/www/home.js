/* Ekran główny (Grzegorz 03/11/2026, makieta „Home experience”) – dane dla ekranu Vue (moduly/szkielet/src/ekrany/Glowny.vue):
 * nagłówek (logo, ONE EASTSIDE, data, pogoda, PL/EN, dzwonek, profil), lampki Wi‑Fi i Dysk, licznik folderu zdjęć,
 * pasek dni (OESTPpmUI.dniPaska), kafelki i okienka: prognoza 7 dni, powiadomienia, Dysk, sieć, nowości.
 * Ekran niczego nie liczy: OESTHome.dane() i dane okienek dają zwykłe obiekty; zmiana stanu → zdarzenie „oest:home”.
 *   OESTHome.dane() → { data, pogoda: { ikona, temp } | null, inicjaly, siec, dysk, zdjecia: { tekst, poziom }, dzwonek, nowosci, kafelki }
 *   OESTHome.prognoza() / powiadomienia() / dysk() / siec() / nowosciLista()   dane okienek
 *   OESTHome.idz(cel) / dyskAkcja(op) → Promise<tekst> / pozniej() / odswiez() */
(function (w) {
  "use strict";
  var d = w.document;
  // teksty ekranu: app/teksty/ekran-glowny.json (Grzegorz 09/11/2026 – teksty w plikach danych, nie w kodzie)
  function X(id, v) { return w.OESTTx ? w.OESTTx("ekran-glowny." + id, v) : id; }
  function en() { return w.OESTBledy ? w.OESTBledy.lang() === "en" : false; }
  function loc() { return en() ? "en-GB" : "pl-PL"; }
  var esc = w.OESTNarzedzia.esc; // moduly/narzedzia (audyt nr 53)
  var iso = w.OESTNarzedzia.dzienIso; // moduly/narzedzia
  var today = w.OESTNarzedzia.dzis; // moduly/narzedzia

  // pogoda: moduł app/www/pogoda.js (OESTPogoda) – jedno źródło dla ekranu głównego i paska dni
  var wxCache = function () { return w.OESTPogoda.cache(); }, wxLoad = function (f) { return w.OESTPogoda.load(f); }, wxIcon = function (c) { return w.OESTPogoda.ikona(c); };
  function zmiana() { w.dispatchEvent(new CustomEvent("oest:home")); }
  // ---------- nagłówek, lampki ----------
  function initials() {
    var p = {}; try { p = w.OESTSettings.get().profile || {}; } catch (e) {}
    var a = {}; try { a = w.OESTKonto.get() || {}; } catch (e) {}
    var f = p.first || a.first || "", l = p.last || a.last || "";
    var s = (f.charAt(0) + l.charAt(0)) || (a.name || a.email || "").charAt(0);
    return (s || "?").toUpperCase();
  }
  function net() {
    if (!w.OESTNarzedzia.online()) return { k: "off", t: X("brak-sieci") };
    if (w.OESTNarzedzia.wifi()) return { k: "on", t: "Wi‑Fi" };
    var c = w.navigator.connection;
    if (c && c.type && c.type !== "unknown") return { k: "mid", t: X("dane-komorkowe") };
    return { k: "on", t: X("online") };
  }
  var photo = { pending: 0, bytes: 0, phone: 0, limit: 0, warn: 0 };
  function drivePaused() { return !!(w.OESTZdjeciaUI && w.OESTZdjeciaUI.paused && w.OESTZdjeciaUI.paused()); }
  var gOk = null; // stan połączenia z Dyskiem: tylko z OESTGoogle.ready (to samo źródło co Ustawienia i wysyłka)
  function driveOn() { var G = w.OESTGoogle; return !!(G && G.connected && G.connected("drive")) || gOk === true; }
  function driveState() {
    if (gOk === false && !driveOn()) return { k: "off", t: X("hdd-brak-polaczenia") };
    if (drivePaused()) return { k: "off", t: X("hdd-wstrzymany") };
    if (photo.pending) return { k: "mid", t: X("hdd-w-kolejce", { n: photo.pending }) };
    return { k: "on", t: X("hdd-zsynchronizowany") };
  }
  function photoStats() {
    var G = w.OESTGoogle, g = G && G.ready ? G.ready("drive").then(function (ok) { gOk = ok; }, function () { gOk = false; }) : Promise.resolve();
    var Z = w.OESTZdjecia; if (!Z || !Z.list) return g;
    return g.then(function () { return Z.list(); }).then(function (rs) { var s = Z.stats(rs); photo = { pending: s.pending, bytes: s.pendingBytes, phone: s.phoneBytes, limit: (Z.settings().phoneLimitMB || 200) * 1048576, warn: (Z.settings().warnMB || 100) * 1048576 }; }).catch(function () {});
  }
  // folder zdjęć OEST: ile zajmuje (Grzegorz 05/11). Kolory liczone od progu ostrzeżeń (osobne ustawienie, domyślnie 100 MB),
  // nie od limitu folderu (200 MB = bufor): <50% zielony, <75% pomarańczowy, <90% czerwony, wyżej czerwony z ⚠ (poziom „full”)
  function zdjeciaStan() {
    var mb = photo.phone / 1048576, base = photo.warn || photo.limit, f = base ? photo.phone / base : 0;
    return { tekst: (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + "/" + Math.round(photo.limit / 1048576) + "MB", poziom: f < 0.5 ? "ok" : f < 0.75 ? "mid" : f < 0.9 ? "hi" : "full" };
  }

  // ---------- powiadomienia ----------
  var rxOpen = 0;
  function rxCount() {
    var H = w.OESTHandover; if (!H || !H.repository || !H.repository.get) return Promise.resolve();
    return H.repository.get().then(function (s) {
      rxOpen = ((s && s.jobs) || []).filter(function (j) { return j.status !== "fixed"; /* jak lista Reactive: także zadania z Handover */ }).length;
    }).catch(function () {});
  }
  function notes() {
    var insp = w.OESTPpmUI ? w.OESTPpmUI.licznikDzis() : { today: 0, late: 0 }, out = [];
    if (insp.today || insp.late) out.push({ ikona: "insp", cel: "insp", tytul: X("inspekcje-na-dzis"),
      opis: X("do-zrobienia", { n: insp.today }) + (insp.late ? ", " + X("po-terminie", { n: insp.late }) : "") });
    if (rxOpen) out.push({ ikona: "rx", cel: "reactive", tytul: "Reactive", opis: X("otwarte-zadania", { n: rxOpen }) });
    var q = w.OESTSender && w.OESTSender.count ? w.OESTSender.count() : 0;
    if (q) out.push({ ikona: "mail", cel: "queue", tytul: X("wysylka-raportow"), opis: X("raporty-w-kolejce-n", { n: q }) });
    if (photo.pending) out.push({ ikona: "drive", cel: "drive", tytul: X("zdjecia-na-dysk"), opis: X("czeka-na-wyslanie", { n: photo.pending }) });
    // nowa wersja apki (stan i pobieranie w update.js): zwykły wpis, nic nie zasłania ekranu; „Później” chowa go do następnej wersji
    var u = w.OESTUpdate && w.OESTUpdate.note ? w.OESTUpdate.note() : null;
    if (u) out.push({ ikona: "upd", cel: "update", tytul: X("nowa-wersja"), opis: en() ? u.en : u.pl, pozniej: !u.busy });
    return out;
  }

  // ---------- dane ekranu ----------
  // kafelki ekranu głównego: jeden kafelek (czesci/Kafelki.vue) powielony z listy – dodanie modułu = jedna linia
  var KAFELKI = [
    { id: "ppm", trasa: "ppm", t: ["Inspekcje", "Inspections"], ikona: "inspekcje" },
    { id: "reactive", trasa: "reactive", t: ["Reactive", "Reactive"], ikona: "reactive" },
    { id: "powertrace", trasa: "soon/powertrace", t: ["Power trace", "Power trace"], ikona: "powertrace" },
    { id: "cal", trasa: "cal", t: ["Kalendarz", "Calendar"], ikona: "kalendarz" },
    { id: "keys", trasa: "soon/keys", t: ["Klucze", "Keys"], ikona: "klucze" },
    { id: "handover", trasa: "soon/handover", t: ["Handover", "Handover"], ikona: "handover" },
    // nowości firm (moduly/nowosci, 18/11/2026): na miejscu „Statystyk” (jeszcze niezrobione) – siatka 2×4 zostaje
    { id: "news", trasa: "", t: ["Nowości firm", "Company news"], ikona: "nowosci" },
    { id: "settings", trasa: "settings", t: ["Ustawienia", "Settings"], ikona: "ustawienia" }
  ];
  function dane() {
    var c = wxCache(), N = w.OESTNowosci, n = net(), dr = driveState(), nw = N ? N.unread() : 0;
    return {
      data: today().toLocaleDateString(loc(), { weekday: "short", day: "numeric", month: "short" }),
      pogoda: c && c.now ? { ikona: wxIcon(c.now.c), temp: c.now.temp + "°C" } : null,
      inicjaly: initials(), siec: { stan: n.k, tekst: n.t }, dysk: { stan: dr.k, tekst: dr.t }, zdjecia: zdjeciaStan(),
      dzwonek: notes().length, dni: w.OESTPpmUI ? w.OESTPpmUI.dniPaska("") : [],
      kafelki: KAFELKI.map(function (k) { return { id: k.id, trasa: k.trasa, ikona: k.ikona, tytul: w.OESTT(k.t[0], k.t[1]), podpis: "", licznik: k.id === "news" ? nw : 0 }; })
    };
  }
  // odświeżenie: pogoda, zdjęcia, powiadomienia, nowości (także bez sieci – ostatnie zapisane)
  function odswiez(silaPogody) {
    zmiana();
    photoStats().then(zmiana);
    rxCount().then(zmiana);
    wxLoad(!!silaPogody).then(zmiana);
    if (w.OESTNowosci) w.OESTNowosci.load(false).then(zmiana);
  }

  // ---------- okienka ----------
  function stanZ(c) { return X("stan-z", { czas: new Date(c.t).toLocaleString(loc(), { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }) }) + (!w.OESTNarzedzia.online() ? " · " + X("bez-sieci-ostatnia") : ""); }
  function prognoza() {
    var c = wxCache(), t = today(), dni = [], DN = w.OESTPpmUI ? w.OESTPpmUI.dayName : function (i) { return i; };
    if (c && c.days) for (var i = 0; i < 7; i++) {
      var x = new Date(t); x.setDate(x.getDate() + i); var f = c.days[iso(x)];
      dni.push({ k: iso(x), nazwa: i === 0 ? X("dzis") : DN(x.getDay()), ikona: f ? wxIcon(f.c) : "", hi: f ? f.hi + "°" : "", lo: f ? f.lo + "°" : "" });
    }
    return { tytul: X("prognoza-7-dni") + " · Birmingham", dni: dni, uwaga: !c || !c.days ? X("brak-prognozy") : stanZ(c) };
  }
  function powiadomienia() { return { tytul: X("powiadomienia"), lista: notes(), pusto: X("nic-nowego"), pozniej: X("pozniej") }; }
  function mb(b) { return (b / 1048576).toLocaleString(loc(), { maximumFractionDigits: 1 }) + " MB"; }
  function dysk() {
    var on = driveOn(), p = drivePaused();
    return { tytul: "Google Drive · " + (on ? X("polaczony") : X("niepolaczony")), opcje: [
      { op: "sync", tekst: X("synchronizuj-teraz"), opis: photo.pending ? X("zdjecia-rozmiar", { n: photo.pending, mb: mb(photo.bytes) }) : X("nic-do-wyslania") },
      { op: "pause", tekst: p ? X("wznow-wysylke") : X("wstrzymaj-wysylke"), opis: p ? X("wstrzymana") : X("wlaczona") },
      { op: "reconnect", tekst: X("polacz-ponownie"), opis: on ? X("polaczony") : X("stuknij-aby-polaczyc") },
      { cel: "zdjecia", tekst: X("zdjecia-i-limity"), opis: "" }
    ] };
  }
  function siec() {
    var n = net(), q = w.OESTSender && w.OESTSender.count ? w.OESTSender.count() : 0;
    return { tytul: X("polaczenie") + " · " + n.t, opis: n.k === "off" ? X("opis-brak-sieci") : n.k === "mid" ? X("opis-dane-komorkowe") : X("opis-polaczono"),
      opcje: [{ cel: "queue", tekst: X("raporty-w-kolejce"), opis: String(q) }, { cel: "settings/sync", tekst: X("ustawienia-wysylki"), opis: "" }] };
  }
  // ---------- nowości firm (moduly/nowosci, Grzegorz 18/11/2026) ----------
  function nowosciLista() {
    var N = w.OESTNowosci, c = N ? N.cache() : null, list = N ? N.top(5) : [], J = N ? N.jobs() : null, out = [];
    if (N) N.seen();
    list.forEach(function (x) {
      var dt = x.date ? new Date(x.date).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }) : "" /* DD/MM/YYYY (AI-008) */;
      out.push({ firma: (N.FIRMY[x.src] || {}).skrot || "", tytul: x.title, url: x.url, opis: (x.oes ? "One Eastside · " : x.praca ? X("nowosci-praca") + " · " : "") + x.pub + (dt ? " · " + dt : "") });
    });
    // oferty pracy Smart: jeden wiersz zbiorczy (strona kariery)
    if (J) out.push({ firma: "Smart", tytul: X("nowosci-oferty", { n: J.n }), url: J.url, opis: X("nowosci-kariera") });
    zmiana();
    return { tytul: X("nowosci-firm") + " · PIC · Savills · Smart", lista: out,
      pusto: !list.length && !J ? (!w.OESTNarzedzia.online() ? X("nowosci-brak-sieci") : X("nowosci-brak")) : "",
      uwaga: c ? X("stan-z", { czas: new Date(c.t).toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "") }) + (!w.OESTNarzedzia.online() ? " · " + X("bez-sieci-ostatnia") : "") : "" };
  }
  // przejście ze źródła powiadomienia (okienko zamyka ekran przed wywołaniem)
  function idz(cel) {
    if (cel === "queue") { if (w.OESTSender && w.OESTSender.expand) w.OESTSender.expand(); return; }
    if (cel === "insp") { if (w.OESTPpmUI) w.OESTPpmUI.ustawDzien(iso(today())); w.OESTEkrany.go("ppm"); return; }
    if (cel === "update") { if (w.OESTUpdate) w.OESTUpdate.install(); return; }
    w.OESTEkrany.go(cel);
  }
  function pozniej() { if (w.OESTUpdate) w.OESTUpdate.postpone(); zmiana(); }
  // operacje Dysku z okienka → Promise<tekst wyniku> (błąd: tekst błędu z moduly/bledy)
  function dyskAkcja(op) {
    var U = w.OESTZdjeciaUI, G = w.OESTGoogle;
    if (op === "pause") { if (U && U.setPaused) U.setPaused(!drivePaused()); zmiana(); return Promise.resolve(""); }
    var job = op === "sync" ? function () { if (!U || !U.syncNow) throw Error("GOOGLE_SETUP"); return U.syncNow(true).then(function (r) { return photoStats().then(function () { zmiana(); return r; }); }); }
      : function () { if (!G) throw Error("GOOGLE_SETUP"); return G.connect("drive"); };
    return Promise.resolve().then(job).then(function (r) {
      zmiana();
      return op === "sync" ? (r && r.skipped ? X("czekam-na-wifi") : X("wyslano", { n: (r && r.sent) || 0 })) : X("polaczono-z-dyskiem");
    }, function (e) { zmiana(); throw new Error(U && U.errText ? U.errText(e) : (w.OESTBledy ? w.OESTBledy.text(e) : String(e))); });
  }
  function jezyk() {
    var next = en() ? "pl" : "en";
    try { w.OESTSettings.update(function (s) { s.appearance.language = next; }); w.OESTSettingsUI.applyTheme(); }
    catch (e) { w.OESTBledy.zapiszJezyk(next); } // klucz oest.lang: moduly/bledy
  }

  w.addEventListener("oest:update", zmiana);
  // powrót do apki (np. następnego dnia): odśwież datę, pasek dni i liczniki, także bez sieci
  ["pageshow", "focus"].forEach(function (ev) { w.addEventListener(ev, function () { if (!d.hidden) odswiez(false); }); });
  d.addEventListener("visibilitychange", function () { if (!d.hidden) odswiez(false); });
  ["online", "offline"].forEach(function (ev) { w.addEventListener(ev, function () { if (ev === "online") odswiez(false); else zmiana(); }); });
  if (w.navigator.connection && w.navigator.connection.addEventListener) w.navigator.connection.addEventListener("change", zmiana);
  if (w.OESTZdjecia && w.OESTZdjecia.onChange) w.OESTZdjecia.onChange(function () { photoStats().then(zmiana); });
  w.OESTHome = { dane: dane, odswiez: odswiez, prognoza: prognoza, powiadomienia: powiadomienia, dysk: dysk, siec: siec, nowosciLista: nowosciLista,
    idz: idz, pozniej: pozniej, dyskAkcja: dyskAkcja, jezyk: jezyk, rxCount: rxCount };
})(window);
