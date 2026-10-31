# Pytania — niezależna baza i API

Gałąź `codex/pytania` od `codex/power-trace`; roboczy PR do main, bez scalania. Porównanie tylko tego zadania: `codex/power-trace...codex/pytania`. Nie zmieniono `ppm.js`, `inspekcje/`, CI, podpisu ani sekretów. Formularze nadal działają po staremu, dopóki Claude ich nie podłączy. Nie wykonywano wysyłek.

## Obsługa

Ustawienia → **Pytania**. Zakładka **Baza pytań** zawiera działy/poddziały, zmianę kolejności działów, pytania trzech typów, zdania EN, chipy powodów, tagi, źródło/status, duplikowanie i usuwanie z liczbą inspekcji używających pytania. Pusty dział można usunąć; wcześniej trzeba przenieść jego pytania i poddziały. Wyszukiwanie obejmuje tekst, tagi i źródło, a filtr wybiera dział. Pokazujemy do 200 pytań naraz — dalej należy doprecyzować filtr.

Nowe i duplikowane pytanie jest propozycją. Zmiana tekstu nie zmienia ID. Zmiana pass↔scale wymaga jawnego podania nowych zdań; nie tłumaczymy ani nie wymyślamy ich. Zmiana typu czyści niezgodne domyślne odpowiedzi i nadpisania w konfiguracjach. Globalne nazwy A/B/C/D/NA można edytować, kody poziomów pozostają stałe.

**Inspekcje**: wybierz zadanie z katalogu PPM, rozwiń działy, zaznacz zatwierdzone pytania i ustaw odpowiedzi, gwiazdki, opcjonalne nadpisania zdań oraz metadane raportu. Strzałki zmieniają kolejność w dziale; kolejność działów jest wspólna. Kopiowanie przenosi pytania/ustawienia/gwiazdki, zachowując tytuł i wzór pliku docelowej inspekcji. Po zmianach naciśnij Zapisz. Propozycje nie są automatycznie wybierane, także po zatwierdzeniu i mimo suggestedFor. tempTB/024 jest wyłącznie informacją „formularz wg wzoru firmy”.

Przy pierwszym użyciu danego konta importujemy cztery wbudowane formularze jako zatwierdzone pytania i wybory ich inspekcji. **27 dostarczonych pozycji** dodajemy jednorazowo jako nieprzypisane propozycje ze źródłem „Import JSON” (załącznik nie określał autora). Oryginały pozostają nietknięte. Przywróć wbudowane odtwarza wybór/metadane i brakujące oryginalne pytania; **nie cofa wspólnych edycji treści**, które mogłyby wpływać na inne inspekcje. Ten zakres jest podany w potwierdzeniu przycisku.

Pomiar ma jednostkę/progi i wzór zawierający `{value}`, opcjonalnie `{unit}` i `{label}`. Etykietę EN można wpisać osobno. Nigdy nie przechowujemy wartości ani domyślnego wyniku pomiaru. Progi wymagają zdania o przekroczeniu. Puste pola progów wyboru oznaczają dziedziczenie z pytania; nie zerują jego progów. Podgląd tekstowy pokazuje `[MEASUREMENT REQUIRED]`, a przykład złego wyniku jest wyraźnie oznaczony EXAMPLE ONLY. To nie jest raport wykonanej inspekcji ani generator docx/PDF.

## Podłączenie dla Claude’a

Skrypty/API są już w głównej powłoce. Inny dokument inspekcji musi załadować `settings-store.js`, `ppm.js`, `questions-proposals.js`, `questions-core.js`, `questions-store.js`, `questions-api.js` z właściwymi ścieżkami i tej samej lokalnej domeny. `settings-store.js`/`ppm.js` nie trzeba ładować drugi raz, jeżeli już są obecne. Nie dodawać ponownego seedowania ani zapisu pytań w samym formularzu.

```js
await window.OESTQuestions.ready; // obsłuż błąd pamięci; nie udawaj pustej bazy
const custom = window.OESTQuestions.formFor(task.id); // synchroniczny snapshot
// null: brak własnych zatwierdzonych pytań; użyj istniejącej ścieżki wbudowanej.
const unsubscribe = window.OESTQuestions.onChange(revision => {
  // odśwież przyszły formularz/konfigurację; nie nadpisuj rozpoczętej inspekcji
});
// unsubscribe() przy usunięciu obserwatora
```

`version` = wersja schematu 1; `revision` = licznik udanych zmian. `ready` to Promise, `reload()` odświeża snapshot, `get()` zwraca kopię całego stanu. Przed gotowością `formFor` zwraca null i rozpoczyna ładowanie, dlatego konsument **musi najpierw await ready**. Błąd IndexedDB nie powinien stać się cichym „brak konfiguracji”. Powiadomienia BroadcastChannel odświeżają inne otwarte dokumenty bez odpytywania w tle. Konto jest sprawdzane po asynchronicznych operacjach; nowemu kontu nie udostępniamy poprzedniego cache.

