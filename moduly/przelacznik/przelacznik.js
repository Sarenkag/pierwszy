// Moduł przełącznika (moduly/przelacznik) – JEDEN przełącznik „jedna z kilku opcji” dla całej apki (Grzegorz 04/11/2026),
// wzór: klocek PL / EN. Wypukły suwak płynnie przesuwa się pod wybraną opcję (sprężyście, z cieniem – „3D”), zamiast pstryknięcia.
//
//   OESTPrzelacznik.html({ name: "lang", value: "pl", options: [{ v: "pl", t: "PL" }, { v: "en", t: "EN" }], label: "Język", cls: "" })
//   OESTPrzelacznik.set(elementLubNazwa, "en")   – przesuwa suwak (np. po zmianie z innego ekranu)
// Kliknięcie obsługuje ekran (jak dotąd); moduł sam przestawia suwak. Przełącznik języka (name "lang")
// sam słucha zmiany języka w całej apce (oest:lang), więc na każdym ekranie pokazuje to samo.
(function (w, d) {
  "use strict";
  if (w.OESTPrzelacznik) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var CSS =
    ".oest-sw{--n:2;--i:0;position:relative;display:inline-grid;grid-auto-flow:column;grid-auto-columns:1fr;align-items:stretch;flex:none;min-width:calc(var(--n) * 30px);height:32px;padding:3px;box-sizing:border-box;" +
    "border-radius:11px;border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(255,255,255,.04));" +
    "box-shadow:inset 0 2px 5px rgba(0,0,0,.55),inset 0 -1px 0 rgba(255,255,255,.06),0 1px 0 rgba(255,255,255,.05);cursor:pointer;font:700 11.5px/1 var(--font-body,system-ui);color:var(--muted,#9aa3cc);-webkit-tap-highlight-color:transparent;overflow:hidden;isolation:isolate}" +
    ".oest-sw>.th{position:absolute;z-index:0;top:3px;bottom:3px;left:3px;width:calc((100% - 6px) / var(--n));border-radius:8px;" +
    "background:linear-gradient(180deg,#8f86ff 0%,#6c63f5 48%,#8a4fe6 100%);" +
    "box-shadow:0 3px 8px rgba(70,50,200,.55),0 1px 2px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.45),inset 0 -2px 3px rgba(40,10,120,.45);" +
    "transform:translateX(calc(var(--i) * 100%));transition:transform .42s cubic-bezier(.34,1.45,.5,1),box-shadow .3s}" +
    ".oest-sw>.th:after{content:'';position:absolute;left:18%;right:18%;top:2px;height:35%;border-radius:6px;background:linear-gradient(180deg,rgba(255,255,255,.35),transparent)}" +
    ".oest-sw>i{position:relative;z-index:1;display:grid;place-items:center;padding:0 7px;font-style:normal;letter-spacing:.04em;transition:color .3s,transform .3s,text-shadow .3s}" +
    ".oest-sw>i.on{color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.45)}" +
    ".oest-sw:active>.th{box-shadow:0 1px 3px rgba(70,50,200,.5),inset 0 1px 0 rgba(255,255,255,.35),inset 0 -1px 2px rgba(40,10,120,.45)}" +
    ".oest-sw.big{height:var(--h-btn-s,40px);border-radius:13px;font-size:13px}.oest-sw.big>.th{border-radius:10px}.oest-sw.big>i{padding:0 12px}" +
    "@media (prefers-reduced-motion:reduce){.oest-sw>.th,.oest-sw>i{transition:none}}" +
    ":root[data-settings-motion=reduce] .oest-sw>.th,:root[data-settings-motion=reduce] .oest-sw>i{transition:none}";
  function css() {
    if (d.getElementById("oest-sw-css")) return;
    var s = d.createElement("style"); s.id = "oest-sw-css"; s.textContent = CSS; (d.head || d.documentElement).appendChild(s);
  }
  function html(o) {
    css(); o = o || {};
    var opts = o.options || [], v = o.value, idx = Math.max(0, opts.map(function (x) { return x.v; }).indexOf(v));
    return '<button type="button" class="oest-sw' + (o.cls ? " " + esc(o.cls) : "") + '"' + (o.name ? ' data-sw="' + esc(o.name) + '"' : "") + (o.id ? ' id="' + esc(o.id) + '"' : "") +
      (o.attrs || "") + ' data-val="' + esc(v) + '" style="--n:' + opts.length + ";--i:" + idx + '"' + (o.label ? ' aria-label="' + esc(o.label) + '"' : "") + ">" +
      '<span class="th" aria-hidden="true"></span>' +
      opts.map(function (x, i) { return '<i data-v="' + esc(x.v) + '"' + (i === idx ? ' class="on"' : "") + ">" + esc(x.t) + "</i>"; }).join("") + "</button>";
  }
  function set(el, v) {
    css();
    var list = typeof el === "string" ? d.querySelectorAll('.oest-sw[data-sw="' + el + '"]') : el ? [el] : [];
    [].forEach.call(list, function (b) {
      var items = [].slice.call(b.querySelectorAll(":scope>i[data-v]")), idx = items.map(function (i) { return i.dataset.v; }).indexOf(String(v));
      if (idx < 0) return;
      b.dataset.val = v; b.style.setProperty("--n", items.length); b.style.setProperty("--i", idx);
      items.forEach(function (i, k) { i.classList.toggle("on", k === idx); });
    });
  }
  function lang() { try { return w.localStorage.getItem("oest.lang") === "en" ? "en" : "pl"; } catch (e) { return "pl"; } }
  w.addEventListener("oest:lang", function () { set("lang", lang()); });
  w.addEventListener("storage", function (e) { if (e.key === "oest.lang") set("lang", lang()); });
  // przełącznik zapisany wprost w HTML (np. ekran główny) – dobierz stan od razu
  function init() { css(); set("lang", lang()); }
  if (d.readyState !== "loading") init(); else d.addEventListener("DOMContentLoaded", init);
  w.OESTPrzelacznik = { html: html, set: set, css: css };
})(window, document);
