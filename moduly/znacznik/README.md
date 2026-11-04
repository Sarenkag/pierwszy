# Moduł `moduly/znacznik`

```
Moduł znaczków (moduly/znacznik) – JEDEN wzór małych wskaźników w całej apce (Grzegorz 04/11/2026):
  • licznik  – kropka z liczbą w rogu (dzwonek, kafelek, aparat przy punkcie, dzień w kalendarzu),
  • lampka   – kolorowa kropka stanu (Wi‑Fi, Dysk, wysyłka, termin): on / mid / off / na,
  • ikonka z liczbą – np. 📷 3, ⚠ 1, ✓ 12 (stopka klocka, nagłówek zdjęć).
Zmiana wyglądu tutaj = zmiana na wszystkich ekranach. Starsze nazwy klas (hm-badge, kf-n, fl-ic b, .cd i,
hm-st .l, pasek wysyłki .n i) są podpięte pod ten sam wzór, więc nic nie wygląda inaczej.

  OESTZnacznik.licznik(3, "red"|"orange"|"accent"|"dashed")  → '<span class="oest-n">3</span>' (0 = nic)
  OESTZnacznik.lampka("on"|"mid"|"off"|"na")                  → '<i class="oest-l on"></i>'
  OESTZnacznik.ikona("📷", 3, tone)                            → '<span class="oest-ic">📷 3</span>'
```

Strona: `<script src="moduly/znacznik/znacznik.js"></script>` (inspekcje: `../moduly/znacznik/znacznik.js`). CSS moduł dokłada sam.
