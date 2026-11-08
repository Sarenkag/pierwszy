/* Moduł Wstecz (moduly/wstecz) – JEDYNE miejsce, które obsługuje systemowy klawisz/gest Wstecz telefonu.
 *
 * Zasada (Grzegorz 08/11/2026): „back powinien cofać max o poziom wyżej lub spuszczać dane okienko”.
 * Wcześniej Android cofał się po całej historii przeglądania (nawet 15 naciśnięć do ekranu głównego,
 * po wyjściu z inspekcji Wstecz otwierał ją z powrotem). Teraz Wstecz telefonu, po kolei:
 *   1. zamyka okienko na wierzchu (podgląd zdjęcia, edytor, pytanie, okienko z ekranu głównego),
 *   2. robi dokładnie to samo co strzałka ‹ na widocznym ekranie (jeden poziom wyżej),
 *   3. na ekranie głównym: okienko „Chcesz wyjść z aplikacji?” (Tak / Nie), jak każde inne pytanie w apce.
 *
 *   OESTWstecz.okno(zamknij) → zwolnij()   okienko bez wpisu w historii (np. aparat) rejestruje się tu;
 *                                           Wstecz woła zamknij(), okienko po zamknięciu woła zwolnij()
 *   OESTWstecz.ustaw({ gora, glowny, pytaj }) strona podaje: pytaj(tekst, {ok, cancel}) → Promise<bool> = okienko pytania apki; gora() → gdy ekran nie ma strzałki ‹: sama idzie poziom wyżej, true;
 *                                           glowny() → true, gdy to ekran główny (Wstecz = wyjście z apki)
 *   OESTWstecz.wstecz()                    to, co robi klawisz Wstecz (też do testów w przeglądarce)
 */
(function (w) {
  'use strict';
  if (w.OESTWstecz) return;
  var okna = [], strona = {}, pytam = false;
  function T(pl, en) { try { return localStorage.getItem('oest.lang') === 'en' ? en : pl; } catch (e) { return pl; } }
  function widoczna(el) { return !!el && !el.hidden && el.offsetParent !== null; }
  // strzałka ‹ na widocznym ekranie (górny pasek .top .back)
  function strzalka() {
    var all = document.querySelectorAll('.top .back');
    for (var i = 0; i < all.length; i++) if (widoczna(all[i]) && !all[i].closest('[hidden]')) return all[i];
    return null;
  }
  function wyjdz() {
    var App = w.Capacitor && w.Capacitor.Plugins && w.Capacitor.Plugins.App;
    if (App && App.exitApp) App.exitApp();
  }
  function wstecz() {
    // 1. okienko bez historii (aparat) – zamknij najwyższe
    if (okna.length) { var z = okna[okna.length - 1]; try { z(); } catch (e) {} return 'okno'; }
    // 1b. okienko z wpisem historii (OESTOverlay, OESTPytaj) – zamyka je cofnięcie tego wpisu
    if (history.state && history.state.overlay) { history.back(); return 'okno'; }
    // 2. jeden poziom wyżej
    var glowny = strona.glowny ? !!strona.glowny() : !strzalka();
    if (!glowny) {
      var b = strzalka(); if (b) { b.click(); return 'gora'; }
      if (strona.gora && strona.gora()) return 'gora';
    }
    // 3. ekran główny: okienko „Chcesz wyjść z aplikacji?” (Grzegorz 08/11/2026); Wstecz w okienku = Nie
    if (pytam) return 'okno';
    if (!strona.pytaj) { wyjdz(); return 'wyjscie'; }
    pytam = true;
    Promise.resolve(strona.pytaj(T('Chcesz wyjść z aplikacji?', 'Do you want to exit the app?'), { ok: T('Tak', 'Yes'), cancel: T('Nie', 'No'), danger: false }))
      .then(function (tak) { pytam = false; if (tak) wyjdz(); }, function () { pytam = false; });
    return 'pytanie';
  }
  w.OESTWstecz = {
    okno: function (zamknij) { okna.push(zamknij); return function () { var i = okna.indexOf(zamknij); if (i >= 0) okna.splice(i, 1); }; },
    ustaw: function (o) { strona = o || {}; },
    wstecz: wstecz
  };
  // telefon: własna obsługa Wstecz wyłącza domyślne cofanie Androida po historii WebView
  try {
    var App = w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform() && w.Capacitor.Plugins && w.Capacitor.Plugins.App;
    if (App && App.addListener) App.addListener('backButton', function () { wstecz(); });
  } catch (e) {}
})(typeof window !== 'undefined' ? window : globalThis);
