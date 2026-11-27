# Moduł `moduly/znacznik`

Małe wskaźniki – jeden wzór w całej apce (Grzegorz 04/11/2026):
- `OESTZnacznik.licznik(3, "red"|"orange"|"accent"|"dashed"|"inline")` → `<span class="oest-n">3</span>` (0 = nic) – kropka z liczbą w rogu;
- lampka – kolorowa kropka stanu: sam CSS (`.hm-st .l` + `on` / `mid` / `off`).

27/11/2026: `lampka()`, `ikona()` (nikt ich nie wołał) i `status()` (druga kopia pigułki) usunięte. Zostaje `formularz("brak"|"ok"|"blad")` – ikonka zdjęcia formularza w inspekcji (inspekcje/i-zdjecia.js).

## Pigułka statusu (zatwierdzona przez Grzegorza 07/11/2026 18:29) – rysuje ją `moduly/szkielet/src/czesci/Pigulka.vue`, wygląd w `szkielet.css` (`.oest-pigulka`)

Jedna pigułka statusu dla całej apki. **Zawsze taka sama** – kształt, cień, wypełnienie, wielkość, zaokrąglenie.
Zmienia się tylko kolor i napis. Nie nadpisywać tych wartości na ekranach – zmiana tylko w Pigulka.vue / szkielet.css. Wzór:

| Cecha | Wartość |
|---|---|
| Szerokość | 98 px (`--oest-st-w`), dobrana do najdłuższego napisu („Wstrzymana” 97 px) |
| Zaokrąglenie | pełne (999px) |
| Napis | 12 px, pogrubiony (700), na środku, jedna linia |
| Wypełnienie | kolor trybu 16% + obwódka 1 px w kolorze trybu, napis w kolorze trybu (bez pełnego wypełnienia, także Gotowa) |
| Cień 3D | `inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 0 rgba(0,0,0,.35), 0 3px 6px rgba(0,0,0,.45)`; napis `0 1px 1px rgba(0,0,0,.4)` |

| Tryb | PL | EN | Kolor |
|---|---|---|---|
| `zalegla` | Zaległa | Overdue | czerwony #ef3b36 |
| `nierozpoczeta` | – – – – | – – – – | szary #c3c9e8 |
| `wtrakcie` | W trakcie | In progress | żółty #f0c75e |
| `wstrzymana` | Wstrzymana | On hold | niebieski #79b8ff |
| `gotowa` | Gotowa | Ready | zielony #00d84a |
| `odzyskana` | Odzyskana | Recovered | fioletowy #a35bff (Grzegorz 08/11/2026; ten sam fiolet co w gradiencie apki) – inspekcja odzyskana z raportu, tylko w klocku Raporty |

PL/EN: ta sama szerokość, nic nie skacze.

Strona: `<script src="moduly/znacznik/znacznik.js"></script>` (inspekcje: `../moduly/znacznik/znacznik.js`). CSS moduł dokłada sam.
