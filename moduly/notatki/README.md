# Notatki głosowe (`moduly/notatki`)

Jeden moduł zapisu, odczytu i poprawiania notatek głosowych (Grzegorz 08/11/2026). Dwa pliki:

- `glos.js` → `OESTVoice`: nagrywanie (Android: wtyczka `HandoverTools`, przeglądarka: `MediaRecorder`), zamiana nagrania na tekst offline (Android 13+, polski pakiet mowy), przycisk „przytrzymaj i mów” z ekranem nagrywania. Wcześniej `app/www/handover-voice.js` – używają go Hand over, Reactive i inspekcje.
- `notatki.js` → `OESTNotatki`: notatki jako lista w telefonie (IndexedDB `oest-notatki`), osobno dla każdego miejsca (`scope`, w inspekcji = klucz szkicu), okienko „📝 Notatki”, poprawianie, łączenie.

## Jak powstaje tekst

1. Nagranie → tekst PL (rozpoznawanie mowy w telefonie, bez internetu).
2. Słowa branżowe PL (`WORDS.pl`): np. „54 stopnie” → „54 °C”, „a o w” → „AOV”, „de be” → „DB”.
3. Tłumaczenie PL → EN (ML Kit `Translate`), potem słowa branżowe EN (`WORDS.en`): „insulator” → „isolator”, „faucet” → „tap”, „elevator” → „lift”.
4. Gdy model jest pobrany (`moduly/model`): model układa zdanie, z nazwą inspekcji jako kontekstem słownictwa (bez dopisywania faktów).
5. Liczby z oryginału, których brakuje w EN → notatka oznaczona „⚠ sprawdź liczby” (ostrzeżenie, nie blokada).

Nic nie trafia do raportu samo: „✨ Połącz notatki w komentarz” daje propozycję, wstawia ją dopiero „✓ Wstaw do komentarza”.

## API

- `OESTNotatki.bind(przycisk, { scope(), ctx(), onSaved(note), onError(err) })` – przycisk nagrywania; może być kilka ekranów, nagranie trafia do tego, którego przyciskiem zaczęto.
- `OESTNotatki.mount(pudełko, { scope(), ctx(), title(), join, ok, onJoin(tekst), onSaved, onError })` – gotowy pasek „🎤 Nagraj notatkę · 📝 Notatki N · ✨ Połącz…” (Reactive, Hand over); licznik odświeża się sam, pasek ukryty bez `scope()`.
- `OESTNotatki.offer(scope, { ctx, ok })` → tekst albo `null` – okienko z propozycją do poprawienia i ostrzeżeniem o liczbach; `propose(scope, ctx)` → `{ text, miss }` (to samo bez okienka, inspekcja).
- `OESTNotatki.busy()` – trwa nagrywanie (ekran nie powinien się wtedy zamykać).
- `OESTNotatki.media(scope)` → nagrania notatek jako dowody `{ id, kind:'audio', blob, … }` (Hand over zapisuje je przy wpisie).
- `OESTNotatki.open(scope, { title })` – okienko: lista (godzina, miejsce, długość, EN + PL oryginał, stan), ▶ odsłuchanie, ✎ Popraw (zakładki PL/EN, „✨ Ułóż z polskiego”, ostrzeżenie o liczbach), 🗑 (drugie stuknięcie usuwa).
- `OESTNotatki.summary(scope)` → `{ all, ready, busy }`; `combine(scope, ctx)` → tekst; `list/put/remove/clear(scope)/move(z, do)`; `on(fn)` – zmiana notatek.
- `OESTNotatki.fix(tekst, 'pl'|'en')`, `missing(pl, en)`, `state(note)` – czyste funkcje (testy: `app/tests/notatki.test.cjs`).

## Użycie

- Inspekcje (`inspekcje/index.html`): pole „Notatka” – „🎤 Nagraj notatkę”, „📝 Notatki N”, „✨ Połącz notatki w komentarz”. Notatki należą do szkicu inspekcji: „Wyczyść inspekcję” je usuwa, nowy termin przenosi je do archiwum razem ze szkicem. Test: `app/tests/notatki-ui-check.cjs`.
- Reactive (09/11/2026): pasek pod „Opis / adnotacje”, „✨ Połącz notatki w opis” dopisuje pod opisem; notatki należą do zadania (`rx|<id szkicu>`), „Usuń szkic” je usuwa. Stare nagrania (sprzed zmiany) zostają niżej z „📝 Na tekst”.
- Hand over (09/11/2026): pasek w „Szybki wpis”, „✨ Połącz notatki we wpis” (do pustego pola – zaznacza „po angielsku”); po „Zapisz wpis” nagrania trafiają do wpisu jako dowód (wpis z samym nagraniem też się zapisze), a notatki przechodzą do zapisanego wpisu (`ho|e|<id wpisu>`, stałe też po scaleniu kont) – przy wpisie „📝 Notatki wpisu”, w archiwum tylko odczyt i odsłuch. Test: `app/tests/notatki-app-ui-check.cjs`.

Strona: `<script src="moduly/notatki/glos.js"></script>` i `<script src="moduly/notatki/notatki.js"></script>` (inspekcje: `../moduly/notatki/…`), po `moduly/model` i `moduly/przycisk`.
