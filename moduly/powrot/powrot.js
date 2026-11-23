/* moduly/powrot – JEDYNE miejsce, które pamięta, dokąd wrócić po wyjściu ze strony inspekcji (klucz oest.back w sessionStorage).
 * Przed wejściem do inspekcji strona główna (albo przeglądarka raportów) zapisuje ekran, dzień i przewinięcie;
 * strona inspekcji czyta to przy wyjściu, a strona główna po powrocie odtwarza widok i kasuje wpis.
 *   OESTPowrot.zapisz(o)       o = { h: "#trasa", … } – nadpisuje poprzedni wpis
 *   OESTPowrot.odczytaj(usun)  → zapisany obiekt albo null; usun = true kasuje wpis po odczycie
 */
(function (w) {
  "use strict";
  var KLUCZ = "oest.back";
  function zapisz(o) { try { w.sessionStorage.setItem(KLUCZ, JSON.stringify(o)); } catch (e) {} }
  function odczytaj(usun) {
    var b = null;
    try { b = JSON.parse(w.sessionStorage.getItem(KLUCZ) || "null"); if (usun) w.sessionStorage.removeItem(KLUCZ); } catch (e) {}
    return b;
  }
  w.OESTPowrot = { zapisz: zapisz, odczytaj: odczytaj };
})(typeof window !== "undefined" ? window : globalThis);
