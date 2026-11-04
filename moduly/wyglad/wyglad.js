// Moduł wyglądu (moduly/wyglad) – ruch w całej apce, bez zmian w poszczególnych ekranach (Grzegorz 04/11/2026):
//  • ekran wjeżdża łagodnie (do przodu z prawej, Wstecz z lewej), karty listy pojawiają się kolejno,
//  • lista po zmianie filtra pokazuje nowe karty płynnie (te same karty – bez migania),
//  • każde okienko na wierzchu rośnie z miejsca stuknięcia i zamyka się pomniejszeniem.
// „Ogranicz animacje” (Ustawienia → Wygląd) i systemowe „mniej ruchu” wyłączają wszystko.
(function (w, d) {
  "use strict";
  if (w.OESTWyglad) return;
  var CARDS = ".prow,.tile,.settings-card,.ho-entry,.type,.item,.panel,.zd-item,.keys-card,.pt-card";
  var tap = { x: w.innerWidth / 2, y: w.innerHeight / 2, t: 0 };
  function reduce() {
    if (d.documentElement.dataset.settingsMotion === "reduce") return true;
    try { return w.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; }
  }
  d.addEventListener("pointerdown", function (e) { tap = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  function visible(el) { if (!el || el.hidden) return false; var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  function play(el, cls, done) {
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    var end = function (e) { if (e && e.target !== el) return; el.removeEventListener("animationend", end); clearTimeout(t); el.classList.remove(cls); if (done) done(); };
    var t = setTimeout(end, 700); el.addEventListener("animationend", end);
  }
  // karty widoczne na ekranie pojawiają się kolejno (najwyżej 14, reszta od razu – bez czekania)
  function stagger(root, list) {
    if (reduce()) return;
    var items = list || [].slice.call(root.querySelectorAll(CARDS)).filter(function (el) { return !el.closest(".wy-item") && el.getBoundingClientRect().top < w.innerHeight; });
    items.slice(0, 14).forEach(function (el, i) { el.style.setProperty("--wy-i", i); play(el, "wy-item", function () { el.style.removeProperty("--wy-i"); }); });
  }
  // ---------- wejście ekranu ----------
  var back = false, navAt = 0;
  w.addEventListener("popstate", function (e) { back = !(e.state && e.state.overlay); navAt = Date.now(); }, true);
  var push = history.pushState;
  history.pushState = function (s) { var r = push.apply(this, arguments); if (!(s && s.overlay)) { back = false; navAt = Date.now(); schedule(); } return r; };
  w.addEventListener("hashchange", function () { navAt = Date.now(); schedule(); });
  w.addEventListener("popstate", function (e) { if (!(e.state && e.state.overlay) && !overlayOpen()) schedule(); });
  function overlayOpen() { return !!(w.OESTOverlay && w.OESTOverlay.stack && w.OESTOverlay.stack.length); }
  var queued = false, lastView = null, lastSig = "";
  function schedule() { if (queued) return; queued = true; w.requestAnimationFrame(function () { w.requestAnimationFrame(function () { queued = false; enter(); }); }); }
  function current() { return [].slice.call(d.querySelectorAll(".view")).filter(visible)[0] || null; }
  function enter() {
    var v = current(); if (!v) return;
    var sig = v.id + "|" + location.hash.replace(/#?/, "").split("?")[0];
    if (v === lastView && sig === lastSig && Date.now() - navAt > 600) return;
    lastView = v; lastSig = sig;
    if (reduce()) return;
    v.classList.toggle("wy-back", back);
    play(v, "wy-enter", function () { v.classList.remove("wy-back"); });
    stagger(v);
    back = false;
  }
  // ekrany przełączane atrybutem hidden (inspekcje, moduły) – ta sama animacja
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) { var t = ms[i].target; if (t.classList && t.classList.contains("view") && !t.hidden) { schedule(); return; } }
  }).observe(d.documentElement, { attributes: true, attributeFilter: ["hidden"], subtree: true });
  // ---------- lista po zmianie (filtr, dzień, nowe zadanie) ----------
  // ten sam zestaw kart = brak animacji (np. wpisywanie w polu nie miga); nowy zestaw = karty pojawiają się kolejno
  var sigs = new WeakMap();
  function keyOf(el) { return el.getAttribute("data-id") || el.getAttribute("data-fam") || el.getAttribute("data-route") || el.getAttribute("data-go") || (el.textContent || "").trim().slice(0, 40); }
  new MutationObserver(function (ms) {
    var hosts = [];
    ms.forEach(function (m) {
      if (m.type !== "childList" || !m.addedNodes.length) return;
      var h = m.target; if (!h.querySelector || hosts.indexOf(h) >= 0) return;
      for (var i = 0; i < m.addedNodes.length; i++) { var n = m.addedNodes[i]; if (n.nodeType === 1 && (n.matches(CARDS) || n.querySelector(CARDS))) { hosts.push(h); break; } }
    });
    if (!hosts.length || Date.now() - navAt < 400) return; // wejście ekranu samo animuje karty
    hosts.forEach(function (h) {
      var cards = [].slice.call(h.querySelectorAll(":scope > " + CARDS.split(",").join(",:scope > ")));
      if (!cards.length) return;
      var sig = cards.map(keyOf).join("\n"), old = sigs.get(h); sigs.set(h, sig);
      if (old === undefined || old === sig) return;
      var before = old.split("\n");
      stagger(h, cards.filter(function (c) { return before.indexOf(keyOf(c)) < 0 || cards.length !== before.length; }).filter(function (c) { return c.getBoundingClientRect().top < w.innerHeight; }));
    });
  }).observe(d.documentElement, { childList: true, subtree: true });
  // ---------- okienka na wierzchu ----------
  var OWN = /(^|\s)(hm-pop|oest-sbar|fulltitle)(\s|$)/; // ekran główny i pasek wysyłki mają własny ruch
  function isOverlay(el) {
    if (el.nodeType !== 1 || el.dataset.wyPop || OWN.test(el.className || "")) return false;
    if (/^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) return false;
    var s = w.getComputedStyle(el); if (s.position !== "fixed") return false;
    var r = el.getBoundingClientRect(); return r.width * r.height > w.innerWidth * w.innerHeight * 0.5;
  }
  function card(el) { // okienko w środku przyciemnionego tła (np. pytanie „Usunąć?”), inaczej całe okno
    var c = el.firstElementChild;
    if (c && el.children.length === 1) { var r = c.getBoundingClientRect(); if (r.width < w.innerWidth * 0.98 || r.height < w.innerHeight * 0.9) return c; }
    return el;
  }
  function popIn(el) {
    el.dataset.wyPop = "1";
    if (reduce()) return;
    var c = card(el), fresh = Date.now() - tap.t < 1500, r = c.getBoundingClientRect();
    var ox = fresh ? tap.x - r.left : r.width / 2, oy = fresh ? tap.y - r.top : r.height / 2;
    c.style.transformOrigin = Math.round(ox) + "px " + Math.round(oy) + "px";
    if (c !== el) play(el, "wy-dim");
    play(c, "wy-pop");
  }
  function popOut(el, finish) {
    if (reduce() || !el.isConnected || el.dataset.wyOut) { finish(); return; }
    el.dataset.wyOut = "1"; el.removeAttribute("id");
    var c = card(el);
    if (c !== el) el.classList.add("wy-dim-out");
    var t = setTimeout(finish, 260);
    c.addEventListener("animationend", function () { clearTimeout(t); finish(); }, { once: true });
    c.classList.remove("wy-pop"); c.classList.add("wy-pop-out");
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { [].forEach.call(m.addedNodes, function (n) { if (n.parentNode === d.body && isOverlay(n)) popIn(n); }); });
  }).observe(d.body || d.documentElement, { childList: true });
  // zamknięcie okienka: najpierw pomniejszenie, potem dopiero zniknięcie z ekranu
  var rm = Element.prototype.remove, rc = Node.prototype.removeChild;
  Element.prototype.remove = function () { var el = this; if (el.dataset && el.dataset.wyPop && !el.dataset.wyOut) { popOut(el, function () { rm.call(el); }); return; } return rm.call(el); };
  Node.prototype.removeChild = function (ch) { var p = this; if (ch && ch.dataset && ch.dataset.wyPop && !ch.dataset.wyOut && p === d.body) { popOut(ch, function () { if (ch.parentNode === p) rc.call(p, ch); }); return ch; } return rc.call(p, ch); };
  w.OESTWyglad = { stagger: stagger, enter: schedule, reduce: reduce, tap: function () { return tap; } };
  if (d.readyState !== "loading") schedule(); else d.addEventListener("DOMContentLoaded", schedule);
})(window, document);
