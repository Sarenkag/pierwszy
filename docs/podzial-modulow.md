# Podział apki inspekcji na moduły – mapa dla lokalnego agenta (22/11/2026)

**Po co:** `inspekcje/index.html` ma **87 892 tokenów** (zmierzone tokenizerem Qwen 3.6 27B, pakiet `qwen-tokenizer`; tokenizera Qwen 3.8 nie miałem, liczby mogą się nieco różnić). Lokalny model ma pracować na kawałkach do ~25k. Po podziale największy plik ma ~11k, a `index.html` ~7k.

**Ten dokument nie przenosi kodu.** Kroki wykonuje lokalny agent, jeden krok = jeden commit (albo jeden PR).

## Stan przed podziałem (zmierzone 22/11/2026, main `f66c9fc`)
- `npm test` w `app/`: 438/438 PASS.
- G1 (`node quality/check-architecture.cjs`): PASS, 0 nowych naruszeń. Ratchet: PASS.
- G2 (`node quality/run-gate.cjs --part browser`): wynik w opisie PR.

## Jak jest zbudowana strona
`index.html` ma: style (linie 14–309), HTML (310–505), skrypty z `../moduly` (506–543), skrypt Word (544–827, zwykłe funkcje globalne: `fillDocx`, `makeName`…) i **jeden wielki skrypt** (828–3294) w środku `(function () { "use strict"; … })();`. Ten skrypt dzieli się komentarzami `// ---------- nazwa ----------` na sekcje. Sekcje mocno dzielą zmienne (np. `states`, `photos`, `fl`, `temps` są zmieniane z kilku sekcji).

## Wybrany sposób (gotowy wzorzec, bez nowych narzędzi)
Zwykłe pliki `<script src>` ładowane po kolei, tak jak reszta apki (ARCH-011: bez bundlera i ES modules). Kroki:
1. Zdjąć opakowanie `(function () { … })();` – zostaje `"use strict";`. Nazwy z sekcji stają się wspólne dla całej strony inspekcji. **Sprawdzone 22/11:** żadna z 270 nazw nie koliduje z nazwami przeglądarki ani innych skryptów tej strony (Playwright, lista `window` po załadowaniu strony).
2. Wycinać sekcje **po kolei od góry** do plików obok strony (`inspekcje/i-*.js`, R27 pozwala na „plik obok strony”). Kolejność plików = kolejność sekcji, więc kod przy starcie wykonuje się w tej samej kolejności co dziś. **Sprawdzone 22/11:** wszystkie 40 odwołań do funkcji z dalszych sekcji siedzą w obsłudze kliknięć (działają później), żadne nie wykonuje się przy ładowaniu.
3. Kod przenosić **bez zmian** (te same wcięcia), żeby `git diff --color-moved` pokazał samo przeniesienie.

Etap 2 (później, osobne zlecenie): każdy plik dostaje własny interfejs `window.OESTInsp…` jak `flush.js`/`rodzaje.js` (karty K). Dziś pliki dzielą zasięg strony – to świadomy krok pośredni.

## Moduły (tokeny Qwen 3.6)

