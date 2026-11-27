# moduly/podmien – miejsce pod dwa języki (08/11/2026, odchudzony 27/11/2026)

Zasada Grzegorza: zmiana języka albo stanu niczego nie przesuwa; miejsce na zmienne treści jest zarezerwowane z góry.

**Kontrakt**
- `OESTPodmien.miejsce(el, tekst2)` – jeden tekst ustawiany przez JS (np. termin „Zostało 24 dni” / „Ends in 24d”): element dostaje min. wysokość (a w rzędzie min. szerokość) dłuższej wersji PL/EN.
Ukryty element jest liczony, gdy się pokaże (ResizeObserver). Pomiar idzie przez chwilową zamianę tekstu w jednym kroku – bez klatki na ekranie.

**Uzupełnia:** `moduly/bledy` – `applyDom` rezerwuje miejsce dla stałego HTML z `data-en`; `prostokat(el)` – rozmiar bez chwilowej transformacji.

**Konsumenci:** `inspekcje/form-ui.js`, `inspekcje/i-formularz.js`, `inspekcje/i-zapis-zdjec.js`, `moduly/szkielet/src/czesci/Kafel.vue`.

**Usunięte 27/11/2026:** `html`, `oba`, `rezerwuj`, `ustaw` – nikt ich już nie wołał (ekrany rysuje Ionic + Vue).
