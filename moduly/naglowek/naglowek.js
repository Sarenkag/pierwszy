// Moduł nagłówka (moduly/naglowek) – JEDEN nagłówek ekranu w całej apce (Grzegorz 04/11/2026).
// Stałe miejsca: z lewej „‹ Wstecz”, w środku tytuł (1 linia), z prawej ikonki ekranu (⚙ ⋮ ◀ ▶) i przełącznik PL/EN.
// Wygląd i rozmiary: moduly/wyglad/wyglad.css (.top). Ten plik:
//   • OESTNaglowek.html({ back: "home", title: "Klucze", actions: '<button …>', lang: true }) – nagłówek dla nowych ekranów,
//   • sam ujednolica nagłówki, które ekrany rysują po swojemu: ta sama strzałka Wstecz wszędzie,
//     przełącznik PL/EN tam, gdzie ekran umie podmienić język w miejscu (bez przerysowania).
(function (w, d) {
  "use strict";
  if (w.OESTNaglowek) return;
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function lang() { try { return w.localStorage.getItem("oest.lang") === "en" ? "en" : "pl"; } catch (e) { return "pl"; } }
  // ekrany, które po zmianie języka same podmieniają teksty w miejscu (bez gubienia wpisanych danych)
  var LIVE = { "v-ppm": 1, "v-soon": 1, "v-appset": 1 }; // Kalendarz: brak miejsca (◀ ▶ ⚙) – język zmienia się z ekranu głównego
  function sw() {
    return w.OESTPrzelacznik ? w.OESTPrzelacznik.html({ name: "lang", value: lang(), attrs: ' data-oest-lang="1"', label: T("Język: polski / angielski", "Language: Polish / English"), options: [{ v: "pl", t: "PL" }, { v: "en", t: "EN" }] }) : "";
  }
  function html(o) {
    o = o || {};
    return '<div class="top oest-top">' +
      (o.back !== false ? '<button class="back" type="button"' + (o.back ? ' data-go="' + esc(o.back) + '"' : "") + ' aria-label="' + esc(T("Wstecz", "Back")) + '">' + ARROW + "</button>" : "") +
      '<div class="t"><h1>' + esc(o.title || "") + "</h1></div>" + (o.actions || "") + (o.lang ? sw() : "") + "</div>";
  }
  function setLang(next) {
    try { w.OESTSettings.update(function (s) { s.appearance.language = next; }); w.OESTSettingsUI.applyTheme(); }
    catch (e) { try { w.localStorage.setItem("oest.lang", next); w.dispatchEvent(new CustomEvent("oest:lang")); } catch (e2) {} }
  }
  d.addEventListener("click", function (e) {
    var b = e.target.closest("[data-oest-lang]"); if (!b) return;
    setLang(lang() === "en" ? "pl" : "en");
  });
  function fix(top) {
    // ta sama strzałka Wstecz na każdym ekranie (zamiast „‹” w różnych krojach)
    var back = top.querySelector(":scope > .back:not(.rx-gear)");
    if (back && !back.dataset.oestArrow && /^\s*‹?\s*$/.test(back.textContent) && !back.querySelector("img")) { back.dataset.oestArrow = "1"; back.innerHTML = ARROW; }
    var view = top.closest(".view");
    if (view && LIVE[view.id] && !top.querySelector(".oest-sw")) top.insertAdjacentHTML("beforeend", sw());
    top.classList.add("oest-top");
  }
  function scan(root) { [].forEach.call((root || d).querySelectorAll(".top"), fix); }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
      var n = ms[i].addedNodes[j]; if (n.nodeType !== 1) continue;
      if (n.classList.contains("top")) fix(n); else if (n.querySelector && n.querySelector(".top")) scan(n);
    }
  }).observe(d.documentElement, { childList: true, subtree: true });
  if (d.readyState !== "loading") scan(); else d.addEventListener("DOMContentLoaded", function () { scan(); });
  w.OESTNaglowek = { html: html, fix: fix, arrow: ARROW };
})(window, document);
