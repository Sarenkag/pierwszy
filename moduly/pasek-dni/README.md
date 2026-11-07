# Moduł `moduly/pasek-dni`

Jeden pasek dni dla całej apki (Grzegorz 07/11/2026): ekran główny i lista Inspekcji używają tego samego modułu,
więc wyglądają i liczą tak samo.

- **Dzień pracy** z grafiku (Mój profil → Mój grafik) = ten sam fioletowy gradient co dzień pracy w kalendarzu miesiąca (`.cd.sh`).
- **Dzień wolny** wygląda zwyczajnie (nie jest przygaszony). Przygaszony jest tylko dzień miniony.
- **Dziś** – obwódka akcentu z poświatą; **wybrany dzień** (lista Inspekcji) – dodatkowo biała ramka.
- Każdy kafelek ma zawsze 4 rzędy: dzień tygodnia, numer, pogoda, licznik „zrobione/wszystkie” (albo „–”), więc pasek nie skacze.

Moduł nie zna apki – grafik, liczniki i pogodę podaje ekran przez adaptery:

```
OESTPasekDni.html({ start, days, today, todayLabel, dayName, selected, isWork, counter, icon })
OESTPasekDni.iso(Date) → "RRRR-MM-DD"
```

Strona: `<script src="moduly/pasek-dni/pasek-dni.js"></script>`. CSS moduł dokłada sam. Test: `app/tests/pasek-dni-ui-check.cjs`.
