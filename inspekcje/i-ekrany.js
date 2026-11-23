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
  function show(v) {
    if (REC && (v === "home" || v === "list")) { leave(backUrl()); return; } // odzyskana: wyjście wraca do klocka Raporty
    if (cur.ppm && (v === "home" || (v === "list" && !cur.ppm.open))) { leave(backUrl()); return; }
    if (APP && v === "home" && location.hash === "#queue") { leave(backUrl()); return; } // z kolejki wracamy do listy inspekcji
    ["home", "list", "form", "preview", "queue"].forEach(function (n) { $("v-" + n).hidden = n !== v; });
    if (v === "home") renderHome();
    if (v === "list") renderList();
    renderPpmBar();
    if (v === "queue") renderQueue();
    window.scrollTo(0, 0);
  }
  // Raport w trakcie wysyłki kończymy przed wyjściem na listę (dalsze z kolejki lista PPM wyśle sama)
  // powrót tam, skąd przyszedłem (lista PPM, kalendarz, kolejka…) – zapisane przez app/www/index.html goInsp()
  function backUrl() { if (REC_ID) return "../index.html#settings/reports"; var b = OESTPowrot.odczytaj(false); return "../index.html" + (b && /^#[\w=&.-]*$/.test(b.h) ? b.h : "#ppm"); }
  function leave(url) { saveDraftNow().then(function () { return gm() ? OESTSender.whenIdle() : null; }).then(function () { location.replace(url); }); } // replace: strona inspekcji nie zostaje w historii (Wstecz telefonu przed startem Ionic nie wróci do niej); szkic zapisany, zanim strona zniknie
  // Wysyłka prosto z Gmaila (zalogowany w apce): moduł ../moduly/wysylka, pasek stanu na dole
  function gm() { return APP && !!window.OESTSender && OESTSender.active(); }
  // Podczas przygotowania raportu formularz musi zostać ten sam (wynik dotyczy tego urządzenia i tego zlecenia)
  var queueing = false;
  // Wstecz telefonu (szkielet Ionic, moduly/szkielet; Grzegorz 08/11): okienko i strzałkę ‹ widocznego ekranu obsługuje szkielet;
  // ekran bez strzałki → lista, z której przyszedłem. Strona inspekcji do przeniesienia na ramę (licznik bramki „Poza Ionic/Vue”).
  if (window.OESTEkrany) OESTEkrany.strona({ up: function () { if (!queueing) leave(backUrl()); } }); // bez paczki szkieletu (strona www z katalogu repo) inspekcja działa dalej, bez Wstecz telefonu
  document.querySelectorAll("[data-go]").forEach(function (b) { b.addEventListener("click", function () { if (!queueing) show(b.getAttribute("data-go")); }); });
  // strzałka ‹ do apki: przez leave() (szkic zapisany, wysyłka w tle skończona), nie zwykły link (audyt 19/11/2026 nr 37); adres = href ustawiany przez stronę
  $("appMenu").addEventListener("click", function (e) { e.preventDefault(); if (!queueing) leave(this.href); });

  // zrobione dziś (zaznaczane przy dodaniu do kolejki), osobno dla każdego rodzaju — ten sam kod może być w dwóch rejestrach
  function doneToday(t) { var d = load("done", {}), day = d[NZ.dzienIso(new Date())] || {}; return day[t.id] || {}; }
  function markDone(t, code) {
    var d = load("done", {}), k = NZ.dzienIso(new Date()), keep = {};
    keep[k] = d[k] || {}; keep[k][t.id] = keep[k][t.id] || {}; keep[k][t.id][code] = NZ.godzina(new Date()); save("done", keep);
  }
  function waiting(t, code) { return queue.some(function (q) { return q.type === t.id && q.code === code && q.status !== "sent"; }); }

  function renderHome() {
    $("homeSub").textContent = (cfg.site ? cfg.site + " · " : "") + NZ.data(new Date());
    function html() { return TYPES.map(function (t) {
      var all = devices(t), dn = doneToday(t), done = all.filter(function (d) { return dn[d.code]; }).length, pr = t.batch && load("bprog_" + t.id, null);
      var sub = pr && pr.n ? '<span class="sub" style="color:var(--warn);font-weight:600">W trakcie: ' + pr.n + "/" + all.length + T(" · od ", " · since ") + esc(NZ.data(new Date(pr.started))) + " "+T("· dotknij, by wznowić", "· tap to resume")+"</span>" :
        '<span class="sub">' + all.length + T(" urządzeń · dziś zrobione: ", " devices · done today: ") + done + "</span>";
      // jeden kafelek dla całej apki (moduly/kafelek, Grzegorz 04/11)
      if (window.OESTKafelek) return OESTKafelek.html({ name: t.name, sub: (pr && pr.n ? "◐ " : "") + sub.replace(/<[^>]+>/g, "").trim(), badge: pr && pr.n ? pr.n + "/" + all.length : "", cls: "type",
        icon: '<rect x="9" y="5" width="30" height="38" rx="2"/><path d="M15 13h18M15 19h18M15 25h18"/><path d="M26 30l-5 7h5l-3 6"/>', data: { type: t.id } });
      return '<button class="type" type="button" data-type="' + t.id + '">' +
        '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="5" width="30" height="38" rx="2"/><path d="M15 13h18M15 19h18M15 25h18"/><path d="M26 30l-5 7h5l-3 6"/></svg>' +
        "<div><b>" + esc(t.name) + "</b>" + sub + "</div>" +
        '<span class="arrow" aria-hidden="true">›</span></button>';
    }).join(""); }
    $("types").innerHTML = html(); both($("types"), html);
    $("types").querySelectorAll("[data-type]").forEach(function (b) {
      b.addEventListener("click", function () {
        cur.type = TYPES.filter(function (t) { return t.id === b.getAttribute("data-type"); })[0]; $("search").value = "";
        (cur.type.batch ? loadBatch(cur.type) : Promise.resolve()).then(function () { show("list"); }, function (e) {
          say(T("Nie udało się odczytać zapisanego zlecenia (", "Could not read the saved job (") + gErr(e) + T("). Zamknij i otwórz apkę ponownie — nic nie zostało usunięte.", "). Close and reopen the app — nothing was deleted."));
        });
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
    $("listTitle").textContent = t.name;
    var all = devices(t);
    var done = all.filter(function (d) { return dn[d.code]; }).length;
    $("listSub").textContent = t.batch ? T("Raport zbiorczy: otwórz tylko urządzenia z uwagami albo ze zdjęciem", "Combined report: open only devices with remarks or a photo") :
      T("Dziś zrobione: ", "Done today: ") + done + T(" z ", " of ") + all.length + (lastQueued ? " · " + lastQueued + T(" w kolejce", " queued") : "");
    renderBatchBar();
    var groups = {};
    all.filter(function (d) { return !q || d.code.indexOf(q) >= 0; }).forEach(function (d) { (groups[d.loc] = groups[d.loc] || []).push(d); });
    var order = ["Tower A", "Tower B", "Pavilion"].concat(Object.keys(groups).filter(function (g) { return ["Tower A", "Tower B", "Pavilion"].indexOf(g) < 0; })).filter(function (g) { return groups[g]; });
    $("groups").innerHTML = order.length ? order.map(function (g) {
      var list = groups[g];
      return '<div class="group"><h2>' + esc(g) + "<small>" + list.filter(function (d) { return t.batch ? batch.items[d.code] : dn[d.code]; }).length + "/" + list.length + "</small></h2>" +
        list.map(function (d) {
          var c = d.code, bi = t.batch && batch.items[c], badge = bi ? (bi.fails ? '<span class="badge q">✗ ' + bi.fails + "</span>" : '<span class="badge">✓ OK</span>') : t.batch ? '<span class="arrow" aria-hidden="true">›</span>' : waiting(t, c) ? '<span class="badge q">'+T('⏳ w kolejce', '⏳ queued')+'</span>' : dn[c] ? '<span class="badge">✓ ' + esc(dn[c]) + "</span>" : '<span class="arrow" aria-hidden="true">›</span>';
          var hl = t.ask && !bi && load("hist_" + t.id, {})[c], lastTxt = hl && (hl.q.length || hl.r.length) ? '<div class="last">'+T('ostatnio z uwagami (', 'last time with remarks (')+'' + esc(hl.d) + ")</div>" : "";
          return '<button class="item" type="button" data-code="' + esc(c) + '"><div><div class="code">' + esc(c) + '</div><div class="where">' + esc(where(d)) + "</div>" + lastTxt + "</div>" + badge + "</button>";
        }).join("") + "</div>";
    }).join("") : '<p class="hint">'+T('Brak wyników. Wpisz kod niżej, żeby otworzyć inne urządzenie.', 'No results. Type a code below to open another device.')+'</p>';
    $("groups").querySelectorAll("[data-code]").forEach(function (b) { b.addEventListener("click", function () { openForm(b.getAttribute("data-code")); }); });
  }
  $("search").addEventListener("input", renderList);
  $("customGo").addEventListener("click", function () {
    var c = val("customCode").toUpperCase(); if (!c) return;
    var key = "custom_" + cur.type.id, arr = customList(cur.type).filter(function (x) { return x.code !== c; });
    if (!cur.type.devices.map(norm).some(function (x) { return x.code === c; })) { arr.push({ code: c, loc: $("customLoc").value, room: "" }); save(key, arr); }
    $("customCode").value = ""; renderList(); openForm(c);
  });

  $("customCode").addEventListener("input", function () { var tw = RD.wieza(val("customCode")); if (tw) $("customLoc").value = tw; });

