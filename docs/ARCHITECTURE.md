# OEST — architektura i przenośne moduły (v1.0, 06/11/2026)

## Zakres i stan rzeczywisty

**ARCH-010:** OEST jest jedną aplikacją: mobilną przez Capacitor/Android, z UI HTML/CSS/JavaScript, formularzami `inspekcje/`, modułami współdzielonymi `moduly/`, logiką `app/www/` i testami `app/tests/`. Nie twórz osobnych niepowiązanych produktów do obsługi tego samego przepływu.

**ARCH-011:** istniejąca architektura z globalnymi interfejsami `window.OEST…` i skryptami ładowanymi w ustalonej kolejności jest stanem zastanym, nie wzorcem dla każdej nowej funkcji. Nie przeprowadzaj masowej migracji do frameworka, bundlera, TypeScript czy ES modules bez uzgodnienia, planu regresji i dowodu korzyści.

**ARCH-012:** `inspekcje/index.html` zawiera rozbudowaną logikę formularzy i raportów. Wydzielaj odpowiedzialności stopniowo dopiero po pokryciu istniejących ścieżek testami zachowania, Word/PDF i trwałości danych. Nie wydzielaj na podstawie samego rozmiaru pliku.

## Rejestr istniejących obszarów

| Obszar | Implementacje obecne w repo | Odpowiedzialność |
|---|---|---|
| UI i nawigacja | `app/www/index.html`, `home.js`, `theme.css`, `settings-ui.js` | widoki, routing, prezentacja |
| PPM i Vantify | `app/www/ppm.js`, `vantify-plan.js` | lista, harmonogram i importowane zlecenia |
| Reactive/Handover | `reactive*.js`, `handover*.js` | usterki, przekazanie zmiany, stan |
| Calendar | `calendar-*.js` | grafik, zdarzenia, synchronizacja |
| Inspekcje i raporty | `inspekcje/index.html`, `tpl-*.js`, `app/www/templates/` | formularze i DOCX/PDF |
| Aparat | `moduly/aparat`, pluginy Android | przechwytywanie i edycja |
| Magazyn zdjęć | `moduly/zdjecia` | pojedynczy magazyn, referencje, synchronizacja |
| Wysyłka | `moduly/wysylka`, `settings-google.js` | Gmail, kolejka, stan |
| UI współdzielone | `moduly/przycisk`, `checkbox`, `kafelek`, `klocek`, `naglowek`, `znacznik`, `pasek-dni`, `przelacznik`, `pole-email`, `ladowanie`, `wyglad` | współdzielone kontrolki |
| Wstecz telefonu | `moduly/wstecz` | systemowy Wstecz: okienko → poziom wyżej → pytanie o wyjście (08/11/2026) |
| Notatki głosowe | `moduly/notatki` (`glos.js` = OESTVoice, `notatki.js` = OESTNotatki) | nagrywanie, tekst PL→EN, okienko notatek; inspekcje (08/11/2026), Hand over i Reactive – nagrywanie |
| Zmiana treści bez drgań | `moduly/podmien`, `moduly/bledy` (`applyDom`, `wJezyku`) | podmiana HTML bez przerysowania, miejsce pod PL i EN (08/11/2026) |
| Teksty ekranów | `app/teksty/<ekran>.json` → `app/scripts/teksty.js` (budowa, walidacja) → `app/www/teksty.js`; odczyt `moduly/bledy` (`tx`, `zaladujTeksty`, globalnie `OESTTx`) | teksty PL/EN w plikach danych zamiast w kodzie; pilot: ekran główny (09/11/2026), test `app/tests/teksty.test.cjs` |
| Raporty PDF | `moduly/czcionka-pdf`, `moduly/word-pdf` | czcionka DejaVu dla jsPDF; PDF rysowany z wypełnionego formularza Word (Word = PDF, 08/11/2026) |
| Pozostałe | `moduly/wiedza`, `model`, `odczyt`, `bledy` | wiedza, AI/OCR, błędy i tłumaczenia |

### Status integracji i przenośności (stan audytowy, nie certyfikat)

| Moduł | Integracja | Przenośność / uwagi |
|---|---|---|
| `moduly/wiedza` | IMPLEMENTED, bez potwierdzonego użycia w aplikacji | INTERNAL / kandydat REUSABLE |
| `moduly/odczyt` | IMPLEMENTED, bez potwierdzonego użycia w aplikacji | INTERNAL / kandydat REUSABLE |
| `moduly/naglowek` | IMPLEMENTED, bez potwierdzonego użycia w aplikacji | INTERNAL; zamierzony komponent |
| `moduly/wysylka` | INTEGRATED | INTERNAL; zależy m.in. od `OEST_PPM.markSent` oraz danych inspekcji |
| pozostałe moduły | stan ustalany z analizy kodu i testów | INTERNAL, dopóki nie zaliczą REUSE-004 |

Ten rejestr nie oznacza, że wszystkie moduły są już używane, poprawnie izolowane lub certyfikowane. Statusy aktualizuje się na podstawie kodu/testów, nie intuicji. Żaden przygotowany moduł nie jest usuwany wyłącznie dlatego, że nie ma jeszcze konsumenta.

## Granice odpowiedzialności

