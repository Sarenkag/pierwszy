# Model tekstowy na telefonie (`moduly/model`)

Mały model językowy w apce (Gemma 4 **E2B** domyślnie, **E4B** do wyboru w Ustawieniach → AI) przez LiteRT-LM. Plik modelu (2,6 / 3,7 GB) pobierany **raz, tylko przez Wi‑Fi**; potem działa offline. To nie jest Gemini Nano ani chmura.

Funkcje:
- `OESTModel.polish(notatka, polskiOryginał, kontekst?)` → 1–2 dobrze zbudowane zdania po angielsku; `kontekst` (np. nazwa inspekcji) tylko do doboru słownictwa (08/11/2026).
- `OESTModel.combine([notatki], polskiOryginał?, kontekst?)` → jeden spójny akapit (nie zlepek zdań).
- `OESTModel.missingNumbers(wejście, wynik)` → liczby, których brakuje w wyniku (ostrzeżenie).

Zasady (prompt `RULES`): bez nowych faktów, przyczyn i zaleceń; liczby, jednostki, kody i nazwy bez zmian. **Wynik to zawsze propozycja** – Grzegorz akceptuje albo poprawia. Polski oryginał i zwykłe tłumaczenie zostają (Cofnij). Bez modelu apka działa jak dotąd.

Android: wtyczka `OESTModel` (`ModelPlugin.kt`): `status/download/remove/generate/unload`. Jedno zadanie naraz, CPU, silnik zwalniany po 3 min bezczynności. Wymaga Androida 12+.

Strona: `<script src="moduly/model/model.js"></script>` (inspekcje: `../moduly/model/model.js`).
