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
  w.OESTKlocek = { html: html, esc: esc, tones: TONE, css: css };
})(typeof window !== "undefined" ? window : globalThis);
