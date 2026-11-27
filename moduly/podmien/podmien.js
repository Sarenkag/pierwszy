/* Moduł miejsca pod dwa języki (moduly/podmien).
 * Zasada Grzegorza: zmiana języka albo stanu niczego nie przesuwa – miejsce na tekst ustawiany przez JS jest zarezerwowane z góry.
 * Użycie: OESTPodmien.miejsce(el, tekst2) – el ma już tekst w bieżącym języku, tekst2 = ten sam tekst w drugim języku.
 * Stały HTML z data-en: moduly/bledy (applyDom). Dawne html / oba / rezerwuj / ustaw usunięte 27/11/2026 – nikt ich już nie wołał
 * (ekrany rysuje Ionic + Vue).
 */
(function (root) {
  "use strict";
  // ukryty teraz: policz, gdy się pokaże (ten sam tekst)
  var RO = typeof ResizeObserver === "function" ? new ResizeObserver(function (es) { es.forEach(function (e) { var el = e.target; if (!el.getClientRects().length) return;
    if (el.__oestAlt != null && el.textContent === el.__oestKeep) { RO.unobserve(el); miejsce(el, el.__oestAlt); } }); }) : null;
  // rozmiar bez chwilowej transformacji (Poświata, wciśnięcie) – jedno miejsce: moduly/bledy (OESTBledy.prostokat)
  function prostokat(el) { var B = (el.ownerDocument.defaultView || {}).OESTBledy; return B && B.prostokat ? B.prostokat(el) : el.getBoundingClientRect(); }
  // element nie wypełnia szerokości rodzica (przycisk, napis w rzędzie, wyśrodkowany) – wtedy liczy się też szerokość
  function narrow(e, r, win) { var p = e.parentNode, pc = win.getComputedStyle(p), pr = prostokat(p); return r.width < pr.width - parseFloat(pc.paddingLeft) - parseFloat(pc.paddingRight) - parseFloat(pc.borderLeftWidth) - parseFloat(pc.borderRightWidth) - 1; }
  // jeden tekst ustawiany przez JS: el ma już tekst w bieżącym języku, inny = ten sam tekst w drugim języku
  function miejsce(el, inny) {
    if (!el) return;
    if (!el.getClientRects().length) { el.__oestAlt = inny; el.__oestKeep = el.textContent; if (RO) RO.observe(el); return; }
    el.__oestAlt = null;
    var win = el.ownerDocument.defaultView;
    if (el.__oestMin) { el.style.minHeight = ""; el.style.minWidth = ""; el.__oestMin = false; }
    var cs = win.getComputedStyle(el), keep = el.textContent; if (inny == null || inny === keep) return;
    var ra = prostokat(el), row = narrow(el, ra, win), h = parseFloat(cs.height), w = parseFloat(cs.width);
    el.textContent = inny; var rb = prostokat(el); el.textContent = keep;
    if (rb.height > ra.height + 0.5) { el.style.minHeight = (rb.height - Math.max(0, ra.height - h)) + "px"; el.__oestMin = true; }
    if (row && cs.display !== "inline" && rb.width > ra.width + 0.5) { el.style.minWidth = (rb.width - Math.max(0, ra.width - w)) + "px"; el.__oestMin = true; }
  }  var api = { miejsce: miejsce };
  if (typeof module === "object" && module.exports) module.exports = api; else root.OESTPodmien = api;
})(typeof window !== "undefined" ? window : globalThis);
