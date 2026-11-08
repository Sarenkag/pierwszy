// Moduł kafelka (moduly/kafelek) – JEDEN kafelek dla całej apki (Grzegorz 04/11/2026): ekran główny, Ustawienia,
// Reactive (kategorie zgłoszeń) i wybór typu w inspekcjach. Stałe miejsca: ikona w kolorowym kwadracie, nazwa,
// opcjonalny opis pod spodem i znaczek z liczbą w rogu. Ekrany tylko powielają kafelek i podstawiają treść.
//
//   OESTKafelek.html({ icon: '<path …/>' albo cały '<svg …>' albo emoji, name: "Inspekcje", en: "Inspections" (albo name już w języku ekranu, bez en),
//                      sub: "Dane i podpis", subEn: "Details", badge: 3, data: { go: "ppm" }, cls: "settings-card" })
//   OESTKafelek.grid(lista)  → '<div class="tiles kf-grid">…</div>'
(function (w, d) {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var CSS =
    ".kf-grid{display:grid!important;grid-template-columns:1fr 1fr;gap:10px}" +
    "html body .kf{position:relative;display:flex!important;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:8px;" +
    "min-height:108px!important;padding:14px 10px!important;border-radius:18px!important;box-sizing:border-box;width:100%;min-width:0;color:var(--ink);font:inherit;cursor:pointer;" +
    "background:var(--panel)!important;border:1px solid var(--line)!important;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}" +
    "html body .kf .kf-ic{width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;background:var(--grad,linear-gradient(90deg,#5b7cff,#a35bff));" +
    "box-shadow:0 6px 16px rgba(110,90,255,.35),inset 0 1px 0 rgba(255,255,255,.35);color:#fff;font-size:22px;line-height:1}" +
    "html body .kf .kf-ic svg{width:26px;height:26px;stroke:#fff;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;padding:0;background:none;box-sizing:border-box}" +
    "html body .kf b{display:block;font-family:var(--font-body)!important;font-size:15px!important;font-weight:650!important;line-height:1.2;text-transform:none!important;letter-spacing:0!important;overflow-wrap:anywhere}" +
    "html body .kf small{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px!important;line-height:1.3;color:var(--muted)}" +
    "html body .kf small:empty{display:none}" +
    // nazwa i opis na całą szerokość kafelka (tekst wyśrodkowany w środku) – inna długość PL/EN nie przesuwa ich pudełek
    "html body .kf b,html body .kf small{align-self:stretch}" +
    // licznik w rogu: moduly/znacznik (.kf-n)
    "html body .kf:disabled{opacity:.45}" +
    // ruch kafelka z tabeli ruchu (moduly/wyglad/wyglad.css, rola „kafelek”): naciśnięcie i płynna zmiana stanu; w nawiasie wartości zapasowe
    ":where(.tile){transition:transform var(--ruch-kafelek-czas,.16s) var(--ruch-kafelek-easing,cubic-bezier(.2,.8,.2,1)),background-color var(--ruch-stan-czas,.24s),border-color var(--ruch-stan-czas,.24s),color var(--ruch-stan-czas,.24s),box-shadow var(--ruch-stan-czas,.24s),opacity var(--ruch-stan-czas,.24s),filter var(--ruch-stan-czas,.24s);-webkit-tap-highlight-color:transparent;backface-visibility:hidden}" +
    ":where(.tile:active:not(:disabled)){transform:var(--ruch-kafelek-nacisk,scale(.97))}" +
    "@media (prefers-reduced-motion:reduce){:where(.tile:active:not(:disabled)){transform:none}}:root[data-settings-motion=reduce] :where(.tile:active:not(:disabled)){transform:none}";
  function css() {
    if (d.getElementById("oest-kafelek-css")) return;
    var s = d.createElement("style"); s.id = "oest-kafelek-css"; s.textContent = CSS; (d.head || d.documentElement).appendChild(s);
  }
  function icon(i) {
    if (!i) return "";
    if (/^\s*<svg/.test(i)) return i;
    if (/^\s*</.test(i)) return '<svg viewBox="0 0 48 48" aria-hidden="true">' + i + "</svg>";
    return '<span aria-hidden="true">' + esc(i) + "</span>";
  }
  function html(o) {
    css(); o = o || {};
    var data = "";
    Object.keys(o.data || {}).forEach(function (k) { data += " data-" + k + '="' + esc(o.data[k]) + '"'; });
    // z en/subEn: tekst polski + data-en, język podmienia OESTBledy.applyDom w miejscu (bez przerysowania)
    var name = o.name, sub = o.sub;
    return '<button class="tile kf' + (o.cls ? " " + esc(o.cls) : "") + '" type="button"' + data + (o.disabled ? " disabled" : "") + ">" +
      '<span class="kf-ic">' + icon(o.icon) + "</span>" +
      "<b" + (o.en ? ' data-en="' + esc(o.en) + '"' : "") + ">" + esc(name) + "</b>" +
      "<small" + (o.subEn ? ' data-en="' + esc(o.subEn) + '"' : "") + ">" + esc(sub || "") + "</small>" +
      (o.badge ? '<span class="kf-n">' + esc(o.badge) + "</span>" : "") + "</button>";
  }
  function grid(list, cls) { return '<div class="tiles kf-grid' + (cls ? " " + esc(cls) : "") + '">' + (list || []).map(html).join("") + "</div>"; }
  css(); // ruch kafelka działa też dla kafelków zbudowanych bez OESTKafelek.html (np. stare .tile)
  w.OESTKafelek = { html: html, grid: grid, css: css };
})(window, document);
