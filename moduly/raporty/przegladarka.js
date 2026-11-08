/* Przeglądarka raportów (moduly/raporty, etap 2b, Grzegorz 08/11/2026) – klocek „Raporty” w Ustawieniach.
 *
 *  - lista raportów z telefonu, najnowsze na górze, jako klocki z moduly/klocek,
 *  - szukanie (kod, nazwa, budynek, rodzaj, data dd/mm/rrrr) i filtr budynku,
 *  - stuknięcie: okienko (moduly/przycisk) z podglądem treści Worda i zdjęć, adresatami jak ⚙ wysyłki
 *    (prywatny / firmowy / inżynier / manager) i „Wyślij” – mail Word + PDF przez kolejkę (moduly/wysylka),
 *    bez ponownego zapisu do archiwum i bez zmiany pliku na Dysku,
 *  - „Otwórz na Dysku”, gdy raport już tam jest.
 *  - „Odzyskaj do edycji” (etap 2c): raport z zapisaną inspekcją wraca jako zwykły klocek inspekcji (moduly/klocek)
 *    z fioletową pigułką „Odzyskana” na górze tego klocka (nie na głównej liście); stuknięcie otwiera inspekcję
 *    (inspekcje/index.html#rec=id) z edycją, Wyślij i Update.
 *
 * OESTRaportyUI.mount(element)  – rysuje (albo odświeża po zmianie języka) przeglądarkę w podanym elemencie;
 *   to samo robi zdarzenie window „oest:raporty-ui” z elementem w detail (tak woła ekran Ustawień).
 */
