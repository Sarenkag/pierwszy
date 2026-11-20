# ZASADY architektury apki OEST

Wersja 1.0, 19/11/2026. Zatwierdził Grzegorz 19/11/2026 („Dobra wdrażaj”) razem z planem naprawy architektury (52 ustalenia + 24 duplikaty).

**Po co.** Zmiana w jednym miejscu nie może psuć innego. Dlatego najpierw jest budowa apki (granice ekranów, jeden właściciel każdej rzeczy, jedno źródło danych), a testy tylko potwierdzają, że tak jest. Testy mają łapać nawet drobną pomyłkę (literówka, przecinek, brak elementu). Nigdy ich nie luzujemy.

Ten plik obowiązuje razem z `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md` i `docs/QUALITY.md`. Przy sprzeczności decyduje właściciel (AI-004).

## Zasady

| # | Zasada | Właściciel |
|---|---|---|
| R1 | Każdy ekran jest zapisany **raz** w `moduly/ekrany/ekrany.json`: id, rodzic, adres, pudełko `#v-id`, przedrostek stylów. Apka i testy czytają ten sam plik. `up` jest zarezerwowane i nie może być nazwą ekranu. | `moduly/ekrany` (nowy) |
| R2 | Historia przeglądarki **nie jest** stanem nawigacji. Nawigacja zmienia adres tylko przez `replaceState`, więc długość historii się nie zmienia. Nie ma obsługi `popstate`. Ekran woła `OESTEkrany.go(id)` albo `.up()`. Przy starcie nawigacja przechwytuje `pushState`/`replaceState`, a każde wywołanie spoza niej rzuca błąd. | `moduly/ekrany` |
| R3 | Wstecz (klawisz i gest Androida, tylko przez `backButton` → `OESTWstecz`) najpierw zamyka okienko na wierzchu, potem idzie do rodzica z `ekrany.json`, a na ekranie głównym pyta „Wyjść? Tak/Nie”. Nigdy nie szuka przycisku po klasie stylu i nie używa historii. Strzałka ma stały znacznik `data-nav="up"`. | `moduly/wstecz` |
| R4 | Okienko otwiera się tylko przez `OESTOkna.open()`, w jednej warstwie, a lista okienek jest w pamięci (bez wpisów historii). Zmiana ekranu zamyka wszystkie okienka. Przy starcie moduł przechwytuje `window.open`, `alert`, `confirm` i `showModal` i podmienia je na wersje, które rzucają błąd, więc obejście w kodzie nie zadziała. | `moduly/okna` (z przycisk + wstecz) |
| R5 | „Zamknij” zamyka **swoje** okienko, a nie to, które jest na wierzchu. | `moduly/okna` |
| R6 | Życie ekranu idzie przez `ctx`: nasłuchy przez `ctx.on()` są usuwane przy wyjściu, a praca w tle sprawdza `ctx.alive`, zanim coś narysuje. | `moduly/ekrany` |
| R7 | Ekran pisze tylko w swoim pudełku, a w okienka tylko przez R4. | każdy ekran |
| R8 | Każda dana ma jednego właściciela: język `lang()`/`setLang()` w `moduly/bledy` (już istnieje, tylko udostępniony), konto `OESTKonto`, ustawienia `OESTSettings`. Nikt inny nie czyta ani nie zapisuje `oest.*`. | jeden plik na klucz |
| R9 | Każda baza w telefonie (IndexedDB) ma jeden plik, który ją otwiera. Bez nowego modułu: jedyna podwójna dziś to kolejka raportów (D4). | plik-właściciel bazy |
| R10 | Ekran nie sięga do globali ani magazynów innego ekranu. Wspólne rzeczy są w `moduly/`. | check-architecture |
| R11 | Style ekranu są w jego pliku, każdy selektor z przedrostkiem ekranu, kolejność przez `@layer`. Nie ma nowych `!important`. theme.css trzyma tylko kolory i rozmiary. | theme / pliki ekranów |
| R12 | Nagłówek, strzałka, kafelek, wiersz listy, pigułka statusu, checkbox i przycisk pochodzą tylko z `moduly/`. | naglowek, kafelek, klocek, znacznik, checkbox, przycisk |
| R13 | Stałe napisy mają `data-pl`/`data-en` i zmiana języka tylko podmienia tekst (tak działa dziś `bledy.js`). `OESTT(pl, en)` tylko dla napisów chwilowych. Miejsce jest zarezerwowane na oba języki, więc nic się nie przerysowuje. | `moduly/bledy` |
| R14 | Wspólne narzędzia (`esc`, `pad`, data dd/mm/rrrr, bezpieczny link) istnieją raz. | `moduly/narzedzia` (nowy) |
| R15 | Jedna droga na zadanie: zdjęcia `OESTZdjecia.prepare`, odczyt `OESTOdczyt`, raport `moduly/word-pdf` (jeden wzór basic), wysyłka, kolejka i pasek `OESTSender`. | te moduły |
| R16 | Logowanie Google, tokeny i zakresy obsługuje tylko `OESTGoogle`. | settings-google.js |
| R17 | Żaden sekret nie trafia do JavaScriptu. Mostki Androida sprawdzają, kto woła. Zakresy Google są na sztywno w Javie. | wtyczki Androida |
| R18 | Żadnych skryptów wpisanych w HTML. Każda strona ma blokadę obcych skryptów (CSP). | każda strona |
| R19 | Moduły przyjmują tekst albo gotowe elementy, nigdy surowy HTML. | `moduly/*` |
| R20 | Każdy plik i każdy ekran ma wejście, inaczej jest usuwany. | check-architecture |
| R21 | Każda zasada ma strażnika, który sprawdza **dokładnie**: id rodzica, liczbę elementów, selektor, tekst PL/EN i położenie w px. | `quality/` |
| R22 | Bez nowych bibliotek. Małe PR-y. Nic nie scala się bez Twojego „tak”. | Grzegorz |
| R23 | Zakazane: luzowanie progu, `skip`/`todo`, dopisywanie wyjątku, żeby przeszło, usuwanie asercji, łapanie błędu testu. Zmiana samego testu tylko osobnym PR za Twoim „tak” i zawsze na równie ostry albo ostrzejszy. **Pilnowanie (decyzja 19/11/2026):** zmieniony test nie może mieć mniej sprawdzeń niż na main – `check-ratchet` daje FAIL (PR #157); do tego blokuje usunięcie testu, luzowanie progów i nowe wyjątki. Test i apka mogą zmieniać się w jednym PR. | check-ratchet |
| R24 | Każdy strażnik ma próbkę z celowym błędem (literówka w id, przecinek, brak elementu, zły rodzic). Build pada, jeśli strażnik jej nie złapie. | `quality/tests/gate.test.cjs` |
| R25 | Jedna rzecz = jedno miejsce (sprawdza JM). Jeden sprawdzacz architektury (JM wbudowany w istniejący `check-architecture.cjs`) i jeden format listy naruszeń (istniejące `quality/baselines/*.json`). | `quality/check-architecture.cjs` |
| R26 | Jedno słownictwo znaczników: `data-nav="<ekran>"`, `data-nav="up"`, `data-okno="<okienko>"`, `data-akcja="<nazwa>"`. Stare `data-go`, `data-href`, `data-open`, `data-hnews`, `data-rx`, `data-key-action`, `data-pt-action`, `data-qq` znikają. | `moduly/ekrany` |

## Jak to jest pilnowane (od P0-1)

- **Jeden sprawdzacz:** `quality/check-architecture.cjs` (G1) razem z `quality/zasady.cjs`. Działa na zbudowanej paczce `app/www`, czyli na tym, co trafia do APK.
- **Mapa ekranów:** `moduly/ekrany/ekrany.json` (R1). Sprawdzane:
  - poprawny JSON;
  - każdy ekran raz;
  - rodzic istnieje;
  - z każdego ekranu droga do ekranu głównego, bez pętli;
  - `up` zarezerwowane;
  - każda sekcja `.view` ma wpis i odwrotnie;
  - strzałka ‹ w sekcji prowadzi dokładnie do rodzica.
- **Rejestr „jedna rzecz = jedno miejsce”:** `quality/jedno-miejsce.json` (R25, JM-1 i JM-4). Każda rzecz ma właściciela, a trafienie poza nim to naruszenie. Dodatkowo:
  - klucz `oest.*` i baza w telefonie mają być w jednym pliku;
  - Wstecz Androida rejestruje tylko `moduly/wstecz`.
- **Kopie:** ta sama funkcja (min. 40 tokenów; `function`, strzałkowa z klamrą, metoda obiektu/klasy) w dwóch plikach, z liczbą kopii w „maks” i dwa identyczne pliki (JM-2, JM-3).
- **Znaczniki klikalnych elementów (R26):** każdy przycisk, link i `role=button` ma dokładnie jeden znacznik: `data-nav`, `data-okno` albo `data-akcja`.
- **Zastane naruszenia** są w `quality/baselines/zasady.json`:
  - każdy wpis ma punkt planu i PR, który go usuwa;
  - identyfikator to plik + rzecz (bez nazw funkcji i liczby trafień), a liczba trafień jest w polu „maks”: więcej = FAIL, mniej = trzeba obniżyć „maks” w tym samym PR;
  - lista może tylko maleć (`check-ratchet.cjs`).
- **Strażnik sprawdza sam siebie (R24):** `quality/tests/gate.test.cjs` ma próbki z celowym błędem. Są tam:
  - rodzic „hme”;
  - przecinek w JSON;
  - `window['open']` w apostrofach;
  - druga rejestracja Wstecz i literówka w niej;
  - kopia funkcji;
  - przycisk bez znacznika.

  Jeśli strażnik którejś nie złapie, build pada.

## Czego nie wolno (R23)

- Nie wolno luzować progu, dodawać `skip`/`todo`, dopisywać wyjątku, żeby przeszło, usuwać asercji ani łapać błędu testu.
- Wpis na liście zastanych naruszeń dodaje tylko właściciel, wprost.
- Zmiana testu idzie tylko osobnym PR za „tak” właściciela i zawsze na równie ostry albo ostrzejszy.
