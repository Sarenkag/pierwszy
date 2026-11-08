/* Moduł podmiany treści (moduly/podmien) – zamiast el.innerHTML = html.
 * Zasada Grzegorza: zmiana języka albo stanu niczego nie przerysowuje ani nie drga. innerHTML usuwa i tworzy od nowa
 * wszystkie elementy (miga, gubi fokus i przewinięcie, rusza animacje pojawienia). Tu ten sam HTML jest nakładany na
 * istniejące elementy: zmieniają się tylko teksty i atrybuty; elementy powstają/znikają tylko wtedy, gdy naprawdę
 * przybyło albo ubyło pozycji.
 * Użycie: OESTPodmien.html(el, html)  → el (to samo co el.innerHTML = html, ale bez przerysowania)
 */
(function (root) {
  "use strict";
  var PROPS = { value: 1, checked: 1, selected: 1, disabled: 1 };
  function attrs(a, b) {
    var i, n;
    for (i = a.attributes.length - 1; i >= 0; i--) { n = a.attributes[i].name; if (!b.hasAttribute(n)) { a.removeAttribute(n); if (PROPS[n] && n in a) a[n] = n === "value" ? "" : false; } }
    for (i = 0; i < b.attributes.length; i++) {
      n = b.attributes[i].name; var v = b.attributes[i].value;
      if (a.getAttribute(n) !== v) { a.setAttribute(n, v); if (PROPS[n] && n in a) a[n] = n === "value" ? v : true; }
    }
  }
  function same(a, b) { return a.nodeType === b.nodeType && a.nodeName === b.nodeName; }
  function kids(a, b) {
    var bc = Array.prototype.slice.call(b.childNodes), i;
    for (i = 0; i < bc.length; i++) {
      var x = a.childNodes[i];
      if (!x) a.appendChild(bc[i].cloneNode(true));
      else if (same(x, bc[i])) patch(x, bc[i]);
      else a.replaceChild(bc[i].cloneNode(true), x);
    }
    while (a.childNodes.length > bc.length) a.removeChild(a.lastChild);
  }
  function patch(a, b) {
    if (a.nodeType === 3 || a.nodeType === 8) { if (a.nodeValue !== b.nodeValue) a.nodeValue = b.nodeValue; return; }
    attrs(a, b); kids(a.content || a, b.content || b);
  }
  function html(el, s) {
    if (!el) return el;
    var t = el.ownerDocument.createElement("template");
    t.innerHTML = s;
    kids(el, t.content);
    return el;
  }
  // ukryty teraz: policz, gdy się pokaże (ten sam tekst / ten sam ekran)
  var RO = typeof ResizeObserver === "function" ? new ResizeObserver(function (es) { es.forEach(function (e) { var el = e.target; if (!el.getClientRects().length) return;
    if (el.__oestHtml2 != null) { RO.unobserve(el); rezerwuj(el, el.__oestHtml2); }
    else if (el.__oestAlt != null && el.textContent === el.__oestKeep) { RO.unobserve(el); miejsce(el, el.__oestAlt); } }); }) : null;
  // Miejsce pod oba języki: el pokazuje jeden język, html2 to ten sam ekran w drugim języku. Teksty (elementy bez
  // dzieci-bloków) dostają min-wysokość, a w rzędzie także min-szerokość dłuższej wersji – zmiana języka niczego nie przesuwa.
  // Pomiar: na chwilę (w tym samym kroku, bez klatki na ekranie) same węzły tekstu dostają drugi język – bez dodawania elementów.
  // tekst „liść”: wszystkie dzieci w linii (b, span, br…); tabela, wiersz i grupa wierszy nigdy nie są liściem
  function leaf(e, win) {
    if (/^table(-row|-row-group|-header-group|-footer-group)?$|^inline-table$/.test(win.getComputedStyle(e).display)) return false;
    for (var c = e.firstElementChild; c; c = c.nextElementSibling) { var d = win.getComputedStyle(c).display; if (d !== "none" && !/^inline/.test(d)) return false; }
    return /\S/.test(e.textContent);
  }
  function pairs(a, b, out) {
    var ac = a.children, bc = b.children;
    if (ac.length !== bc.length) return;
    for (var i = 0; i < ac.length; i++) { if (ac[i].tagName !== bc[i].tagName) continue; out.push([ac[i], bc[i]]); pairs(ac[i], bc[i], out); }
  }
  // element nie wypełnia szerokości rodzica (przycisk, napis w rzędzie, wyśrodkowany) – wtedy liczy się też szerokość
  function narrow(e, r, win) { var p = e.parentNode, pc = win.getComputedStyle(p), pr = p.getBoundingClientRect(); return r.width < pr.width - parseFloat(pc.paddingLeft) - parseFloat(pc.paddingRight) - parseFloat(pc.borderLeftWidth) - parseFloat(pc.borderRightWidth) - 1; }
  function texts(e) { var out = [], w = e.ownerDocument.createTreeWalker(e, 4); while (w.nextNode()) out.push(w.currentNode); return out; }
  function rezerwuj(el, html2) {
    if (!el) return;
    if (!el.isConnected || !el.getClientRects().length) { el.__oestHtml2 = html2; if (RO) RO.observe(el); return; } // ekran pokaże się za chwilę
    el.__oestHtml2 = null;
    var win = el.ownerDocument.defaultView, t = el.ownerDocument.createElement("template"), list = [];
    t.innerHTML = html2; pairs(el, t.content, list);
    list.forEach(function (p) { if (p[0].__oestMin) { p[0].style.minHeight = ""; p[0].style.minWidth = ""; if (win.getComputedStyle(p[0]).display === "table-cell") p[0].style.height = ""; p[0].__oestMin = false; } });
    var todo = list.filter(function (p) { return p[0].getClientRects().length && leaf(p[0], win); }).map(function (p) {
      var a = p[0], ta = texts(a), tb = texts(p[1]), cs = win.getComputedStyle(a);
      return { a: a, ta: ta, tb: ta.length === tb.length ? tb.map(function (n) { return n.nodeValue; }) : null, cs: cs };
    }).filter(function (x) { return x.tb && x.ta.some(function (n, i) { return n.nodeValue !== x.tb[i]; }); });
    todo.forEach(function (x) { x.ra = x.a.getBoundingClientRect(); x.row = narrow(x.a, x.ra, win); x.h = parseFloat(x.cs.height); x.w = parseFloat(x.cs.width); x.keep = x.ta.map(function (n) { return n.nodeValue; }); });
    todo.forEach(function (x) { x.ta.forEach(function (n, i) { n.nodeValue = x.tb[i]; }); });
    todo.forEach(function (x) { x.rb = x.a.getBoundingClientRect(); });
    todo.forEach(function (x) { x.ta.forEach(function (n, i) { n.nodeValue = x.keep[i]; }); });
    todo.forEach(function (x) {
      var dh = x.ra.height - x.h, dw = x.ra.width - x.w;
      if (x.rb.height > x.ra.height + 0.5) { x.a.style[x.cs.display === "table-cell" ? "height" : "minHeight"] = (x.rb.height - (dh > 0 ? dh : 0)) + "px"; x.a.__oestMin = true; } // komórka tabeli nie zna min-height
      if (x.row && x.cs.display !== "inline" && !/^table/.test(x.cs.display) && x.rb.width > x.ra.width + 0.5) { x.a.style.minWidth = (x.rb.width - (dw > 0 ? dw : 0)) + "px"; x.a.__oestMin = true; }
    });
  }
  // jeden tekst ustawiany przez JS: el ma już tekst w bieżącym języku, inny = ten sam tekst w drugim języku
  function miejsce(el, inny) {
    if (!el) return;
    if (!el.getClientRects().length) { el.__oestAlt = inny; el.__oestKeep = el.textContent; if (RO) RO.observe(el); return; }
    el.__oestAlt = null;
    var win = el.ownerDocument.defaultView;
    if (el.__oestMin) { el.style.minHeight = ""; el.style.minWidth = ""; el.__oestMin = false; }
    var cs = win.getComputedStyle(el), keep = el.textContent; if (inny == null || inny === keep) return;
    var ra = el.getBoundingClientRect(), row = narrow(el, ra, win), h = parseFloat(cs.height), w = parseFloat(cs.width);
    el.textContent = inny; var rb = el.getBoundingClientRect(); el.textContent = keep;
    if (rb.height > ra.height + 0.5) { el.style.minHeight = (rb.height - Math.max(0, ra.height - h)) + "px"; el.__oestMin = true; }
    if (row && cs.display !== "inline" && rb.width > ra.width + 0.5) { el.style.minWidth = (rb.width - Math.max(0, ra.width - w)) + "px"; el.__oestMin = true; }
  }
  // fn() buduje HTML ekranu; ten sam fn w drugim języku (moduly/bledy wJezyku) wyznacza miejsce pod oba
  function oba(el, fn) { var B = (el && el.ownerDocument.defaultView || {}).OESTBledy; if (B && B.wJezyku) rezerwuj(el, B.wJezyku(B.drugi(), fn)); }
  var api = { html: html, rezerwuj: rezerwuj, miejsce: miejsce, oba: oba };
  if (typeof module === "object" && module.exports) module.exports = api; else root.OESTPodmien = api;
})(typeof window !== "undefined" ? window : globalThis);
