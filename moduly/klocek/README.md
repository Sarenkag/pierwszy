# Moduł `moduly/klocek`

Klocek listy (Inspekcje, Kalendarz, Reactive, Moje raporty) rysuje szkielet Ionic + Vue: `moduly/szkielet/src/czesci/Klocek.vue`.
Ten moduł liczy tylko teksty klocka, wspólne dla wszystkich ekranów:

- `OESTKlocek.termin(due, left, done)` → `{ text, date, rest, tone }` – „dd/mm za 3D”, „dziś”, „jutro”, „−2D” (tone: `red` / `jutro` / pusty).
- `OESTKlocek.czest(f)` → częstotliwość w 3 znakach (`12M` = `Y`).

Konsumenci: `app/www/ppm-ui.js`, `app/www/reactive.js`, `moduly/raporty/przegladarka.js`.

27/11/2026: dawne rysowanie klocka z HTML (`html`, `inspekcja`, `infoNode`, `przytrzymaj`, CSS) usunięte – nikt go już nie wołał.
