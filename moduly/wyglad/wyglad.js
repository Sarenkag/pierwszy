// Moduł wyglądu (moduly/wyglad) – ruch w całej apce, bez zmian w poszczególnych ekranach (Grzegorz 04/11/2026):
//  • ekran pojawia się „Poświatą” (wyglad.css), przy Wstecz w odwrotnym kierunku; karty pojawiają się kolejno tylko po zmianie listy,
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
  // ---------- przejście między ekranami (Poświata, Grzegorz 09/11/2026) ----------
  // Samą animację robi CSS (.view:not([hidden]) w wyglad.css) w klatce, w której ekran się pokazuje. Tu tylko:
  //  • kierunek: Wstecz (systemowy i strzałka ‹ = history.back) → html.wy-wstecz odwraca efekt,
  //  • navAt: karty wstawione przy wejściu na ekran nie „podjeżdżają” osobno (to też wyglądało jak drżenie),
  //  • nowa strona (wejście do inspekcji, powrót z niej, start apki): pierwszy ekran tylko się rozjaśnia (html.wy-wczytanie).
  var root = d.documentElement, navAt = Date.now(), backT = 0;
  function wstecz(on) {
    clearTimeout(backT); root.classList.toggle("wy-wstecz", !!on);
    if (on) backT = setTimeout(function () { root.classList.remove("wy-wstecz"); }, 700);
  }
  root.classList.add("wy-wczytanie"); // pierwszy ekran strony tylko się rozjaśnia (wyglad.css); od pierwszej zmiany ekranu – pełna Poświata
  function nav() { navAt = Date.now(); }
  function ruchUzytkownika() { nav(); if (d.readyState === "complete") root.classList.remove("wy-wczytanie"); } // pierwsza zmiana ekranu po wczytaniu strony
  w.addEventListener("popstate", function (e) { ruchUzytkownika(); if (!(e.state && e.state.overlay)) wstecz(true); }, true);
  var push = history.pushState;
  history.pushState = function (s) { var r = push.apply(this, arguments); if (!(s && s.overlay)) { ruchUzytkownika(); wstecz(false); } return r; };
  w.addEventListener("hashchange", nav);
  // ekran schowany i od razu pokazany w tym samym kroku (przebudowa, zmiana języka, powrót po błędzie) nie jest zmianą ekranu:
  // dostaje wy-zostaje i nie animuje się od nowa (inaczej „drgnąłby” w miejscu) – do czasu, aż naprawdę zniknie
  new MutationObserver(function (ms) {
    var first = new Map(), shown = false;
    ms.forEach(function (m) { var t = m.target; if (t.classList && t.classList.contains("view") && !first.has(t)) first.set(t, m.oldValue); });
    first.forEach(function (old, t) {
      if (t.hidden) { t.classList.remove("wy-zostaje"); return; }
      if (old === null) t.classList.add("wy-zostaje"); else shown = true;
    });
    if (shown) nav();
  }).observe(root, { attributes: true, attributeFilter: ["hidden"], attributeOldValue: true, subtree: true });
  // ---------- lista po zmianie (filtr, dzień, nowe zadanie) ----------
  // ten sam zestaw kart = brak animacji (np. wpisywanie w polu nie miga); nowy zestaw = karty pojawiają się kolejno
  var sigs = new WeakMap(), quietUntil = 0;
  function hush() { quietUntil = Date.now() + 600; }
  w.addEventListener("oest:lang", hush, true);
  ["focus", "pageshow"].forEach(function (ev) { w.addEventListener(ev, function (e) { if (e.target === w || e.target === d) hush(); }, true); }); // tylko powrót do apki, nie fokus pola
  d.addEventListener("visibilitychange", hush, true);
  function keyOf(el) { return el.getAttribute("data-id") || el.getAttribute("data-fam") || el.getAttribute("data-route") || el.getAttribute("data-go") || (el.textContent || "").trim().slice(0, 40); }
  new MutationObserver(function (ms) {
    var hosts = [], hushNow = Date.now() < quietUntil;
    ms.forEach(function (m) {
      if (m.type !== "childList" || !m.addedNodes.length) return;
      // zmiana języka / powrót do apki: te same treści wstawione od nowa – bez animacji „pojawienia się” (liczniki, ikonki, karty)
      if (hushNow) for (var j = 0; j < m.addedNodes.length; j++) { var an = m.addedNodes[j]; if (an.nodeType === 1 && an.classList) an.classList.add("wy-cisza"); }
      var h = m.target; if (!h.querySelector || hosts.indexOf(h) >= 0) return;
      for (var i = 0; i < m.addedNodes.length; i++) { var n = m.addedNodes[i]; if (n.nodeType === 1 && (n.matches(CARDS) || n.querySelector(CARDS))) { hosts.push(h); break; } }
    });
    if (!hosts.length || Date.now() - navAt < 400) return; // wejście ekranu samo animuje karty
    var quiet = Date.now() < quietUntil; // zmiana języka / powrót do apki: tylko nowe teksty, bez ruchu (B3, 07/11/2026)
    hosts.forEach(function (h) {
      var cards = [].slice.call(h.querySelectorAll(":scope > " + CARDS.split(",").join(",:scope > ")));
      if (!cards.length) return;
      var sig = cards.map(keyOf).join("\n"), old = sigs.get(h); sigs.set(h, sig);
      if (old === undefined || old === sig || quiet) return;
      var before = old.split("\n");
      // animują się tylko karty, których przed chwilą nie było; te, które zostały, stoją w miejscu (B3, 07/11/2026)
      stagger(h, cards.filter(function (c) { return before.indexOf(keyOf(c)) < 0; }).filter(function (c) { return c.getBoundingClientRect().top < w.innerHeight; }));
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
  // ---------- tabela ruchu: odczyt i podmiana w locie (07/11/2026) ----------
  // Wartości domyślne są w wyglad.css (:root, --ruch-<rola>-<parametr>). Tu tylko API dla przyszłych ustawień animacji:
  //   OESTWyglad.ruch.pobierz("okno") → { czas: ".22s", easing: "…", efekt: "wyPop", … }
  //   OESTWyglad.ruch.ustaw("okno", { czas: ".3s", efekt: "wyFade" })  albo  ustaw("okno", "zanikanie")  (gotowy wariant)
  //   OESTWyglad.ruch.domyslne()  → wszystko jak w wyglad.css
  var ROLE = {
    przycisk: ["czas", "easing", "nacisk"], kafelek: ["czas", "easing", "nacisk"], stan: ["czas"], znacznik: ["czas", "easing", "efekt"],
    status: ["czas", "easing", "efekt"], okno: ["czas", "easing", "efekt", "zamkniecie-czas", "zamkniecie-efekt", "tlo-czas"],
    ekran: ["czas", "easing", "efekt", "skala", "przesuniecie"], lista: ["czas", "easing", "efekt", "odstep"]
  };
  var WARIANTY = { // gotowe zestawy z efektów, które już są w wyglad.css (bez nowego wyglądu)
    przycisk: { nacisk: { nacisk: "scale(.97)" }, brak: { nacisk: "none" } },
    kafelek: { nacisk: { nacisk: "scale(.97)" }, brak: { nacisk: "none" } },
    okno: { wzrost: { efekt: "wyPop", "zamkniecie-efekt": "wyOut" }, zanikanie: { efekt: "wyFade", "zamkniecie-efekt": "wyOut" } },
    ekran: { poswiata: { efekt: "wyPoswiataIn" }, zanikanie: { efekt: "wyFade" }, wjazd: { efekt: "wyIn" } },
    lista: { podjazd: { efekt: "wyUp" }, zanikanie: { efekt: "wyFade" } },
    status: { podjazd: { efekt: "wyUp" }, zanikanie: { efekt: "wyFade" } },
    znacznik: { wyskok: { efekt: "oest-n-in" }, zanikanie: { efekt: "wyFade" }, brak: { efekt: "none" } }
  };
  function nazwa(rola, p) { return "--ruch-" + rola + "-" + p; }
  var ruch = {
    role: function () { return Object.keys(ROLE); },
    warianty: function (rola) { return Object.keys(WARIANTY[rola] || {}); },
    pobierz: function (rola) {
      if (!ROLE[rola]) return null;
      var cs = w.getComputedStyle(d.documentElement), o = {};
      ROLE[rola].forEach(function (p) { o[p] = cs.getPropertyValue(nazwa(rola, p)).trim(); });
      return o;
    },
    ustaw: function (rola, zmiany) {
      if (!ROLE[rola]) return false;
      if (typeof zmiany === "string") zmiany = (WARIANTY[rola] || {})[zmiany];
      if (!zmiany) return false;
      Object.keys(zmiany).forEach(function (p) { if (ROLE[rola].indexOf(p) >= 0) d.documentElement.style.setProperty(nazwa(rola, p), String(zmiany[p])); });
      return true;
    },
    domyslne: function () { Object.keys(ROLE).forEach(function (r) { ROLE[r].forEach(function (p) { d.documentElement.style.removeProperty(nazwa(r, p)); }); }); },
    ograniczony: reduce
  };
  w.OESTWyglad = { stagger: stagger, enter: nav, reduce: reduce, tap: function () { return tap; }, ruch: ruch };
})(window, document);
