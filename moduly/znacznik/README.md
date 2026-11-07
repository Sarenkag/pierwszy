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
  OESTZnacznik.status("zalegla"|"nierozpoczeta"|"wtrakcie"|"wstrzymana"|"gotowa") → '<span class="oest-st zalegla">Zaległa</span>'
```

## Pigułka statusu – `OESTZnacznik.status(tryb)` (zatwierdzona przez Grzegorza 07/11/2026 18:29)

Jedna pigułka statusu dla całej apki. **Zawsze taka sama** – kształt, cień, wypełnienie, wielkość, zaokrąglenie.
Zmienia się tylko kolor i napis. Nie nadpisywać tych wartości na ekranach – zmiana tylko tutaj.

| Cecha | Wartość |
|---|---|
| Szerokość | 98 px (`--oest-st-w`), dobrana do najdłuższego napisu („Wstrzymana” 97 px) |
| Zaokrąglenie | pełne (999px) |
| Napis | 12 px, pogrubiony (700), na środku, jedna linia |
| Wypełnienie | kolor trybu 16% + obwódka 1 px w kolorze trybu, napis w kolorze trybu (bez pełnego wypełnienia, także Gotowa) |
| Cień 3D | `inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 0 rgba(0,0,0,.35), 0 3px 6px rgba(0,0,0,.45)`; napis `0 1px 1px rgba(0,0,0,.4)` |

| Tryb | PL | EN | Kolor |
|---|---|---|---|
| `zalegla` | Zaległa | Overdue | czerwony #ff7b72 |
| `nierozpoczeta` | – – – – | – – – – | szary #c3c9e8 |
| `wtrakcie` | W trakcie | In progress | żółty #f0c75e |
| `wstrzymana` | Wstrzymana | On hold | niebieski #79b8ff |
| `gotowa` | Gotowa | Ready | zielony #5fd6a0 |

Kolory to te same, które już są w klocku (moduly/klocek, TONE). PL/EN: ta sama szerokość, nic nie skacze.
Test: `app/tests/pigulka-statusu-ui-check.cjs` (wymagany w Quality Gate).

Strona: `<script src="moduly/znacznik/znacznik.js"></script>` (inspekcje: `../moduly/znacznik/znacznik.js`). CSS moduł dokłada sam.
