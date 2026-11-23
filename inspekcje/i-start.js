"use strict";
// i-start.js – start strony, wejście z PPM, odzyskanie szkicu.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: musi być wczytany ostatni.
  // ---------- start ----------
  OESTKolejkaWidok.montuj($("queueBox")); // ekran Kolejka: część Vue (czesci/KolejkaInsp.vue)
  states = cur.type.checks.map(function (c) { return c.def; });
  var cached = load("setup", null);
  if (cached) applySetup(cached);
  // wejście prosto do inspekcji (#ppm=…) albo odzyskanej (#rec=…): żaden ekran do czasu otwarcia formularza – wcześniej przez chwilę
  // pokazywała się lista inspekcji, a telefon trzyma poprzedni ekran, dopóki nowy nie ma czego pokazać (Grzegorz 09/11/2026, „drżenie”)
  var wprost = !!REC_ID || !!(PPM && PPM.byId(new URLSearchParams(location.hash.slice(1)).get("ppm") || ""));
  if (!wprost) show(APP && location.hash === "#queue" ? "queue" : "home"); // z apki prosto do kolejki (bez przekierowania z ekranu startowego)
  renderTranslate();
  OESTWzory.wczytaj().catch(function () {}); // wzory Word (moduly/wzory) wczytywane w tle – start ekranu na nie nie czeka; buildAll() czeka przed raportem
  Promise.all([
    kvGet("tpl").then(function (t) { if (t && t.bytes && !serverTpl) { serverTpl = t; tplState(); } }).catch(function () {}),
    qAll().then(function (all) {
      var old = Date.now() - 3 * 864e5; // wysłane starsze niż 3 dni sprzątam
      queue = (all || []).filter(function (q) { if (q.status === "sent" && q.sentAt < old && q.arch !== "todo") { qDel(q.id); return false; } /* Word jeszcze nie w archiwum raportów: zostaje do ponowienia */ return true; });
      queue.forEach(function (q) { if (q.status === "sending") q.status = "wait"; });
    }).catch(function () {})
  ]).then(function () {
    refresh(); renderHome(); if (REC_ID) openRec(REC_ID); else openPpm();
    if (location.hash === "#queue") show("queue");
    if (!REC_ID && !cur.ppm && !document.querySelector(".view:not([hidden])")) show("home"); // nie ma takiej karty PPM – lista inspekcji (karta otwiera swój ekran sama, też z opóźnieniem, np. izolatory)
    if (window.OESTSender) OESTSender.init({
      ustawienia: function () { return OESTSettings.get(); }, // settings-store.js (właściciel oest.settings.v1)
      onChange: function (it) { // moduł wysyłki zmienił raport w bazie: ta sama zmiana w kolejce na tym ekranie
        var q = queue.filter(function (x) { return x.id === it.id; })[0]; if (!q) return;
        q.status = it.status; q.err = it.err || ""; if (it.status === "sent") { q.sentAt = it.sentAt; q.docx = new Uint8Array(0); q.photos = []; }
        refresh();
      },
      onQueue: function () { show("queue"); },
      onIdle: refresh,
      onShare: shareApi() ? function () { var p = pending()[0]; if (p) shareSend(p); } : null
    });
    if (APP && !cfg.api) return; // apka: wzór wbudowany, raporty przez Gmaila, skrypt Google niepotrzebny
    return online() ? loadSetup() : tplState(window.OESTT("brak sieci", "no network"));
  }).then(function () { if (cfg.auto) sendQueue(); });

  // ---------- wejście z listy PPM w apce (#ppm=id) ----------
  function renderPpmBar() {
    if (REC) {
      // odzyskana: zamiast terminu i etapu – fioletowa pigułka „Odzyskana” (moduly/znacznik), termin bez zmian
      document.querySelectorAll(".ppmbar").forEach(function (el) { el.hidden = true; });
      var hd = document.querySelector("#v-form .iright") || document.querySelector("#v-form .top"), pill = $("recPill");
      if (hd && window.OESTZnacznik) { if (!pill) { pill = document.createElement("span"); pill.id = "recPill"; hd.appendChild(pill); } pill.innerHTML = OESTZnacznik.status("odzyskana"); }
      return;
    }
    var t = cur.ppm;
    document.querySelectorAll(".ppmbar").forEach(function (el) {
      el.hidden = !t; if (!t) return;
      var due = PPM.due(t), left = PPM.daysLeft(due);
      // termin ze zlecenia Vantify: dokładnie jak w pliku, nie do zmiany w apce (Grzegorz 05/11)
      // po ostatnim zleceniu z importu też bez ręcznej daty – apka nie tworzy terminu (PROD-010)
      var vj = (due && PPM.jobFor ? PPM.jobFor(t, NZ.dzienIso(due)) : null) || (PPM.jobs && PPM.jobs(t).length > 0);
      el.innerHTML = '<label>Update <input type="date" value="' + (due ? NZ.dzienIso(due) : "") + '"' + (vj ? " disabled" : "") + ' aria-label="'+window.OESTT('Termin z systemu', 'Due date from the system')+'"></label>' +
        '<b class="' + (left !== null && left <= 0 ? "late" : "") + '" data-alt="' + esc(window.OESTBledy && OESTBledy.wJezyku ? OESTBledy.wJezyku(OESTBledy.drugi(), function () { return PPM.endsText(left, t); }) : "") + '">' + esc(PPM.endsText(left, t)) + "</b><span>" + esc(t.freq.join(" + ")) + "</span>";
      el.querySelector("input").addEventListener("change", function () { PPM.setDue(t, this.value); renderPpmBar(); });

    });
    // etap w nagłówku inspekcji (obok nazwy), ustawiany ręcznie, gdy jestem pewien (Grzegorz 02/11): zwykle zmienia się sam
    var top = document.querySelector("#v-form .iright") || document.querySelector("#v-form .top"), sel = $("ppmStage");
    if (!top || !PPM || !PPM.setStage) return;
    if (!sel) {
      sel = document.createElement("select"); sel.id = "ppmStage"; sel.className = "ppmpill"; sel.setAttribute("aria-label", "Etap inspekcji");
      sel.addEventListener("change", function () {
        var tt = cur.ppm; if (!tt || this.value === "queued" || this.value === "sent") return;
        var was = PPM.stage(tt), closed = was && (was.s === "done" || was.s === "queued" || was.s === "sent");
        if (this.value === "done") { if (!closed) $("finishIns").click(); return; } // „Zakończona” z listy = to samo co ✓ Zakończ inspekcję (Gotowa, zielony klocek); ustawia tylko Grzegorz
        // cofnięcie „Gotowa” (Grzegorz 04/11: Zakończ → Nie rozpoczęta → inspekcja zniknęła): termin wraca na ten sprzed Zakończ,
        // a szkic traci znacznik Gotowa, żeby nic go nie wyczyściło. Odpowiedzi i zdjęcia zostają zawsze.
        if (closed && this.value === "prog") { unready(tt); return; }
        if (closed && this.value !== "done") {
          if (was.period) PPM.setDue(tt, was.period);
          var dk = draftKey(); kvGet(dk).then(function (d) { if (d && d.fin) { delete d.fin; delete d.finPeriod; return kvSet(dk, d); } }).catch(function () {});
        }
        if (!this.value) { PPM.setStage(tt, null); if (PPM.setUnstarted) PPM.setUnstarted(tt, ppmCounts()); } else PPM.setStage(tt, { s: this.value, manual: true, day: NZ.dzienIso(new Date()) });
        renderPpmBar(); updateFormHint(); $("formHint").textContent = finHint();
      });
      top.insertBefore(sel, top.firstChild);
    }
    if (sel.parentNode !== top) top.insertBefore(sel, top.firstChild); // nagłówek budowany przez form-ui.js po pierwszym wywołaniu
    sel.hidden = !t; if (!t) return;
    var st = PPM.stage(t), s = st ? st.s : "";
    sel.innerHTML = [["", window.OESTT("○ Nie rozpoczęta", "○ Not started")], ["prog", window.OESTT("◐ W trakcie", "◐ In progress")], ["hold", window.OESTT("⏸ Wstrzymana", "⏸ On hold")], ["done", window.OESTT("✓ Zakończona", "✓ Completed")]]
      .concat(s === "queued" || s === "sent" ? [[s, window.OESTT("✓ Gotowa", "✓ Ready")]] : []) // zamknięta = Gotowa (04/11); stan raportu pokazuje Wyślij i pasek wysyłki
      .map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === s ? " selected" : "") + ">" + o[1] + "</option>"; }).join("");
    sel.className = "ppmpill s-" + (s || "none");
  }
  // inspekcje bez własnych pytań: 6 ogólnych checkpointów na wzorze generic (Grzegorz 01/11), pytania można potem podmienić w ustawieniach
  var GENERIC_CPS = [
    ["access", "Access clear", "Access to the area and equipment clear and unobstructed.", "Access to the area or equipment obstructed – requires clearing."],
    ["condition", "Condition good", "Equipment and surroundings in good condition, no visible damage.", "Visible damage found – remedial action required."],
    ["operation", "Operating normally", "Equipment operating normally at the time of inspection.", "Equipment not operating normally – further investigation required."],
    ["clean", "Clean and tidy", "Area clean, tidy and free of stored materials.", "Area untidy or used for storage – requires clearing."],
    ["labels", "Labels in place", "Labels and safety signage in place and legible.", "Labels or safety signage missing or illegible."],
    ["hazards", "No hazards", "No hazards, leaks or signs of overheating observed.", "Hazard observed – reported for action."]];
  // t0, code0: odzyskana inspekcja (openRec) – ta sama karta i to samo urządzenie co w raporcie
  function openPpm(t0, code0) {
    var t = t0 || PPM && PPM.byId(new URLSearchParams(location.hash.slice(1)).get("ppm") || "");
    if (!t) return;
    cur.ppm = t; $("appMenu").href = t0 ? backUrl() : "../index.html#ppm";
    if (t.open && code0 && !t.dev) { cur.type = TYPES.filter(function (x) { return x.id === t.open; })[0]; if (cur.type) openForm(code0); return; } // urządzenie z listy (np. izolator)
    if (t.open && t.dev) {
      // jedna rozdzielnica = osobna inspekcja: prosto do jej formularza
      cur.type = TYPES.filter(function (x) { return x.id === t.open; })[0];
      if (!cur.type.devices.some(function (d) { return d.code === t.dev; })) cur.type.devices.push({ code: t.dev, loc: t.where || "", room: "" });
      openForm(t.dev); return;
    }
    if (t.open) {
      cur.type = TYPES.filter(function (x) { return x.id === t.open; })[0]; $("search").value = "";
      (cur.type.batch ? loadBatch(cur.type) : Promise.resolve()).then(function () { show("list"); });
      return;
    }
    var dev = [{ code: t.name, loc: t.where || "One Eastside", room: "" }], f = t.form && PPM.forms && PPM.forms[t.form];
    if (f && f.folder) {
      // inspekcja „z folderu”: tylko zdjęcia wypełnionej kartki → jeden PDF (strona na zdjęcie), bez formularza
      cur.type = { id: "ppm-" + t.id, folder: true, name: t.name, title: t.name, scope: "", devices: dev, checks: [], flush: t.flush && PPM.forms.flush ? PPM.forms.flush[t.flush] : null };
      openForm(t.name); return;
    }
    if (f && f.rooms) {
      // plant roomy: stałe pomieszczenia, w każdym checkpointy (domyślnie OK), raport na wzorze firmy
      var cps = PPM.forms.plantCps.concat(f.monthly ? PPM.forms.plantCpsMonthly : []), rc = [];
      PPM.forms.plantRooms.forEach(function (r) {
        cps.concat(r.extra || []).forEach(function (cp) { rc.push({ key: r.key + "." + cp, cp: cp, room: r.key, roomName: r.name, roomLoc: r.loc, ok: r.name + ": " + cp + " OK.", fail: r.name + ": " + cp + " – requires attention.", def: "ok" }); });
      });
      cur.type = { id: "ppm-" + t.id, plain: true, rooms: true, name: t.name, title: f.title, wzor: f.wzor, scope: "", devices: dev, checks: rc };
      openForm(t.name); return;
    }
    if (f) {
      // formularz jak DB (pytania z ppm.js) albo pomiary temperatur według wzoru firmy
      cur.type = f.temp ? { id: "ppm-" + t.id, temp: true, name: t.name, title: f.title, wzor: f.wzor, slots: f.slots, scope: "", devices: dev, checks: [] } :
        { id: "ppm-" + t.id, plain: true, name: t.name, title: f.title, scope: f.scope || "", devices: dev,
          checks: f.checks.map(function (c) { return { key: c.key, cp: c.cp, ok: c.ok, fail: c.fail, def: c.def || "ok" }; }) };
      openForm(t.name); return;
    }
    // inspekcja bez własnych pytań: zdjęcie i jedno sprawdzenie, pytania dojdą w ustawieniach inspekcji
    cur.type = { id: "ppm-" + t.id, quick: true, name: t.name, title: t.name + " - Inspection", scope: "", devices: [{ code: t.name, loc: t.where || "One Eastside", room: "" }],
      checks: GENERIC_CPS.map(function (g) { return { key: g[0], cp: g[1], ok: g[2], fail: g[3], def: "ok" }; }) };
    openForm(t.name);
  }

  // ---------- odzyskana inspekcja (etap 2c, Grzegorz 08/11/2026) ----------
  // Otwierana z klocka Raporty (Ustawienia → Raporty i zdjęcia). Dane: zapis inspekcji z archiwum raportów (moduly/raporty),
  // potem własny szkic „rec_<id>”. Lista PPM, termin i etap karty zostają bez zmian (OEST_PPM.sandbox).
  function openRec(id) {
    var R = window.OESTRaporty;
    var fail = function (e) { $("formHint").textContent = window.OESTBledy ? OESTBledy.text(e) : String(e && e.message || e); show("form"); };
    if (!R) { fail(new Error("REPORT_MISSING")); return; }
    R.get(id).then(function (r) {
      if (!r) throw new Error("REPORT_MISSING"); // get() zwraca tylko raporty zalogowanego konta
      if (!r.snap || !r.rec) throw new Error("REPORT_NO_DATA");
      var m = r.meta || {}, t = m.ppm && PPM ? PPM.byId(m.ppm) : null;
      REC = r; document.documentElement.classList.add("recmode"); $("recUpdate").hidden = false; if ($("updBox")) $("updBox").hidden = false;
      if (t && PPM.sandbox) {
        // ustawienia pytań odzyskanej: z jej szkicu, inaczej z zapisu w raporcie (nie z bieżącej karty PPM)
        return kvGet("rec_" + r.id).catch(function () { return null; }).then(function (d) {
          PPM.sandbox(t.id, (d && d.needs) || r.snap.needs); openPpm(t, m.code);
        });
      }
      if (t) { openPpm(t, m.code); return; }
      cur.type = TYPES.filter(function (x) { return x.id === m.type; })[0];
      if (!cur.type) throw new Error("REPORT_NO_DATA");
      $("appMenu").href = backUrl(); openForm(m.code);
    }).catch(fail);
  }
  window.addEventListener("oest:lang", function () { if (REC) renderPpmBar(); });
  // „Update” (Grzegorz 08/11/2026 12:54): uzupełniona odzyskana inspekcja – nowa wersja w telefonie i nadpisany Word na Dysku, BEZ maila.
  // Data i termin bez zmian. Stan Dysku mówimy wprost (nic nie udajemy).
  $("recUpdate").addEventListener("click", function () {
    var b = this; if (queueing || !REC || !window.OESTSender || !OESTSender.update) return;
    if (restoring || pendingPh > 0) { $("formHint").textContent = window.OESTT("Poczekaj, aż zdjęcia się wczytają i zapiszą.", "Wait until the photos are loaded and saved."); return; } // raport bez zdjęć nie nadpisze Dysku
    if (recMissing()) return;
    saveDraftNow();
    queueing = true;
    var btn = window.OESTPrzycisk ? OESTPrzycisk.start(b, { busy: window.OESTT("Zapisuję raport", "Saving the report"), keep: false }) : null, msg = "";
    if (!btn) b.disabled = true;
    var from = { type: cur.type, mode: cur.mode, ppm: cur.ppm, day: NZ.dzienIso(reportDate()) };
    freeBuilt();
    var buildWord = function () { return buildAll({ word: true }); };
    buildWord().then(function (r) { return fitReport(r, buildWord); }).then(function (r) {
      var it = queueItem(r, from); it.at = Date.now(); it.sentAt = (REC.meta || {}).sentAt || 0; // kiedy wysłany – bez zmian
      return OESTSender.update(it).then(function () { return window.OESTRaporty.get(REC.id); }).then(function (now) {
        if (now) REC = now;
        var onDrive = now && now.driveId && !now.dirty;
        msg = onDrive ? window.OESTT("✓ Zapisano w telefonie i na Dysku (Word nadpisany). Mail nie poszedł.", "✓ Saved on the phone and on Drive (Word overwritten). No email sent.")
          : window.OESTT("✓ Zapisano w telefonie. Na Dysk pójdzie, gdy będzie połączenie z Dyskiem. Mail nie poszedł.", "✓ Saved on the phone. It goes to Drive once Drive is connected. No email sent.");
        return btn ? btn.ok(window.OESTT("Zapisano", "Saved")) : null;
      });
    }).catch(function (e) {
      msg = window.OESTT("Nie zapisano: ", "Not saved: ") + (window.OESTBledy ? OESTBledy.text(e) : buildErr(e));
    }).then(function () {
      queueing = false; if (btn) btn.restore(); b.disabled = false; updateFormHint();
      $("formHint").textContent = msg;
    });
  });

  // W apce na Androida: powrót do menu głównego
  if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) { $("appMenu").hidden = false; document.documentElement.setAttribute("data-theme", "dark"); document.documentElement.setAttribute("data-app", ""); }

  var NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  if ("serviceWorker" in navigator) {
    // Bez pamięci offline (service worker) – w APK pliki są w telefonie, a w przeglądarce apka nie musi działać bez zasięgu
    // (Grzegorz 22/11/2026). Stara pamięć tylko pokazywała starą wersję po aktualizacji i mogła rozjechać stronę z jej plikami,
    // więc ją usuwamy także w przeglądarkach, które ją mają z wcześniejszych wersji.
    var stale = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); })
      .then(function () { return window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : null; })
      .then(function () {
        var k = "oest.sw.reloaded";
        try { if (stale && !sessionStorage.getItem(k)) { sessionStorage.setItem(k, "1"); location.reload(); } } catch (e) {}
      }).catch(function () {});
  }
