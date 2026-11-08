# Moduł `moduly/klocek`

```
Moduł klocka (moduly/klocek) – JEDEN klocek listy dla całej apki (Grzegorz 04/11/2026):
stałe miejsca, które każda lista tylko wypełnia swoimi danymi. Inspekcje, dzień w Kalendarzu, Reactive
i grupy (np. 18 DB) wyglądają i działają tak samo; różnią się tylko treścią.

 ┌▌[ikona] [TA] Nazwa ……………………… status ┐   1: ikona, znacznik budynku, nazwa (1 linia), status w rogu
 │▌ opis: gdzie · częstotliwość · kto       │   2: opis
 │▌ termin / data ……………………………… 50%      │   3: termin (może mieć <b>/<span class="red">) + procent
 │▌ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ pasek postępu          │   4: pasek (gdy jest procent)
 └▌ stopka …………… wysyłka [miniatura] Akcja › ┘   5: stopka, stan wysyłki, miniatura, akcja

OESTKlocek.html({
  id, data:{rx:'job'} (dodatkowe data-*), color (kolor paska z lewej), icon (svg/emoji – HTML),
  tag ('TA'), name, status:{text, tone:0..4}, desc, due (HTML), pct (liczba albo pomiń), barColor,
  foot, marks:[{i:'📷', n:3, tone}] (ikonki z liczbą), send:{text, tone}, thumb (adres obrazka) | thumbAttr ('data-rx-thumb="…"' – miniatura dociągana później),
  go ('Zacznij ›'), done (szary, na koniec listy), plan (przygaszony – planowane)
})   → '<button class="prow k2" …>…</button>'
Kolory statusu (tone): 0 szary · 1 żółty (w trakcie) · 2 zielony (gotowe) · 3 czerwony (zaległe) · 4 niebieski (w kolejce)
```

## Klocek inspekcji (Grzegorz 07/11/2026)

Lista Inspekcji, grupy (np. 18 DB) i dzień w Kalendarzu używają `OESTKlocek.inspekcja`. Reactive zostaje na `OESTKlocek.html` (nie było zlecenia).
Każdy element ma stałe miejsce i stałą (maksymalną) wielkość, także gdy jest pusty; PL i EN bez skoków. Ikonki 21×21, styl „słupków” (kreska 1.8, kolor `--steel`), kolor ma tylko znak w środku.

```
 ┌▌ Nazwa inspekcji …………………………… (pigułka)  ┐  1: nazwa (wielokropek) + pigułka statusu – OESTZnacznik.status (98 px, 5 trybów)
 │▌ [TB/L13] ▮▮▮ 3M  🗎✗                     › │  2: lokalizacja (51 px, puste = pusty kwadrat) · słupki + częstotliwość (3 znaki, 12M = Y) · formularz
 └▌ 📅 30/11 za 23D │ 🖼 7 │ ☑ 8/20 │ ⚠ 2      ┘  3: termin │ zdjęcia (max 99) │ OK/pytania (max 99/99) │ usterki (na razie pomarańczowe)
```

| Pole | Zasada |
| --- | --- |
| Formularz | ✗ czerwony #ef3b36 = zdjęcie formularza wymagane i brak; ✓ zielony #21c45a = dodane; same linie = niewymagane |
| Termin | „DD/MM za 4D”, od 31 dni „za 1M”; „DD/MM jutro” pomarańczowy #ff8a3d; „DD/MM dziś” i zaległe „DD/MM −3D” czerwone #ef3b36; Gotowa = sama data |
| OK/pytania | ptaszek zielony, gdy równe; pomarańczowy, gdy nierówne; „–”, gdy nie zaczęta albo pytania nieaktywne |
| Przytrzymanie | ~0,4 s w dowolnym miejscu klocka → krótka wibracja + okno informacji (treść `OESTKlocek.infoNode`, okienko `OESTPrzycisk.ask({ bare: true })` bez przycisków); zostaje po puszczeniu palca, stuknięcie gdziekolwiek / Wstecz zamyka; ruch palca = przewijanie |
| Okno informacji | tytuł = pełna nazwa zadania z Vantify (`OEST_VANTIFY.tasks`, z eksportu Task Frequencies); lokalizacja „TB – Tower B”; częstotliwość + numer zadania Vantify; termin dd/mm/rrrr + nr zlecenia; formularz; zdjęcia; pytania; usterki |
| Bez zaznaczania | klocek i okno informacji: bez zaznaczania tekstu i bez paska Kopiuj/Udostępnij przy przytrzymaniu (Pixel, 08/11/2026); tylko listy inspekcji, reszta apki bez zmian |

Pilnuje test `app/tests/klocek-inspekcji-ui-check.cjs`.

Strona: `<script src="moduly/klocek/klocek.js"></script>` (inspekcje: `../moduly/klocek/klocek.js`). CSS moduł dokłada sam.
