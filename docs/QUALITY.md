# OEST — Quality Gate i dowody jakości (v1.0, 06/11/2026)

> **WAŻNE:** ten dokument opisuje kontrakt docelowy. Istniejące CI **nie realizuje jeszcze wszystkich bramek**. Nie opisuj ich jako już aktywnych. Wdrożenie i konfiguracja blokad to osobne zadania.

## Zasady niepodlegające obejściu

- **QG-010 — niezależność:** o dopuszczeniu do merge decydują deterministyczne wyniki testów i ustawienia GitHub, a nie samoocena AI.
- **QG-011 — brak fałszywych sukcesów:** PASS, FAIL, SKIPPED i NOT RUN są rozróżniane; wymagane nieoczekiwane SKIPPED i NOT RUN blokują. Wszystkie wyjątki jawnie raportowane.
- **QG-012 — regresja całego przepływu:** testuj nie tylko dotknięty moduł, ale jego konsumentów i krytyczne scenariusze aplikacji.
- **QG-013 — test po każdym błędzie:** zgłoszony błąd dostaje odtwarzający go test, który przed naprawą nie przechodzi i po naprawie przechodzi, o ile jest automatyzowalny. Jeśli nie, zapisz ręczny przypadek i jego dowód.
- **QG-014 — ochrona kryteriów:** AI nie może usuwać scenariuszy, pomniejszać zbioru inspekcji, zwiększać limitów, aktualizować wzorca screenshotu ani zmieniać reguł CI jedynie po to, by uzyskać PASS. Zmiana testów czy quality baseline wymaga jawnej, niezależnej autoryzacji właściciela.
- **QG-015 — dowód:** do wyniku dołącz SHA kodu, wersje narzędzi, wykonane testy i ich liczność, scenariusze, wynik, czas, screenshoty/artefakty, znane niezweryfikowane obszary.

## Aktualny stan — ustalenia z audytu 06/11/2026

`app/package.json` uruchamia `node --test tests/*.test.cjs`, a `.github/workflows/android.yml` zawiera `npm test`, następnie przeglądarkowe `raport-ui-check.cjs` i `raport-rozmiar-ui-check.cjs`, potem budowę APK. Audyt wykazał **8 testów `*-ui-check.cjs`, z których CI wykonuje 2**. Pozostałe obszary to: `questions`, `settings`, `reactive`, `keys`, `handover`, `powertrace` (zweryfikuj aktualne nazwy plików przy wdrożeniu bramek). `scripts/check-lang.js` działa przy `npm run sync`, a aktualne CI uruchamia `npm run sync` na PR objętych filtrem ścieżek. `.github/workflows/android.yml` (audyt 06/11/2026, L11–13) uruchamia workflow tylko dla zmian w `app/`, `inspekcje/`, `moduly/` lub samym pliku workflow. **PR zmieniający wyłącznie dokumentację, jak #73, nie uruchamia obecnie tych kontroli.** Przed ustawieniem obowiązkowych checków na `main` trzeba objąć dokumentacyjne PR-y osobnym, rzeczywiście uruchamianym workflow lub odpowiednio zmienić filtry i wymagane statusy; inaczej merge może utknąć bez statusu. Sama dokumentacja nie wprowadza tej zmiany. Samo istnienie testu nie oznacza jego wykonania.

**Znane ryzyka wymagające odrębnego zadania naprawczego:**
1. `app/tests/raport-ui-check.cjs` pomija formularze przy niedostępnym przycisku; minimalny próg pięciu nie dowodzi kontroli całego katalogu.
2. ~~`app/tests/vantify-plan.test.cjs` i `app/www/ppm.js` wyliczały daty po ostatnim zleceniu.~~ **Naprawione 08/11/2026:** karta ze zleceniami Vantify po ostatnim zleceniu z importu nie ma terminu („Brak kolejnego zlecenia w Vantify”), `P.close` nic nie zapisuje, kalendarz nie planuje dat; testy w `vantify-plan.test.cjs`. Karty bez zleceń w Vantify (Update + częstotliwość) bez zmian.
3. ~~`moduly/zdjecia/zdjecia.js`: awaria między uploadem a zapisem `driveId` → duplikat lub osierocony plik.~~ **Naprawione 08/11/2026:** plik na Dysku nosi id zdjęcia (`appProperties.oestPhoto`), przed wysyłką znacznik `upTry`; ponowna próba najpierw szuka pliku po id zdjęcia; zdjęcie usunięte w trakcie wysyłki – plik zdejmowany z Dysku. Testy w `zdjecia.test.cjs`.
4. Zmiany PL/EN, Android Back i wszystkie drogi wejścia do ekranu wymagają testów end-to-end.
5. Obecny workflow ma uprawnienie `contents: write` dla całego joba; przyszły podział build/release i ochrona bramek wymagają osobnej decyzji i konfiguracji.
6. Testy webowe nie dowodzą zachowania natywnych pluginów na Pixelu 8 Pro.

## Docelowe bramki

