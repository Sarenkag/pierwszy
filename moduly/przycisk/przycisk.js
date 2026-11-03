// Moduł przycisku akcji (moduly/przycisk) – jedno zachowanie wszędzie (Grzegorz 02/11/2026):
// naciśnięcie → kręciołek → „✓ Gotowe” na chwilę → dalej (albo powrót do zwykłego napisu przy błędzie).
// Wygląd przycisku zostaje z ekranu; moduł zmienia tylko to, co dzieje się w środku w trakcie akcji.
(function (w) {
  "use strict";
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  // kółko ze smugą (ten sam wzór co „Zapisuję…” na środku ekranu, Grzegorz 03/11) + tekst etapu obok
  var CSS = ".oest-busy{opacity:1!important;transform:scale(.97);transition:transform .2s}" +
    ".oest-busy .oest-step{display:inline-flex;align-items:center;justify-content:center;gap:.55em;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".oest-spin{display:inline-block;flex:none;width:1.15em;height:1.15em;border-radius:50%;vertical-align:middle;" +
    "background:conic-gradient(from 0deg,rgba(255,255,255,0) 0deg,rgba(255,255,255,.2) 120deg,currentColor 300deg,#fff 360deg);" +
    "-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - .17em),#000 calc(100% - .15em));mask:radial-gradient(farthest-side,transparent calc(100% - .17em),#000 calc(100% - .15em));animation:oest-spin .9s linear infinite}" +
    ".oest-ask{position:fixed;inset:0;z-index:2147483100;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}" +
    ".oest-ask>div{width:100%;max-width:360px;border-radius:18px;padding:18px;background:#161a34;color:#fff;border:1px solid rgba(255,255,255,.12);box-shadow:0 16px 40px rgba(0,0,0,.5);font:15px/1.4 system-ui,sans-serif}" +
    ".oest-ask b{display:block;font-size:1.05rem;margin-bottom:6px}.oest-ask p{margin:0 0 14px;color:#c3c9e8}" +
    ".oest-ask .row{display:grid;grid-template-columns:1fr 1fr;gap:10px}.oest-ask button{min-height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:#222746;color:#fff;font:600 15px system-ui}" +
    ".oest-ask button.ok{border:0;background:linear-gradient(90deg,#5b7cff,#a35bff)}" +
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
    var sel = "button,.btn,.tile,.pbtn,.go,[role=button],input[type=button],input[type=submit]";
    // Cały selektor (z :active) w :where(), żeby własny transform ekranu (np. .pt-marker translate) zawsze wygrywał.
    var act = sel.split(",").map(function (x) { return x + ":active:not(:disabled)"; }).join(",");
    var s = document.createElement("style"); s.id = "oest-nacisk-css";
    s.textContent = ":where(" + sel + "){transition:transform .16s cubic-bezier(.2,.8,.2,1);-webkit-tap-highlight-color:transparent;backface-visibility:hidden}" +
      ":where(" + act + "){transform:scale(.97)}" +
      "@media (prefers-reduced-motion:reduce){:where(" + act + "){transform:none}}" +
      ":root[data-settings-motion=reduce] :where(" + act + "){transform:none}";
    (document.head || document.documentElement).insertBefore(s, (document.head || document.documentElement).firstChild);
  })();
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  // Małe okno z dwoma przyciskami, np. „Połącz ponownie” / „Anuluj”. → Promise<true|false>
  function ask(o) {
    o = o || {}; css();
    return new Promise(function (done) {
      var box = document.createElement("div"); box.className = "oest-ask"; box.setAttribute("role", "dialog");
      box.innerHTML = "<div><b>" + esc(o.title || T("Brak połączenia", "No connection")) + "</b><p>" + esc(o.text || "") + '</p><div class="row">' +
        '<button type="button" data-a="no">' + esc(o.cancel || T("Anuluj", "Cancel")) + '</button><button type="button" class="ok" data-a="ok">' + esc(o.ok || T("Połącz ponownie", "Reconnect")) + "</button></div></div>";
      box.addEventListener("click", function (e) { var b = e.target.closest("[data-a]"); if (!b) return; box.remove(); done(b.getAttribute("data-a") === "ok"); });
      document.body.appendChild(box);
    });
  }

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
  w.OESTPrzycisk = { start: start, run: run, ask: ask };
})(window);
