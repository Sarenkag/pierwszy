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
  // wczytany plik obowiązuje, chyba że apka ma nowszy eksport (ten sam dzień = wczytany, bo zrobiony świadomie)
  var s = stored(); if (s && s.date >= baseDate()) use(s);

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

  // Podgląd przed zapisem: nic nie zapisuje. Błędy: VANTIFY_FORMAT, VANTIFY_EMPTY, VANTIFY_OLDER.
  function preview(text) {
    var c = cur(), p = E.plan(E.parseCsv(text), { match: E.matcher(cards()), prevCards: c.cards || Object.keys(c.jobs || {}) });
    var now = String(c.exported || "").slice(0, 10);
    return { plan: p, changes: E.changes(c.jobs, p.jobs), older: p.date < now, currentDate: now };
  }
  // Zapis + ponowny odczyt (DATA-002): sukces dopiero, gdy telefon oddał to samo.
  function save(p) {
    var rec = { exported: p.exported, date: p.date, jobs: p.jobs, cards: p.cards, at: new Date().toISOString() };
    ls().setItem(KEY, JSON.stringify(rec));
    var back = stored(); if (!back || back.exported !== rec.exported) throw new Error("VANTIFY_SAVE");
    use(back);
    try { w.dispatchEvent(new CustomEvent("oest:vantify", { detail: { exported: back.exported } })); } catch (e) {}
    return back;
  }
  function info() { var c = cur(); return { date: String(c.exported || "").slice(0, 10), source: c.source || "app", importedAt: c.importedAt || null, jobs: count(c.jobs) }; }

  function errText(e) {
    var m = e && e.message;
    if (m === "VANTIFY_FORMAT") return L("To nie jest eksport Job z Vantify (brak kolumn zleceń).", "This is not a Vantify Job export (job columns missing).");
    if (m === "VANTIFY_EMPTY") return L("W pliku nie ma zleceń planowych (Planned).", "The file has no Planned jobs.");
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
  function zapis() { try { var z = JSON.parse(ls().getItem(ZKEY) || "null"); return z && z.entries ? { n: z.entries.length, z: z } : { n: 0 }; } catch (e) { return { n: 0 }; } }
  function keepLog(entries) {
    if (!entries || !entries.length) return;
    var old = zapis().z, all = ((old && old.entries) || []).concat(entries).slice(-1500), s;
    while ((s = JSON.stringify({ at: new Date().toISOString(), entries: all })).length > 900000 && all.length > 50) all = all.slice(Math.floor(all.length / 4));
    try { ls().setItem(ZKEY, s); } catch (e) {}
  }
  function plugin(name) { var C = w.Capacitor; if (!C || !C.isNativePlatform || !C.isNativePlatform()) return null; return (C.Plugins && C.Plugins[name]) || (C.registerPlugin && C.registerPlugin(name)); }
  function msg(box, t) { var m = box.querySelector("#vtMsg"); if (m) m.textContent = t; }
  function openVantify(box) {
    var V = plugin("Vantify");
    if (!V) { msg(box, L("Vantify w apce działa w aplikacji Android.", "Vantify in the app works in the Android app.")); return; }
    V.open({ lang: lang() }).then(function (r) {
      keepLog(r && r.log);
      draw(box);
      if (r && r.csv) { try { showText(box, r.csv); } catch (e) { box.querySelector("#vtPreview").innerHTML = "<p class=\"settings-status warn\">" + esc(errText(e)) + "</p>"; } }
      else msg(box, L("Nie pobrano eksportu. Zapis „Zbadaj” jest w telefonie.", "No export downloaded. The “Explore” log is on the phone."));
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
  var pending = null; // podgląd czekający na „Zapisz”
  function draw(box) {
    if (!box) return;
    var i = info();
    put(box, "<div class=\"panel\"><h2>" + L("Terminy PPM z Vantify", "PPM due dates from Vantify") + "</h2>" +
      "<p class=\"settings-selected\" id=\"vtNow\">" + L("Eksport z ", "Export from ") + dmy(i.date) + " · " + i.jobs + L(" zleceń", " jobs") + " · " +
      (i.source === "phone" ? L("wczytany w telefonie ", "loaded on this phone ") + dmy((i.importedAt || "").slice(0, 10)) + " " + hm(i.importedAt) : L("wbudowany w apkę", "built into the app")) + "</p>" +
      "<p class=\"hint\">" + L("W Vantify: Jobs → Export → Download. Potem tutaj wybierz pobrany plik job…csv. Terminy będą dokładnie takie jak w pliku.", "In Vantify: Jobs → Export → Download. Then pick the downloaded job…csv here. Due dates stay exactly as in the file.") + "</p>" +
      "<label class=\"btn go vt-file\">" + L("Wczytaj eksport Vantify", "Load Vantify export") + "<input id=\"vtFile\" type=\"file\" accept=\".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel,text/plain\"></label>" +
      "<div id=\"vtPreview\" aria-live=\"polite\"></div></div>" +
      "<div class=\"panel\"><h2>" + L("Vantify w apce", "Vantify in the app") + "</h2>" +
      "<p class=\"hint\">" + L("Logujesz się sam na stronie Vantify (apka nie zapisuje hasła, może je podpowiedzieć menedżer haseł Google). Jobs → Export → Download: apka sama weźmie plik i pokaże zmiany.", "You sign in yourself on the Vantify page (the app does not store the password; Google Password Manager may fill it). Jobs → Export → Download: the app takes the file and shows the changes.") + "</p>" +
      "<div class=\"settings-actions\"><button type=\"button\" class=\"btn go\" id=\"vtOpen\">" + L("Otwórz Vantify w apce", "Open Vantify in the app") + "</button>" +
      "<button type=\"button\" class=\"btn\" id=\"vtShare\"" + (zapis().n ? "" : " hidden") + ">" + L("Udostępnij zapis „Zbadaj” (", "Share the “Explore” log (") + zapis().n + ")</button></div>" +
      "<p class=\"hint\" id=\"vtMsg\" aria-live=\"polite\"></p></div>");
    box.querySelector("#vtOpen").onclick = function () { openVantify(box); };
    box.querySelector("#vtShare").onclick = function () { shareLog(box); };
    var input = box.querySelector("#vtFile");
    function show(r) {
        var out = box.querySelector("#vtPreview"), ch = r.changes, p = r.plan; pending = r;
        if (r.older) { pending = null; out.innerHTML = "<p class=\"settings-status warn\">" + L("Ten plik jest starszy (eksport z ", "This file is older (export from ") + dmy(p.date) + L(") niż obecny plan (", ") than the current plan (") + dmy(r.currentDate) + L("). Nic nie zmieniono.", "). Nothing changed.") + "</p>"; input.value = ""; return; }
        put(out, "<h3>" + L("Eksport z ", "Export from ") + dmy(p.date) + " · " + ch.total + L(" zleceń", " jobs") + "</h3>" +
          "<p>" + L("Nowe zlecenia: ", "New jobs: ") + ch.added.length + "</p>" + (ch.added.length ? list(ch.added, 8) : "") +
          "<p>" + L("Zamknięte w Vantify (znikną z apki): ", "Closed in Vantify (removed from the app): ") + ch.closed.length + "</p>" + (ch.closed.length ? list(ch.closed, 8) : "") +
          (p.missing.length ? "<p class=\"hint\">" + L("Bez karty w apce (pominięte): ", "No card in the app (skipped): ") + esc(p.missing.join(", ")) + "</p>" : "") +
          "<div class=\"settings-actions\"><button type=\"button\" class=\"btn go\" id=\"vtSave\">" + L("Zapisz w apce", "Save in the app") + "</button><button type=\"button\" class=\"btn\" id=\"vtCancel\">" + L("Anuluj", "Cancel") + "</button></div>");
        out.querySelector("#vtCancel").onclick = function () { pending = null; out.innerHTML = ""; input.value = ""; };
        out.querySelector("#vtSave").onclick = function () {
          try { save(p); pending = null; draw(box); box.querySelector("#vtPreview").innerHTML = "<p class=\"settings-status ok\">" + L("Zapisano. Terminy z eksportu ", "Saved. Due dates from the export of ") + dmy(p.date) + ".</p>"; }
          catch (e) { out.insertAdjacentHTML("beforeend", "<p class=\"settings-status warn\">" + esc(errText(e)) + "</p>"); }
        };
    }
    showText = function (bx, text) { show(preview(text)); };
    input.onchange = function () {
      var f = input.files && input.files[0], out = box.querySelector("#vtPreview"); if (!f) return;
      f.text().then(function (text) { show(preview(text)); })
        .catch(function (e) { pending = null; out.innerHTML = "<p class=\"settings-status warn\">" + esc(errText(e)) + "</p>"; input.value = ""; });
    };
    if (pending) show(pending); // zmiana języka: podgląd zostaje, tylko w drugim języku
  }
  w.addEventListener("oest:vantify-ui", function (e) { draw(e.detail); });
  w.addEventListener("hashchange", function () { if (!/vantify/.test(location.hash)) pending = null; });
  w.OESTVantifyImport = { preview: preview, save: save, info: info, draw: draw };
})(window);