| # | Plik | Linie dziś | Tokeny | Co zawiera | Wolno ruszać |
|---|---|---|---|---|---|
| – | `index.html` (zostaje) | 1–13, 310–543 | ~7 200 | nagłówek, HTML ekranów, lista `<script>` | tylko listę `<script>`/`<link>` |
| 1 | `insp.css` | 14–309 | 8 112 | style strony | wygląd |
| 2 | `i-word.js` | 545–826 | 7 122 | `T`, `fillDocx`, `tabsToColumns`, `templateInfo`, `makeName` – wypełnianie Worda | Word |
| 3 | `i-rdzen.js` | 832–907 | 1 505 | `$`, `MIME_DOCX`, `RD/TYPES/FAULTS`, pamięć `load/save/cfg`, pomocnicze (`NZ`, `esc`, `val`…), IndexedDB (`kvGet`, `qAll`, `qPut`…) | **nie ruszać bez potrzeby** – używają go wszystkie |
| 4 | `i-ekrany.js` | 908–1018 | 3 202 | `show`, `renderHome`, `renderList`, `devices`, `markDone` | ekran główny i lista |
| 5 | `i-formularz.js` | 1019–1186 | 4 681 | stan formularza (`states`, `photos`, `override`…), `openForm`, `applyNeeds`, `resetForm`, ustawienia wysyłki | otwieranie/czyszczenie formularza |
| 6 | `i-szkic.js` | 1187–1389 | 5 933 | szkic (`saveDraftNow`, `restoreDraft`) i odzyskiwanie skasowanych inspekcji | zapis szkicu |
| 7 | `i-flushing.js` | 1390–1445 | 2 185 | Weekly Flushing w formularzu (`renderFlush`, `flushReport`) | Flushing (logika tygodni jest w `flush.js`) |
| 8 | `i-checklista.js` | 1446–1618 | 4 079 | temperatury (wzór 024), checklista, usterki, `suggestOverall` | checklista i temperatury |
| 9 | `i-zbiorcze.js` | 1619–1809 | 4 161 | zlecenie zbiorcze (izolatory), historia, `batchData` | zlecenia zbiorcze |
| 10 | `i-serwer.js` | 1810–1931 | 3 054 | Apps Script (`api`, `gErr`), tłumacz, model tekstowy, notatki głosowe | łączność i pomocnicy tekstu |
| 11 | `i-zdjecia.js` | 1932–2094 | 3 809 | dodawanie zdjęć, miniatury, sugestie ze zdjęcia | zdjęcia w formularzu |
| 12 | `i-zapis-zdjec.js` | 2095–2311 | 6 093 | jeden zapis zdjęcia, rozmiar raportu (`REPORT_SIZE`, `fitReport`), `ask`, `say` | zapis i zmniejszanie zdjęć |
| 13 | `i-raport.js` | 2312–2488 | 4 214 | dane raportu (`formData`, `reportDate`, `english`) i szablon z Drive | treść raportu |
| 14 | `i-ustawienia.js` | 2489–2690 | 6 275 | ustawienia, `buildAll` (Word + PDF), Flushing basic | budowa plików raportu |
| 15 | `i-kolejka.js` | 2691–3083 | 11 153 | podgląd, kolejka, wysyłka, `reportFolder`, `markSent` | kolejka i wysyłka |
| 16 | `i-start.js` | 3084–3292 | 5 076 | start strony, wejście z PPM (`openPpm`), odzyskana inspekcja (`openRec`) | start i wejścia |

Zależności: każdy plik może używać plików o **niższym numerze**; wyższe tylko wewnątrz obsługi kliknięć (tak jest dziś). Agent dostaje swój plik + `i-rdzen.js` (1,5k) + ten wiersz tabeli, razem dużo poniżej 25k.

## Krok 0 – bramka jakości (potrzebna zgoda Grzegorza, robi Claude albo agent)
Problem (sprawdzony w kodzie bramki): `quality/baselines/zasady.json` ma 19 zastanych naruszeń zapisanych na plik `inspekcje/index.html` (np. `JM|esc|…`, `ZNACZNIK|brak|… maks 56`). Po przeniesieniu kodu do `i-*.js` te same naruszenia dostaną nową nazwę pliku, a `check-ratchet.cjs` traktuje nowy wpis jako FAIL (baseline może tylko maleć, QG-014).
Rozwiązanie: w `quality/zasady.cjs` w funkcji `pliki()` treść plików `inspekcje/i-*.js` doklejać do treści `inspekcje/index.html` jako skrypt strony (zamiast liczyć je osobno). Liczby naruszeń zostają te same, nic się nie poluzowuje. Test: `node quality/check-architecture.cjs` → G1 PASS, 0 nowych; `node --test quality/tests/gate.test.cjs` PASS.

## Kroki dla agenta
Przed każdym krokiem: `git pull`, w `app/`: `npm install` (raz). Po każdym kroku **zawsze**:
```
cd app && node scripts/copy-web.js && npm test          # 438+ PASS, 0 FAIL
cd .. && node quality/check-architecture.cjs            # G1 PASS, NOWE: 0
node quality/check-ratchet.cjs                          # PASS
node quality/run-gate.cjs --part browser --only <test>  # testy podane w kroku
```
Każdy nowy plik `i-*.js`: dopisać do `SHELL` w `inspekcje/sw.js` (praca bez zasięgu). Nie zmieniać kodu, nazw, wcięć ani kolejności. Test czytający przeniesiony kod: zmienić **tylko ścieżkę pliku**, nie asercje.

