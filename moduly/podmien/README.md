# moduly/podmien – zmiana treści bez przerysowania i drgania (08/11/2026)

Zasada Grzegorza: zmiana języka albo stanu niczego nie przerysowuje ani nie przesuwa; miejsce na zmienne treści jest zarezerwowane z góry.

**Kontrakt**
- `OESTPodmien.html(el, html)` – zamiast `el.innerHTML = html`. Nakłada nowy HTML na istniejące elementy: zmieniają się tylko teksty i atrybuty, elementy powstają/znikają tylko przy zmianie liczby pozycji. Uwaga: słuchacze zdarzeń przypięte do starych elementów zostają (używaj delegacji na kontenerze).
- `OESTPodmien.oba(el, fn)` – `fn()` buduje HTML ekranu; ten sam `fn` wywołany w drugim języku (`OESTBledy.wJezyku`) wyznacza miejsce: teksty dostają min. wysokość (a w rzędzie min. szerokość) dłuższej wersji PL/EN.
- `OESTPodmien.ustaw({ drugi: fn => html })` – adapter języka: `drugi(fn)` zwraca HTML z `fn()` zbudowany w drugim języku. Bez adaptera moduł używa `OESTBledy.wJezyku/drugi`, jeśli są na stronie; bez żadnego `oba` nic nie rezerwuje (pozostałe funkcje działają bez OEST).
- `OESTPodmien.rezerwuj(el, html2)` – to samo z gotowym HTML drugiego języka.
- `OESTPodmien.miejsce(el, tekst2)` – jeden tekst ustawiany przez JS (np. termin „Zostało 24 dni” / „Ends in 24d”).
Ukryty element jest liczony, gdy się pokaże (ResizeObserver). Pomiar idzie przez chwilową zamianę samych węzłów tekstu w jednym kroku – bez nowych elementów i bez klatki na ekranie.

**Uzupełnia:** `moduly/bledy` – `applyDom` rezerwuje miejsce dla stałego HTML z `data-en`; `wJezyku(lang, fn)` i `drugi()`.

**Konsumenci:** `index.html` (Inspekcje: pasek dni, filtry, lista), `home.js` (pasek dni), `settings-ui.js`, `questions-ui.js`, `reactive.js`, `powertrace.js`, `zdjecia-ui.js`, `moduly/raporty/przegladarka.js`, `moduly/model`, `inspekcje/index.html` (kafelki, termin, podpowiedzi).

**Testy:** `app/tests/pl-en-ui-check.cjs` (35 ekranów, lista znanych odstępstw pusta).

**Ograniczenia:** szerokość kolumn tabeli z automatycznym układem może się różnić między językami (wysokość wiersza jest wyrównana); kolejny ekran dodany bez `oba`/`html` nie jest objęty – test PL/EN to wykaże.
