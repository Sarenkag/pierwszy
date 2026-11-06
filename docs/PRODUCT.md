# OEST — mapa wymagań funkcjonalnych (v1.0, 06/11/2026)

> Ten dokument nie zastępuje zatwierdzonych formularzy, importu Vantify, rozmów z właścicielem ani szczegółowej specyfikacji w projekcie Claude. Chroni ich znaczenie i wskazuje podstawowe reguły do testowania. Rozbieżność należy zgłosić, nie rozstrzygać samowolnie.

## Kontekst

**PROD-001:** OEST jest narzędziem technicznego inżyniera utrzymania ruchu dla One Eastside: Tower A, Tower B, Pavilion; Smart Managed Solutions. Telefon referencyjny: Pixel 8 Pro. Cykl 4 dni pracy / 4 wolne od 02/11/2026. Terminy i czynności wynikają z obowiązujących danych i procesów, nie z domysłów AI.

**PROD-002:** język rozmowy z użytkownikiem: polski; interfejs: PL (domyślny) + EN; firmowe raporty: angielski. Daty prezentowane DD/MM/YYYY. Nazwa dokumentu typu `KOD DDMMRRRR`, z zachowaniem obecnego szczegółowego kontraktu.

## PPM i inspekcje

- **PROD-010:** oficjalne terminy i numery zadań pochodzą z `app/www/vantify-plan.js` (eksport Vantify). Nie przestawiaj ani nie przeliczaj dat źródłowych; ewentualne terminy prognozowane muszą być odróżnione od zleceń.
- **PROD-011:** katalog pełnych inspekcji, dotychczasowe formularze i lista 78 PPM określona w źródłowych rozmowach/specyfikacji nie mogą być samowolnie okrajane; niespójność z aktualną bazą zgłoś, nie „uzupełniaj” przez zgadywanie.
- **PROD-012:** dzień wykonania wybiera użytkownik, nie podmieniaj go automatycznie; kalendarz liczy zakończone/wszystkie, nie fałszuje stanu po restarcie; dotychczasowe `oest.ppm.done` traktuj jako istniejącą zależność do migracji, nie dowolnie nadpisuj.
- **PROD-013:** klik „Zakończ/Ready” zmienia status na GOTOWA jednym działaniem, **nie usuwa ani nie ukrywa inspekcji**. Gotowa, wysłana, czeka na dokumenty, w pełni zakończona, czeka na podwykonawcę, czeka na części to odrębne stany zgodnie z wymaganiami.
- **PROD-014:** dotychczasowe firmowe formularze są źródłem struktury raportu. Nie wynajduj nowych szablonów; „Wszystko OK → następny” oraz pamiętanie postępu obowiązują tam, gdzie wymagano. Lista Isolators i pytania SFG20 pozostają do uzupełnienia tylko na podstawie zatwierdzonych danych.
- **PROD-015:** poprawna nawigacja wraca do ekranu, z którego rozpoczęto zadanie, przywraca kontekst i przewijanie. PL/EN nie może powodować migotania i przypadkowych przesunięć.

## Zdjęcia, raporty, wysyłanie

