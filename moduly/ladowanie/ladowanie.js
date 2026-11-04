// Moduł ładowania (moduly/ladowanie) – JEDNO kółko „pracuję” w całej apce (Grzegorz 04/11/2026):
// kółko ze smugą (wzór „Zapisuję…”, Grzegorz 03/11) – w przycisku, na środku ekranu, w liście i na pasku wysyłki.
//
//   OESTLadowanie.ring()             → '<span class="oest-spin"></span>' (rozmiar = wielkość tekstu obok)
//   OESTLadowanie.show("Zapisuję…")  → okienko na środku ekranu (nie blokuje palca), hide() je chowa
//   OESTLadowanie.inline(el, "Wczytuję…") → w miejscu treści: kółko + tekst, dopóki ekran nie wstawi danych
(function (w, d) {
  "use strict";
  if (w.OESTLadowanie) return;
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var RING = "background:conic-gradient(from 0deg,rgba(124,132,255,0) 0deg,rgba(124,132,255,.15) 120deg,#7c84ff 300deg,#c58bff 360deg);" +
    "-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - .17em),#000 calc(100% - .15em));mask:radial-gradient(farthest-side,transparent calc(100% - .17em),#000 calc(100% - .15em));" +
    "animation:oest-spin .9s linear infinite";
  var CSS =
    ".oest-spin{display:inline-block;flex:none;width:1.15em;height:1.15em;border-radius:50%;vertical-align:middle;" + RING + "}" +
    // w kolorowym przycisku kółko jest białe (na fiolecie fiolet znika)
    ":is(.go,.btn.go,button.go,.save-bar .btn,#toQueue,.oest-ask .ok) .oest-spin{background:conic-gradient(from 0deg,rgba(255,255,255,0) 0deg,rgba(255,255,255,.2) 120deg,rgba(255,255,255,.85) 300deg,#fff 360deg)}" +
    ".oest-load{position:fixed;left:50%;top:45%;transform:translate(-50%,-50%);z-index:2147482000;display:flex;flex-direction:column;align-items:center;gap:10px;" +
    "padding:18px 22px;border-radius:18px;background:rgba(14,18,40,.9);color:#fff;font:600 14px/1.3 var(--font-body,system-ui);pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.45);" +
    "opacity:0;transition:opacity .2s,transform .2s;transform:translate(-50%,-50%) scale(.9)}" +
    ".oest-load.on{opacity:1;transform:translate(-50%,-50%) scale(1)}" +
    ".oest-load .oest-spin{width:46px;height:46px;-webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px));mask:radial-gradient(farthest-side,transparent calc(100% - 5px),#000 calc(100% - 4px))}" +
    ".oest-inline{display:flex;align-items:center;justify-content:center;gap:10px;padding:28px 0;color:var(--muted,#9aa3cc);font-size:13px}" +
    ".oest-inline .oest-spin{width:22px;height:22px}" +
    "@keyframes oest-spin{to{transform:rotate(360deg)}}" +
    "@media (prefers-reduced-motion:reduce){.oest-spin{animation-duration:2s}}";
  function css() {
    if (d.getElementById("oest-ladowanie-css")) return;
    var s = d.createElement("style"); s.id = "oest-ladowanie-css"; s.textContent = CSS; (d.head || d.documentElement).appendChild(s);
  }
  function ring(cls) { css(); return '<span class="oest-spin' + (cls ? " " + cls : "") + '" aria-hidden="true"></span>'; }
  var box = null, hideT = 0;
  function show(text) {
    css(); clearTimeout(hideT);
    if (!box) { box = d.createElement("div"); box.className = "oest-load"; box.setAttribute("role", "status"); d.body.appendChild(box); }
    box.innerHTML = ring() + "<b>" + esc(text || T("Pracuję…", "Working…")) + "</b>";
    box.hidden = false; void box.offsetWidth; box.classList.add("on");
  }
  function hide() { if (!box) return; box.classList.remove("on"); var b = box; hideT = setTimeout(function () { b.hidden = true; }, 220); }
  function inline(el, text) { css(); if (el) el.innerHTML = '<div class="oest-inline" role="status">' + ring() + "<span>" + esc(text || "") + "</span></div>"; }
  css();
  w.OESTLadowanie = { ring: ring, show: show, hide: hide, inline: inline, css: css };
})(window, document);
