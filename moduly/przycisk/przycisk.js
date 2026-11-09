// Moduł przycisku akcji (moduly/przycisk) – jedno zachowanie wszędzie (Grzegorz 02/11/2026):
// naciśnięcie → kręciołek → „✓ Gotowe” na chwilę → dalej (albo powrót do zwykłego napisu przy błędzie).
// Wygląd przycisku zostaje z ekranu; moduł zmienia tylko to, co dzieje się w środku w trakcie akcji.
(function (w) {
  "use strict";
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  // kółko ze smugą (ten sam wzór co „Zapisuję…” na środku ekranu, Grzegorz 03/11) + tekst etapu obok
  var CSS = ".oest-busy{opacity:1!important;transform:scale(.97);transition:transform .2s}" +
    ".oest-busy .oest-step{display:inline-flex;align-items:center;justify-content:center;gap:.55em;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    // kółko: jedno dla całej apki – moduly/ladowanie (tu tylko zapas, gdy strona go nie ładuje)
    ".oest-spin{display:inline-block;flex:none;width:1.15em;height:1.15em;border-radius:50%;vertical-align:middle;" +
    "background:conic-gradient(from 0deg,rgba(124,132,255,0) 0deg,rgba(124,132,255,.15) 120deg,#7c84ff 300deg,#c58bff 360deg);" +
    "-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - .17em),#000 calc(100% - .15em));mask:radial-gradient(farthest-side,transparent calc(100% - .17em),#000 calc(100% - .15em));animation:oest-spin .9s linear infinite}" +
    ".oest-ask{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}" +
    ".oest-ask>div{width:100%;max-width:360px;border-radius:18px;padding:18px;background:#161a34;color:#fff;border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 40px rgba(0,0,0,.5);font:15px/1.4 var(--font-body,system-ui),sans-serif;-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}" +
    ".oest-ask b{display:block;font-size:17px;font-weight:650;margin-bottom:6px}.oest-ask p{margin:0 0 14px;color:#c3c9e8}" +
    ".oest-ask .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.oest-ask button{min-height:48px;border-radius:14px;border:1px solid rgba(255,255,255,.18);background:#222746;color:#fff;font:600 15px var(--font-body,system-ui)}" +
    ".oest-ask button.ok{border:0;background:linear-gradient(90deg,#5b7cff,#a35bff)}" +
    ".oest-ask-body{max-height:62vh;overflow:auto;margin:0 0 14px}" +
    ".oest-ask .row.one{grid-template-columns:1fr}.oest-ask button.ok.danger{background:linear-gradient(90deg,#ff5d6c,#e0405a)}" +
    ".oest-busy .oest-done{display:inline-flex;align-items:center;gap:.4em;animation:oest-pop .25s ease-out}" +
    "@keyframes oest-spin{to{transform:rotate(360deg)}}@keyframes oest-pop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}" +
    "@media (prefers-reduced-motion:reduce){.oest-busy .oest-spin{animation-duration:2s}.oest-busy .oest-done{animation:none}}";
  function css() {
    if (document.getElementById("oest-przycisk-css")) return;
    var s = document.createElement("style"); s.id = "oest-przycisk-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  // Każdy przycisk i kafelek w apce przy naciśnięciu ciutkę się zmniejsza (Grzegorz 02/11/2026).
  // :where() = zerowa waga: element, który sam używa transform (np. przesunięcie), zostaje jak był.
  (function press() {
    if (document.getElementById("oest-nacisk-css")) return;
    // kafelki (.tile) mają własną rolę ruchu w moduly/kafelek – tu tylko przyciski
    var sel = "button:not(.tile),.btn,.pbtn,.go,[role=button],input[type=button],input[type=submit]";
    // Cały selektor (z :active) w :where(), żeby własny transform ekranu (np. .pt-marker translate) zawsze wygrywał.
    var act = sel.split(",").map(function (x) { return x + ":active:not(:disabled)"; }).join(",");
    var s = document.createElement("style"); s.id = "oest-nacisk-css";
    // czas, easing i efekt naciśnięcia z tabeli ruchu (moduly/wyglad/wyglad.css, rola „przycisk”); w nawiasie wartości zapasowe
    s.textContent = ":where(" + sel + "){transition:transform var(--ruch-przycisk-czas,.16s) var(--ruch-przycisk-easing,cubic-bezier(.2,.8,.2,1));-webkit-tap-highlight-color:transparent;backface-visibility:hidden}" +
      ":where(" + act + "){transform:var(--ruch-przycisk-nacisk,scale(.97))}" +
      "@media (prefers-reduced-motion:reduce){:where(" + act + "){transform:none}}" +
      ":root[data-settings-motion=reduce] :where(" + act + "){transform:none}";
    (document.head || document.documentElement).insertBefore(s, (document.head || document.documentElement).firstChild);
  })();
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // Małe okno z pytaniem – JEDNO okienko „Na pewno?” w całej apce (zamiast systemowego confirm/alert, Grzegorz 04/11/2026).
  // Rośnie z miejsca stuknięcia i zamyka się pomniejszeniem (moduly/wyglad); Wstecz telefonu i stuknięcie obok = Anuluj.
  //   ask({ title, text, ok: "Usuń", cancel: "Anuluj", danger: true }) → Promise<true|false>
  //   ask({ title, text, alert: true }) → tylko „OK” (komunikat)
  //   ask({ title, node: element, ok: "Zapisz" }) → okienko z własną treścią (element zostaje do odczytu po zamknięciu)
  //   ask({ title, node, bare: true, cls: "ki-info" }) → samo okienko bez przycisków (np. informacje o inspekcji, 07/11/2026):
  //        stuknięcie gdziekolwiek (także w okienko) albo Wstecz zamyka; cls = dodatkowa klasa do własnego wyglądu treści
  function ask(o) {
    o = o || {}; css();
    return new Promise(function (done) {
      var box = document.createElement("div"); box.className = "oest-ask" + (o.cls ? " " + o.cls : ""); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
      var okTxt = o.ok || (o.alert ? "OK" : T("Połącz ponownie", "Reconnect"));
      box.innerHTML = "<div>" + (o.title ? "<b>" + esc(o.title) + "</b>" : "") + (o.text ? "<p>" + esc(o.text).replace(/\n/g, "<br>") + "</p>" : "") + (o.node ? '<div class="oest-ask-body"' + (o.bare ? ' style="margin:0"' : "") + "></div>" : "") + (o.bare ? "</div>" : '<div class="row' + (o.alert ? " one" : "") + '">' +
        (o.alert ? "" : '<button type="button" data-a="no">' + esc(o.cancel || T("Anuluj", "Cancel")) + "</button>") +
        '<button type="button" class="ok' + (o.danger ? " danger" : "") + '" data-a="ok">' + esc(okTxt) + "</button></div></div>");
      if (o.node) box.querySelector(".oest-ask-body").appendChild(o.node); // własna treść okienka (np. tick boxy ustawień wysyłki)
      var res = !!(o.alert || o.bare), over = false, O = w.OESTWstecz && w.OESTWstecz.nakladki.on ? w.OESTWstecz.nakladki : null, own = false; // stos okien apki (moduly/wstecz)
      function finish() { if (over) return; over = true; document.removeEventListener("keydown", key, true); w.removeEventListener("popstate", pop); box.remove(); done(res); }
      function closeVia(v) { res = v; if (O && O.stack && O.stack.indexOf(finish) >= 0) O.close(); else if (own) history.back(); else finish(); }
      function pop() { if (own) finish(); }
      function key(e) { if (e.key === "Escape") { e.preventDefault(); closeVia(!!o.alert); } }
      box.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]");
        if (b) { closeVia(b.getAttribute("data-a") === "ok"); return; }
        if (o.bare || !e.target.closest(".oest-ask>div")) closeVia(!!(o.alert || o.bare)); // stuknięcie obok okienka (bez przycisków: gdziekolwiek)
      });
      document.addEventListener("keydown", key, true);
      // Wstecz telefonu zamyka okienko (jak każde okno na wierzchu)
      try {
        if (O && O.open) O.open(finish);
        else { history.pushState({ n: ((history.state && history.state.n) || 0) + 1, overlay: 1 }, "", location.hash || location.pathname); own = true; w.addEventListener("popstate", pop); }
      } catch (e) {}
      document.body.appendChild(box);
      var f = box.querySelector(".ok"); if (f) try { f.focus({ preventScroll: true }); } catch (e) {}
    });
  }
  // zamiast w.confirm(tekst): await OESTPytaj(tekst) albo OESTPrzycisk.confirm(tekst, { ok: "Usuń", danger: true }) → Promise<true|false>
  // pytanie o usunięcie/wyczyszczenie samo dostaje czerwony przycisk „Usuń”
  function confirmAsk(text, o) {
    o = o || {}; var del = /^(Usunąć|Wyczyścić|Zastąpić|Delete|Remove|Clear|Replace)/i.test(String(text || "").trim());
    return ask({ title: o.title || "", text: text, ok: o.ok || (del ? (/^(Zastąpić|Replace)/i.test(text) ? T("Zastąp", "Replace") : T("Usuń", "Delete")) : T("Tak", "Yes")), cancel: o.cancel || T("Anuluj", "Cancel"), danger: o.danger != null ? o.danger : del });
  }
  // „Niezapisane zmiany – opuścić ekran?” dla ekranów, które pytają w chwili wyjścia (synchronicznie):
  //   canLeave(){ return !dirty || OESTPrzycisk.leave(tekst, () => { dirty = false; }); }  → od razu false,
  //   a po „Opuść” ekran sam powtarza wyjście (to samo stuknięcie albo Wstecz telefonu).
  var leaving = false;
  function leave(text, onYes) {
    if (leaving) return false; leaving = true;
    var ev = w.event, el = ev && ev.type === "click" && ev.target && ev.target.closest ? ev.target.closest("button,a,[role=button],[data-route],[data-go]") : null, viaBack = ev && ev.type === "popstate";
    setTimeout(function () { // po tym, jak ekran cofnie wpis historii (Wstecz telefonu)
      ask({ title: T("Niezapisane zmiany", "Unsaved changes"), text: text, ok: T("Opuść", "Leave"), cancel: T("Zostań", "Stay"), danger: true }).then(function (yes) {
        leaving = false; if (!yes) return;
        try { if (onYes) onYes(); } catch (e) {}
        setTimeout(function () { if (el && el.isConnected) el.click(); else if (viaBack || !el) history.back(); }, 30);
      });
    }, 0);
    return false;
  }
  function alertAsk(text, o) { o = o || {}; return ask({ title: o.title || "", text: text, alert: true }); }

  // Ręczne sterowanie, gdy po sukcesie ekran ma się zmienić dopiero po „✓ Gotowe”:
  //   var h = OESTPrzycisk.start(btn);  …  h.ok().then(pokażListę)  /  h.fail()
  function start(btn, opts) {
    opts = opts || {}; css();
    var html = btn.innerHTML, dis = btn.disabled, over = false;
    btn.disabled = true; btn.classList.add("oest-busy"); btn.setAttribute("aria-busy", "true");
    function show(t) { if (over) return; btn.innerHTML = '<span class="oest-step" role="status"><span class="oest-spin" aria-hidden="true"></span><span>' + esc(t) + "</span></span>"; }
    show(opts.busy ? opts.busy + "…" : T("Pracuję…", "Working…"));
    function restore() { if (over) return; over = true; btn.innerHTML = html; btn.disabled = dis; btn.classList.remove("oest-busy"); btn.removeAttribute("aria-busy"); }
    return {
      // etap pracy na przycisku: „Sprawdzam połączenie…” → „Wysyłam 1/2…” (Grzegorz 03/11)
      step: function (text) { show(text); },
      ok: function (text) {
        btn.innerHTML = '<span class="oest-done">✓ ' + (text || opts.done || T("Gotowe", "Done")) + "</span>";
        return wait(opts.hold || 900).then(function () { if (opts.keep !== false) restore(); });
      },
      fail: restore,
      restore: restore
    };
  }
  // Najprostsze użycie: OESTPrzycisk.run(btn, function () { return wyslij(); })
  function run(btn, fn, opts) {
    var h = start(btn, opts);
    return Promise.resolve().then(fn).then(function (r) { return h.ok().then(function () { return r; }); }, function (e) { h.fail(); throw e; });
  }
  w.OESTPrzycisk = { start: start, run: run, ask: ask, confirm: confirmAsk, alert: alertAsk, leave: leave };
  w.OESTPytaj = confirmAsk; w.OESTKomunikat = alertAsk; // krótkie nazwy dla ekranów
})(window);