(function (w) {
  "use strict";
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var BLD = { "Tower A": "TA", "Tower B": "TB", "Pavilion": "P" };
  var ICON = '<svg class="ty" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h10l4 4v16H5zM15 2v5h4M8 11h8M8 15h8M8 18h5"/></svg>';
  var CSS = ".rpt-find{display:flex;gap:8px;margin:0 0 12px}.rpt-find input{flex:1 1 auto;min-width:0}.rpt-find select{flex:0 0 34%;min-width:0}" +
    ".rpt-list{display:flex;flex-direction:column;gap:10px}.rpt-empty{color:var(--muted);font-size:14px;padding:6px 2px}" +
    ".rpt-view{max-height:46vh;overflow:auto;-webkit-overflow-scrolling:touch;margin:0 0 10px;font-size:13px;line-height:1.35}" +
    ".rpt-view p{margin:0 0 6px}.rpt-meta{color:var(--muted);font-size:12.5px;margin:0 0 8px}" +
    ".rpt-pics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0 0}.rpt-pics img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block}" +
    ".rpt-to{display:flex;flex-direction:column;gap:8px;margin:6px 0 0}.rpt-to label{display:flex;align-items:center;gap:10px;font-size:14px}.rpt-to small{color:var(--muted)}" +
    ".rpt-drive{display:inline-block;margin:6px 0 0;font-size:14px;color:var(--accent,#7c84ff)}" +
    ".rpt-rec{display:flex;flex-direction:column;gap:10px;margin:0 0 14px}.rpt-rec[hidden]{display:none}.rpt-sub{font-size:13px;font-weight:700;color:var(--muted);margin:0 0 -2px}" +
    ".rpt-recb{display:block;width:100%;margin:10px 0 0}";
  function css() { if (document.getElementById("oest-rpt-css")) return; var s = document.createElement("style"); s.id = "oest-rpt-css"; s.textContent = CSS; document.head.appendChild(s); }

  var state = { q: "", b: "" };
  function mount(el) {
    var R = w.OESTRaporty; if (!el) return;
    css();
    if (!R) { el.textContent = T("Archiwum raportów niedostępne.", "Report archive unavailable."); return; }
    var opts = [["", T("Wszystkie", "All")], ["Tower A", "Tower A"], ["Tower B", "Tower B"], ["Pavilion", "Pavilion"], ["General", T("Ogólne", "General")], ["Reactive", "Reactive"]];
    if (!el.__rpt) {
      el.__rpt = true;
      el.innerHTML = '<div class="rpt-rec" id="rptRec" hidden><div class="rpt-sub" id="rptRecT"></div><div class="rpt-list" id="rptRecL"></div></div><div class="rpt-find"><input type="search" id="rptQ" autocomplete="off"><select id="rptB"></select></div><div class="rpt-list" id="rptList"></div>';
      el.querySelector("#rptQ").addEventListener("input", function (e) { state.q = e.target.value; list(el); });
      el.querySelector("#rptB").addEventListener("change", function (e) { state.b = e.target.value; list(el); });
      el.querySelector("#rptList").addEventListener("click", function (e) { var b = e.target.closest("[data-rid]"); if (b) show(b.getAttribute("data-rid")); });
      el.querySelector("#rptRecL").addEventListener("click", function (e) { var b = e.target.closest("[data-rec]"); if (b) openRec(b.getAttribute("data-rec")); });
      if (R.onChange) R.onChange(function () { if (document.body.contains(el)) list(el); });
      // szukanie to nie zmiana ustawień: zdarzenia pól przeglądarki nie wychodzą do formularza ekranu (bez „niezapisanych zmian”)
      ["input", "change"].forEach(function (t) { el.addEventListener(t, function (e) { e.stopPropagation(); }); });
    }
    // język: tylko teksty, wpisane szukanie i wybór zostają (bez przerysowania pola)
    var q = el.querySelector("#rptQ"), b = el.querySelector("#rptB");
    q.placeholder = T("Kod, budynek, data…", "Code, building, date…"); q.setAttribute("aria-label", q.placeholder); q.value = state.q;
    b.innerHTML = opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === state.b ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("");
    b.setAttribute("aria-label", T("Budynek", "Building"));
    el.querySelector("#rptRecT").textContent = T("Odzyskane inspekcje", "Recovered inspections");
    list(el);
  }
  // odzyskana inspekcja jako zwykły klocek inspekcji: dane z zapisu inspekcji w raporcie (bez nowego układu)
  function recCard(r) {
    var m = r.meta || {}, c = m.card || {}, s = r.snap || {}, f = s.fields || {}; // c: opis klocka zapisany przez apkę przy wysyłce
    var st = s.states || [], used = st.filter(function (x) { return x !== "na"; }).length, ok = st.filter(function (x) { return x === "ok"; }).length;
    var ph = s.photos || [], dz = /^(\d{4})-(\d{2})-(\d{2})$/.exec(f.dzien || "");
    return w.OESTKlocek.inspekcja({ data: { rec: r.id }, color: "#a35bff", name: c.name || m.code || r.name, status: "odzyskana",
      loc: c.loc || "", freq: c.freq || "", form: ph.some(function (p) { return p.sheet; }) ? "ok" : "brak",
      due: dz ? new Date(+dz[1], +dz[2] - 1, +dz[3]) : null, dueDone: true, photos: ph.filter(function (p) { return !p.sheet; }).length,
      qa: used ? { ok: ok, all: used } : null, issues: st.filter(function (x) { return x === "fail"; }).length, go: T("Otwórz", "Open") });
  }
  function openRec(id) {
    // Wstecz z odzyskanej inspekcji wraca tutaj (inspekcje/index.html → #settings/reports)
    try { sessionStorage.setItem("oest.back", JSON.stringify({ h: location.hash || "#settings/reports" })); } catch (e) {}
    location.href = "inspekcje/index.html#rec=" + encodeURIComponent(id);
  }
  var seq = 0;
  function list(el) {
    var R = w.OESTRaporty, box = el.querySelector("#rptList"), my = ++seq;
    if (R.recovered) R.recovered().then(function (rs) {
      if (my !== seq) return;
      el.querySelector("#rptRec").hidden = !rs.length;
      el.querySelector("#rptRecL").innerHTML = rs.map(recCard).join("");
    }).catch(function () {});
    R.list().then(function (all) {
      if (my !== seq) return;
      var hit = R.find(all, state.q, { building: state.b });
      if (!all.length) { box.innerHTML = '<div class="rpt-empty">' + esc(T("Brak raportów w telefonie. Każdy wysłany raport pojawi się tutaj.", "No reports on this phone yet. Every sent report appears here.")) + "</div>"; return; }
      if (!hit.length) { box.innerHTML = '<div class="rpt-empty">' + esc(T("Nic nie pasuje do szukania.", "Nothing matches your search.")) + "</div>"; return; }
      box.innerHTML = hit.map(function (r) {
        var f = r.folder || [], drive = r.driveId && !r.dirty;
        return w.OESTKlocek.html({ id: r.id, data: { rid: r.id }, color: drive ? "#5fd6a0" : "#f0c75e", icon: ICON, tag: BLD[f[0]] || "", name: r.name,
          status: { text: drive ? T("Na Dysku", "On Drive") : T("Czeka na Dysk", "Waiting for Drive"), tone: drive ? 2 : 1 },
          desc: f.join(" · ") || "—", due: esc(T("Wysłany ", "Sent ") + R.day(r)) + (r.versions > 1 ? esc(" · " + T("wersja ", "version ") + r.versions) : ""), go: T("Otwórz ›", "Open ›") });
      }).join("");
    }).catch(function (e) { if (my === seq) box.innerHTML = '<div class="rpt-empty">' + esc(w.OESTBledy ? w.OESTBledy.text(e) : String(e && e.message || e)) + "</div>"; });
  }

  function show(id) {
    var R = w.OESTRaporty, S = w.OESTSender, P = w.OESTPrzycisk;
    R.get(id).then(function (r) {
      if (!r || r.gone) return;
      var urls = [], node = document.createElement("div"), pv = null;
      try { pv = w.PizZip ? R.docxPreview(r.docx, w.PizZip) : null; } catch (e) { pv = null; }
      var to = S && S.recipients ? S.recipients({ sp: 1, sm: 1, se: 1, sg: 1 }) : { priv: "", me: "", eng: "", man: "" };
      // Reactive wysyłamy tylko na firmowy e-mail (PROD-025) – tak jak przy pierwszej wysyłce
      var reactive = (r.meta && r.meta.type) === "reactive" || (r.folder || [])[0] === "Reactive", only = T("Reactive: tylko firmowy e-mail", "Reactive: work email only");
      function cb(k, label, addr, missing) { var off = !addr || (reactive && k !== "sm"); return "<label><input type=\"checkbox\" data-to=\"" + k + "\"" + (k === "sm" && addr ? " checked" : "") + (off ? " disabled" : "") + "><span>" + esc(label) + " <small>" + esc(reactive && k !== "sm" ? only : addr || missing) + "</small></span></label>"; }
      var pics = pv ? pv.images.map(function (i) { var u = URL.createObjectURL(new Blob([i.bytes], { type: i.type })); urls.push(u); return '<img src="' + u + '" alt="">'; }).join("") : "";
      node.innerHTML = '<div class="rpt-meta">' + esc((r.folder || []).join(" · ") + " · " + T("wysłany ", "sent ") + R.day(r) + " · Word + PDF") + "</div>" +
        '<div class="rpt-view">' + (pv ? pv.lines.map(function (l) { return "<p>" + esc(l) + "</p>"; }).join("") + (pics ? '<div class="rpt-pics">' + pics + "</div>" : "") : "<p>" + esc(T("Nie udało się otworzyć podglądu. Raport można wysłać.", "Could not open the preview. The report can still be sent.")) + "</p>") + "</div>" +
        (r.snap && !reactive ? '<button type="button" class="btn rpt-recb" data-a="rec">' + esc(r.rec ? T("Otwórz odzyskaną inspekcję", "Open recovered inspection") : T("Odzyskaj do edycji", "Recover for editing")) + "</button>" : "") +
        (r.driveId ? '<a class="rpt-drive" target="_blank" rel="noopener" href="https://drive.google.com/file/d/' + encodeURIComponent(r.driveId) + '/view">' + esc(T("Otwórz na Dysku ›", "Open on Drive ›")) + "</a>" : "") +
        '<div class="rpt-to">' +
        cb("sp", T("Mój prywatny e-mail", "My private email"), to.priv, T("brak adresu w Mój profil", "no address in My Profile")) +
        cb("sm", T("Mój firmowy e-mail", "My work email"), to.me, T("brak adresu w Mój profil", "no address in My Profile")) +
        cb("se", T("Inżynier", "Engineer"), to.eng, T("ustaw w Ustawienia → Wysyłka", "set in Settings → Mail")) +
        cb("sg", T("Manager", "Manager"), to.man, T("ustaw w Ustawienia → Wysyłka", "set in Settings → Mail")) + "</div>";
      var wantRec = false, rb = node.querySelector("[data-a=rec]");
      if (rb) rb.addEventListener("click", function () { wantRec = true; }); // okienko samo się zamyka (data-a), potem otwieramy inspekcję
      return P.ask({ title: r.name, node: node, ok: T("Wyślij", "Send"), cancel: T("Zamknij", "Close") }).then(function (ok) {
        urls.forEach(function (u) { URL.revokeObjectURL(u); });
        if (wantRec) return R.setRec(r.id, true).then(function () { openRec(r.id); }, function (e) {
          return P.ask({ title: T("Nie odzyskano", "Not recovered"), text: w.OESTBledy ? w.OESTBledy.text(e) : String(e && e.message || e), alert: true });
        });
        if (!ok) return;
        var sel = {}; node.querySelectorAll("[data-to]:checked").forEach(function (c) { sel[c.getAttribute("data-to")] = true; });
        if (reactive) sel = { sm: !!sel.sm };
        var list = S && S.recipients ? S.recipients(sel).list : [];
        if (!S || !S.active || !S.active() || !S.enqueue) return P.ask({ title: T("Wysyłka niedostępna", "Sending unavailable"), text: T("Zaloguj się do Google w apce.", "Sign in to Google in the app."), alert: true });
        if (!list.length) return P.ask({ title: T("Brak adresata", "No recipient"), text: T("Zaznacz, do kogo wysłać.", "Tick who to send it to."), alert: true });
        return S.enqueue({ type: "archive", code: r.name, name: r.name, subject: r.name, body: r.name + "\n" + T("Raport z archiwum OEST", "Report from the OEST archive") + " (" + R.day(r) + ")\n",
          docx: r.docx, pdf: r.pdf || new Uint8Array(0), toList: list, noArchive: true, rpt: r.folder }).then(function () {
          return P.ask({ title: T("W kolejce", "Queued"), text: T("Raport czeka w kolejce – pasek na dole pokaże wysyłkę.", "The report is queued – the bar at the bottom shows sending."), alert: true });
        }, function (e) {
          // nie trafił do kolejki (np. brak miejsca w telefonie): mówimy wprost, nic nie udajemy; ponowienie = otworzyć raport i Wyślij jeszcze raz
          return P.ask({ title: T("Nie wysłano", "Not sent"), text: T("Nie udało się dodać raportu do kolejki: ", "Could not add the report to the queue: ") + (w.OESTBledy ? w.OESTBledy.text(e) : String(e && e.message || e)) + T("\nOtwórz raport i spróbuj ponownie.", "\nOpen the report and try again."), alert: true });
        });
      });
    });
  }

  w.OESTRaportyUI = { mount: mount };
  // ekran (np. Ustawienia → Raporty) daje miejsce zdarzeniem oest:raporty-ui z elementem w detail – także po zmianie języka
  w.addEventListener("oest:raporty-ui", function (e) { mount(e.detail); });
})(window);
