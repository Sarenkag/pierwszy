// Terminy PPM z Vantify w telefonie: „Pobierz z Vantify” (lista Jobs z API) albo eksport CSV „Job” pobrany w oknie Vantify w apce.
// Przycisk „Wczytaj eksport” z pliku usunięty (Grzegorz 18/11/2026: „Pobierz” wczytuje samo, przycisk zbędny).
// Plan z wczytanego pliku zastępuje plan wbudowany w apkę (vantify-plan.js), dopóki nowa wersja apki nie przyniesie
// eksportu z późniejszą datą. Terminy dokładnie z pliku (PROD-010). Liczy moduł moduly/eksport-vantify.
// Ładowany zaraz po ppm.js (index.html i inspekcje/index.html), przed pierwszym rysowaniem – obie strony widzą ten sam plan.
// ppm.js czyta OEST_VANTIFY przy każdym wywołaniu, więc podmiana po jego wczytaniu działa od razu.
(function (w) {
  // Plan wbudowany (vantify-plan.js) jest jedynym obiektem OEST_VANTIFY; wczytany plik podmienia w nim tylko zlecenia i karty.
  var KEY = "oest.vantify.plan", RKEY = "oest.vantify.reactive", E = w.OESTEksportVantify, V = w.OEST_VANTIFY;
  var base = { exported: V && V.exported, jobs: (V && V.jobs) || {}, cards: V && V.cards };
  function ls() { try { return w.localStorage; } catch (e) { return null; } }
  function baseDate() { return String(base.exported || "").slice(0, 10); }
  function stored() {
    try { var p = JSON.parse(ls().getItem(KEY) || "null"); return p && p.jobs && p.date ? p : null; } catch (e) { return null; }
  }
  function union(a, b) { var m = {}; (a || []).concat(b || []).forEach(function (k) { m[k] = 1; }); return Object.keys(m).sort(); }
  function use(p) {
    if (!V) return;
    V.exported = p.exported; V.jobs = p.jobs; V.cards = union(p.cards, base.cards || Object.keys(base.jobs)); V.source = "phone"; V.importedAt = p.at;
    V.api = !!p.api; V.zmiany = p.zmiany || null;
  }
  // Data wczytanego planu = późniejsza z: najnowsze zlecenie w pliku, dzień wczytania (plik nie ma daty eksportu,
  // a zamknięcie najnowszego zlecenia obniża maksimum createdAt). Wczytany obowiązuje, chyba że apka ma nowszy eksport.
  function day(p) { var a = String(p.at || "").slice(0, 10); return a > p.date ? a : p.date; }
  var s = stored();
  if (s && day(s) >= baseDate()) use(s);
  // Karty prowadzone przez Vantify zostają kartami Vantify także, gdy wygra plan wbudowany (bez powrotu do terminów liczonych przez apkę).
  else if (s && V) V.cards = union(V.cards || Object.keys(V.jobs || {}), s.cards);

  function cur() { return V || base; }
  function lang() { return (document.documentElement.lang || "pl").slice(0, 2) === "en" ? "en" : "pl"; }
  function L(pl, en) { return w.OESTT(pl, en); }
  function dmy(iso) { return iso ? w.OESTNarzedzia.dmmrrrr(iso) : "–"; }
  function hm(iso) { var d = new Date(iso); return isNaN(d) ? "" : w.OESTNarzedzia.godzina(d); }
  function cards() { var P = w.OEST_PPM; return P ? P.tasks.map(function (t) { return [t.id, t.name]; }) : []; }
  function cardName(id) { var P = w.OEST_PPM, t = P && P.byId(id); return t ? t.name : id; }
  function count(j) { return Object.keys(j || {}).reduce(function (n, k) { return n + j[k].length; }, 0); }

  // Porównanie z obecnym planem (samo nic nie zapisuje; zapis: zapiszPlan). Błędy: VANTIFY_FORMAT, VANTIFY_EMPTY. older = tylko ostrzeżenie
  // (data pliku to najnowsze createdAt, nie dzień eksportu: świeży eksport po zamknięciu najnowszego zlecenia wygląda na starszy).
  function previewRows(rows) {
    var c = cur(), p = E.plan(rows, { match: E.matcher(cards()), prevCards: c.cards || Object.keys(c.jobs || {}) });
    var now = String(c.exported || "").slice(0, 10);
    return { plan: p, changes: E.changes(c.jobs, p.jobs), older: p.date < now, currentDate: now };
  }
  function preview(text) { return previewRows(E.parseCsv(text)); }
  // Lista zleceń z Vantify (vantify-sync.js, bez eksportu): ta sama droga co plik (moduł eksport-vantify), data = dzień pobrania.
  function today() { var d = new Date(); return d.getFullYear() + "-" + w.OESTNarzedzia.pad(d.getMonth() + 1) + "-" + w.OESTNarzedzia.pad(d.getDate()); }
  function apiPreview(r) {
    var rows = E.fromApi(r && r.jobs, today());
    if (!rows.some(function (x) { return x.jobType === "Planned"; })) throw new Error("VANTIFY_EMPTY_LIST");
    var pv = previewRows(rows); pv.api = true; pv.older = false;
    // zlecenia inne niż planowe (Reactive) z tej samej listy – grupa „Z Vantify” w Reactive (Grzegorz 27/11/2026)
    pv.reactive = ((r && r.jobs) || []).filter(function (j) { return j && j.type !== "planned"; })
      .map(function (j) { return { id: String(j.id), summary: String(j.summary || ""), status: String(j.status || "") }; });
    return pv;
  }
  // Zapis + ponowny odczyt (DATA-002): sukces dopiero, gdy telefon oddał to samo.
  // o: { api: plan z „Pobierz z Vantify”, zmiany: nowe i zamknięte względem poprzedniego planu (pokazuje je karta) }
  function save(p, o) {
    o = o || {};
    var rec = { exported: p.exported, date: p.date, jobs: p.jobs, cards: p.cards, at: new Date().toISOString(), api: !!o.api, zmiany: o.zmiany || null };
    ls().setItem(KEY, JSON.stringify(rec));
    var back = stored(); if (!back || back.exported !== rec.exported) throw new Error("VANTIFY_SAVE");
    use(back);
    try { w.dispatchEvent(new CustomEvent("oest:vantify", { detail: { exported: back.exported } })); } catch (e) {}
    // zmiana terminów: ten sam sygnał co przy zmianie terminów PPM (kalendarz telefonu, ekran główny)
    try { w.dispatchEvent(new CustomEvent("oest:ppm-due-changed", { detail: { source: "vantify" } })); } catch (e) {}
    return back;
  }
  // Pobranie z Vantify (ręczne i przy starcie) i eksport z okna Vantify od razu zapisują plan (Grzegorz 26/11/2026:
  // „Od razu zapis, jedna karta”) – bez podglądu i bez „Zapisz”/„Anuluj”. Karta pokazuje zapisany plan i zmiany z tego zapisu.
  function zapiszPlan(r) {
    var ch = r.changes;
    var back = save(r.plan, { api: !!r.api, zmiany: { nowe: ch.added, zamkniete: ch.closed, pominiete: r.plan.missing || [], starszy: !!r.older, dataObecna: r.currentDate } });
    if (r.api && r.reactive) { try { ls().setItem(RKEY, JSON.stringify({ at: back.at, jobs: r.reactive })); } catch (e) {} }
    zmiana(); // otwarty ekran Ustawienia → Vantify od razu pokazuje nowy plan (także po zapisie przy starcie apki)
    return back;
  }
  function info() { var c = cur(); return { date: String(c.exported || "").slice(0, 10), source: c.source || "app", importedAt: c.importedAt || null, jobs: count(c.jobs), api: !!c.api, zmiany: c.zmiany || null }; }

  // Komunikaty ekranu: tekst w języku z chwili zdarzenia (jak dotąd – po zmianie PL/EN ekran odświeżał się bez komunikatów)
  function errText(e) {
    var m = e && e.message;
    if (m === "VANTIFY_FORMAT") return L("To nie jest eksport Job z Vantify (brak kolumn zleceń).", "This is not a Vantify Job export (job columns missing).");
    if (m === "VANTIFY_EMPTY") return L("W pliku nie ma zleceń planowych (Planned).", "The file has no Planned jobs.");
    if (m === "VANTIFY_BAD_LOGIN") return L("Vantify nie przyjął zapisanego hasła. Wpisz aktualne hasło w „Vantify w apce” i zapisz.", "Vantify did not accept the saved password. Type the current password under “Vantify in the app” and save.");
    if (m === "VANTIFY_EMPTY_LIST") return L("Lista Jobs w Vantify nie pokazuje zleceń planowych (Planned). Otwórz Vantify w apce i na liście Jobs ustaw filtr ze zleceniami PPM One Eastside – apka bierze listę z tym filtrem.", "The Jobs list in Vantify shows no Planned jobs. Open Vantify in the app and set the Jobs list filter to show One Eastside PPM jobs – the app uses the list with that filter.");
    if (m === "VANTIFY_LOGIN") return L("Vantify prosi o zalogowanie. Otwórz Vantify w apce, zaloguj się i spróbuj jeszcze raz.", "Vantify asks you to sign in. Open Vantify in the app, sign in and try again.");
    if (m === "VANTIFY_SYNC") return L("Nie udało się pobrać zleceń z Vantify (brak sieci albo Vantify nie odpowiada). Spróbuj później albo wczytaj eksport.", "Could not get jobs from Vantify (no network or Vantify not responding). Try later or load an export.");
    if (m === "VANTIFY_NATIVE") return L("Pobieranie z Vantify działa w aplikacji Android.", "Getting jobs from Vantify works in the Android app.");
    if (m === "VANTIFY_SAVE") return L("Telefon nie zapisał planu. Nic nie zmieniono.", "The phone did not save the plan. Nothing changed.");
    return L("Nie udało się odczytać pliku.", "Could not read the file.");
  }
  function brakMiejsca() { return L("Telefon nie zapisał zapisu „Zbadaj” (brak miejsca). Udostępnij go teraz, zanim zamkniesz apkę.", "The phone could not store the “Explore” log (no space). Share it now, before closing the app."); }
  // Zapis „Zbadaj” z ostatnich wizyt w Vantify (vantify-rejestr.js): tylko w telefonie, do udostępnienia przez Grzegorza
  var ZKEY = "oest.vantify.zapis";
  var inMemory = null; // kopia w pamięci, gdy telefon nie zapisał (np. brak miejsca): do udostępnienia w tej sesji
  function zapis() {
    if (inMemory) return { n: inMemory.entries.length, z: inMemory, memory: true };
    try { var z = JSON.parse(ls().getItem(ZKEY) || "null"); return z && z.entries ? { n: z.entries.length, z: z } : { n: 0 }; } catch (e) { return { n: 0 }; }
  }
  // Zapis + ponowny odczyt (DATA-002). Brak miejsca: mniejszy zapis (najnowsze wpisy); gdy i to nie wejdzie, kopia w pamięci.
  // Zwraca "ok" | "memory" | null (nic nowego).
  // big: „Zbadaj automatycznie” (do ~4000 wpisów) – większy zapis; gdy telefon nie zmieści, cały zostaje w pamięci do udostępnienia
  function keepLog(entries, big) {
    if (!entries || !entries.length) return null;
    var MAXN = big ? 5000 : 1500, MAXB = big ? 3000000 : 900000;
    if (big && JSON.stringify(entries).length > MAXB) { inMemory = { at: new Date().toISOString(), entries: entries }; return "memory"; } // nic nie ucinamy
    if (big && entries.length > MAXN) { inMemory = { at: new Date().toISOString(), entries: entries }; return "memory"; }
    var old = zapis().z, all = ((old && old.entries) || []).concat(entries).slice(-MAXN), s, rec;
    // ile wpisów z początku oddać; przy „Zbadaj automatycznie” tylko starsze – nowy zapis zostaje cały (przegląd Codex #135)
    function cut(part) { var k = Math.floor(all.length * part); return big ? Math.min(k, all.length - entries.length) : k; }
    for (;;) {
      while ((s = JSON.stringify(rec = { at: new Date().toISOString(), entries: all })).length > MAXB && all.length > 50 && cut(1 / 4) > 0) all = all.slice(cut(1 / 4));
      if (!big || s.length <= MAXB) try { ls().setItem(ZKEY, s); var back = JSON.parse(ls().getItem(ZKEY) || "null"); if (back && back.entries && back.entries.length === all.length) { inMemory = null; return "ok"; } } catch (e) {}
      if (all.length <= entries.length || all.length <= 50 || cut(1 / 2) <= 0) break;
      all = all.slice(cut(1 / 2)); // najpierw oddaj starsze wpisy
    }
    if (big) rec = { at: new Date().toISOString(), entries: entries };
    inMemory = rec; return "memory";
  }
  function plugin(name) { var C = w.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null; return (C.Plugins && C.Plugins[name]) || (C.registerPlugin && C.registerPlugin(name)); }
  var AKEY = "oest.vantify.auto";
  function getJson(k) { try { return JSON.parse(ls().getItem(k) || "null"); } catch (e) { return null; } }
  function setJson(k, v) { try { if (v == null) ls().removeItem(k); else ls().setItem(k, JSON.stringify(v)); } catch (e) {} }
  setJson("oest.vantify.nowe", null); // odłożony podgląd ze starszej wersji apki (już nieużywany)
  function sync() {
    var V = plugin("Vantify");
    if (!V || !V.sync) return Promise.reject(new Error("VANTIFY_NATIVE"));
    return V.sync({}).then(function (r) {
      var st = getJson(AKEY) || {}; st.at = Date.now(); st.last = (r && r.status) || "error"; setJson(AKEY, st);
      // po udanym pobraniu (ręcznym i co 4 h) odświeżany jest też status zleceń Reactive z numerem (reactive-vantify.js, Grzegorz 26/11/2026)
      if (r && r.status === "ok") { try { w.dispatchEvent(new CustomEvent("oest:vantify-pobrane")); } catch (e) {} }
      return r || {};
    });
  }
  // ---------- ekran Ustawienia → Vantify: stan i akcje (Vantify.vue pyta dane(), po zmianie dostaje zdarzenie oest:vantify-stan) ----------
  // Komunikaty żyją tylko, dopóki ekran jest otwarty.
  var ui, goAfter = null, zywy = false;
  function zeruj() { ui = { pobierz: null, login: null, vantify: null, wynik: null, fokus: 0, pobieranie: false, zbadaj: false }; }
  zeruj();
  function zmiana() { try { w.dispatchEvent(new CustomEvent("oest:vantify-stan")); } catch (e) {} }
  function cutList(items, max) { return { wiersze: items.slice(0, max).map(function (x) { return dmy(x.due) + " · " + cardName(x.id) + " · " + x.no; }), wiecej: Math.max(0, items.length - max) }; }
  function opis(z) {
    return { starszy: !!z.starszy, dataObecna: dmy(z.dataObecna), nowe: { n: z.nowe.length, lista: cutList(z.nowe, 8) },
      zamkniete: { n: z.zamkniete.length, lista: cutList(z.zamkniete, 8) }, pominiete: (z.pominiete || []).join(", ") };
  }
  function dane() {
    var i = info(), tel = i.source === "phone";
    return { teraz: { data: dmy(i.date), zlecen: i.jobs, api: tel && i.api, telefon: tel, wczytano: tel ? dmy((i.importedAt || "").slice(0, 10)) + " " + hm(i.importedAt) : "" },
      zmiany: tel && i.zmiany && i.zmiany.nowe ? opis(i.zmiany) : null, wynik: ui.wynik, pobierz: ui.pobierz, login: ui.login, vantify: ui.vantify, fokus: ui.fokus,
      zapis: zapis().n, trwaPobierz: ui.pobieranie, trwaZbadaj: ui.zbadaj };
  }
  // zapis od razu; komunikat pod kartą: zapisano albo błąd (ostrzeżenie o starszym pliku pokazuje karta)
  function zapiszTeraz(r) {
    try {
      zapiszPlan(r);
      ui.wynik = { ok: true, tekst: r.api ? L("Zapisano. Terminy z Vantify z dnia " + dmy(r.plan.date) + ".", "Saved. Due dates from Vantify as of " + dmy(r.plan.date) + ".") : L("Zapisano. Terminy z eksportu " + dmy(r.plan.date) + ".", "Saved. Due dates from the export of " + dmy(r.plan.date) + ".") };
    } catch (e) { ui.wynik = { ok: false, tekst: errText(e) }; }
  }
  // „Vantify w apce” (PROD-035): okno Vantify; pobrany eksport zapisuje się od razu, zapis „Zbadaj” do udostępnienia
  function otworz(po) {
    var V = plugin("Vantify");
    if (!V) { ui.vantify = L("Vantify w apce działa w aplikacji Android.", "Vantify in the app works in the Android app."); zmiana(); return Promise.resolve(); }
    return V.open({ lang: lang() }).then(function (r) {
      var kept = keepLog(r && r.log);
      ui.pobierz = null; ui.vantify = kept === "memory" ? brakMiejsca() : null;
      if (r && r.csv) { try { zapiszTeraz(preview(r.csv)); } catch (e) { ui.wynik = { ok: false, tekst: errText(e) }; } }
      else if (po) po();
      else if (kept !== "memory") ui.vantify = L("Nie pobrano eksportu. Zapis „Zbadaj” jest w telefonie.", "No export downloaded. The “Explore” log is on the phone.");
      zmiana();
    }).catch(function () { ui.vantify = L("Nie udało się otworzyć Vantify.", "Could not open Vantify."); zmiana(); });
  }
  // „Zbadaj automatycznie” (Grzegorz 10/11/2026): ukryte okno Vantify samo czyta listy i szczegóły (tylko GET, vantify-sync.js
  // tryb explore) i kod strony; wynik dopisuje się do zapisu „Zbadaj” – udostępnia Grzegorz.
  function zbadaj() {
    var V = plugin("Vantify");
    if (!V || !V.sync) { ui.vantify = L("Zbadaj automatycznie działa w aplikacji Android.", "Explore automatically works in the Android app."); zmiana(); return Promise.resolve(); }
    ui.vantify = L("Badam Vantify – tylko odczyt, do 10 minut. Zostaw ten ekran otwarty.", "Exploring Vantify – read only, up to 10 minutes. Keep this screen open."); ui.zbadaj = true; zmiana();
    return V.sync({ mode: "explore" }).then(function (r) {
      ui.zbadaj = false;
      if (r && r.status === "ok") {
        var kept = keepLog(r.log, true);
        ui.vantify = kept === "memory" ? brakMiejsca()
          : L("Gotowe: " + (r.count || 0) + " odczytów z Vantify. Dotknij „Udostępnij zapis „Zbadaj”” i wyślij mi plik.", "Done: " + (r.count || 0) + " reads from Vantify. Tap “Share the Explore log” and send me the file.");
        zmiana(); return;
      }
      if (r && r.status === "login" && r.log && r.log.length) keepLog(r.log, true); // częściowy zapis zostaje
      ui.vantify = errText(new Error(r && r.status === "login" ? (r.code === "bad" ? "VANTIFY_BAD_LOGIN" : "VANTIFY_LOGIN") : "VANTIFY_SYNC")); zmiana();
    }).catch(function (e) { ui.zbadaj = false; ui.vantify = e && e.message === "VANTIFY_BUSY" ? L("Vantify jest teraz sprawdzany. Spróbuj za chwilę.", "Vantify is being checked right now. Try again in a moment.") : errText(new Error("VANTIFY_SYNC")); zmiana(); });
  }
  function udostepnij() {
    var z = zapis().z, S = plugin("ReportShare");
    if (!z) return;
    var json = JSON.stringify(z, null, 1), d = new Date(), name = "vantify-zbadaj-" + w.OESTNarzedzia.pad(d.getDate()) + w.OESTNarzedzia.pad(d.getMonth() + 1) + d.getFullYear() + ".json";
    if (!S) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name; a.click(); return; }
    var b64 = btoa(unescape(encodeURIComponent(json)));
    S.share({ subject: "Vantify – zapis Zbadaj", body: L("Zapis bez haseł, tokenów i danych osób.", "Log without passwords, tokens or personal data."), files: [{ name: name, data: b64 }] })
      .then(function () { ui.vantify = L("Przekazano do udostępnienia.", "Handed over for sharing."); zmiana(); })
      .catch(function () { ui.vantify = L("Nie udało się udostępnić zapisu.", "Could not share the log."); zmiana(); });
  }
  // „Pobierz z Vantify” (Grzegorz 10/11/2026): ukryte okno Vantify czyta listę zleceń i od razu zapisuje plan (26/11/2026).
  // Gdy Vantify prosi o logowanie: otwiera okno Vantify, a po „Zakończ” pobiera jeszcze raz (raz, bez pętli).
  function pobierz(retried) {
    ui.pobierz = L("Łączę z Vantify…", "Connecting to Vantify…"); ui.pobieranie = true; zmiana();
    return sync().then(function (r) {
      ui.pobieranie = false;
      if (r.status === "ok") { ui.pobierz = null; try { zapiszTeraz(apiPreview(r)); } catch (e) { ui.wynik = { ok: false, tekst: errText(e) }; } zmiana(); return; }
      // zapisane hasło odrzucone: nie otwieraj logowania w kółko, poproś o aktualne hasło
      if (r.status === "login" && r.code === "bad") { ui.pobierz = errText(new Error("VANTIFY_BAD_LOGIN")); ui.fokus++; zmiana(); return; }
      if (r.status === "login" && !retried) {
        ui.pobierz = L("Zaloguj się w Vantify, potem dotknij „Zakończ” – apka sama pobierze zlecenia.", "Sign in to Vantify, then tap “Done” – the app gets the jobs by itself."); zmiana();
        return otworz(function () { pobierz(true); });
      }
      ui.pobierz = errText(new Error(r.status === "login" ? "VANTIFY_LOGIN" : "VANTIFY_SYNC")); zmiana();
    }).catch(function (e) { ui.pobieranie = false; ui.pobierz = errText(e); zmiana(); });
  }
  // Sprawdzanie przy starcie apki: app/www/vantify-auto.js (ładowany na końcu głównej strony, po module okienek).
  // Po wejściu na ekran z okienka przy starcie (goAfter): prośba o hasło albo logowanie w Vantify
  function wejdz() {
    if (goAfter === "haslo") { goAfter = null; ui.pobierz = errText(new Error("VANTIFY_BAD_LOGIN")); ui.fokus++; }
    else if (goAfter === "login") { goAfter = null; ui.pobierz = L("Zaloguj się w Vantify, potem dotknij „Zakończ” – apka sama pobierze zlecenia.", "Sign in to Vantify, then tap “Done” – the app gets the jobs by itself."); otworz(function () { pobierz(true); }); }
    else goAfter = null;
    zmiana();
  }
  // już na Ustawienia → Vantify: ten sam adres nie otworzy ekranu od nowa, więc wchodzimy od razu (przegląd Codex #133)
  function goVantify(what) {
    goAfter = what;
    if (w.OESTEkrany.trasa() === "settings/vantify" && zywy) wejdz();
    else w.OESTEkrany.go("settings/vantify");
  }
  // Zapamiętany login i hasło (Grzegorz 10/11/2026): wpisujesz raz, zmieniasz, kiedy chcesz; hasło zagwiazdkowane, „Pokaż” je odsłania.
  // Zapis i szyfrowanie w telefonie (VantifyPlugin.saveLogin → Keystore). Ukryte okno Vantify loguje się nimi samo, najwyżej raz.
  // Pola (login, hasło) trzyma ekran; moduł oddaje stan zapisu {user, zapisane} i komunikat.
  function loginStan(r) {
    r = r || {};
    ui.login = r.bad ? L("Vantify nie przyjął zapisanego hasła. Wpisz aktualne hasło i zapisz – do tego czasu apka nie loguje się sama.", "Vantify did not accept the saved password. Type the current password and save – until then the app does not sign in by itself.")
      : r.saved ? L("Zapisane. Apka zaloguje się sama, gdy logowanie wygaśnie.", "Saved. The app signs in by itself when the sign-in expires.") : L("Nic nie zapisano.", "Nothing saved.");
    zmiana();
    return { user: r.user || "", zapisane: !!r.saved };
  }
  function loginOdswiez() {
    var V = plugin("Vantify");
    if (!V || !V.loginInfo) { ui.login = L("Zapis loginu działa w aplikacji Android.", "Saving the login works in the Android app."); zmiana(); return Promise.resolve(null); }
    return V.loginInfo().then(loginStan).catch(function () { return null; });
  }
  function loginZapisz(user, pass) {
    var V = plugin("Vantify");
    if (!V || !V.loginInfo) return Promise.resolve(null);
    if (!String(user || "").trim() || !pass) { ui.login = L("Wpisz login i hasło.", "Type the login and password."); zmiana(); return Promise.resolve(null); }
    return V.saveLogin({ user: String(user).trim(), pass: pass }).then(loginStan).catch(function () { ui.login = L("Nie udało się zapisać. Spróbuj jeszcze raz.", "Could not save. Try again."); zmiana(); return null; });
  }
  function loginUsun() {
    var V = plugin("Vantify");
    if (!V || !V.loginInfo) return Promise.resolve(null);
    return V.clearLogin().then(function (r) { var s = loginStan(r); s.user = ""; return s; }).catch(function () { return null; });
  }
  // zapisane hasło pokazuje okienko Androida; ekran apki go nie dostaje (ustalenie #39, Grzegorz 19/11/2026)
  function loginPokaz() {
    var V = plugin("Vantify");
    if (!V || !V.showLogin) return Promise.resolve();
    return V.showLogin({ lang: L("pl", "en") }).then(function (r) { if (!r || !r.ok) { ui.login = L("Nie ma zapisanego hasła.", "No saved password."); zmiana(); } }).catch(function () {});
  }
  function ekran(jest) { zywy = !!jest; if (zywy) wejdz(); }
  w.document.addEventListener("oest:ekran", function (e) { if (!/vantify/.test(e.detail.trasa)) zeruj(); });
  w.OESTVantifyImport = { preview: preview, apiPreview: apiPreview, save: save, info: info,
    // dla Vantify.vue: dane ekranu i akcje
    dane: dane, ekran: ekran, pobierz: function () { return pobierz(false); }, otworz: function () { return otworz(); }, zbadaj: zbadaj, udostepnij: udostepnij,
    loginOdswiez: loginOdswiez, loginZapisz: loginZapisz, loginUsun: loginUsun, loginPokaz: loginPokaz,
    // dla vantify-auto.js: pobranie, zapis planu, stan sprawdzania, przejście do Ustawienia → Vantify (hasło, logowanie)
    sync: sync, zapiszPlan: zapiszPlan,
    // dla reactive.js: zlecenia Reactive z ostatniego pobrania listy [{ id, summary, status }]
    reactive: function () { try { var x = JSON.parse(ls().getItem(RKEY) || "null"); return x && Array.isArray(x.jobs) ? x.jobs : []; } catch (e) { return []; } }, state: function (v) { if (v === undefined) return getJson(AKEY) || {}; setJson(AKEY, v); }, go: goVantify };
})(window);
