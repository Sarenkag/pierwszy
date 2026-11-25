# Model tekstowy na telefonie (`moduly/model`)

Mały model językowy w apce (Gemma 4 **E4B** domyślnie, **E2B** do wyboru w Ustawieniach → AI) przez LiteRT-LM. To nie jest Gemini Nano ani chmura.

**Jeden plik na telefonie (Grzegorz 25/11/2026):** apka czyta model z folderu **Modele** w pamięci telefonu (`/sdcard/Modele/gemma-4-E4B-it.litertlm`), na miejscu, bez kopiowania. Wymaga zgody Androida „Dostęp do wszystkich plików” (przycisk „Zezwól” w Ustawienia → AI). Gdy pliku tam nie ma, apka może go pobrać raz, tylko przez Wi‑Fi, do swojego katalogu (2,6 / 3,7 GB). Pliku z folderu Modele apka nie usuwa. Edge Gallery robi własne kopie modeli, więc nie dzieli z nią pliku.

Funkcje:
- `OESTModel.polish(notatka, polskiOryginał, kontekst?)` → 1–2 dobrze zbudowane zdania po angielsku; `kontekst` (np. nazwa inspekcji) tylko do doboru słownictwa (08/11/2026).
- `OESTModel.combine([notatki], polskiOryginał?, kontekst?)` → jeden spójny akapit (nie zlepek zdań).
- `OESTModel.translate(tekst, kontekst?)` → wierne tłumaczenie PL → EN w tej samej formie (krótkie pola do Vantify: miejsce, nazwa, części).
- `OESTModel.summary(notatka, kontekst?)` → krótka nazwa zlecenia (Summary w Vantify), gdy nie ma nazwy ani wyborów kreatora.
- `OESTModel.missingNumbers(wejście, wynik)` → liczby, których brakuje w wyniku (ostrzeżenie).

Zasady (jeden stały prompt `RULES` dla wszystkich zadań, podgląd w Ustawienia → AI): bez nowych faktów, przyczyn i zaleceń; liczby, jednostki, kody i nazwy bez zmian. **Wynik to zawsze propozycja** – Grzegorz akceptuje albo poprawia. Polski oryginał i zwykłe tłumaczenie zostają (Cofnij). Bez modelu apka działa jak dotąd.

Android: wtyczka `OESTModel` (`ModelPlugin.kt`): `status/download/remove/allowFiles/generate/unload`. Jedno zadanie naraz, CPU, silnik zwalniany po 3 min bezczynności. Wymaga Androida 12+.

Strona: `<script src="moduly/model/model.js"></script>` (inspekcje: `../moduly/model/model.js`).
