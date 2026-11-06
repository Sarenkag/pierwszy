# OEST — wspólny kontrakt agentów (v1.0, 06/11/2026)

> **Status:** kontrakt projektowy. Dokument nie upoważnia agenta do inicjowania nowych zadań. Dotyczy wszystkich agentów pracujących nad repozytorium, w tym Claude i Codex.
> **Właściciel decyzji produktowych:** użytkownik. **Repozytorium:** Sarenkag/pierwszy. **Gałąź główna:** main.

## A. Kontrakt wykonania

- **AI-001 — Ścisły zakres:** wykonuj wyłącznie zadania wyraźnie zlecone przez właściciela. Nie dodawaj „przy okazji” funkcji, nie zmieniaj formularzy, zachowań, architektury, ikon, animacji, stylu, nazewnictwa ani kryteriów odbioru poza koniecznym i uzgodnionym zakresem. Pomysły przedstaw oddzielnie jako propozycje, bez implementowania.
- **AI-002 — Autonomia wykonawcza:** w granicach zleconego zadania możesz sam analizować kod, implementować, uruchamiać testy, naprawiać regresje, commitować, otwierać PR oraz korzystać z istniejącego uzgodnionego automatycznego merge/release, **wyłącznie po zaliczeniu wymaganych bramek**. Nie wymagaj osobnej akceptacji każdej technicznej czynności. Zgoda na zadanie nie oznacza zgody na rozszerzenie jego zakresu.
- **AI-003 — Dyskusja to nie zlecenie:** jeśli właściciel mówi „omawiamy”, „zwolnij”, „pokaż” lub prosi o projekt, nie zmieniaj repozytorium. Nie traktuj analizy, sugestii lub audytu jako pozwolenia na implementację.
- **AI-004 — Konflikty:** przy sprzecznych wymaganiach, niepewnym źródle danych lub konieczności zmiany zakresu zgłoś konkretny konflikt i uzyskaj rozstrzygnięcie. Nie zgaduj.
- **AI-005 — Prawdomówność:** nie twierdź, że naprawa „działa”, gdy wykonano tylko build, HTTP 200, zapis pliku albo test syntaktyczny. Oddziel: Implemented, Automated Tested, Device Verified, User Approved, Released oraz Not Verified.
- **AI-006 — Wierność projektu:** pracuj w tym samym kontekście zadania; przed pisaniem kodu znajdź istniejący właścicielski moduł i wszystkich konsumentów. Nie twórz równoległej implementacji ani „łaty” omijającej architekturę.
- **AI-007 — Bez samowolnego uproszczenia:** nie skracaj, nie usuwaj i nie redefiniuj zatwierdzonych wymagań, kryteriów, formularzy czy dokumentów. Modyfikacja kontraktu jakości lub automatycznych testów wymaga jawnego wskazania zmiany i zgody właściciela; zielone CI nie usprawiedliwia osłabienia bramki.
- **AI-008 — Język:** rozmowa z właścicielem po polsku; interfejs PL domyślnie + EN; raporty firmowe po angielsku; widoczne daty DD/MM/YYYY; nazwa raportu według obowiązującego wzorca „KOD DDMMRRRR”.

## B. Pierwsze czynności dla każdego zadania

1. Przeczytaj ten kontrakt oraz dokumenty adekwatne do zadania: `docs/ARCHITECTURE.md`, `docs/DESIGN-SYSTEM.md`, `docs/QUALITY.md`, `docs/PRODUCT.md`.
2. Zapisz granice zadania i kryteria akceptacji; ustal rzeczywiste pliki, moduły, zależności i ryzyka regresji.
3. Odszukaj oraz uruchom testy charakterystyczne dla dotkniętych funkcji; przed zmianą zachowaj dowód dotychczasowego zachowania.
4. Zmień minimalny, logicznie spójny obszar. Nie naprawiaj niezwiązanych elementów bez osobnej zgody.
5. Uruchom pełne obowiązkowe bramki i testy regresji wpływu; nieoczekiwane SKIP/NOT RUN to nie PASS.
6. Przedstaw dowody: zmienione pliki, SHA/PR, scenariusz, test, wynik, wyjątki, niezweryfikowane obszary.

## C. Nienaruszalne reguły integracji

- **ARCH-001:** jedna aplikacja, jedna odpowiedzialność systemowa, jeden właściciel kontraktu; implementacje wspólne w `moduly/` wykorzystuj przez udokumentowane API.
- **ARCH-002:** moduł planowany, ale niewykorzystany, nie jest zbędny: stosuj status PLANNED, IMPLEMENTED, INTEGRATED, VERIFIED; nie usuwaj go bez polecenia.
- **ARCH-003:** nowe uniwersalne moduły projektuj bez twardej zależności od OEST, z konfigurowalnymi adapterami; nie odrywaj istniejących modułów od aplikacji kosztem regresji.
- **UX-001:** zachowaj zatwierdzony wizualny język OEST; żadnych nowych ikon, arbitralnych gradientów, nieuzasadnionych przesunięć i zmian geometrii.
- **UX-002:** natychmiastowa reakcja na dotyk, płynne przejścia, brak migotania i skoków; ekran Wstecz wraca do faktycznego miejsca wejścia.
- **DATA-001:** zapis lokalny, oczekiwanie na synchronizację, potwierdzona synchronizacja i zweryfikowany odczyt zdalny to **różne stany**; nie symuluj sukcesu.
- **DATA-002:** nie utracisz danych wskutek zamknięcia, utraty sieci, wznowienia, kolejki wysyłek czy migracji; dowód trwałości wymaga ponownego odczytu.
- **QG-001:** każda poprawiona regresja zyskuje test odtwarzający błąd; testy obejmują konsumentów dotkniętych modułów.
- **QG-002:** test/CI nie może ukrywać nieobsłużonych inspekcji, funkcji, błędów, pominięć ani niepełnych wyników.
- **REL-001:** automatyczny merge dotyczy tylko zleconych zmian, które przejdą niezależny Quality Gate. Reguły repozytorium muszą to egzekwować technicznie; sam ten dokument nie zapewnia ochrony.

## D. Zakres dokumentów

- `docs/ARCHITECTURE.md`: faktyczne moduły, granice odpowiedzialności, dane, offline, przenośność.
- `docs/DESIGN-SYSTEM.md`: źródło wzorca, UX, wygląd, animacje, stany i dostępność.
- `docs/QUALITY.md`: audytowalne bramki, stan istniejących testów i plan ich rozbudowy.
- `docs/PRODUCT.md`: zachowanie funkcjonalne, lokalizacje wymagań, zakazy samowolnych zmian.

Nie uznawaj propozycji oznaczonych „docelowe” za już wdrożone. W razie rozbieżności między dokumentacją a kodem zgłoś rozbieżność i sprawdź wymaganie źródłowe.