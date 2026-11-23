/* moduly/konto – JEDYNE miejsce, które czyta i zapisuje konto zalogowanego użytkownika (klucz oest.account w telefonie).
 * Klucz ma jednego właściciela (bramka: quality/jedno-miejsce.json „kluczeWlasciciele”); reszta apki pyta ten moduł.
 *   OESTKonto.get()   → { id, email, … } albo null (brak konta / zły zapis)
 *   OESTKonto.email() → adres konta małymi literami albo ""
 *   OESTKonto.set(a)  → zapis konta po zalogowaniu; true / false (pamięć niedostępna)
 *   OESTKonto.clear() → wylogowanie (usuwa zapis konta)
 */
(function (w) {
  "use strict";
  var KLUCZ = "oest.account";
  function get() { try { return JSON.parse(w.localStorage.getItem(KLUCZ) || "null"); } catch (e) { return null; } }
  function email() { var a = get(); return a && a.email ? String(a.email).toLowerCase() : ""; }
  function set(a) { try { w.localStorage.setItem(KLUCZ, JSON.stringify(a)); return true; } catch (e) { return false; } }
  function clear() { try { w.localStorage.removeItem(KLUCZ); } catch (e) {} }
  w.OESTKonto = { get: get, email: email, set: set, clear: clear };
})(typeof window !== "undefined" ? window : globalThis);
