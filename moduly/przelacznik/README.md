# Moduł `moduly/przelacznik`

```
Moduł przełącznika (moduly/przelacznik) – JEDEN przełącznik „jedna z kilku opcji” dla całej apki (Grzegorz 04/11/2026),
wzór: klocek PL / EN. Wypukły suwak płynnie przesuwa się pod wybraną opcję (sprężyście, z cieniem – „3D”), zamiast pstryknięcia.

  OESTPrzelacznik.html({ name: "lang", value: "pl", options: [{ v: "pl", t: "PL" }, { v: "en", t: "EN" }], label: "Język", cls: "" })
  OESTPrzelacznik.set(elementLubNazwa, "en")   – przesuwa suwak (np. po zmianie z innego ekranu)
Kliknięcie obsługuje ekran (jak dotąd); moduł sam przestawia suwak. Przełącznik języka (name "lang")
sam słucha zmiany języka w całej apce (oest:lang), więc na każdym ekranie pokazuje to samo.
```

Strona: `<script src="moduly/przelacznik/przelacznik.js"></script>` (inspekcje: `../moduly/przelacznik/przelacznik.js`). CSS moduł dokłada sam.
