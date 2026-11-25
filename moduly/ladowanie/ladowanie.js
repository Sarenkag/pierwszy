// Moduł ładowania (moduly/ladowanie) – JEDNO kółko „pracuję” w całej apce (Grzegorz 04/11/2026).
// Wygląd: standard Ionic ze szkieletu (moduly/szkielet, OESTCzesci.ladowanie): kółko ion-spinner, okienko ion-loading, w miejscu treści część Ladowanie.vue.
// Ten plik to cienki interfejs dla starego kodu – bez HTML z kodu (bramka IONIC|modul-ui).
//
//   OESTLadowanie.ring()             → '<ion-spinner …>' (napis do wstawienia w przycisk / listę starego ekranu)
//   OESTLadowanie.show("Zapisuję…")  → okienko na środku ekranu (ion-loading), hide() je chowa
//   OESTLadowanie.inline(el, "Wczytuję…") → w miejscu treści: kółko + tekst, dopóki ekran nie wstawi danych
(function (w) {
  "use strict";
  if (w.OESTLadowanie) return;
  function L() { return w.OESTCzesci && w.OESTCzesci.ladowanie; }
  w.OESTLadowanie = {
    ring: function () { var l = L(); return l ? l.ring() : ''; },
    show: function (text) { var l = L(); if (l) l.show(text); },
    hide: function () { var l = L(); if (l) l.hide(); },
    inline: function (el, text) { var l = L(); if (l && el) l.inline(el, text); },
    css: function () {}
  };
})(window);
