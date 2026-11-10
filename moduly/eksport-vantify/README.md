# moduly/eksport-vantify

Eksport „Job” z Vantify (CSV) → plan zleceń planowych PPM. Grzegorz, 10/11/2026.

**Status:** INTEGRATED (wczytanie w telefonie `app/www/vantify-import.js`, skrypt `app/scripts/vantify-plan.cjs`). INTERNAL.

## Kontrakt (`window.OESTEksportVantify`, w Node `require`)

| Funkcja | Wejście | Wyjście / błędy |
|---|---|---|
| `parseCsv(text)` | tekst CSV (RFC 4180, BOM, cudzysłowy, nowe linie w polu) | tablica obiektów wg nagłówków |
| `norm(s)` | nazwa zadania | nazwa do porównania (Tower A → TA, Pavillion → P, …) |
| `matcher(cards)` | `[[id, nazwa], …]` | `fn(nazwaZadania) → id \| null` |
| `plan(rows, {match, prevCards})` | wiersze eksportu | `{exported, date, jobs, cards, missing, planned}`; `VANTIFY_FORMAT`, `VANTIFY_EMPTY` |
| `changes(oldJobs, newJobs)` | dwa plany | `{added, closed, total}` po numerze zlecenia |
| `fromApi(items, day)` | zlecenia z API Vantify (`id, type, summary, completionDueAt, frequency`), dzień pobrania | wiersze jak z `parseCsv` (do `plan`) |

## Zasady

- Terminy (`completeBy`) i numery zleceń dokładnie z pliku; moduł niczego nie przelicza (PROD-010).
- Tylko zlecenia `Planned`. Wynik bez danych osobowych (tylko numer, termin, częstotliwość).
- `cards` = karty z poprzedniego planu + karty z pliku: eksport ma tylko otwarte zlecenia, więc karta z zamkniętymi zleceniami zostaje kartą Vantify (bez terminu).
- `date` = najnowsze `createdAt` w pliku; `exported` = data + skrót treści (ta sama treść = ta sama wersja).
- Lista z API (przycisk „Pobierz z Vantify” i sprawdzanie przy starcie, `app/www/vantify-sync.js`) idzie tą samą drogą co plik: `fromApi` → `plan`. Termin = dzień `completionDueAt` w czasie UK.
- Moduł nie zna OEST: dopasowanie zadania do karty podaje wywołujący.

## Testy

`app/tests/eksport-vantify.test.cjs` (moduł + skrypt), `app/tests/vantify-wczytaj-ui-check.cjs` (ekran w Ustawieniach, zapis, restart, PPM i inspekcja).
