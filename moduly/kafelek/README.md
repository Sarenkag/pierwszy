# Moduł `moduly/kafelek`

```
Moduł kafelka (moduly/kafelek) – JEDEN kafelek dla całej apki (Grzegorz 04/11/2026): ekran główny, Ustawienia,
Reactive (kategorie zgłoszeń) i wybór typu w inspekcjach. Stałe miejsca: ikona w kolorowym kwadracie, nazwa,
opcjonalny opis pod spodem i znaczek z liczbą w rogu. Ekrany tylko powielają kafelek i podstawiają treść.

  OESTKafelek.html({ icon: '<path …/>' albo cały '<svg …>' albo emoji, name: "Inspekcje", en: "Inspections" (albo name już w języku ekranu, bez en),
                     sub: "Dane i podpis", subEn: "Details", badge: 3, data: { go: "ppm" }, cls: "settings-card" })
  OESTKafelek.grid(lista)  → '<div class="tiles kf-grid">…</div>'
```

Strona: `<script src="moduly/kafelek/kafelek.js"></script>` (inspekcje: `../moduly/kafelek/kafelek.js`). CSS moduł dokłada sam.