| Gate | Kontrola | Narzędzie / kryterium |
|---|---|---|
| G0 | syntax, podstawowe testy, PL/EN | istniejące `npm test`; `scripts/check-lang.js` działa przy `npm run sync` w CI dla PR pasujących do filtrów ścieżek; PR wyłącznie dokumentacyjny obecnie pomija cały workflow; lint w razie wdrożenia |
| G1 | architektura i kontrakty | walidator zależności skryptów, jawne API i jego konsumenci, wykrywanie nowych cykli/duplikacji |
| G2 | przepływy E2E | wszystkie obowiązkowe testy UI, liczność sprawdzonych scenariuszy, brak cichych skip |
| G3 | raporty i dane | otwieralność Word/PDF, tożsamość treści, zdjęcia, limity, reopen, offline, sync/retry |
| G4 | design/regresja | PL/EN bez skoków, Back, statusy, screenshoty i interakcje |
| G5 | wydajność i bezpieczeństwo | uzgodnione budżety po pomiarze bazowym, podatności, sekrety, duże zasoby |
| G6 | Android i release | Gradle, APK, podpis, uprawnienia, artefakt, testy natywne/device, zasady wydania |

**Nie zaliczaj gate, jeśli nie ma narzędzia, konfiguracji, uruchomienia lub dowodu.**

## Przypadki wymagane funkcjonalnie

- **QG-020 — raporty:** dla każdego obsługiwanego typu inspekcji przetestuj wymagane pola, generację dwóch plików Word i PDF z właściwego szablonu, realną zawartość, zdjęcia z podpisami, dane dat i rozmiar. Błędy, SKIP lub tylko „plik istnieje” nie spełniają wymogu.
- **QG-021 — rozmiar:** obowiązuje kontrakt limitu raportu <1 MB z wymaganym ostrzeżeniem użytkownika przed wygenerowaniem, gdy realnie spodziewany jest większy plik. Testuj najgorsze realistyczne konfiguracje, nie tylko stałe kompresji.
- **QG-022 — integralność:** utwórz rekord + zdjęcia, zapisz, zamknij, uruchom ponownie, odczytaj i porównaj; osobno zdalnie zweryfikuj, jeśli twierdzisz, że dane trafiły do centrum.
- **QG-023 — zakłócenia:** testuj zerwanie Wi-Fi, wygaśnięcie OAuth, zmianę konta, awarię pomiędzy uploadem i zapisem `driveId`, ponowienie e-mail i brak podwójnej wysyłki.
- **QG-024 — UX:** testy zmian PL/EN, modal, back na każdej ścieżce, stany przycisków, zachowanie długich formularzy, brak losowych zmian zatwierdzonej geometrii.
- **QG-025 — terminy:** każde zadanie Vantify ma oryginalny numer i datę z importu; aplikacja **nie wylicza żadnego następnego terminu**, także po ostatniej pozycji. Zakończenie zadania nie zmienia terminów pozostałych. Test obecnie aprobuje niezgodne zachowanie i musi być naprawiony w osobnym zadaniu.
- **QG-026 — API modułów:** moduł REUSABLE musi przejść autonomiczne testy kontraktu i użycia poza OEST, niezależnie od testów integracyjnych nowego konsumenta.

## Lista znanych odstępstw (baseline)

Zastany kod może mieć liczne naruszenia. Można zatwierdzić rejestr `quality/baselines/` z konkretną regułą, lokalizacją, uzasadnieniem i właścicielem naprawy. Walidatory blokują nowe niezatwierdzone naruszenia. Baseline **może tylko maleć automatycznie**; zwiększenie, reset lub wymiana istniejących wyjątków wymaga wyraźnej zgody właściciela, diffu przyczyn i weryfikacji rzeczywistego regresu. Nie dopuszczaj wyjątków ukrywających utratę danych, wyciek sekretów lub pominięcie krytycznego testu.

## CI, merge, uprawnienia

- **REL-010:** docelowo automatyczny merge wyłącznie w zakresie zleconego zadania i po technicznie egzekwowanym przejściu wymaganych testów; bez samowolnego rozszerzania zakresu. **Do czasu ochrony `main` wymuszającej co najmniej G0–G2 każdy merge wymaga wyraźnej zgody właściciela dla konkretnego PR.** Dotyczy to również dokumentacyjnego PR #73.
- **REL-011:** status checks mają być wymagane w ustawieniach gałęzi, nie tylko opisane w markdown.
- **REL-012:** zmiany `app/tests/`, `.github/workflows/`, `quality/` i dokumentów kontraktowych nie mogą osłabiać bramek bez jawnej zgody. `CODEOWNERS` sam w sobie nie zapewnia kontroli bez odpowiednich ustawień ochrony gałęzi i uprawnień.
- **REL-013:** minimalne uprawnienia GitHub Actions; możliwość publikowania APK odizolować od build/test.
- **REL-014:** jeśli PR zmieni kod po wykonaniu testów, testy muszą dotyczyć nowego SHA. Release musi pochodzić z tego samego zaakceptowanego kodu.

## Definicja zakończenia

W raporcie podaj osobno: Implemented, Automated Tested, Native/Device Verified, Approved, Released. Zadanie nie jest ukończone, jeśli brakuje obowiązkowego dowodu, nawet gdy PR scalono. Dalsze niezwiązane ulepszenia przedstaw tylko jako propozycje.
