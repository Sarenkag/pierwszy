# Model tekstowy na telefonie (`moduly/model`)

Mały model językowy w apce (Gemma 4 **E4B** domyślnie, **E2B** do wyboru w Ustawieniach → AI) przez LiteRT-LM. To nie jest Gemini Nano ani chmura.

**Jeden plik na telefonie (Grzegorz 25/11/2026):** apka czyta model z folderu **Modele** w pamięci telefonu (`/sdcard/Modele/gemma-4-E4B-it.litertlm`), na miejscu, bez kopiowania. Wymaga zgody Androida „Dostęp do wszystkich plików” (przycisk „Zezwól” w Ustawienia → AI). Gdy pliku tam nie ma, apka może go pobrać raz, tylko przez Wi‑Fi, do swojego katalogu (2,6 / 3,7 GB). Pliku z folderu Modele apka nie usuwa. Edge Gallery robi własne kopie modeli, więc nie dzieli z nią pliku.

Funkcje:
- `OESTModel.agent(id, tekst albo [notatki], { context?, reference? })` → tekst do jednego pola. **Agent na każde pole (Grzegorz 26/11/2026):** wspólne zasady `COMMON` + własna instrukcja z `OESTModel.AGENTS` + słownik pojęć. Agenci:
  - `summary` – Summary w Vantify: krótki tytuł, maks. 10 słów, bez kropki;
  - `description` – Description w Vantify: co jest nie tak / co zrobić, 1–3 zdania;
  - `opis` – Job Sheet, opis pracy: wszystkie notatki (pisane i głosowe) w JEDEN tekst; punktory „- ” przy kilku czynnościach;
  - `czesci` – Części: lista bez zmian w ilościach i kodach; punktory przy kilku;
  - `uwaga` – Uwaga w inspekcji: 1–2 zdania albo jeden akapit z kilku notatek;
  - `rekomendacja` – tylko zalecenia, które poda inżynier; punktory przy kilku.
  Agent pracuje **tylko na oryginale Grzegorza** podanym w wywołaniu – nigdy na wyniku innego agenta ani swoim wcześniejszym. `context` (np. nazwa inspekcji) tylko do doboru słownictwa; `reference` – polski oryginał pomocniczo.
- `OESTModel.translate(tekst, kontekst?)` → wierne tłumaczenie PL → EN w tej samej formie (krótkie pola, np. pomieszczenie); nie jest agentem pola.
- `OESTModel.missingNumbers(wejście, wynik)` → liczby, których brakuje w wyniku (ostrzeżenie).

Zasady (`COMMON` + instrukcja agenta, podgląd w Ustawienia → AI; doklejany jest **słownik pojęć** z Ustawienia → AI – `ai.glossary` w OESTSettings: termin PL, tłumaczenie EN, znaczenie; dopisuje go Grzegorz): bez nowych faktów, przyczyn i opinii; liczby, jednostki, kody i nazwy bez zmian. Słownik to polecenie dla modelu, nie mechaniczna podmiana; ML Kit (gdy modelu brak) go nie zna. **Wynik to zawsze propozycja** – Grzegorz akceptuje albo poprawia. Bez modelu apka działa jak dotąd.

Android: wtyczka `OESTModel` (`ModelPlugin.kt`): `status/download/remove/allowFiles/generate/unload`. Jedno zadanie naraz, CPU, silnik zwalniany po 3 min bezczynności. Wymaga Androida 12+.

Strona: `<script src="moduly/model/model.js"></script>` (inspekcje: `../moduly/model/model.js`).
