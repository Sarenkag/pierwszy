# Moduł `moduly/nowosci`

Nagłówki trzech firm związanych z One Eastside (Grzegorz 18/11/2026):
PIC – Pension Insurance Corporation (właściciel budynku), Savills (zarządca), Smart Managed Solutions (pracodawca).

- Filtry (Grzegorz 18/11/2026 20:32): PIC i Savills – tylko wiadomości o One Eastside; Smart – wszystkie wiadomości (kontrakty, rozwój) + oferty pracy ze strony kariery (Teamtailor RSS). Oferty z Birmingham/Midlands osobno, reszta w jednym wierszu zbiorczym.
- Źródło wiadomości: Google News RSS – jeden format dla wszystkich trzech (Smart nie ma działu newsów na stronie, LinkedIn wymaga logowania).
- Raz na dobę, tylko gdy jest sieć; bez sieci okienko pokazuje ostatnio zapisane albo „Brak sieci”. Nic nie udaje.
- One Eastside zawsze na górze, potem najnowsze; max 5 w okienku, bez dubli.
- Na telefonie zapytanie natywne (CapacitorHttp), bo WebView blokuje CORS.
- Lista zapytań: `KANALY` w `nowosci.js` (zmiana tylko tutaj). Okienko i kafelek: `app/www/home.js` (kafelek na miejscu „Statystyk”).
- Test: `app/tests/nowosci-ui-check.cjs`.
