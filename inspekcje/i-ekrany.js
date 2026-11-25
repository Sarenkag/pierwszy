"use strict";
// i-ekrany.js – ekrany strony i przejścia między nimi.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: kolejności wczytywania w index.html.
  // ---------- ekrany ----------
  var PPM = window.OEST_PPM || null;
  var cur = { type: TYPES[0], code: "", mode: "one", ppm: null };
  // Odzyskana inspekcja (etap 2c, Grzegorz 08/11/2026): inspekcja odtworzona z raportu w archiwum (moduly/raporty), otwierana
  // z klocka Raporty (#rec=id). Osobny szkic, bez zmian na liście PPM (termin, etap, ⚙), pigułka „Odzyskana”, obok Wyślij przycisk Update.
  var REC = null, REC_ID = (function () { try { return new URLSearchParams(location.hash.slice(1)).get("rec") || ""; } catch (e) { return ""; } })();
  // widoczny ekran strony i jego tytuł w górnym pasku ramy (Grzegorz 25.11.2026: ten sam pasek co w całej apce, tytuł = nazwa ekranu / inspekcji)
  var widok = "", tytulFormularza = ""; // tytulFormularza: kod urządzenia albo nazwa zlecenia zbiorczego (i-formularz.js, i-zbiorcze.js)
  // wyjście ze strony Wstecz z ekranu startowego: w apce na Androida do menu głównego albo tam, skąd przyszedłem (i-start.js), w przeglądarce – lista, z której przyszedłem
  var wyjscie = "../index.html#home", wyjscieApka = false;
  window.addEventListener("oest:lang", tytul); // tytul(): tytul-etap.js
  function show(v) {
    if (REC && (v === "home" || v === "list")) { leave(backUrl()); return; } // odzyskana: wyjście wraca do klocka Raporty
    if (cur.ppm && (v === "home" || (v === "list" && !cur.ppm.open))) { leave(backUrl()); return; }
    if (APP && v === "home" && location.hash === "#queue") { leave(backUrl()); return; } // z kolejki wracamy do listy inspekcji
    ["home", "list", "form", "preview", "queue"].forEach(function (n) { $("v-" + n).hidden = n !== v; });
    widok = v; tytul();
    if (v === "home") renderHome();
    if (v === "list") renderList();
    renderPpmBar();
    if (v === "queue") { renderNet(); OESTKolejkaWidok.powiadom(); }
    OESTEkrany.naGore();
  }
  // Raport w trakcie wysyłki kończymy przed wyjściem na listę (dalsze z kolejki lista PPM wyśle sama)
  // powrót tam, skąd przyszedłem (lista PPM, kalendarz, kolejka…) – zapisane przez app/www/index.html goInsp()
  function backUrl() { if (REC_ID) return "../index.html#settings/my-reports"; var b = OESTPowrot.odczytaj(false); return "../index.html" + (b && /^#[\w=&.-]*$/.test(b.h) ? b.h : "#ppm"); }
  function leave(url) { saveDraftNow().then(function () { return gm() ? OESTSender.whenIdle() : null; }).then(function () { location.replace(url); }); } // replace: strona inspekcji nie zostaje w historii (Wstecz telefonu przed startem Ionic nie wróci do niej); szkic zapisany, zanim strona zniknie
  // Wysyłka prosto z Gmaila (zalogowany w apce): moduł ../moduly/wysylka, pasek stanu na dole
  function gm() { return APP && !!window.OESTSender && OESTSender.active(); }
  // Podczas przygotowania raportu formularz musi zostać ten sam (wynik dotyczy tego urządzenia i tego zlecenia)
  var queueing = false;
  // Wstecz telefonu (szkielet Ionic, moduly/szkielet; Grzegorz 08/11): okienko zamyka szkielet; potem jeden poziom w górę strony,
  // z ekranu startowego – lista, z której przyszedłem. Bez strzałki ‹ na ekranie (Grzegorz 25.11.2026: tylko Wstecz telefonu). Treść przewija Rama.vue.
  var WSTECZ = { list: "home", form: "list", preview: "form", queue: "home" };
  OESTEkrany.strona({ up: function () { if (queueing) return; if (WSTECZ[widok]) show(WSTECZ[widok]); else leave(wyjscieApka ? wyjscie : backUrl()); } });
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { if (!queueing) show(b.getAttribute("data-go")); }); });

  // zrobione dziś (zaznaczane przy dodaniu do kolejki), osobno dla każdego rodzaju — ten sam kod może być w dwóch rejestrach
  function doneToday(t) { var d = load("done", {}), day = d[NZ.dzienIso(new Date())] || {}; return day[t.id] || {}; }
  function markDone(t, code) {
    var d = load("done", {}), k = NZ.dzienIso(new Date()), keep = {};
    keep[k] = d[k] || {}; keep[k][t.id] = keep[k][t.id] || {}; keep[k][t.id][code] = NZ.godzina(new Date()); save("done", keep);
  }
  function waiting(t, code) { return queue.some(function (q) { return q.type === t.id && q.code === code && q.status !== "sent"; }); }

  function renderHome() {
    $("homeSub").textContent = (cfg.site ? cfg.site + " · " : "") + NZ.data(new Date());
    widokInspekcji("types", "fragment", { rodzaj: "typy", lista: TYPES.map(function (t) {
      var all = devices(t), dn = doneToday(t), done = all.filter(function (d) { return dn[d.code]; }).length, pr = t.batch && load("bprog_" + t.id, null);
      function opis() { return pr && pr.n ? "◐ W trakcie: " + pr.n + "/" + all.length + window.OESTT(" · od ", " · since ") + NZ.data(new Date(pr.started)) + " " + window.OESTT("· dotknij, by wznowić", "· tap to resume") : all.length + window.OESTT(" urządzeń · dziś zrobione: ", " devices · done today: ") + done; }
      return { id: t.id, tytul: t.name, licznik: pr && pr.n ? pr.n + "/" + all.length : "", podpis: opis(),
        podpisAlt: window.OESTBledy && OESTBledy.wJezyku ? OESTBledy.wJezyku(OESTBledy.drugi(), opis) : "" };
    }) }, function (id) {
      cur.type = TYPES.filter(function (t) { return t.id === id; })[0]; $("search").value = "";
      (cur.type.batch ? loadBatch(cur.type) : Promise.resolve()).then(function () { show("list"); }, function (e) {
        say(window.OESTT("Nie udało się odczytać zapisanego zlecenia (", "Could not read the saved job (") + gErr(e) + window.OESTT("). Zamknij i otwórz apkę ponownie — nic nie zostało usunięte.", "). Close and reopen the app — nothing was deleted."));
      });
    });
    renderNet();
  }
  // Urządzenie: kod albo {code, loc, room} z Code.gs; lokalizacja z kodu (TA/TB) albo zapisana przy dodawaniu
  function norm(c) {
    if (typeof c === "string") return { code: c, loc: RD.wieza(c) || "Tower B", room: "" };
    return { code: c.code, loc: c.loc || RD.wieza(c.code) || "Tower B", room: c.room || "" };
  }
  function customList(t) { return load("custom_" + t.id, []).map(norm); }
  function devices(t) {
    var list = t.devices.map(norm);
    customList(t).forEach(function (c) { if (!list.some(function (x) { return x.code === c.code; })) list.push(c); });
    return list;
  }
  function devOf(code) { return devices(cur.type).filter(function (x) { return x.code === code; })[0] || norm(code); }
  function where(d) { return [d.loc, RD.pietro(d.code), d.room].filter(Boolean).join(", "); }
  var lastQueued = "";
  function renderList() {
    var t = cur.type, dn = doneToday(t), q = val("search").toUpperCase();
    var all = devices(t);
    var done = all.filter(function (d) { return dn[d.code]; }).length;
    $("listSub").textContent = t.batch ? window.OESTT("Raport zbiorczy: otwórz tylko urządzenia z uwagami albo ze zdjęciem", "Combined report: open only devices with remarks or a photo") :
      window.OESTT("Dziś zrobione: ", "Done today: ") + done + window.OESTT(" z ", " of ") + all.length + (lastQueued ? " · " + lastQueued + window.OESTT(" w kolejce", " queued") : "");
    renderBatchBar();
    var groups = {};
    all.filter(function (d) { return !q || d.code.indexOf(q) >= 0; }).forEach(function (d) { (groups[d.loc] = groups[d.loc] || []).push(d); });
    var order = ["Tower A", "Tower B", "Pavilion"].concat(Object.keys(groups).filter(function (g) { return ["Tower A", "Tower B", "Pavilion"].indexOf(g) < 0; })).filter(function (g) { return groups[g]; });
    widokInspekcji("groups", "fragment", { rodzaj: "grupy", lista: order.map(function (g) {
      var list = groups[g]; return { nazwa: g, zrobione: list.filter(function (d) { return t.batch ? batch.items[d.code] : dn[d.code]; }).length,
        lista: list.map(function (d) {
          var c = d.code, bi = t.batch && batch.items[c], hl = t.ask && !bi && load("hist_" + t.id, {})[c];
          return { kod: c, miejsce: where(d), uwaga: !!(bi && bi.fails || !t.batch && waiting(t, c)),
            badge: bi ? (bi.fails ? "✗ " + bi.fails : "✓ OK") : t.batch ? "" : waiting(t, c) ? window.OESTT("⏳ w kolejce", "⏳ queued") : dn[c] ? "✓ " + dn[c] : "",
            ostatnio: hl && (hl.q.length || hl.r.length) ? window.OESTT("ostatnio z uwagami (", "last time with remarks (") + hl.d + ")" : "" };
        }) };
    }) }, openForm);
  }
  $("search").addEventListener("input", renderList);
  $("customGo").addEventListener("click", function () {
    var c = val("customCode").toUpperCase(); if (!c) return;
    var key = "custom_" + cur.type.id, arr = customList(cur.type).filter(function (x) { return x.code !== c; });
    if (!cur.type.devices.map(norm).some(function (x) { return x.code === c; })) { arr.push({ code: c, loc: $("customLoc").value, room: "" }); save(key, arr); }
    $("customCode").value = ""; renderList(); openForm(c);
  });

  $("customCode").addEventListener("input", function () { var tw = RD.wieza(val("customCode")); if (tw) $("customLoc").value = tw; });

