// Moduł klocka (moduly/klocek) – JEDEN klocek listy dla całej apki (Grzegorz 04/11/2026):
// stałe miejsca, które każda lista tylko wypełnia swoimi danymi. Inspekcje, dzień w Kalendarzu, Reactive
// i grupy (np. 18 DB) wyglądają i działają tak samo; różnią się tylko treścią.
//
//  ┌▌[ikona] [TA] Nazwa ……………………… status ┐   1: ikona, znacznik budynku, nazwa (1 linia), status w rogu
//  │▌ opis: gdzie · częstotliwość · kto       │   2: opis
//  │▌ termin / data ……………………………… 50%      │   3: termin (może mieć <b>/<span class="red">) + procent
//  │▌ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ pasek postępu          │   4: pasek (gdy jest procent)
//  └▌ stopka …………… wysyłka [miniatura] Akcja › ┘   5: stopka, stan wysyłki, miniatura, akcja
//
// OESTKlocek.html({
//   id, data:{rx:'job'} (dodatkowe data-*), color (kolor paska z lewej), icon (svg/emoji – HTML),
//   tag ('TA'), name, status:{text, tone:0..4}, desc, due (HTML), pct (liczba albo pomiń), barColor,
//   foot, marks:[{i:'📷', n:3, tone}] (ikonki z liczbą), send:{text, tone}, thumb (adres obrazka) | thumbAttr ('data-rx-thumb="…"' – miniatura dociągana później),
//   go ('Zacznij ›'), done (szary, na koniec listy), plan (przygaszony – planowane)
// })   → '<button class="prow k2" …>…</button>'
// Kolory statusu (tone): 0 szary · 1 żółty (w trakcie) · 2 zielony (gotowe) · 3 czerwony (zaległe) · 4 niebieski (w kolejce)
(function (w) {
  "use strict";
  var TONE = ["#c3c9e8", "#f0c75e", "#5fd6a0", "#ff7b72", "#79b8ff"];
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var CSS = ".prow.k2{position:relative;display:flex!important;flex-direction:column!important;flex-wrap:nowrap!important;align-items:stretch!important;justify-content:space-between;gap:5px!important;height:136px;box-sizing:border-box;padding:11px 14px 9px 18px!important;border-radius:16px!important;text-align:left;color:var(--ink);overflow:hidden;width:100%;margin:0 0 8px}" +
    ".ppm>.prow.k2{margin:0}" +
    ".prow.k2:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--g)}" +
    ".k2 .kr{display:flex;align-items:center;gap:8px;min-width:0}" +
    ".k2 .ty{width:21px;height:21px;flex:none;fill:none;stroke:var(--steel);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}" +
    ".k2 .ty.em{display:grid;place-items:center;font-size:16px;line-height:1;stroke:none}" +
    ".k2 .knm{flex:1;min-width:0;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".k2 .kbl{display:inline-block;font-size:10px;font-weight:700;padding:1px 5px;border-radius:5px;background:rgba(255,255,255,.12);color:var(--steel);margin-right:6px;vertical-align:2px}" +
    ".k2 .kst,.k2 .ksend{flex:none;font-size:12px;font-weight:700}" +
    ".k2 .c0{color:" + TONE[0] + "}.k2 .c1{color:" + TONE[1] + "}.k2 .c2{color:" + TONE[2] + "}.k2 .c3{color:" + TONE[3] + "}.k2 .c4{color:" + TONE[4] + "}" +
    ".k2 .kloc,.k2 .kd,.k2 .kft{flex:1;min-width:0;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".k2 .kd b{color:var(--ink);font-weight:600}.k2 .red{color:" + TONE[3] + "!important}" +
    ".k2 .kpc{font-size:13px;font-weight:700}" +
    ".k2 .kbar{flex:none;height:6px;border-radius:3px;background:rgba(255,255,255,.1);overflow:hidden}.k2 .kbar i{display:block;height:100%;border-radius:3px;transition:width .45s cubic-bezier(.2,.8,.2,1)}" +
    ".k2 .kbar.none{background:transparent}" +
    ".k2 .kth,.k2 .kths img{width:30px;height:30px;border-radius:7px;object-fit:cover;border:1px solid rgba(255,255,255,.2);flex:none;display:block}" +
    ".k2 .kths:empty{display:none}" +
    ".k2 .kgo{font-size:13px;font-weight:700;flex:none}" +
    ".prow.k2.kdone{opacity:.5;filter:grayscale(.6)}.prow.k2.kplan{opacity:.6}";
  function css() {
    if (!w.document || w.document.getElementById("oest-klocek-css")) return;
    var s = w.document.createElement("style"); s.id = "oest-klocek-css"; s.textContent = CSS;
    (w.document.head || w.document.documentElement).appendChild(s);
  }
  function html(o) {
    css();
    o = o || {};
    var data = "";
    if (o.id != null) data += ' data-id="' + esc(o.id) + '"';
    Object.keys(o.data || {}).forEach(function (k) { data += " data-" + k + '="' + esc(o.data[k]) + '"'; });
    var st = o.status ? '<span class="kst c' + (o.status.tone | 0) + '">' + esc(o.status.text) + "</span>" : "";
    var icon = !o.icon ? "" : /^\s*</.test(o.icon) ? o.icon : '<span class="ty em" aria-hidden="true">' + esc(o.icon) + "</span>";
    var has = typeof o.pct === "number";
    var bar = has ? '<div class="kbar"><i style="width:' + Math.max(0, Math.min(100, o.pct)) + "%;background:" + (o.barColor || "transparent") + '"></i></div>' : '<div class="kbar none"></div>';
    var thumb = o.thumb ? '<img class="kth" alt="" src="' + esc(o.thumb) + '">' : o.thumbAttr ? '<span class="kths" ' + o.thumbAttr + "></span>" : "";
    // ikonki z liczbą (✓ punkty, ⚠ usterki, 📷 zdjęcia) – jeden wzór: moduly/znacznik
    var Z = w.OESTZnacznik, marks = (o.marks || []).filter(function (m) { return m && m.n !== "" && m.n != null; }).map(function (m) { return Z ? Z.ikona(m.i, m.n, m.tone) : esc(m.i + m.n); }).join("");
    var send = o.send ? '<span class="ksend c' + (o.send.tone | 0) + '">' + esc(o.send.text) + "</span>" : "";
    return '<button class="prow k2' + (o.done ? " kdone" : "") + (o.plan ? " kplan" : "") + '" type="button"' + data + ' style="--g:' + esc(o.color || "#8b949e") + '"' + (o.disabled ? " disabled" : "") + ">" +
      '<div class="kr">' + icon + '<div class="knm">' + (o.tag ? '<span class="kbl">' + esc(o.tag) + "</span>" : "") + esc(o.name) + "</div>" + st + "</div>" +
      '<div class="kr"><div class="kloc">' + esc(o.desc || "") + "</div></div>" +
      '<div class="kr"><div class="kd">' + (o.due || "") + "</div>" + (has ? '<div class="kpc">' + Math.round(o.pct) + "%</div>" : "") + "</div>" +
      bar +
      '<div class="kr"><div class="kft">' + esc(o.foot || "") + "</div>" + marks + send + thumb + (o.go ? '<div class="kgo">' + esc(o.go) + "</div>" : "") + "</div></button>";
  }
  w.OESTKlocek = { html: html, esc: esc, tones: TONE, css: css };
})(typeof window !== "undefined" ? window : globalThis);
