# OEST — design system i jakość interakcji (v1.0, 06/11/2026)

## Założenie

**UX-010:** OEST ma być dopracowaną, ciemną aplikacją mobilną dla inżyniera pracującego w terenie: piękną, czytelną, naturalną, responsywną i płynną. Animacja ma wyjaśniać zmianę stanu, nie opóźniać pracy. **Nie zmieniaj zatwierdzonego stylu przy okazji poprawki technicznej.**

**UX-011 — źródło wyglądu:** zatwierdzony front aplikacji jest wzorcem. Istniejące implementacje obejmują `moduly/wyglad/wyglad.css`, `moduly/wyglad/wyglad.js`, `app/www/theme.css` i istniejące komponenty. Wzorzec należy dodatkowo utrwalać zatwierdzonymi zrzutami ekranów PL/EN; dokument nie zastępuje rzeczywistych tokenów. Nie wprowadzaj nowej biblioteki ikon lub gradientów bez polecenia.

## Geometria, treść, stabilność

- **UX-020:** współdzielone przyciski, kafelki, pola, modal, statusy i nagłówek korzystają z istniejących tokenów i komponentów. Jeden wzorzec elementu we wszystkich ekranach; nie twórz wizualnego odpowiednika tego samego komponentu lokalnie.
- **UX-021:** każdy tap daje natychmiastowy feedback: lekkie wciśnięcie, stan ładowania/nieaktywny/wynik. Nie pokazuj zielonego potwierdzenia, gdy operacja pozostaje w kolejce albo niezweryfikowana.
- **UX-022:** rezerwuj w komponentach miejsce na zmienny tekst i licznik; nie przesuwaj sąsiednich kart podczas aktualizacji statusu, zmiany PL/EN albo ładowania. Nie obcinaj ważnej treści tylko po to, by utrzymać stały rozmiar.
- **UX-023:** modal i pop-up są nakładkami, nie przebudową układu. Otwieranie/zamykanie płynne, tap poza zamyka tam, gdzie to bezpieczne; operacje destrukcyjne wymagają jasnego potwierdzenia.
- **UX-024:** Android Back przywraca ekran faktycznego wejścia, kontekst/scroll i niezapisane dane; nie zawsze ekran główny. Testuj ścieżki wejścia z kalendarza, PPM, ustawień i historii.
- **UX-025:** oba języki PL/EN mają odpowiadające sobie etykiety, bez migotania i resetowania bieżącego formularza. Data dla użytkownika DD/MM/YYYY, przy zachowaniu formatu danych ISO wewnętrznie, gdy jest używany.
- **UX-026:** kolor nie jest jedynym wskaźnikiem statusu: zastosuj ikonę i tekst; zachowaj kontrast, czytelność w warunkach technicznych, odpowiedni obszar dotyku i powiększenie tekstu.
- **UX-028:** przyciski w jednej grupie mają tę samą geometrię i stałe pozycje, także przy zmianie PL/EN i liczników; nie mogą drgać, skakać ani zmieniać rozmiaru po aktualizacji danych. Dłuższe tłumaczenie obsługuj świadomym układem, nie przypadkowym przesunięciem.
- **UX-029:** komunikaty błędów są zrozumiałe dla użytkownika po polsku lub angielsku zgodnie z wybranym językiem. Nie pokazuj surowych kodów wyjątków/HTTP; kod diagnostyczny może trafić do logu, a wspólną obsługę prezentacji prowadzi `moduly/bledy`.
- **UX-027:** respektuj ograniczenie animacji (`prefers-reduced-motion`) i utrzymuj fokus, stan klawiatury i przewijanie podczas zmian widoku.

## Zatwierdzone zachowania OEST

