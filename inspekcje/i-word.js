// i-word.js – teksty strony PL/EN i nazwa pliku raportu (Word składa moduly/word).
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: nazw T/OESTT – używa ich cała strona.
// Tekst na ekranie: OESTT('po polsku', 'in English') wg języka apki (moduly/bledy). Raporty zawsze po angielsku.
// Statyczne teksty strony (data-en / data-en-aria-label / data-en-placeholder) – podmiana w miejscu, bez przerysowania.
(function () {
  function lang() { if (window.OESTBledy) OESTBledy.applyDom(document); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", lang); else lang();
  if (window.OESTBledy) OESTBledy.naZmianeJezyka(lang); // oest:lang i zmiana w innej stronie (moduly/bledy)
  window.addEventListener("storage", function (e) { if (e && e.key === "oest.settings") lang(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) lang(); });
})();
// Silnik Worda (wypełnianie, strony ze zdjęciami, czytanie wzoru): moduly/word/word.js (OESTWord) – jedno miejsce dla całej apki.

// Nazwa pliku według wzoru: {RRRR} {MM} {DD} {GG} {mm} {kod} {urzadzenie} {lokalizacja} {obiekt} {rodzaj} {nr}
function makeName(pattern, data, when) {
  var pad = window.OESTNarzedzia.pad;
  function clean(s) {
    return String(s || "").replace(/[(),]/g, " ").trim()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[łŁ]/g, function (c) { return c === "ł" ? "l" : "L"; }) // i18n-ok: zamiana liter w nazwie pliku
      .replace(/[^A-Za-z0-9._ -]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  var map = {
    RRRR: when.getFullYear(), MM: pad(when.getMonth() + 1), DD: pad(when.getDate()),
    GG: pad(when.getHours()), mm: pad(when.getMinutes()),
    kod: clean(data.urzadzenie).toLowerCase(),
    obiekt: clean(data.obiekt), urzadzenie: clean(data.urzadzenie), lokalizacja: clean(data.lokalizacja),
    rodzaj: clean(data.rodzaj), nr: clean(data.nr), zlecenie: clean(data["job number"])
  };
  // numer zlecenia Vantify (Grzegorz 20/11/2026): na końcu nazwy, także przy własnym wzorze bez {zlecenie}; bez numeru – nazwa jak dotąd
  if (map.zlecenie && pattern.indexOf("{zlecenie}") < 0) pattern += " {zlecenie}";
  var name = pattern.replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : ""; });
  name = name.replace(/[\/\\:*?"<>|]/g, "-").replace(/ +/g, " ").replace(/_+/g, "_").replace(/-+/g, "-").replace(/^[ _-]+|[ _-]+$/g, "");
  return name || "raport";
}



