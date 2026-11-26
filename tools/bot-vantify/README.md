# tools/bot-vantify

Bot zamykający zlecenia Reactive w Vantify po zatwierdzeniu (Grzegorz 26/11/2026 „Tak, buduj bota”, PROD-042).
Google Apps Script na koncie Grzegorza, projekt „OEST bot Vantify”. Nie jest częścią apki.

## Co robi (co 10 minut)

1. Gmail: maile „Your issue has been assigned - <nr>” od savillsuk.cafm@vantify.com z ostatnich 30 dni = zatwierdzone.
2. Job Sheet: PDF „JOB SHEET … <nr>” w Files zlecenia w Vantify albo na Dysku (raporty z apki).
   - w Vantify → Commence (jeśli trzeba) + Complete bez nowego pliku;
   - tylko na Dysku → wysyła ten PDF i Commence (jeśli trzeba) + Complete z nim;
   - brak → czeka (Dysk przy każdym przebiegu, Vantify najwyżej co godzinę).
3. Mail do Grzegorza: „#nr zamknięte w Vantify” albo „#nr – zamknij ręcznie” (z powodem). Już zamknięte w Vantify → bez maila.
4. Awaria Vantify: przerwa 30 min → 1 h → 2 h → 4 h → 12 h, jeden mail na całą awarię.

Bot niczego nie zmienia w Gmailu (bez etykiet i filtrów). Stan: Właściwość skryptu `OEST_BOT_STAN`.

## Budowa i wdrożenie

```
node tools/bot-vantify/zbuduj.cjs OEST-bot-Vantify.gs
```

Plik = `app/www/vantify-akcje.js` (te same zapytania co apka) + `bot.js`. Wkleić w miejsce kodu w projekcie Apps Script.
Właściwości skryptu (wpisuje Grzegorz): `VANTIFY_USER`, `VANTIFY_PASS`. Strefa czasowa projektu: Europe/London.

Funkcje w edytorze:

| Funkcja | Co robi |
|---|---|
| `sprawdz` | próba: czyta Gmail, Dysk i Vantify, pisze w dzienniku, co by zrobił; nic nie wysyła, nie zapisuje, bez maili |
| `uruchom` | jeden prawdziwy przebieg |
| `wlacz` / `wylacz` | wyzwalacz co 10 minut / usunięcie wyzwalacza |

## Testy

`app/tests/bot-vantify.test.cjs` – zbudowany plik na udawanych usługach Google i udawanym Vantify.
