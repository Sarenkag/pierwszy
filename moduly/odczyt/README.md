# Moduł odczytu ze zdjęcia (`moduly/odczyt`)

Czyta tekst i liczby ze zdjęcia – **do ekranu SPA Daily Sampling** (wyświetlacze: W&T Ezetrol, Palintest, panel basenu), ewentualnie tabliczki do bazy budynku. W inspekcjach nie jest używany (tam model ma szukać usterek – decyzja Grzegorza 02/11) **na telefonie**, przez ML Kit, który jest już w apce (ta sama wtyczka `OESTKeys.recognize` co w Kluczach i Power trace). Działa offline. AI w chmurze tu nie ma.

**Zasada:** nic nie trafia do pól samo. Arkusz pokazuje liczby (np. `7.2 pH`, `0.85 mg/l`, `49.8 Hz`) i linie tekstu; stuknięcie wpisuje wybraną pozycję do wskazanego pola. Ręczne wpisywanie działa jak dawniej.

## Użycie
```js
OESTOdczyt.pick(blob, { targets: [{ label: 'Komentarz', el: textarea }, { label: 'Temp. CWU', el: input }] });
OESTOdczyt.read(blob).then(r => r.lines /* r.numbers, r.text */);
```
`OESTOdczyt.available()` = apka Android. W przeglądarce przycisk się nie pokazuje.

Strona: `<script src="moduly/odczyt/odczyt.js"></script>` (w inspekcjach `../moduly/odczyt/odczyt.js`).
