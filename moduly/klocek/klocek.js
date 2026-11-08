// Moduł klocka (moduly/klocek) – JEDEN klocek listy dla całej apki (Grzegorz 04/11/2026):
// stałe miejsca, które każda lista tylko wypełnia swoimi danymi. Inspekcje, dzień w Kalendarzu, Reactive
// i grupy (np. 18 DB) wyglądają i działają tak samo; różnią się tylko treścią.
// Układ wg makiety Grzegorza (04/11/2026):
//
//  ┌▌[ikona] [TA] Nazwa …………………… ( Status ) ┐   1: ikona, znacznik budynku, nazwa (1 linia), status w pigułce (bez kropki)
//  │▌ Tower A · co tydzień                    › │   2: opis                                               strzałka akcji
//  └▌ 📅 pt 06/11 · za 3 dni │ 🗎 │ 🖼 4 │ ☑ 6/12┘   3: termin + znaczki (zdjęcie formularza ✓/✗, zdjęcia, odpowiedzi) z kreskami
//
// OESTKlocek.html({
//   id, data:{rx:'job'} (dodatkowe data-*), color (kolor paska z lewej), icon (svg/emoji – HTML),
//   tag ('TA'), name, status:{text, tone:0..4}, desc, due (HTML), foot (dopisek do opisu),
//   form: 'brak'|'ok'|'blad' (zdjęcie formularza, moduly/znacznik), marks:[{i:'zdjecia'|'punkty'|'usterki'|'📷', n:'4', tone, off (szara – niewymagane)}],
//   thumb (adres obrazka) | thumbAttr ('data-rx-thumb="…"' – miniatura dociągana później),
//   go ('Zacznij' – podpis strzałki dla czytnika), open (strzałka w dół – grupa rozwinięta), done (szary, na koniec listy), plan (przygaszony)
// })   → '<button class="prow k2" …>…</button>'
// Kolory statusu (tone): 0 szary · 1 żółty (w trakcie) · 2 zielony (gotowe) · 3 czerwony (zaległe) · 4 niebieski (w kolejce)
(function (w) {
  "use strict";
  var TONE = ["#c3c9e8", "#f0c75e", "#5fd6a0", "#ff7b72", "#79b8ff"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var CSS = ".prow.k2{position:relative;display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;align-items:stretch!important;justify-content:space-between;gap:6px!important;min-height:104px;box-sizing:border-box;padding:12px 38px 11px 18px!important;border-radius:16px!important;text-align:left;color:var(--ink);overflow:hidden;width:100%;margin:0 0 8px}" +
    ".ppm>.prow.k2{margin:0}" +
    ".prow.k2:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--g)}" +
    ".k2 .kr{display:flex;align-items:center;gap:8px;min-width:0}" +
    ".k2 .ty{width:21px;height:21px;flex:none;fill:none;stroke:var(--steel);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
    ".k2 .ty.em{display:grid;place-items:center;font-size:16px;line-height:1;stroke:none}" +
    ".k2 .knm{flex:1;min-width:0;font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".k2 .kbl{display:inline-block;font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:6px;background:rgba(255,255,255,.12);color:var(--steel);margin-right:7px;vertical-align:2px}" +
    // status: pigułka w kolorze stanu, bez kropki/symbolu (Grzegorz 04/11)
    ".k2 .kst{flex:none;font-size:12px;font-weight:700;line-height:1;padding:5px 10px;border-radius:999px;border:1px solid currentColor;background:color-mix(in srgb,currentColor 16%,transparent);white-space:nowrap}" +
    ".k2 .c0{color:" + TONE[0] + "}.k2 .c1{color:" + TONE[1] + "}.k2 .c2{color:" + TONE[2] + "}.k2 .c3{color:" + TONE[3] + "}.k2 .c4{color:" + TONE[4] + "}" +
    ".k2 .kloc{flex:1;min-width:0;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".k2 .kinfo{gap:0}" +
    ".k2 .kd{display:flex;align-items:center;gap:5px;flex:1 1 auto;min-width:0;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden}" +
    ".k2 .kd>span:last-child{overflow:hidden;text-overflow:ellipsis}" +
    ".k2 .kd b{color:var(--ink);font-weight:700}.k2 .red{color:" + TONE[3] + "!important}" +
    ".k2 .km{display:flex;align-items:center;flex:none}" +
    ".k2 .km{gap:0}.k2 .km>*{box-sizing:content-box;padding:0 9px;border-left:1px solid rgba(255,255,255,.16);min-height:19px}.k2 .km>*:first-child{border-left:0}.k2 .km>*:last-child{padding-right:0}" +
    ".k2 .kth,.k2 .kths img{width:28px;height:28px;border-radius:7px;object-fit:cover;border:1px solid rgba(255,255,255,.2);flex:none;display:block}" +
    ".k2 .kths:empty{display:none}" +
    ".k2 .kgo{position:absolute;right:10px;top:50%;width:22px;height:22px;margin-top:-11px;fill:none;stroke:var(--muted);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}" +
    ".k2 .kgo.open{transform:rotate(90deg)}" +
    ".prow.k2.kdone{opacity:.5;filter:grayscale(.6)}.prow.k2.kplan{opacity:.6}" +
    // gotowa (Grzegorz 04/11 09:58): jaskrawy zielony, pełny napis — widać z daleka, nic nie szarzeje
    ".k2 .kst.ready{color:#04210f!important;background:#2bf07f!important;border-color:#2bf07f!important;font-size:13px;letter-spacing:.04em;padding:6px 12px;box-shadow:0 0 14px rgba(43,240,127,.55)}" +
    ".prow.k2.kready{background:linear-gradient(180deg,rgba(43,240,127,.22),rgba(43,240,127,.10))!important;box-shadow:inset 0 0 0 2px rgba(43,240,127,.85),0 0 16px rgba(43,240,127,.30)}" /* Gotowa: cały klocek świeci na zielono (04/11) */;
  function css() {
    if (!w.document || w.document.getElementById("oest-klocek-css")) return;
    var s = w.document.createElement("style"); s.id = "oest-klocek-css"; s.textContent = CSS;
    (w.document.head || w.document.documentElement).appendChild(s);
  }
  // status bez znaczka z przodu („○ Nie rozpoczęta” → „Nie rozpoczęta”): kolor pigułki mówi wszystko
  function bare(t) { return String(t == null ? "" : t).replace(/^[\s○●◌◐⏸⏳✓✔!📤✉•]+/u, ""); }
  var CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>';
  function html(o) {
    css();
    o = o || {};
    var Z = w.OESTZnacznik;
    var data = "";
    if (o.id != null) data += ' data-id="' + esc(o.id) + '"';
    Object.keys(o.data || {}).forEach(function (k) { data += " data-" + k + '="' + esc(o.data[k]) + '"'; });
    var st = o.status ? '<span class="kst c' + (o.status.tone | 0) + (o.status.ready ? " ready" : "") + '">' + esc(bare(o.status.text)) + "</span>" : "";
    var icon = !o.icon ? "" : /^\s*</.test(o.icon) ? o.icon : '<span class="ty em" aria-hidden="true">' + esc(o.icon) + "</span>";
    var thumb = o.thumb ? '<img class="kth" alt="" src="' + esc(o.thumb) + '">' : o.thumbAttr ? '<span class="kths" ' + o.thumbAttr + "></span>" : "";
    // znaczki w dolnym wierszu – jeden wzór: moduly/znacznik (raport, zdjęcia, punkty, usterki)
    var marks = (o.form && Z ? Z.formularz(o.form) : "") + (o.marks || []).filter(function (m) { return m && m.n !== "" && m.n != null; }).map(function (m) { return Z ? Z.ikona(m.i, m.n, m.off ? "off" : m.tone) : esc(m.i + m.n); }).join("") + thumb;
    var desc = [o.desc, o.foot].filter(Boolean).join(" · ");
    var due = o.due ? '<div class="kd"><span class="oest-ic termin">' + CAL + "</span><span>" + o.due + "</span></div>" : '<div class="kd"></div>';
    return '<button class="prow k2' + (o.done ? " kdone" : "") + (o.status && o.status.ready ? " kready" : "") + (o.plan ? " kplan" : "") + '" type="button"' + data + ' style="--g:' + esc(o.color || "#8b949e") + '"' + (o.disabled ? " disabled" : "") + (o.go ? ' aria-description="' + esc(bare(o.go).replace(/[›▸▾]/g, "").trim()) + '"' : "") + ">" +
      '<div class="kr">' + icon + '<div class="knm">' + (o.tag ? '<span class="kbl">' + esc(o.tag) + "</span>" : "") + esc(o.name) + "</div>" + st + "</div>" +
      '<div class="kr"><div class="kloc">' + esc(desc || "") + "</div></div>" +
      '<div class="kr kinfo">' + due + (marks ? '<div class="km">' + marks + "</div>" : "") + "</div>" +
      '<svg class="kgo' + (o.open ? " open" : "") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
  }
  // ---------- klocek inspekcji (Grzegorz 07/11/2026, zgoda na budowę 22:10) ----------
  // Każdy element ma STAŁE miejsce i stałą (maksymalną) wielkość, także gdy jest pusty – klocki są identyczne, PL/EN bez skoków.
  // Wszystkie ikonki: 21×21, styl „słupków” (kreska 1.8, kolor --steel); kolor ma tylko znak w środku ikony.
  //
  //  ┌▌ Nazwa inspekcji …………………………… (pigułka)  ┐  1: nazwa (wielokropek) + pigułka statusu (OESTZnacznik.status, 98 px)
  //  │▌ [TB/L13] ▮▮▮ 3M  🗎✗                     › │  2: lokalizacja (pole 5–6 znaków, puste = pusty kwadrat), słupki + częstotliwość (3 znaki), formularz
  //  └▌ 📅 30/11 za 23D │ 🖼 7 │ ☑ 8/20 │ ⚠ 2      ┘  3: termin │ zdjęcia (2 cyfry) │ OK/pytania (99/99) │ usterki (na razie pomarańczowe)
  //
  // OESTKlocek.inspekcja({
  //   id, data:{fam:'DB'}, color (pasek z lewej), name, status:'zalegla'|'nierozpoczeta'|'wtrakcie'|'wstrzymana'|'gotowa',
  //   loc:'TB/L13' ('' = pusty kwadrat), freq:'3M' (1W 1M 3M 6M 11M; 12M pokazuje się jako „Y”), form:'blad'|'ok'|'brak'
  //   (✗ czerwony = wymagane zdjęcie formularza, jeszcze brak; ✓ zielony = dodane; same linie = niewymagane),
  //   due: Date|null, left: dni do terminu (z OEST_PPM.daysLeft), dueDone: true (Gotowa – sama data, bez odliczania),
  //   photos: liczba, qa: {ok, all} | null („–”), issues: liczba (0 = puste miejsce), go ('Otwórz'), open (grupa rozwinięta), plan, glow (Gotowa świeci)
  // })   → '<button class="prow k2 ki" …>…</button>'
  // OESTKlocek.termin(due, left, done) → { text, tone: ''|'jutro'|'red' } – „DD/MM za 4D”, „DD/MM jutro”, „DD/MM dziś”, „DD/MM −3D”; od 31 dni „za 1M”.
  // OESTKlocek.przytrzymaj(lista, onHold) – przytrzymanie klocka ~0,4 s → onHold(klocek) + krótka wibracja; zwykłe stuknięcie działa jak dotąd.
  // OESTKlocek.infoNode([{ic:'lok'|'czest'|'termin'|'form-blad'|'form-ok'|'form-brak'|'zdjecia'|'pytania'|'pytania-ok'|'pytania-mid'|'usterki', html}])
  //   → treść okna informacji; strona otwiera je tym samym okienkiem apki: OESTPrzycisk.ask({ title, node, bare: true, cls: OESTKlocek.infoCls })
  //   (bez przycisków: zostaje po puszczeniu palca, stuknięcie gdziekolwiek / Wstecz zamyka).
  var ORANGE = "#ff8a3d", RED = "#ef3b36", GREEN = "#21c45a";
  var DOC = '<path d="M7 3h7.5L19 7.5V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z"/>';
  var IC = {
    lok: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    czest: '<path d="M3 20h18"/><rect x="5" y="12" width="3" height="8" rx="1"/><rect x="10.5" y="8" width="3" height="12" rx="1"/><rect x="16" y="4" width="3" height="16" rx="1"/>',
    termin: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    "form-blad": DOC + '<path class="kz" style="stroke:' + RED + '" d="M9.5 11l5 5M14.5 11l-5 5"/>',
    "form-ok": DOC + '<path class="kz" style="stroke:' + GREEN + '" d="M8.8 13.6l2.3 2.4 4.3-4.8"/>',
    "form-brak": DOC + '<path d="M8.5 11h7M8.5 15h5"/>',
    zdjecia: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
    pytania: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12.5l3 3 5.5-6.5"/>',
    "pytania-ok": '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path class="kz" style="stroke:' + GREEN + '" d="M8 12.5l3 3 5.5-6.5"/>',
    "pytania-mid": '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path class="kz" style="stroke:' + ORANGE + '" d="M8 12.5l3 3 5.5-6.5"/>',
    usterki: '<path d="M12 4l9 16H3z"/><path class="kz" style="stroke:' + ORANGE + '" d="M12 10v4M12 17.2v.1"/>'
  };
  function svg(k) { return '<svg class="kic" viewBox="0 0 24 24" aria-hidden="true">' + (IC[k] || "") + "</svg>"; }
  var CSS2 =
    ".prow.k2.ki{min-height:0;gap:0!important;padding:12px 38px 12px 18px!important;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}" +
    ".ki .kr+.kr{margin-top:9px}" +
    ".ki .kic{width:21px;height:21px;flex:none;fill:none;stroke:var(--steel);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ki .kic .kz{stroke-width:2.2}" +
    // lokalizacja: stałe pole pod najdłuższy wpis (TB/L13), puste = pusty kwadrat
    ".ki .klok{flex:none;width:51px;height:24px;box-sizing:border-box;display:grid;place-items:center;border-radius:7px;background:rgba(255,255,255,.12);font-size:11px;font-weight:800;color:var(--steel);letter-spacing:.02em;white-space:nowrap;overflow:hidden}" +
    ".ki .kcz{flex:none;width:34px;font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden}" +
    ".ki .kdt{flex:none;width:118px;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}.ki .kdt b{color:var(--ink)}" +
    ".ki .kdt.t-jutro,.ki .kdt.t-jutro b{color:" + ORANGE + "}.ki .kdt.t-red,.ki .kdt.t-red b{color:" + RED + "}" +
    ".ki .ksep{flex:none;width:1px;height:19px;background:rgba(255,255,255,.18)}" +
    // linia 3 sięga pod strzałkę (strzałka stoi na wysokości linii 2), żeby zmieściła się także na wąskim ekranie (uwaga Codex w PR #87)
    ".ki .kr3{gap:6px;margin-right:-26px}" +
    // ekran węższy niż 400 px (np. 360): te same stałe miejsca, tylko ciaśniej i czcionka 12 px – nic nie wypada poza klocek.
    // Szerokości pól z zapasem na najszerszą czcionkę zastępczą (DejaVu Sans na serwerze CI), nie tylko Roboto/Inter z telefonu.
    "@media (max-width:399px){.ki .kr3{gap:3px}.ki .kr3 .kdt,.ki .kr3 .kn{font-size:12px}.ki .kr3 .kdt{width:108px}.ki .kr3 .kn2{width:18px}.ki .kr3 .kn5{width:40px}.ki .kr3 .kus{width:40px}}" +
    ".ki .kn{flex:none;font-size:13px;font-weight:700;color:var(--ink);white-space:nowrap;overflow:hidden;font-variant-numeric:tabular-nums}.ki .kn2{width:20px}.ki .kn5{width:44px}" +
    ".ki .kus{flex:none;display:flex;align-items:center;gap:4px;width:44px;height:21px;color:" + ORANGE + "}.ki .kus:empty{visibility:hidden}" +
    ".oest-ask.ki-info,.oest-ask.ki-info *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}" +
    ".oest-ask.ki-info>div{text-align:left}.oest-ask.ki-info{--ruch-okno-easing:var(--ruch-znacznik-easing,cubic-bezier(.34,1.56,.64,1))}" +
    ".ki-info .kir{display:flex;gap:10px;align-items:center;margin:10px 0;font-size:14px;line-height:1.35}" +
    ".ki-info .kic{width:21px;height:21px;flex:none;fill:none;stroke:var(--steel,#b9c2e6);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.ki-info .kic .kz{stroke-width:2.2}" +
    ".ki-info .kir b{display:inline;font-size:inherit;margin:0;font-weight:700}.ki-info .kfoot{margin:12px 0 0;font-size:12px;opacity:.6;text-align:center}";
  function css2() {
    css();
    if (!w.document || w.document.getElementById("oest-klocek-ki-css")) return;
    var s = w.document.createElement("style"); s.id = "oest-klocek-ki-css"; s.textContent = CSS2;
    (w.document.head || w.document.documentElement).appendChild(s);
  }
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function dd(d) { return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0"); }
  function termin(due, left, done) {
    if (!due) return { text: "–", date: "", rest: "", tone: "" };
    var date = dd(due), rest = "", tone = "";
    if (done || left == null) rest = "";
    else if (left < 0) { rest = "−" + (-left > 30 ? Math.floor(-left / 30) + "M" : -left + "D"); tone = "red"; }
    else if (left === 0) { rest = T("dziś", "today"); tone = "red"; }
    else if (left === 1) { rest = T("jutro", "tomorrow"); tone = "jutro"; }
    else rest = T("za ", "in ") + (left > 30 ? Math.floor(left / 30) + "M" : left + "D");
    return { text: date + (rest ? " " + rest : ""), date: date, rest: rest, tone: tone };
  }
  function czest(f) { return f === "12M" ? "Y" : String(f || "").slice(0, 3); }
  function inspekcja(o) {
    css2(); o = o || {};
    var Z = w.OESTZnacznik, data = "";
    if (o.id != null) data += ' data-id="' + esc(o.id) + '"';
    Object.keys(o.data || {}).forEach(function (k) { data += " data-" + k + '="' + esc(o.data[k]) + '"'; });
    var tm = termin(o.due, o.left, o.dueDone);
    var qa = o.qa && o.qa.all ? o.qa : null, qn = qa ? Math.min(qa.ok, 99) + "/" + Math.min(qa.all, 99) : "–";
    var form = o.form === "blad" || o.form === "ok" ? o.form : "brak";
    var st = Z && Z.status ? Z.status(o.status) : "";
    var n = o.issues > 0 ? Math.min(o.issues, 99) : 0;
    return '<button class="prow k2 ki' + (o.plan ? " kplan" : "") + (o.glow ? " kready" : "") + '" type="button"' + data + ' style="--g:' + esc(o.color || "#8b949e") + '"' + (o.go ? ' aria-description="' + esc(o.go) + '"' : "") + ">" +
      '<div class="kr"><div class="knm">' + esc(o.name) + "</div>" + st + "</div>" +
      '<div class="kr"><span class="klok">' + esc(o.loc || "") + "</span>" + svg("czest") + '<span class="kcz">' + esc(czest(o.freq)) + "</span>" + svg("form-" + form) + "</div>" +
      '<div class="kr kr3">' + svg("termin") + '<span class="kdt' + (tm.tone ? " t-" + tm.tone : "") + '">' + (tm.date ? "<b>" + tm.date + "</b>" + (tm.rest ? " " + esc(tm.rest) : "") : "–") + "</span>" +
      '<i class="ksep"></i>' + svg("zdjecia") + '<span class="kn kn2">' + Math.min(o.photos || 0, 99) + "</span>" +
      '<i class="ksep"></i>' + svg(qa ? (qa.ok === qa.all ? "pytania-ok" : "pytania-mid") : "pytania") + '<span class="kn kn5">' + qn + "</span>" +
      '<span class="kus">' + (n ? svg("usterki") + '<span class="kn">' + n + "</span>" : "") + "</span></div>" +
      '<svg class="kgo' + (o.open ? " open" : "") + '" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>';
  }
  // przytrzymanie klocka (~0,4 s): okno informacji; ruch palca = przewijanie (bez okna); po przytrzymaniu stuknięcie nie otwiera inspekcji
  var HOLD_MS = 400;
  function przytrzymaj(root, onHold) {
    if (!root || root.__kiHold) return; root.__kiHold = true;
    var t = 0, x = 0, y = 0, el = null, fired = false;
    function stop() { clearTimeout(t); t = 0; }
    root.addEventListener("pointerdown", function (e) {
      stop(); fired = false; el = e.target.closest && e.target.closest(".ki"); if (!el || !root.contains(el)) return;
      x = e.clientX; y = e.clientY;
      t = setTimeout(function () {
        t = 0; fired = true;
        try { if (w.navigator && w.navigator.vibrate) w.navigator.vibrate(20); } catch (er) {}
        try { var sel = w.getSelection && w.getSelection(); if (sel && sel.rangeCount) sel.removeAllRanges(); } catch (er) {}
        onHold(el);
      }, HOLD_MS);
    }, { passive: true });
    root.addEventListener("pointermove", function (e) { if (t && (Math.abs(e.clientX - x) > 10 || Math.abs(e.clientY - y) > 10)) stop(); }, { passive: true });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (k) { root.addEventListener(k, stop, { passive: true }); });
    w.addEventListener("scroll", stop, { passive: true });
    root.addEventListener("contextmenu", function (e) { if (e.target.closest && e.target.closest(".ki")) e.preventDefault(); });
    // okno informacji wyskakuje pod palcem, który dalej trzyma – bez zaznaczania i paska Kopiuj/Udostępnij (Pixel, Grzegorz 08/11/2026);
    // tylko klocki i okno informacji list inspekcji, reszta apki bez zmian
    if (!w.document.__kiInfoMenu) {
      w.document.__kiInfoMenu = true;
      w.document.addEventListener("contextmenu", function (e) { if (e.target.closest && e.target.closest(".ki-info")) e.preventDefault(); });
    }
    // stuknięcie, które kończy przytrzymanie, nie otwiera inspekcji – niezależnie od tego, jak długo palec trzymał (uwaga Codex w PR #87);
    // stan zeruje dopiero następne dotknięcie
    root.addEventListener("click", function (e) { if (fired) { fired = false; e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  }
  przytrzymaj.ms = HOLD_MS;
  // treść okna informacji; okno otwiera strona: OESTPrzycisk.ask({ title, node: OESTKlocek.infoNode(rows), bare: true, cls: OESTKlocek.infoCls })
  function infoNode(rows) {
    css2();
    var n = w.document.createElement("div");
    n.innerHTML = (rows || []).map(function (r) { return '<div class="kir">' + svg(r.ic) + "<span>" + r.html + "</span></div>"; }).join("") +
      '<p class="kfoot">' + esc(T("Stuknij gdziekolwiek, aby zamknąć", "Tap anywhere to close")) + "</p>";
    return n;
  }
  w.OESTKlocek = { html: html, esc: esc, tones: TONE, css: css, inspekcja: inspekcja, termin: termin, czest: czest, przytrzymaj: przytrzymaj, infoNode: infoNode, infoCls: "ki-info", ikony: IC };
})(typeof window !== "undefined" ? window : globalThis);
