// Moduł przycisku akcji (moduly/przycisk) – jedno zachowanie wszędzie (Grzegorz 02/11/2026):
// naciśnięcie → kręciołek → „✓ Gotowe” na chwilę → dalej (albo powrót do zwykłego napisu przy błędzie).
// Wygląd przycisku zostaje z ekranu; moduł zmienia tylko to, co dzieje się w środku w trakcie akcji.
(function (w) {
  "use strict";
  var CSS = ".oest-busy{opacity:1!important;transform:scale(.97);transition:transform .2s}" +
    ".oest-busy .oest-spin{display:inline-block;width:1.1em;height:1.1em;border:.16em solid currentColor;border-right-color:transparent;border-radius:50%;opacity:.85;animation:oest-spin .8s linear infinite;vertical-align:middle}" +
    ".oest-busy .oest-done{display:inline-flex;align-items:center;gap:.4em;animation:oest-pop .25s ease-out}" +
    "@keyframes oest-spin{to{transform:rotate(360deg)}}@keyframes oest-pop{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}" +
    "@media (prefers-reduced-motion:reduce){.oest-busy .oest-spin{animation-duration:2s}.oest-busy .oest-done{animation:none}}";
  function css() {
    if (document.getElementById("oest-przycisk-css")) return;
    var s = document.createElement("style"); s.id = "oest-przycisk-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Ręczne sterowanie, gdy po sukcesie ekran ma się zmienić dopiero po „✓ Gotowe”:
  //   var h = OESTPrzycisk.start(btn);  …  h.ok().then(pokażListę)  /  h.fail()
  function start(btn, opts) {
    opts = opts || {}; css();
    var html = btn.innerHTML, dis = btn.disabled, over = false;
    btn.disabled = true; btn.classList.add("oest-busy"); btn.setAttribute("aria-busy", "true");
    btn.innerHTML = '<span class="oest-spin" role="status" aria-label="' + (opts.busy || "Pracuję…") + '"></span>';
    function restore() { if (over) return; over = true; btn.innerHTML = html; btn.disabled = dis; btn.classList.remove("oest-busy"); btn.removeAttribute("aria-busy"); }
    return {
      ok: function (text) {
        btn.innerHTML = '<span class="oest-done">✓ ' + (text || opts.done || "Gotowe") + "</span>";
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
  w.OESTPrzycisk = { start: start, run: run };
})(window);
