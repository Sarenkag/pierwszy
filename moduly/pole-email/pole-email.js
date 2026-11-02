// Moduł pola e-mail (moduly/pole-email) – jedno zachowanie wszędzie (Grzegorz 02/11/2026):
// przy wpisywaniu adresu po prawej ✓ (poprawny) albo ✗ (błędny) i podpowiedź pod polem.
// Sam podpina się do KAŻDEGO <input type="email"> na stronie (także dorysowanego później) – nic nie trzeba dopisywać w ekranach.
// Pole z wieloma adresami: <input type="email" multiple> (oddzielone przecinkiem lub średnikiem).
(function (w) {
  "use strict";
  var RE = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[A-Za-z]{2,}$/;
  var CSS = ".oest-email{position:relative;display:block}" +
    ".oest-email>input{padding-right:2.4em!important;width:100%;box-sizing:border-box}" +
    ".oest-email .oest-em-ic{position:absolute;right:.7em;top:50%;width:1.1em;height:1.1em;transform:translateY(-50%) scale(.4);opacity:0;transition:opacity .2s,transform .2s;pointer-events:none}" +
    ".oest-email .oest-em-ic svg{position:absolute;inset:0;width:100%;height:100%;display:none}" +
    ".oest-email.ok .oest-em-ic,.oest-email.bad .oest-em-ic{opacity:1;transform:translateY(-50%) scale(1)}" +
    ".oest-email.ok .oest-em-ok{display:block;color:#3ecf8e}.oest-email.ok .oest-em-ok path{stroke-dasharray:1;stroke-dashoffset:1;animation:oest-em-draw .35s ease-out forwards}" +
    ".oest-email.bad .oest-em-no{display:block;color:#ff6b6b}" +
    ".oest-email.bad>input{border-color:#ff6b6b!important}.oest-email.ok>input{border-color:#3ecf8e!important}" +
    ".oest-em-hp{display:block;font-style:normal;font-size:.8rem;color:#ff8f8f;max-height:0;opacity:0;overflow:hidden;transition:max-height .2s,opacity .2s,margin .2s}" +
    ".oest-email.bad+.oest-em-hp{max-height:2.4em;opacity:1;margin-top:4px}" +
    "@keyframes oest-em-draw{to{stroke-dashoffset:0}}" +
    "@media (prefers-reduced-motion:reduce){.oest-email .oest-em-ic,.oest-em-hp{transition:none}.oest-email.ok .oest-em-ok path{animation:none;stroke-dashoffset:0}}";
  var ICONS = '<svg class="oest-em-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength="1"/></svg>' +
    '<svg class="oest-em-no" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function valid(text, multiple) {
    var v = String(text || "").trim(); if (!v) return null; // puste pole: bez oceny
    var parts = multiple ? v.split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean) : [v];
    return parts.length > 0 && parts.every(function (p) { return RE.test(p); });
  }
  function css() {
    if (document.getElementById("oest-email-css")) return;
    var s = document.createElement("style"); s.id = "oest-email-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function enhance(input) {
    if (!input || input.dataset.oestEmail) return; input.dataset.oestEmail = "1"; css();
    var wrap = document.createElement("span"); wrap.className = "oest-email";
    input.parentNode.insertBefore(wrap, input); wrap.appendChild(input);
    var ic = document.createElement("span"); ic.className = "oest-em-ic"; ic.innerHTML = ICONS; wrap.appendChild(ic);
    var hp = document.createElement("em"); hp.className = "oest-em-hp"; hp.setAttribute("aria-live", "polite");
    hp.textContent = input.multiple ? "Wpisz poprawne adresy (oddziel przecinkiem)" : "Wpisz poprawny adres e-mail";
    wrap.after(hp);
    var touched = false;
    function check() {
      var r = valid(input.value, input.multiple);
      // ✗ dopiero po wyjściu z pola albo przy już poprawionym adresie – nie krzyczy w trakcie pisania
      wrap.classList.toggle("ok", r === true);
      wrap.classList.toggle("bad", r === false && touched);
      input.setAttribute("aria-invalid", r === false && touched ? "true" : "false");
    }
    input.addEventListener("input", function () { if (valid(input.value, input.multiple)) touched = true; check(); });
    input.addEventListener("blur", function () { if (input.value.trim()) touched = true; check(); });
    if (input.value.trim()) { touched = true; check(); }
  }
  function scan(root) {
    if (root.matches && root.matches('input[type="email"]')) enhance(root);
    if (root.querySelectorAll) Array.prototype.forEach.call(root.querySelectorAll('input[type="email"]'), enhance);
  }
  function start() {
    scan(document);
    new MutationObserver(function (ms) { ms.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.nodeType === 1) scan(n); }); }); })
      .observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  w.OESTPoleEmail = { valid: valid, enhance: enhance };
})(window);