| Krok | Polecenie dla agenta | Testy do sprawdzenia |
|---|---|---|
| 1 | Przenieś zawartość `<style>` (linie 14–309) do `inspekcje/insp.css`. W miejscu `<style>…</style>` wstaw `<link rel="stylesheet" href="insp.css">` (ta sama pozycja, przed `../theme.css`). | całe G2 (wygląd) |
| 2 | Przenieś treść drugiego skryptu (od `// Tekst na ekranie: OESTT` do końca przed `</script>`, linie 545–826) do `inspekcje/i-word.js`; w HTML zostaw `<script src="i-word.js"></script>`. W `app/tests/report-template.test.cjs` czytaj `inspekcje/i-word.js` zamiast `index.html`. | `report-template.test`, `word-pdf-ui-check`, `raport-ui-check` |
| 3 | W dużym skrypcie usuń linię `(function () {` i na końcu `})();` (przed `</script>`). `"use strict";` zostaje jako pierwsza linia skryptu. Nic więcej. | całe `npm test` i całe G2 |
| 4 | Wytnij od linii po `"use strict";` do linii przed `// ---------- ekrany ----------` → `inspekcje/i-rdzen.js` (na górze `"use strict";`). Przed dużym `<script>` dodaj `<script src="i-rdzen.js"></script>`. W `narzedzia.test.cjs` i `rodzaje.test.cjs` sprawdzenie kolejności: tag modułu przed tagiem `i-rdzen.js`, a `var NZ …`/`var RD …` szukaj w `i-rdzen.js`. | `narzedzia.test`, `rodzaje.test`, `ekran-glowny-ui-check` |
| 5 | To samo dla sekcji `ekrany` (do `// ---------- formularz`) → `i-ekrany.js`. Tag za poprzednim. | `ekran-glowny-ui-check`, `klocek-inspekcji-ui-check` |
| 6 | `formularz` + „co ta inspekcja wymaga” + „ustawienia wysyłki” (do `// ---------- szkic`) → `i-formularz.js`. | `formularz-ptaszek-ui-check`, `nie-rozpoczeta-ui-check` |
| 7 | `szkic` + „odzyskanie inspekcji” (do `// ---------- Weekly Flushing`) → `i-szkic.js`. | `odzyskana-ui-check`, `czyszczenie-ui-check`, `zapis-bez-bazy-ui-check` |
| 8 | `Weekly Flushing` (do `// ---------- pomiary temperatur`) → `i-flushing.js`. | `flush.test`, `flush-odczyt-ui-check` |
| 9 | `pomiary temperatur` (do `// ---------- zlecenie zbiorcze`) → `i-checklista.js`. | `checkbox-ui-check`, `formularz-ptaszek-ui-check` |
| 10 | `zlecenie zbiorcze` (do `// ---------- serwer`) → `i-zbiorcze.js`. | `raport-ui-check` |
| 11 | `serwer` + tłumaczenie + model + notatki (do `// ---------- zdjęcia`) → `i-serwer.js`. | `notatki-ui-check`, `pl-en-ui-check` |
| 12 | `zdjęcia` + „sugestie ze zdjęcia” (do `// ---------- jeden zapis zdjęcia`) → `i-zdjecia.js`. | `zdjecia.test`, `zdjecia-data-ui-check` |
| 13 | „jeden zapis zdjęcia” (do `// ---------- dane raportu`) → `i-zapis-zdjec.js`. `raport-rozmiar.test.cjs` i `aparat-java.test.cjs` (tylko `camOpts`) czytają `i-zapis-zdjec.js`. | `raport-rozmiar.test`, `aparat-java.test`, `raport-rozmiar-ui-check`, `zdjecia-szybkosc-ui-check` |
| 14 | `dane raportu` + `szablon` (do `// ---------- ustawienia`) → `i-raport.js`. | `raport-ui-check`, `word-pdf-ui-check` |
| 15 | `ustawienia` (do `// ---------- podgląd`) → `i-ustawienia.js`. | `pdf-z-docx-ui-check`, `word-pdf-ui-check` |
| 16 | `podgląd` + `kolejka` (do `// ---------- start`) → `i-kolejka.js`. `raporty-folder.test.cjs` czyta `i-kolejka.js`. | `raporty-folder.test`, `raporty-wysylka.test`, `udostepnij-ui-check`, `raport-ui-check` |
| 17 | Reszta (`start`, wejście z PPM, odzyskana) → `i-start.js`; pusty `<script></script>` usuń. | całe `npm test` i całe G2 |
| 18 | Do każdego pliku na górze 3–5 linii komentarza: co robi, z czego korzysta (numery z tabeli), czego nie ruszać. W `docs/ARCHITECTURE.md` w wierszu „Inspekcje i raporty” dopisz listę plików `i-*.js`. | `check-architecture` |

Jeśli test nie przechodzi: cofnąć krok (`git checkout .`) i zgłosić, **nie poprawiać kodu ani testu na siłę**. Skończone = wszystkie kroki zielone + test na Pixelu 8 Pro (CI go nie zastępuje).
