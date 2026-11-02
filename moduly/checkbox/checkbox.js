// Moduł checkboxa (moduly/checkbox) – jeden wygląd i ruch dla KAŻDEGO <input type="checkbox"> (Grzegorz 02/11/2026):
// zaznaczenie → kwadrat lekko wyskakuje i wypełnia się kolorem apki, ✓ rysuje się od lewej.
// Tylko CSS (bez zmian w HTML ekranów). Reguły w :where() mają zerową wagę, więc ekrany, które
// ukrywają swoje checkboxy (np. chipy) albo ustawiają im rozmiar, dalej wygrywają.
(function () {
  "use strict";
  if (document.getElementById("oest-checkbox-css")) return;
  var tick = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5' fill='none' stroke='%23000' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  var css = ":where(input[type=checkbox]){-webkit-appearance:none;appearance:none;margin:0;width:1.25em;height:1.25em;flex:none;border-radius:.35em;" +
      "box-shadow:inset 0 0 0 2px rgba(128,128,128,.6);box-shadow:inset 0 0 0 2px color-mix(in srgb,currentColor 40%,transparent);background:transparent;display:inline-grid;place-content:center;vertical-align:middle;cursor:pointer;" +
      "transition:background-color .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s cubic-bezier(.34,1.56,.64,1)}" +
    ":where(input[type=checkbox])::before{content:'';width:.85em;height:.85em;background:#fff;-webkit-mask:" + tick + " center/contain no-repeat;mask:" + tick + " center/contain no-repeat;" +
      "clip-path:inset(0 100% 0 0);transition:clip-path .3s cubic-bezier(.25,.1,.25,1) .1s}" +
    ":where(input[type=checkbox]:checked){background-color:var(--accent,#7c84ff);box-shadow:inset 0 0 0 2px var(--accent,#7c84ff);animation:oest-cb-pop .4s cubic-bezier(.34,1.56,.64,1)}" +
    ":where(input[type=checkbox]:checked)::before{clip-path:inset(0 0 0 0)}" +
    ":where(input[type=checkbox]:disabled){opacity:.5;cursor:default}" +
    ":where(input[type=checkbox]:focus-visible){outline:2px solid var(--accent,#7c84ff);outline-offset:2px}" +
    "@keyframes oest-cb-pop{50%{transform:scale(1.2)}}" +
    "@media (prefers-reduced-motion:reduce){:where(input[type=checkbox]),:where(input[type=checkbox])::before{transition:none}:where(input[type=checkbox]:checked){animation:none}}";
  var s = document.createElement("style"); s.id = "oest-checkbox-css"; s.textContent = css;
  (document.head || document.documentElement).insertBefore(s, (document.head || document.documentElement).firstChild); // na początku: style ekranów mogą nadpisać
})();