- **PROD-020:** każde zdjęcie pytania jest przypisane do właściwego punktu i podpisane jego nazwą poniżej zdjęcia. Na stronę raportu maksymalnie 12 zdjęć, z zachowaniem ograniczeń i zatwierdzonego layoutu.
- **PROD-021:** zdjęcia ogólne: 2560 / 1600 (standard) / 800 px według istniejącego wyboru użytkownika; skan formularza 1920 px na pełne A4; zdjęcia punktów i kompresja raportu stosują zatwierdzone reguły konkretnego kontekstu, a nie przypadkowy globalny rozmiar.
- **PROD-022:** folder zdjęć na telefonie ma ustalony limit 200 MB i próg ostrzeżenia 100 MB, z jasnym licznikiem w UI. Nie usuwaj zdjęć nadal używanych przez inspekcję.
- **PROD-023:** każdy raport ma odpowiadające sobie wersje Word i PDF, tworzone z właściwych formularzy i z tymi samymi danymi. Zachowaj podpis, logo, tabelę i zdjęcia. Docelowo każdy plik <1 MB; jeśli przewidywany rozmiar jest większy, ostrzeż **przed stworzeniem** i zapewnij zatwierdzony wybór wersji.
- **PROD-024:** Weekly Flushing: pełny formularz Word z budynkiem, pięcioma kolumnami tygodni, datą i Yes wyłącznie w wybranym tygodniu, zdjęciami przy kranach; referencyjne liczności TA12, TB20, Pavilion2. Test musi oddać faktyczny kontekst, nie tylko istnienie dokumentu.
- **PROD-025:** „Wyślij” **wyłącznie wysyła**; nie kasuje raportu, zdjęć ani historii. Odbiorcy: sp (prywatny), sm (firmowy, domyślny), se (inżynier), sg (manager), także wiele jednocześnie; prywatny z `profile.privateEmail`; Reactive wyłącznie firmowy zgodnie z ustaleniami.
- **PROD-026:** zanim UI ogłosi sukces wysyłki lub połączenia Google, zweryfikuj rzeczywisty rezultat; przy niejednoznacznym wyniku Gmaila nie ponawiaj automatycznie w sposób narażający na duplikaty. Istniejąca kolejka/statusy i `moduly/wysylka` są punktem integracji.

## Pozostałe funkcje i przyszłość

- **PROD-030:** główne funkcje: PPM, Reactive, Calendar, Handover, Keys/Doors, Power Trace, Settings, zdjęcia, wiedza; wszystkie mają korzystać ze wspólnych modułów, gdzie istnieje odpowiedzialny kontrakt.
- **PROD-031:** dla notatek głosowych, OCR tabliczek, analizy usterek, tłumaczenia PL→EN, planów budynku, asset register, wiedzy technicznej i multi-building utrzymuj możliwość przyszłej rozbudowy, ale nie twórz ich samoczynnie.
- **PROD-032:** nie deklaruj, że niezintegrowane moduły są zbędne. Część jest celowo przygotowana na kolejne zadania.
- **PROD-033:** nie wychodź poza role, istniejące procedury, firmowe formularze i zakres techniczny inżyniera; nowe źródła danych oraz uprawnienia wymagają zatwierdzonego procesu.

## Obowiązujące źródła szczegółowe

- Kod i integracje: `inspekcje/`, `app/www/`, `moduly/`, `app/android/`.
- Kontrakty istniejących modułów: ich `moduly/*/README.md`.
- Dokumentacja bieżących podsystemów: `docs/*_HANDOFF.md`, bez automatycznego usuwania przy tworzeniu nowych dokumentów.
- Harmonogramy: zaimportowane zlecenia Vantify, nie wyliczenia z pamięci.
- Wymagania z projektu Claude, zatwierdzone rozmowy i istniejące formularze są nadal obowiązujące. Jeśli nie są dostępne w repozytorium, zgłoś brak źródła i nie twórz fikcyjnej kompletności.

## Matryca wymaganie → dowód

- PROD-010/012 → `app/tests/vantify-plan.test.cjs`, testy kalendarza + weryfikacja danych źródłowych.
- PROD-020/021/022 → `app/tests/zdjecia.test.cjs` + testy rzeczywistych fotografii na urządzeniu.
- PROD-023/024 → `app/tests/raport-ui-check.cjs`, `raport-rozmiar-ui-check.cjs`, `flush.test.cjs`, wizualna/tekstowa zgodność PDF/DOCX.
- PROD-025/026 → `app/tests/wysylka-adresaci.test.cjs` + test integracyjny kolejki i potwierdzona wysyłka.
- PROD-015 → test end-to-end Back i PL/EN (docelowy; nie twierdzić, że już istnieje).
- ARCH/REUSE/UX/DATA/QG → `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, `docs/QUALITY.md`.

**Zmiany produktu realizuj tylko na wyraźne zlecenie użytkownika.**