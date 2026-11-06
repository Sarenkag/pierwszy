# Claude — OEST (v1.0, 06/11/2026)

Ten plik jest **punktem wejścia**, nie konkurencyjną kopią zasad. Claude musi stosować `AGENTS.md` i dokumenty `docs/` zgodnie z zakresem zadania.

1. **Najpierw odczytaj `AGENTS.md`** — szczególnie AI-001 do AI-008, ARCH-001 do ARCH-003, UX-001/002, DATA-001/002, QG-001/002, REL-001.
2. **Architektura:** `docs/ARCHITECTURE.md` — przed utworzeniem funkcji sprawdź istniejący moduł oraz wszystkich konsumentów. Zachowaj OEST i twórz przenośne moduły bez duplikacji.
3. **UI:** `docs/DESIGN-SYSTEM.md` — żadnego samowolnego przeprojektowania, zmiany ikon lub rozkładu. Zachowaj płynność i naturalność.
4. **Testy:** `docs/QUALITY.md` — nie pomijaj regresji, nie obniżaj progów, nie nazywaj niewykonanych testów sukcesem. CI nie zastępuje testu na Pixelu 8 Pro.
5. **Specyfikacja:** `docs/PRODUCT.md` oraz istniejące formularze, **pełna pamięć projektu Claude i Claude Doc**, historia zatwierdzonych ustaleń i dokumenty źródłowe. Odczytaj je przed realizacją zadania, o ile są dostępne, i wykrywaj niespójności. Inni agenci mogą nie widzieć pamięci Claude, dlatego obowiązujące twarde wymagania muszą znaleźć się w repo. Nie zastępuj specyfikacji skrótem.
6. **Autonomia przy ścisłym zakresie:** samodzielne implementacja/testy/PR/merge/release **tylko w zakresie zadania właściciela** i po wymaganych bramkach. „Omówmy” nie oznacza „wdrażaj”.
7. **Raportuj po polsku**: co zmieniono, pliki i PR, wykonane testy, rezultaty, ograniczenia i potrzebne decyzje. Raporty aplikacji firmowe pozostają po angielsku.

### Charakterystyka bieżącego projektu

- Repo: `Sarenkag/pierwszy`, aplikacja OEST dla One Eastside (Tower A, Tower B, Pavilion), Smart Managed Solutions.
- UI: `app/www`; formularze: `inspekcje/`; moduły wspólne: `moduly/`; Android/Capacitor: `app/android`; testy: `app/tests`.
- Główne urządzenie referencyjne: Pixel 8 Pro. Grafik 4 on / 4 off i jego data odniesienia są **edytowalnymi danymi profilu użytkownika**, nie stałymi w kodzie; dotychczasowa podpowiedź 08:00–20:00 nie jest sztywnym wymuszeniem.
- Zasady dotyczące wysyłki, zdjęć, terminów Vantify, Word/PDF, historii i statusów opisuje `docs/PRODUCT.md`.
- Rzeczywisty stan repozytorium może się zmieniać. **Zawsze sprawdź kod i testy przed deklaracją gotowości.**

**Tryb A:** omawianie nie pozwala nawet na edycję plików na gałęzi. **Automatyczny merge:** wstrzymany do czasu technicznego wymuszenia G0–G2, chyba że właściciel wyraźnie zaakceptuje dany PR. 

**Nie próbuj „ulepszać” produktu poza zleceniem.** Wskazuj sugestie oddzielnie; wykonuj dopiero po poleceniu.