- **ARCH-020:** pojedynczy właściciel kontraktu dla aparatu, zdjęć, wysyłki, statusów, stylów, raportów i każdego współdzielonego elementu. Nie duplikuj funkcji między ekranami.
- **ARCH-021:** moduły komunikują się przez jawne API z określonym wejściem, wyjściem, błędami i cyklem życia; unikać bezpośrednich odwołań do szczegółów DOM innych ekranów, ich `localStorage` lub funkcji prywatnych.
- **ARCH-022:** mapuj zależności i skrypty startowe; nie zmieniaj kolejności `<script>` bez analizy i testu. Docelowo deterministyczny walidator porównuje deklarowane zależności z faktycznym ładowaniem.
- **ARCH-023:** stan ma jednego właściciela. Stan UI, sesja i dane trwałe to inne kategorie. Zmiana języka czy nawigacji nie może zerować danych ani bez uzasadnienia odtwarzać wszystkich widoków.
- **ARCH-024:** naprawiaj przyczynę w module odpowiedzialnym i uruchamiaj regresję na wszystkich jego konsumentach. Nie dodawaj „drugiego aparatu”, „drugiej kolejki”, „drugiego magazynu zdjęć” ani „drugiego komponentu statusu”.
- **ARCH-025:** przygotowany moduł niewykorzystywany na tym etapie to nie martwy kod. Rozróżniaj PLANNED / IMPLEMENTED / INTEGRATED / VERIFIED. Usuwanie wyłącznie po poleceniu właściciela.
- **ARCH-026:** zmiany architektoniczne są ewolucyjne; najpierw porównanie zachowania i testy, potem mała zmiana, potem regresja i porównanie artefaktów.

## Przenośność między aplikacjami

- **REUSE-001:** docelowy podział: (A) ogólne biblioteki UI/usług, (B) konfigurowalne moduły biznesowe, (C) adaptery oraz procesy typowe wyłącznie dla OEST.
- **REUSE-002:** nowy moduł ogólnego przeznaczenia nie może wymagać nazw budynków, kodów PPM, `OEST_PPM`, określonych odbiorców e-mail ani stałych kluczy `oest.*`. Eliminuj także ukryte zależności: `OESTT` z `moduly/bledy`, nazwy natywnych wtyczek Android (`OESTKeys.capture`), oraz bezpośrednią zależność od IndexedDB `inspekcje` używanej przez `wysylka`. Wstrzykuj konfigurację/adaptory zamiast zaszytych zależności. To zasada nowych modułów i kryterium przyszłej migracji, nie zgoda na bieżącą refaktoryzację istniejących.
- **REUSE-003:** istniejące moduły OEST mogą pozostać INTERNAL do czasu bezpiecznej izolacji. Nie udawaj, że są REUSABLE tylko dlatego, że znajdują się w `moduly/`.
- **REUSE-004:** moduł można oznaczyć REUSABLE po niezależnym teście kontraktowym, dokumentacji API, znanych zależnościach, udokumentowanym sposobie obsługi błędów oraz działającym teście integracji poza OEST. Integrowany projekt nadal testuje własne scenariusze.
- **REUSE-005:** osobne wersje i paczki publikacyjne wdrażaj, gdy drugi konsument rzeczywiście tego wymaga; wcześniej dokumentuj zmiany API i zgodność konsumentów w repo.
- **REUSE-006:** przenośność nie może kosztem stabilności OEST wymuszać przebudowy działających ekranów. Preferuj małe, mierzalne ekstrakcje z kompatybilnym API.

## Trwałość i dane

- **DATA-010:** określ dla każdego typu obiektu identyfikator, właściciela, magazyn lokalny, opcjonalne źródło centralne, schemat, relacje i zasady konfliktów.
- **DATA-011:** zapis lokalny (IndexedDB potwierdził commit), oczekiwanie na sync, sync w toku, potwierdzony upload, ewentualny odczyt zdalny i błąd muszą być rozróżnialne. Wskaźnik w UI pokazuje prawdziwy etap.
- **DATA-012:** po restarcie aplikacji dane i zdjęcia mają być ponownie odczytywalne; zachowaj statusy inspekcji, formularze, identyfikatory zdjęć i relacje do pytań.
- **DATA-013:** synchronizacja musi tolerować powtórzenia, zmianę konta, utratę Wi-Fi, przerwanie między uploadem a lokalnym zapisem identyfikatora i konflikt. Nie podwajaj plików ani nie ukrywaj niejednoznaczności.
- **DATA-014:** usuwanie lokalnych/zdalnych zdjęć wymaga sprawdzenia aktywnych referencji, pomyślnej weryfikacji dostępności i obowiązujących limitów. Operacja „Wyślij” nie oznacza polecenia „Usuń”.
- **DATA-015:** migracje schematów zachowują istniejące rekordy; wymagany test migracji i odtworzenia po restarcie.
- **DATA-016:** tokeny, hasła i sekrety poza repo; rozdziel dane użytkowników i uprawnienia do Google. Nie loguj danych wrażliwych.

## Integracja i audyt

Mapa zależności ma pochodzić z kodu (w tym DOM, globalnych API i importów), a nie tylko z deklaracji AI. Wizualne narzędzia mogą wyświetlać mapę, ale nie stanowią źródła prawdy. **ARCH-027:** każdy moduł ma mieć własny `README.md` zawierający: kontrakt publiczny, zależności, stan użycia, testy, kompatybilność, ograniczenia.

**Rzeczy do zweryfikowania, nie potwierdzone jako naprawione:** (Android Back i przejścia do inspekcji: `moduly/wstecz`, test `wstecz-ui-check`, 08/11/2026 – do sprawdzenia na Pixelu) brak README w `moduly/bledy` i `moduly/zdjecia`, zależności łańcuchów skryptów, wykorzystanie modułów `wiedza`/`odczyt`/`naglowek`, przerwanie uploadu `zdjecia.js` po utworzeniu pliku zdalnego i przed utrwaleniem `driveId`, rozdzielenie UI od formularzy w monolicie. Zmiany tych obszarów wymagają osobnego zlecenia.