Wynik zawiera `title`, `scope`, wyrenderowany `fileName` bez rozszerzenia, `sections`, `scaleLabels`, `checks`. Każdy check: `key` = globalne ID pytania, `legacyKey` dla wbudowanych, `section`, `label`, `type`, `pinned`, `reasons`, właściwe zdania EN. Pass: `default` = ok/fail/na/null; scale: A/B/C/D/NA/null, `levels` to zdania raportu, `scaleLabels` to nazwy przycisków. Measure: `template`, `threshold`, `reportLabel`, `unit`, opcjonalne min/max, **bez default/value**. Wartość pomiaru wprowadzaj od nowa w instancji inspekcji; nie kopiuj z backlogu. Jednostka/progi to konfiguracja, nie wynik.

Renderuj `pinned` w pierwszej sekcji „Ulubione”, a pozostałe pytania tylko raz we właściwych działach. Nie zmieniaj `key`, nie używaj tablicowego indeksu jako ID. Oryginalne AOV/Plant mają kolidujące `access`: w bazie to `builtin-aov-access` i `builtin-plant-access`, a `legacyKey` dla obu pozostaje access, zgodnie z decyzją Grzegorza. Migrację starych odpowiedzi, jeśli potrzebna, rozróżniaj przez zadanie/formularz + legacyKey. Test zgodności porównuje legacyKey oraz oryginalne ok/fail, ponieważ globalne ID celowo są nowe. **Nie twórz drugiego edytora ani bazy i nie modyfikuj tej gałęzi równolegle.**

Rozpoczęta/zakończona inspekcja powinna zachować snapshot pytań, zdań i konfiguracji. Późniejsza edycja bazy nie może zmienić istniejącego raportu. To podłączenie, snapshot odpowiedzi i generowanie dokumentów należą do Claude’a; tutaj nie są implementowane.

## Import propozycji i kopie

Przykład gotowy do przekazania Gemini: `app/www/questions-proposals.json` (27 pozycji). Minimalny format:

```json
{"format":"oest.questions.proposal","version":1,"source":"Gemini – propozycja","items":[{"section":"Fire doors","question":"Stan uszczelek","type":"pass","ok":"Seals are intact.","fail":"Seals are damaged.","reasons":[{"label":"Damaged seal","text":"The seal is torn."}],"suggestedFor":["EFA-INS-003"]}]}
```

Scale: zamiast ok/fail użyj `levels:{"A":"...","B":"...","C":"...","D":"..."}`. Measure: `unit`, `template` z `{value}`, opcjonalne min/max, `threshold` i `reportLabel`; żadnego default/value. Tagi: fire/water/elec/mech. suggestedFor może zawierać niewystępujące kody — to przechowana wskazówka, nigdy automatyczne mapowanie lub przypisanie. Teksty EN są autorstwa użytkownika/importu; aplikacja nie sprawdza języka ani fachowej poprawności zdań.

Plik lub wklejony JSON najpierw wyświetla podgląd. Podobieństwo wykrywamy w tym samym dziale po normalizacji tekstu i nakładaniu słów (≥85%); nie jest to porównywanie znaczenia ani tłumaczenie. Podobne/identyczne pozycje są oznaczone i odznaczone. Można świadomie zaznaczyć duplikat, lecz nigdy nie dodajemy go po cichu. Każdy zaimportowany wpis ma status propozycja i nowe trwałe ID.

Cała baza: `oest.questions` v1, osobna IndexedDB `oest-questions`, per konto. Eksport przez wspólny `OESTKeys.saveJSONFile` ma nazwę OEST-Questions. Kopia obejmuje działy, pytania/powody, nazwy skali, statusy i wybory. Import tego samego konta waliduje całość przed transakcją; domyślnie scala ID, pozostawiając istniejące definicje/wybory. Jawne „Zastąp całą bazę” z dodatkowym potwierdzeniem służy pełnemu odtworzeniu, także po automatycznym seedzie na nowym urządzeniu. Limit pliku edytora 20 MiB. Nie ma uploadu, e-maili ani AI w tle.

## Weryfikacja

Node: seed i zgodność zdań/legacyKey, rozdzielenie access, stałe ID po edycji, domyślne per inspekcja, blokada propozycji, duplikaty, skala, pomiary bez wartości, cykle działów, backup/replace, izolacja i błąd zapisu. Przeglądarka: kafelek Settings, dział i pytania każdego typu, powód, wybór/default/gwiazdka, kopiowanie, readonly 024, podgląd, import/zatwierdzenie/duplikat, backup/reload i onChange.

Na Pixelu sprawdź tryb samolotowy, restart, wybór pliku oraz systemowy eksport/anulowanie, zmianę konta i brak miejsca. Po podłączeniu przez Claude’a sprawdź realną inspekcję pass/scale/measure, Ulubione, backlog bez kopiowania pomiarów i niezmienność wcześniej rozpoczętych raportów. Natywny picker nie został tutaj sprawdzony na telefonie.
