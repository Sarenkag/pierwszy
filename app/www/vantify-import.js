// Eksport Vantify wczytany w telefonie (Grzegorz 10/11/2026): Ustawienia → Vantify → Wczytaj eksport (CSV „Job”).
// Plan z wczytanego pliku zastępuje plan wbudowany w apkę (vantify-plan.js), dopóki nowa wersja apki nie przyniesie
// eksportu z późniejszą datą. Terminy dokładnie z pliku (PROD-010). Liczy moduł moduly/eksport-vantify.
// Ładowany zaraz po ppm.js (index.html i inspekcje/index.html), przed pierwszym rysowaniem – obie strony widzą ten sam plan.
// ppm.js czyta OEST_VANTIFY przy każdym wywołaniu, więc podmiana po jego wczytaniu działa od razu.
(function (w) {
  // Plan wbudowany (vantify-plan.js) jest jedynym obiektem OEST_VANTIFY; wczytany plik podmienia w nim tylko zlecenia i karty.
  var KEY = "oest.vantify.plan", E = w.OESTEksportVantify, V = w.OEST_VANTIFY;
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
  function L(pl, en) { return lang() === "en" ? en : pl; }
  function dmy(iso) { return iso ? iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4) : "–"; }
  function hm(iso) { var d = new Date(iso); return isNaN(d) ? "" : ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function cards() { var P = w.OEST_PPM; return P ? P.tasks.map(function (t) { return [t.id, t.name]; }) : []; }
  function cardName(id) { var P = w.OEST_PPM, t = P && P.byId(id); return t ? t.name : id; }
  // zmiana treści bez przerysowania (moduly/podmien): przełącznik PL/EN podmienia tylko teksty
  function put(el, h) { if (w.OESTPodmien && el.firstChild) w.OESTPodmien.html(el, h); else el.innerHTML = h; }
  function count(j) { return Object.keys(j || {}).reduce(function (n, k) { return n + j[k].length; }, 0); }

  // Podgląd przed zapisem: nic nie zapisuje. Błędy: VANTIFY_FORMAT, VANTIFY_EMPTY. older = tylko ostrzeżenie
  // (data pliku to najnowsze createdAt, nie dzień eksportu: świeży eksport po zamknięciu najnowszego zlecenia wygląda na starszy).
  function previewRows(rows) {
    var c = cur(), p = E.plan(rows, { match: E.matcher(cards()), prevCards: c.cards || Object.keys(c.jobs || {}) });
    var now = String(c.exported || "").slice(0, 10);
    return { plan: p, changes: E.changes(c.jobs, p.jobs), older: p.date < now, currentDate: now };
  }
  function preview(text) { return previewRows(E.parseCsv(text)); }
  // Lista zleceń z Vantify (vantify-sync.js, bez eksportu): ta sama droga co plik (moduł eksport-vantify), data = dzień pobrania.
  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function apiPreview(r, day) {
    var rows = E.fromApi(r && r.jobs, day || today());
    if (!rows.some(function (x) { return x.jobType === "Planned"; })) throw new Error("VANTIFY_EMPTY_LIST");
    var pv = previewRows(rows); pv.api = true; pv.older = false; return pv;
  }
  // Zapis + ponowny odczyt (DATA-002): sukces dopiero, gdy telefon oddał to samo.
  function save(p) {
    var rec = { exported: p.exported, date: p.date, jobs: p.jobs, cards: p.cards, at: new Date().toISOString() };
    ls().setItem(KEY, JSON.stringify(rec));
    var back = stored(); if (!back || back.exported !== rec.exported) throw new Error("VANTIFY_SAVE");
    use(back);
    try { w.dispatchEvent(new CustomEvent("oest:vantify", { detail: { exported: back.exported } })); } catch (e) {}
    // zmiana terminów: ten sam sygnał co przy zmianie terminów PPM (kalendarz telefonu, ekran główny)
    try { w.dispatchEvent(new CustomEvent("oest:ppm-due-changed", { detail: { source: "vantify" } })); } catch (e) {}
    return back;
  }
  function info() { var c = cur(); return { date: String(c.exported || "").slice(0, 10), source: c.source || "app", importedAt: c.importedAt || null, jobs: count(c.jobs) }; }

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
  function list(items, max) {
    return "<ul class=\"vt-list\">" + items.slice(0, max).map(function (x) { return "<li>" + dmy(x.due) + " · " + esc(cardName(x.id)) + " · " + esc(x.no) + "</li>"; }).join("") +
      (items.length > max ? "<li>" + L("i jeszcze ", "and ") + (items.length - max) + "</li>" : "") + "</ul>";
  }
  // Ekran w Ustawieniach (settings-ui wysyła zdarzenie z miejscem na ekran; Ustawienia nie zależą od tego pliku)
  // Zapis „Zbadaj” z ostatnich wizyt w Vantify (vantify-rejestr.js): tylko w telefonie, do udostępnienia przez Grzegorza
  var showText = function () {};
  var ZKEY = "oest.vantify.zapis";
  var inMemory = null; // kopia w pamięci, gdy telefon nie zapisał (np. brak miejsca): do udostępnienia w tej sesji
  function zapis() {
    if (inMemory) return { n: inMemory.entries.length, z: inMemory, memory: true };
    try { var z = JSON.parse(ls().getItem(ZKEY) || "null"); return z && z.entries ? { n: z.entries.length, z: z } : { n: 0 }; } catch (e) { return { n: 0 }; }
  }
  // Zapis + ponowny odczyt (DATA-002). Brak miejsca: mniejszy zapis (najnowsze wpisy); gdy i to nie wejdzie, kopia w pamięci.
  // Zwraca "ok" | "memory" | null (nic nowego).
  function keepLog(entries) {
    if (!entries || !entries.length) return null;
    var old = zapis().z, all = ((old && old.entries) || []).concat(entries).slice(-1500), s, rec;
    for (;;) {
      while ((s = JSON.stringify(rec = { at: new Date().toISOString(), entries: all })).length > 900000 && all.length > 50) all = all.slice(Math.floor(all.length / 4));
      try { ls().setItem(ZKEY, s); var back = JSON.parse(ls().getItem(ZKEY) || "null"); if (back && back.entries && back.entries.length === all.length) { inMemory = null; return "ok"; } } catch (e) {}
      if (all.length <= entries.length || all.length <= 50) break;
      all = all.slice(Math.floor(all.length / 2)); // najpierw oddaj starsze wpisy
    }
    inMemory = rec; return "memory";
  }
  function plugin(name) { var C = w.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null; return (C.Plugins && C.Plugins[name]) || (C.registerPlugin && C.registerPlugin(name)); }
  function msg(box, t) { var m = box.querySelector("#vtMsg"); if (m) m.textContent = t; }
  function openVantify(box, after) {
    var V = plugin("Vantify");
    if (!V) { msg(box, L("Vantify w apce działa w aplikacji Android.", "Vantify in the app works in the Android app.")); return; }
    V.open({ lang: lang() }).then(function (r) {
      var kept = keepLog(r && r.log);
      draw(box);
      if (kept === "memory") msg(box, L("Telefon nie zapisał zapisu „Zbadaj” (brak miejsca). Udostępnij go teraz, zanim zamkniesz apkę.", "The phone could not store the “Explore” log (no space). Share it now, before closing the app."));
      if (r && r.csv) { try { showText(box, r.csv); } catch (e) { pending = null; box.querySelector("#vtPreview").innerHTML = "<p class=\"settings-status warn\">" + esc(errText(e)) + "</p>"; } }
      else if (after) after(); // po zalogowaniu: od razu pobierz zlecenia
      else if (kept !== "memory") msg(box, L("Nie pobrano eksportu. Zapis „Zbadaj” jest w telefonie.", "No export downloaded. The “Explore” log is on the phone."));
    }).catch(function () { msg(box, L("Nie udało się otworzyć Vantify.", "Could not open Vantify.")); });
  }
  function shareLog(box) {
    var z = zapis().z, S = plugin("ReportShare");
    if (!z) return;
    var json = JSON.stringify(z, null, 1), d = new Date(), name = "vantify-zbadaj-" + ("0" + d.getDate()).slice(-2) + ("0" + (d.getMonth() + 1)).slice(-2) + d.getFullYear() + ".json";
    if (!S) { var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = name; a.click(); return; }
    var b64 = btoa(unescape(encodeURIComponent(json)));
    S.share({ subject: "Vantify – zapis Zbadaj", body: L("Zapis bez haseł, tokenów i danych osób.", "Log without passwords, tokens or personal data."), files: [{ name: name, data: b64 }] })
      .then(function () { msg(box, L("Przekazano do udostępnienia.", "Handed over for sharing.")); })
      .catch(function () { msg(box, L("Nie udało się udostępnić zapisu.", "Could not share the log.")); });
  }
  // „Pobierz z Vantify” (Grzegorz 10/11/2026): ukryte okno Vantify czyta listę zleceń; podgląd i zapis jak przy pliku.
  // Gdy Vantify prosi o logowanie: otwiera okno Vantify, a po „Zakończ” pobiera jeszcze raz (raz, bez pętli).
  var AKEY = "oest.vantify.auto", NKEY = "oest.vantify.nowe";
  // odłożony podgląd z Vantify; gdy telefon go nie zapisze (brak miejsca), zostaje w pamięci – „Pokaż” nie otworzy starszej listy (przegląd Codex #135)
  var memNew = null;
  function dropNew() { memNew = null; setJson(NKEY, null); }
  var showApi = function () {}, goAfter = null;
  function getJson(k) { try { return JSON.parse(ls().getItem(k) || "null"); } catch (e) { return null; } }
  function setJson(k, v) { try { if (v == null) ls().removeItem(k); else ls().setItem(k, JSON.stringify(v)); } catch (e) {} }
  function sync() {
    var V = plugin("Vantify");
    if (!V || !V.sync) return Promise.reject(new Error("VANTIFY_NATIVE"));
    return V.sync({}).then(function (r) {
      var st = getJson(AKEY) || {}; st.at = Date.now(); st.last = (r && r.status) || "error"; setJson(AKEY, st);
      return r || {};
    });
  }
  function pullMsg(box, t) { var m = box.querySelector("#vtPullMsg"); if (m) m.textContent = t; }
  function pull(box, retried) {
    var b = box.querySelector("#vtPull");
    pullMsg(box, L("Łączę z Vantify…", "Connecting to Vantify…")); if (b) b.disabled = true;
    sync().then(function (r) {
      if (b) b.disabled = false;
      if (r.status === "ok") { pullMsg(box, ""); try { showApi(apiPreview(r)); } catch (e) { pending = null; box.querySelector("#vtPreview").innerHTML = "<p class=\"settings-status warn\">" + esc(errText(e)) + "</p>"; } return; }
      // zapisane hasło odrzucone: nie otwieraj logowania w kółko, poproś o aktualne hasło
      if (r.status === "login" && r.code === "bad") { pullMsg(box, errText(new Error("VANTIFY_BAD_LOGIN"))); loginUi(box); var f = box.querySelector("#vtPass"); if (f) f.focus(); return; }
      if (r.status === "login" && !retried) {
        pullMsg(box, L("Zaloguj się w Vantify, potem dotknij „Zakończ” – apka sama pobierze zlecenia.", "Sign in to Vantify, then tap “Done” – the app gets the jobs by itself."));
        openVantify(box, function () { pull(box, true); });
        return;
      }
      pullMsg(box, errText(new Error(r.status === "login" ? "VANTIFY_LOGIN" : "VANTIFY_SYNC")));
    }).catch(function (e) { if (b) b.disabled = false; pullMsg(box, errText(e)); });
  }
  // Sprawdzanie przy starcie apki: app/www/vantify-auto.js (ładowany na końcu głównej strony, po module okienek).
  // już na Ustawienia → Vantify: ten sam adres nie przerysuje widoku, więc rysujemy od razu (przegląd Codex #133)
  var lastBox = null;
  function goVantify(what) {
    goAfter = what;
    if (location.hash === "#settings/vantify" && lastBox && lastBox.isConnected) { pending = null; draw(lastBox); }
    else location.hash = "#settings/vantify";
  }
  // Zapamiętany login i hasło (Grzegorz 10/11/2026): wpisujesz raz, zmieniasz, kiedy chcesz; hasło zagwiazdkowane, „Pokaż” je odsłania.
  // Zapis i szyfrowanie w telefonie (VantifyPlugin.saveLogin → Keystore). Ukryte okno Vantify loguje się nimi samo, najwyżej raz.
  // wpisane, a jeszcze niezapisane pola: zmiana języka przerysowuje ekran, wpisane wartości zostają (przegląd Codex #134)
  var draftLogin = null;
  function loginUi(box) {
    var V = plugin("Vantify"), u = box.querySelector("#vtUser"), pw = box.querySelector("#vtPass"), sh = box.querySelector("#vtLoginShow");
    var keep = draftLogin; draftLogin = null;
    function remember() { draftLogin = { u: u.value, p: pw.dataset.shown ? "" : pw.value, show: pw.type === "text" && !pw.dataset.shown }; }
    u.oninput = pw.oninput = function () { delete pw.dataset.shown; remember(); };
    function m(t) { var e = box.querySelector("#vtLoginMsg"); if (e) e.textContent = t; }
    function state(r) {
      r = r || {};
      if (keep) { u.value = keep.u; pw.value = keep.p; pw.type = keep.show ? "text" : "password"; sh.textContent = keep.show ? L("Ukryj", "Hide") : L("Pokaż", "Show"); draftLogin = keep; keep = null; }
      else { if (r.user) u.value = r.user; pw.value = ""; pw.type = "password"; sh.textContent = L("Pokaż", "Show"); draftLogin = null; }
      pw.placeholder = r.saved ? "••••••••" : "";
      m(r.bad ? L("Vantify nie przyjął zapisanego hasła. Wpisz aktualne hasło i zapisz – do tego czasu apka nie loguje się sama.", "Vantify did not accept the saved password. Type the current password and save – until then the app does not sign in by itself.")
        : r.saved ? L("Zapisane. Apka zaloguje się sama, gdy logowanie wygaśnie.", "Saved. The app signs in by itself when the sign-in expires.") : L("Nic nie zapisano.", "Nothing saved."));
    }
    if (!V || !V.loginInfo) { m(L("Zapis loginu działa w aplikacji Android.", "Saving the login works in the Android app.")); return; }
    V.loginInfo().then(state).catch(function () {});
    box.querySelector("#vtLoginSave").onclick = function () {
      if (!u.value.trim() || !pw.value) { m(L("Wpisz login i hasło.", "Type the login and password.")); return; }
      V.saveLogin({ user: u.value.trim(), pass: pw.value }).then(state).catch(function () { m(L("Nie udało się zapisać. Spróbuj jeszcze raz.", "Could not save. Try again.")); });
    };
    sh.onclick = function () {
      if (pw.type === "text") { pw.type = "password"; if (pw.dataset.shown) { pw.value = ""; delete pw.dataset.shown; } sh.textContent = L("Pokaż", "Show"); if (draftLogin) remember(); return; }
      if (pw.value) { pw.type = "text"; sh.textContent = L("Ukryj", "Hide"); remember(); return; }
      V.showLogin().then(function (r) { if (!r || !r.pass) { m(L("Nie ma zapisanego hasła.", "No saved password.")); return; } pw.value = r.pass; pw.dataset.shown = "1"; pw.type = "text"; sh.textContent = L("Ukryj", "Hide"); }).catch(function () {});
    };
    box.querySelector("#vtLoginClear").onclick = function () { V.clearLogin().then(function (r) { u.value = ""; state(r); }).catch(function () {}); };
  }
  var pending = null; // podgląd czekający na „Zapisz”
  function draw(box) {
    if (!box) return;
    lastBox = box;
    var i = info();
    put(box, "<div class=\"panel\"><h2>" + L("Terminy PPM z Vantify", "PPM due dates from Vantify") + "</h2>" +
      "<p class=\"settings-selected\" id=\"vtNow\">" + L("Eksport z ", "Export from ") + dmy(i.date) + " · " + i.jobs + L(" zleceń", " jobs") + " · " +
      (i.source === "phone" ? L("wczytany w telefonie ", "loaded on this phone ") + dmy((i.importedAt || "").slice(0, 10)) + " " + hm(i.importedAt) : L("wbudowany w apkę", "built into the app")) + "</p>" +
      "<p class=\"hint\">" + L("„Pobierz z Vantify”: apka sama bierze listę zleceń z Vantify (lista Jobs z Twoim filtrem; logowanie w Vantify w apce trwa 24 h). Apka sprawdza też sama przy starcie, najwyżej co 4 h. Terminy dokładnie z Vantify. Zapas: Jobs → Export → Download i wybierz plik job…csv.", "“Get from Vantify”: the app takes the job list from Vantify itself (Jobs list with your filter; Vantify sign-in in the app lasts 24 h). The app also checks on start, at most every 4 h. Due dates exactly from Vantify. Backup: Jobs → Export → Download and pick the job…csv file.") + "</p>" +
      "<div class=\"settings-actions\"><button type=\"button\" class=\"btn go\" id=\"vtPull\">" + L("Pobierz z Vantify", "Get from Vantify") + "</button>" +
      "<label class=\"btn vt-file\">" + L("Wczytaj eksport Vantify", "Load Vantify export") + "<input id=\"vtFile\" type=\"file\" accept=\".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain\"></label></div>" +
      "<p class=\"hint\" id=\"vtPullMsg\" aria-live=\"polite\"></p>" +
      "<div id=\"vtPreview\" aria-live=\"polite\"></div></div>" +
      "<div class=\"panel\"><h2>" + L("Vantify w apce", "Vantify in the app") + "</h2>" +
      "<p class=\"hint\">" + L("Login i hasło do Vantify zapisane w telefonie (zaszyfrowane): gdy logowanie wygaśnie (po 24 h), apka zaloguje się sama. Zmiana hasła albo loginu – wpisz nowe i zapisz.", "Vantify sign-in saved on this phone (encrypted): when the sign-in expires (after 24 h) the app signs in by itself. Password or login changed – type the new one and save.") + "</p>" +
      "<label class=\"field\"><span>" + L("Login", "Login") + "</span><input id=\"vtUser\" type=\"text\" autocomplete=\"username\" autocapitalize=\"off\" spellcheck=\"false\"></label>" +
      "<label class=\"field\"><span>" + L("Hasło", "Password") + "</span><input id=\"vtPass\" type=\"password\" autocomplete=\"current-password\"></label>" +
      "<div class=\"settings-actions\"><button type=\"button\" class=\"btn go\" id=\"vtLoginSave\">" + L("Zapisz login i hasło", "Save login and password") + "</button>" +
      "<button type=\"button\" class=\"btn\" id=\"vtLoginShow\">" + L("Pokaż", "Show") + "</button>" +
      "<button type=\"button\" class=\"btn\" id=\"vtLoginClear\">" + L("Usuń", "Remove") + "</button></div>" +
      "<p class=\"hint\" id=\"vtLoginMsg\" aria-live=\"polite\"></p>" +
      "<div class=\"settings-actions\"><button type=\"button\" class=\"btn go\" id=\"vtOpen\">" + L("Otwórz Vantify w apce", "Open Vantify in the app") + "</button>" +
      "<button type=\"button\" class=\"btn\" id=\"vtShare\"" + (zapis().n ? "" : " hidden") + ">" + L("Udostępnij zapis „Zbadaj” (", "Share the “Explore” log (") + zapis().n + ")</button></div>" +
      "<p class=\"hint\" id=\"vtMsg\" aria-live=\"polite\"></p></div>");
    box.querySelector("#vtOpen").onclick = function () { openVantify(box); };
    box.querySelector("#vtPull").onclick = function () { pull(box); };
    box.querySelector("#vtShare").onclick = function () { shareLog(box); };
    loginUi(box);
    var input = box.querySelector("#vtFile");
    function show(r) {
        var out = box.querySelector("#vtPreview"), ch = r.changes, p = r.plan; pending = r;
        put(out, (r.older ? "<p class=\"settings-status warn\">" + L("Uwaga: najnowsze zlecenie w pliku jest z ", "Note: the newest job in the file is from ") + dmy(p.date) + L(", a w obecnym planie z ", ", the current plan has ") + dmy(r.currentDate) + L(". Plik może być starszy. Zapisz tylko, jeśli to świeży eksport.", ". The file may be older. Save only if it is a fresh export.") + "</p>" : "") + "<h3>" + (r.api ? L("Vantify, stan na ", "Vantify as of ") : L("Eksport z ", "Export from ")) + dmy(p.date) + " · " + ch.total + L(" zleceń", " jobs") + "</h3>" +
          "<p>" + L("Nowe zlecenia: ", "New jobs: ") + ch.added.length + "</p>" + (ch.added.length ? list(ch.added, 8) : "") +
          "<p>" + L("Zamknięte w Vantify (znikną z apki): ", "Closed in Vantify (removed from the app): ") + ch.closed.length + "</p>" + (ch.closed.length ? list(ch.closed, 8) : "") +
          (p.missing.length ? "<p class=\"hint\">" + L("Bez karty w apce (pominięte): ", "No card in the app (skipped): ") + esc(p.missing.join(", ")) + "</p>" : "") +
          "<div class=\"settings-actions\"><button type=\"button\" class=\"btn go\" id=\"vtSave\">" + L("Zapisz w apce", "Save in the app") + "</button><button type=\"button\" class=\"btn\" id=\"vtCancel\">" + L("Anuluj", "Cancel") + "</button></div>");
        out.querySelector("#vtCancel").onclick = function () { if (r.api) dropNew(); pending = null; out.innerHTML = ""; input.value = ""; };
        out.querySelector("#vtSave").onclick = function () {
          try { save(p); dropNew(); /* każdy zapis (API albo plik) unieważnia odłożony podgląd */ pending = null; draw(box); box.querySelector("#vtPreview").innerHTML = "<p class=\"settings-status ok\">" + (r.api ? L("Zapisano. Terminy z Vantify z dnia ", "Saved. Due dates from Vantify as of ") : L("Zapisano. Terminy z eksportu ", "Saved. Due dates from the export of ")) + dmy(p.date) + ".</p>"; }
          catch (e) { out.insertAdjacentHTML("beforeend", "<p class=\"settings-status warn\">" + esc(errText(e)) + "</p>"); }
        };
    }
    showText = function (bx, text) { show(preview(text)); };
    showApi = function (r) { show(r); };
    input.onchange = function () {
      var f = input.files && input.files[0], out = box.querySelector("#vtPreview"); if (!f) return;
      f.text().then(function (text) { show(preview(text)); })
        .catch(function (e) { pending = null; out.innerHTML = "<p class=\"settings-status warn\">" + esc(errText(e)) + "</p>"; input.value = ""; });
    };
    if (pending) show(pending); // zmiana języka: podgląd zostaje, tylko w drugim języku
    else if (goAfter === "haslo") { goAfter = null; pullMsg(box, errText(new Error("VANTIFY_BAD_LOGIN"))); var pf = box.querySelector("#vtPass"); if (pf) { pf.scrollIntoView({ block: "center" }); pf.focus(); } }
    else if (goAfter === "login") { goAfter = null; pullMsg(box, L("Zaloguj się w Vantify, potem dotknij „Zakończ” – apka sama pobierze zlecenia.", "Sign in to Vantify, then tap “Done” – the app gets the jobs by itself.")); openVantify(box, function () { pull(box, true); }); }
    else {
      // nowe terminy znalezione przy starcie apki: podgląd czeka tutaj, dopóki nie zapiszesz albo nie anulujesz
      goAfter = null; var nw = memNew || getJson(NKEY);
      if (nw && nw.jobs) { try { var pv = apiPreview(nw, nw.day); if (pv.changes.added.length || pv.changes.closed.length) show(pv); else dropNew(); } catch (e) { dropNew(); } }
    }
  }
  w.addEventListener("oest:vantify-ui", function (e) { draw(e.detail); });
  w.addEventListener("hashchange", function () { if (!/vantify/.test(location.hash)) { pending = null; draftLogin = null; } });
  w.OESTVantifyImport = { preview: preview, apiPreview: apiPreview, save: save, info: info, draw: draw,
    // dla vantify-auto.js: pobranie, stan sprawdzania, podgląd odłożony do Ustawienia → Vantify
    sync: sync, today: today, state: function (v) { if (v === undefined) return getJson(AKEY) || {}; setJson(AKEY, v); },
    keepNew: function (r) {
      if (!r) { dropNew(); return; }
      var v = { day: today(), jobs: r.jobs }; memNew = null;
      try { ls().setItem(NKEY, JSON.stringify(v)); } catch (e) { memNew = v; try { ls().removeItem(NKEY); } catch (e2) {} }
    }, go: goVantify };
})(window);
