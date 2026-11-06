# Zasady pracy nad apką OEST

Stałe zasady dla każdego, kto pracuje nad tym repo (Claude, Codex, ChatGPT). Bieżący stan prac i PR-ów nie należy tutaj – sprawdzaj go na GitHubie.

Apka do inspekcji technicznych w budynkach One Eastside (Tower A, Tower B, Pavilion), firma Smart Managed Solutions. Właściciel: Grzegorz (GitHub: Sarenkag). Telefon testowy: Pixel 8 Pro.

## 1. Jak pracujemy z Grzegorzem

- Rozmowa po polsku. Raporty inspekcji po angielsku.
- Na co dzień obowiązują obecne formularze firmy. Nie wychodzimy przed szereg.
- Najpierw omawiamy pomysł. Nic nie idzie do wdrożenia, dopóki Grzegorz sam tego nie potwierdzi.
- Robimy dokładnie to, o co prosi, bez dodatków. Jak coś jest niepewne – dopytać, nie zgadywać.
- Zanim zbudujesz coś nowego, sprawdź, czy to już istnieje w repo. Myśl o całości, nie zasłaniaj się procedurami.
- Nie proponuj ręcznej roboty jako obejścia naszego błędu.
- Każdą poprawkę sprawdź na JEGO realnym scenariuszu (wersja, kroki, stan danych), zanim powiesz „gotowe”. Pokaż test w repo (plik + commit), zrzuty i liczby.
- Odpowiadamy i raportujemy w czacie projektu, tam gdzie pisze Grzegorz. Nie każemy mu skakać po wątkach.

## 2. Git, PR i scalanie

- **Nie scalać niczego do `main` bez wyraźnego „tak” Grzegorza** dla tego konkretnego PR. Zielony build i czysty przegląd to za mało.
- Aktualizacja w apce widzi tylko wydania z `main`. Grzegorz woli scalić niż testować ZIP z PR – dlatego zgoda na scalenie jest obowiązkowa.
- Grzegorzowi wysyłamy tylko link do apki.
- Stan PR (otwarty, scalony, kiedy) **zawsze sprawdzaj na GitHubie**, nigdy nie przepisuj z pamięci ani z notatek.

## 3. Moduły

- Każda funkcja (połączenie Google/Dysk/Gmail, aparat, przycisk, wysyłka, status) ma JEDEN moduł, używany wszędzie tak samo. Moduły są w `moduly/`.
- Moduły mają być gotowe i stabilne. Zasady modułu zapisujemy jako testy automatyczne, które blokują build.
- Jedno sprawdzanie połączenia Google dla całej apki.
- Nie twórz duplikatów – najpierw szukaj istniejącego modułu.

## 4. Testy i build

- Zielony build **nie może pomijać żadnej inspekcji**. Jeśli test nie może sprawdzić inspekcji (np. brak przycisku wysyłki), to ma być błąd, a nie pominięcie.
- Testy: `cd app && npm test` (`app/tests/*.test.cjs`) oraz sprawdzenia UI `app/tests/*-ui-check.cjs`.
- `npm run copy-web` uruchamia `app/scripts/check-lang.js` – tekst bez pary EN zatrzymuje budowę.

## 5. Układ i ekrany

- Każdy ekran po polsku (domyślnie) i po angielsku. Każdy widoczny tekst ma parę PL+EN.
- Zmiana języka lub stanu niczego nie przerysowuje i nie drga.
- Żadnych kodów błędów na ekranie – zrozumiały komunikat.
- Układ kafelków stały; miejsce na zmienne treści zarezerwowane z góry.
- Przyciski w grupie mają identyczną wielkość i stałe pozycje.
- Pasek statusu: cienki, na dole, mini-lampki.
- „Wstecz” wraca dokładnie tam, skąd użytkownik przyszedł.

## 6. Wysyłka i „Zakończ” (TWARDE)

- Każdy przycisk wysyłki/połączenia najpierw sprawdza połączenie. Nigdy nie udawać wysyłania.
- „Wyślij” tylko wysyła – nic nie kasuje.
- „Zakończ” / „Ready” to TYLKO znacznik („✓ GOTOWA”), zdejmowany jednym dotknięciem.
- Inspekcje nigdy nie znikają.
- ⚙ wysyłki → „Do kogo”: prywatny / firmowy / inżynier / manager, można kilka naraz, domyślnie firmowy. Prywatny adres z profilu („Mój prywatny e-mail”).
- Reactive wysyła tylko na adres firmowy.

## 7. Terminy (TWARDE)

- Terminy = dokładnie daty zleceń z pliku Vantify (`app/www/vantify-plan.js`).
- Apka NIGDY ich nie przelicza ani nie przesuwa – także po ostatnim zleceniu z pliku.
- Licznik pod dniem: zakończone / wszystkie.

## 8. Zdjęcia

- Zdjęcie przy pytaniu/punkcie (np. kran) jest automatycznie tagowane tym punktem; rozmiar Małe 800 px. W raporcie max 12 na stronę, nazwa punktu POD zdjęciem.
- Zdjęcia ogólne: przełącznik Duże 2560 / Średnie 1600 (domyślne) / Małe 800 px; apka pamięta wybór. W raporcie pół strony A4.
- Zdjęcie formularza: 1920 px, cała strona A4.
- Folder zdjęć: max 200 MB, ostrzeżenia od 100 MB (w Ustawieniach), licznik na ekranie głównym.

## 9. Raporty

- Język raportu: angielski. Data w formacie dd/mm/rrrr. Nazwa pliku: `KOD DDMMRRRR`.
- Każdy raport w DWÓCH IDENTYCZNYCH wersjach: Word i PDF – ta sama treść, ten sam układ.
- Zdjęcie ręcznie wypełnionego formularza → ten formularz w Wordzie i PDF. Inspekcja z pytaniami → nasz basic form Smart (logo, tabelki, podpis, pytania, pod nimi zdjęcia w gridzie).
- Nie wymyślać nowych układów. Nowa inspekcja = podpięcie pod istniejący wzór.
- Raport poniżej 1 MB. TYLKO gdy przekroczyłby 1 MB – przed utworzeniem ostrzeżenie „plik będzie miał X MB” i pytanie: oryginały czy zmniejszyć. Test: `app/tests/raport-rozmiar.test.cjs`.
- Datę inspekcji zawsze wybiera Grzegorz (apka może tylko podpowiedzieć).
