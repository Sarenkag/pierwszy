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

Strona: `<script src="moduly/klocek/klocek.js"></script>` (inspekcje: `../moduly/klocek/klocek.js`). CSS moduł dokłada sam.
