# Moduł `moduly/naglowek`

```
Moduł nagłówka (moduly/naglowek) – JEDEN nagłówek ekranu w całej apce (Grzegorz 04/11/2026).
Stałe miejsca: z lewej „‹ Wstecz”, w środku tytuł (1 linia), z prawej ikonki ekranu (⚙ ⋮ ◀ ▶) i przełącznik PL/EN.
Wygląd i rozmiary: moduly/wyglad/wyglad.css (.top). Ten plik:
  • OESTNaglowek.html({ back: "home", title: "Klucze", actions: '<button …>', lang: true }) – nagłówek dla nowych ekranów,
  • sam ujednolica nagłówki, które ekrany rysują po swojemu: ta sama strzałka Wstecz wszędzie,
    przełącznik PL/EN tam, gdzie ekran umie podmienić język w miejscu (bez przerysowania).
```

Strona: `<script src="moduly/naglowek/naglowek.js"></script>` (inspekcje: `../moduly/naglowek/naglowek.js`). CSS moduł dokłada sam.