- Nagłówek: **One Eastside** bez „Tower”; pod nim data i pogoda, przełącznik języka, powiadomienia, czytelne wskaźniki Wi-Fi i Google Drive.
- Pogoda: kliknięcie otwiera 7-dniowy pop-up, który nie przesuwa strony i zamyka się przewidywalnie.
- Kalendarz: pasek dni zgodny z zatwierdzonym widokiem (w audycie wskazany wariant 14-dniowy, PR #56 — do potwierdzenia na bieżącym UI), dzień bieżący ma być wyraźnie zaznaczony; nie wymuszaj nowego wyśrodkowania przed porównaniem z zatwierdzonym frontem. Grafik 4 on/4 off pochodzi z edytowalnego profilu: dni pracy wyróżnione tym samym fioletowym gradientem co w kalendarzu miesiąca, dni wolne nieprzygaszone (przygaszony tylko dzień miniony) — decyzja Grzegorza 07/11/2026; małe ikony pogody, licznik zrobione/wszystkie. Ekran główny i lista Inspekcji używają jednego modułu `moduly/pasek-dni`.
- Główne kafelki: wyśrodkowane, oszczędny tekst, te same ikony i gradienty co zatwierdzony ekran; lekka reakcja wciśnięcia.
- Kafelek inspekcji: nazwa, status, etap, grupa, miejsce, termin/dni do końca, znacznik wykonania, opcjonalnie procent bez paska postępu. Zmienia wygląd naturalnie wraz z realnym stanem.
- Ekran szczegółów: bez paska postępu; procent jako tekst; stałe ikony bez ramek: formularz, obraz, checkbox; zielone kółko OK i czerwone kółko X; stała geometria dla 1/99, 01/99 i liczb zdjęć.
- „Zakończ/Ready”: jedno tapnięcie zmienia stan, nigdy nie ukrywa inspekcji. „Wyślij” jest wyłącznie operacją wysyłki.
- Pasek stanu: wąski na dole, czytelne statusy sieci, synchronizacji, kolejki; komunikat błędu ma działanie ponowienia, nie ukryty kod.
- Zasady językowe: **treść zdań firmowego raportu jest po angielsku w obu wersjach interfejsu**; źródłowa baza pytań pozostaje po polsku, jeśli tak ustalono dla danego zestawu; folder na Google Drive zachowuje nazwę `OEST Zdjęcia`. Nie tłumacz nazw technicznych lub obowiązujących szablonów automatycznie.
- Google OAuth: zminimalizuj ponawiane pop-upy logowania; korzystaj z istniejącego mechanizmu odświeżenia tokenu (`GoogleTokenPlugin`) bez angażowania użytkownika, jeśli uprawnienia pozostają ważne; błędy autoryzacji pokazuj jawnie, nie symuluj powodzenia.
- Znana rozbieżność do osobnego zadania: `app/www/index.html` może nadal wyświetlać `One East Side Tower` na ekranie startowym mimo zatwierdzonego `One Eastside`; obecny PR nie zmienia implementacji.

## Animacje i wydajność

- **UX-030:** preferuj `transform` i `opacity` do płynnych mikrointerakcji, unikaj kosztownych zmian rozmiaru/układu w pętli animacji i nie blokuj głównego wątku ciężkimi operacjami.
- **UX-031:** czasy 60–120 ms dla feedbacku dotyku, 150–250 ms dla zmiany stanu i 180–300 ms dla nakładek są *punktem startowym do testów*, a nie bezwzględnym wymaganiem. Sprawdź na Pixel 8 Pro oraz przy ograniczeniu animacji.
- **UX-032:** duże listy, formularze z wieloma zdjęciami, kompresja i generowanie Word/PDF nie powinny zamrażać UI; mierzyć rzeczywisty response time, long tasks, spadki FPS, pamięć i czas do interakcji.
- **UX-033:** test porównawczy screenshotów: główny ekran, PPM, inspekcja, Reactive, kalendarz, ustawienia, PL i EN, w stanach normalnych, loading, error i success. Aktualizacja wzorców wymaga akceptacji, nie automatycznego nadpisania.
- **UX-034:** gdy funkcja modyfikuje współdzielone kontrolki, wizualna regresja obejmuje wszystkie miejsca ich wykorzystania, nie tylko aktualny ekran.

## Kontrakt każdego komponentu

Każdy współdzielony komponent określa: dane wejściowe, aktywne stany, dozwolone interakcje, zachowanie bez danych i w błędzie, animacje, klawiaturę/fokus, obsługę PL/EN i minimalne przypadki testowe. Stany typowe: IDLE / PRESSED / LOADING / SUCCESS / ERROR / DISABLED. Dla zdjęć: EMPTY / CAPTURING / PREVIEW / EDITING / SAVED_LOCAL / SYNCING / SYNCED / ERROR. Dla inspekcji odróżniaj gotowość, wysłanie i pełne zakończenie.

## Walidacja

Automatyczne testy porównują pozycje i rozmiary elementów przy przełączaniu PL/EN, przewijanie, Back, modal, stany i screenshoty. Skrypt statyczny zgłasza nowe twardo wpisane kolory i nieuzasadnione animacje, z zatwierdzoną listą wyjątków. Nie traktuj samych screenshotów jako dowodu jakości animacji ani samego FPS jako dowodu intuicyjności.

**Ten dokument nie autoryzuje samowolnego przeprojektowania.** Zmiany wzorca wizualnego są osobnym zleceniem właściciela.
