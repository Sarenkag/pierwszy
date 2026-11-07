# Quality Gate OEST – etap 2

Automatyczna bramka jakości według `docs/QUALITY.md` (G0–G2). Workflow: `.github/workflows/quality-gate.yml`, status do wymagania na `main`: **Quality Gate**.

| Bramka | Co sprawdza | Plik |
|---|---|---|
| G0 | PL/EN (`app/scripts/check-lang.js`), wszystkie `app/tests/*.test.cjs` (każdy plik osobno) | `run-gate.cjs --part lang / node` |
| G1 | zależności modułów i kolejność `<script>` w zbudowanej paczce (`app/www`), baseline zastanych naruszeń | `check-architecture.cjs`, `baselines/architecture.json` |
| G1 | ochrona kryteriów: lista testów, wyjątki i baseline mogą tylko maleć; usunięcie pliku testu = FAIL | `check-ratchet.cjs`, `required-tests.json` |
| G1 | testy samej bramki – dowód, że kontrole łapią błędy | `tests/gate.test.cjs` |
| G2 | wszystkie 12 `app/tests/*-ui-check.cjs` (w tym `pigulka-statusu-ui-check` – jedna pigułka statusu z moduly/znacznik: 5 trybów × PL/EN, 98 px, ten sam kształt/cień/wypełnienie, 07/11/2026; `pasek-dni-ui-check` – jeden pasek dni z dniami pracy z grafiku, 07/11/2026; `plynnosc-ui-check` – B1–B7 z audytu 07/11/2026: pierwszy obraz inspekcji bez internetu, geometria PL/EN, animacje tylko nowych kart, Wstecz, mniej ruchu, tabela ruchu; `pasek-systemowy-ui-check` – czarne tło pod godziną i baterią na każdym ekranie) w Chrome (Playwright przypięty w `package-lock.json`); `raport-ui-check` – każda inspekcja EFA-INS z faktycznej listy `window.OEST_PPM.tasks` (`app/tests/ppm-lista.cjs`), treść Word/PDF przez `app/tests/raport-tresc.cjs` | `run-gate.cjs --part browser` |

## Wyniki

Każdy test dostaje jeden z wyników: **PASS**, **FAIL**, **SKIPPED**, **NOT RUN**. Tylko PASS jest sukcesem.

- `node --test` z pominiętym (`skip`/`todo`) przypadkiem → SKIPPED.
- brak pliku z listy, brak podsumowania, kod 0 bez zdania „… PASS” testu → NOT RUN.
- `raport-ui-check`: inspekcja z listy PPM bez formularza/przycisku Wyślij albo niewypełnialna przez test → FAIL w samym teście; gdyby test przeszedł, a nie wymienił którejś inspekcji z listy → SKIPPED (także gdy jej nie zgłosił). Lista pochodzi z wykonania `ppm.js`, komentarze się nie liczą.
- DB, Isolators, podwykonawcy – tylko spis stanu w `inwentaryzacja-ppm.md`, bez wymagań raportu (decyzja 07/11/2026).
- test spoza `required-tests.json` też jest uruchamiany (z prośbą o dopisanie do listy).
- job, który nie dał wyników → NOT RUN w podsumowaniu.

Podsumowanie (tabela) jest w zakładce Summary uruchomienia, a pliki JSON w artefaktach `quality-g0/g1/g2`.

## Lokalnie

```bash
cd app && npm ci && npm run copy-web && cd ..
cd quality && npm ci && cd ..
node quality/run-gate.cjs --part lang
node quality/run-gate.cjs --part node
OEST_PLAYWRIGHT_PATH=$PWD/quality/node_modules/playwright-core OEST_BROWSER_PATH=$(command -v google-chrome) node quality/run-gate.cjs --part browser
node quality/check-architecture.cjs
node quality/check-ratchet.cjs --base origin/main
node --test quality/tests/*.test.cjs
```

## Wydanie APK (wariant A, 07/11/2026)

`android.yml` na push do `main`: job `gate` wywołuje cały Quality Gate (`workflow_call`) na tym samym SHA, job `apk` buduje jak dotąd,
a job `release` (jedyny z `contents: write`) publikuje APK w Releases tylko gdy `gate` = success i SHA APK = SHA bramki. W PR APK powstaje jako artefakt, bez wydania.

## Zmiany kryteriów

`required-tests.json`, `allowedSkips` i `baselines/*.json` mogą tylko maleć/zaostrzać się. Dodanie wyjątku lub usunięcie testu daje FAIL w PR – przejść może tylko świadomą decyzją właściciela (scalenie z pominięciem reguły jako administrator). Ochronę `main` włącza właściciel skryptem `ochrona-main.sh` (domyślnie tylko podgląd).
