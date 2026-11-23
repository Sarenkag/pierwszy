# Przepis: przeniesienie ekranu na Ionic + Vue

Wzór: `src/ekrany/Ustawienia.vue` (ekran `settings`). Reszta apki idzie JEDNYM PR-em (Grzegorz 23/11/2026): najpierw wspólne części, potem moduły tylko się do nich podpinają. Bramka G1 (reguła IONIC) pilnuje wszystkiego poniżej.

1. **Dane i reguły zostają w module ekranu** (np. `app/www/keys.js`). Moduł wystawia funkcję z danymi, np. `OESTKeys.dane()`, która zwraca zwykły obiekt. Ekran Vue niczego nie liczy.
2. **Utwórz `src/ekrany/<Nazwa>.vue`.** W `<template>` używasz tylko komponentów Ionic (`ion-list`, `ion-item`, `ion-label`, `ion-button`, `ion-input`, `ion-select`, `ion-toggle`, `ion-card`, `ion-grid`, `ion-note`…) oraz `div`/`span`/`p`/`h1–h6`/`img`.
   - Nie wolno: własnych `button`/`input`/`a`/`ul`/`dialog`, `style=`, `<style>` ani klas spoza `ion-*`.
   - Teksty zawsze jako `T('polski', 'English')`.
   - Przejście: `data-nav="<id z ekrany.json>"`. Strzałka i Wstecz telefonu są w ramie.
   - **Pola formularza – jeden sposób w całej apce** (Grzegorz 21/11: „4 listy, każda inna”): każde pole w `ion-item`; wybór z listy = `ion-select` (bez dodatkowego przycisku „Wybierz z listy”); data/godzina = `ion-datetime-button` + `ion-datetime` w `ion-modal`; tekst = `ion-input`/`ion-textarea`; tak/nie = `ion-toggle`. Bez `ion-radio-group`, `ion-segment`, pigułek ani własnych rozwijanych list. Bramka to sprawdza.
   - Nazwy (tytuły, kafelki) krótkie – test PL/EN sprawdza, że w obu językach mieszczą się w zarezerwowanym miejscu.
   - Okienka: `alertController`, `modalController` i `actionSheetController` z `@ionic/vue`.
3. **Dopisz ekran do `src/ekrany/index.js`** (`EKRANY_VUE`) pod tym samym `id` co w `moduly/ekrany/ekrany.json`.
4. **Usuń stary kod ekranu:**
   - sekcję/HTML ekranu i jego `.top`;
   - rysowanie w module (innerHTML);
   - starą obsługę strzałki (`case 'back'`);
   - CSS ekranu.
   
   Niezapisane zmiany: `OESTEkrany.straz('<id>', () => modul.canLeave())`.
5. **Usuń wpis `IONIC|ekran|<id>` z `quality/baselines/ionic.json`.** Licznik „Poza Ionic/Vue” spada o 1.
6. **Sprawdź:**
   - `cd app && npm run copy-web`;
   - `node quality/check-architecture.cjs` (G1 PASS);
   - testy ekranu w `app/tests`;
   - zrzut 448×998 z paskiem stanu.

Coś, czego Ionic nie ma (własny element, klasa, reguła CSS): **stop – pytanie do Grzegorza**. Wpis do `quality/wyjatki-ionic.json` trafia tylko z id jego pisemnego „tak”.

## Wspólne części (`src/czesci`) – zawsze ich używaj, nie rysuj drugi raz

Apka = kilka modułów, które łączą się przez te części (Grzegorz 23/11/2026: „framework jest, kolejny ekran to dołożenie przycisku”).
Moduł ekranu (`app/www/*.js`) daje zwykłe dane; część je pokazuje. Brakuje zmiennej w części → dopisz ją w części (jedno miejsce dla wszystkich ekranów), nie obok.

| Część | Zastępuje stary moduł | Dane |
|---|---|---|
| `Klocek.vue` | `moduly/klocek` (`OESTKlocek.html`, `.inspekcja`) | `{ id, nazwa, znak, czestotliwosc, formularz, status:{tryb}|{tekst,ton}, opis, termin:{tekst,ton}, procent, ikony:[{rodzaj,n,ton}], miniatura, przygaszony, akcja }`; zdarzenia `wybierz`, `przytrzymaj` |
| `Pigulka.vue` | `OESTZnacznik.status` | `tryb` = zalegla/nierozpoczeta/wtrakcie/wstrzymana/gotowa/odzyskana albo `tekst` + `ton` 0–4 |
| `Kafelki.vue` | `moduly/kafelek` | `[{ id, trasa, ikona, tytul, podpis, licznik }]`; bez `trasa` → zdarzenie `wybierz` |
| `PasekDni.vue` | `moduly/pasek-dni` (HTML) | `[{ k, nazwa, numer, pogoda, licznik, dzis, minal, praca, wybrany }]`; zdarzenie `dzien` |
| `Akcja.vue` | `OESTPrzycisk.start/run` | `<Akcja :T="T" :fn="async etap => …" busy="Wysyłam">Wyślij</Akcja>` |
| `Lampka.vue` | `OESTZnacznik.lampka` | `stan` on/mid/off/na + `tekst` |
| `Polaczenie.vue` | – | połączenie z Google (`rodzaj`) |
| `Okno.vue` | `OESTPrzycisk.ask({ node })` | przez `OESTOkna.okno(...)`; `wyglad: '<nazwa>'` = małe okienko na środku z dwoma równymi przyciskami (wspólne moduły) |
| `Notatki.vue` | `OESTNotatki.mount` (pasek notatek) | `<Notatki :T="T" :opcje="{ scope: () => klucz, ctx: () => miejsce, title: () => tytuł, join: 'Połącz notatki w opis', ok: 'Wstaw', icons: true, onJoin: tekst => …, onSaved: n => …, onError: e => … }" />` |
| `Aparat.vue`, `EdytorZdjec.vue` | podgląd i edytor `moduly/aparat` | same z modułu: `OESTAparat.take(opts)` / `edit(blob, opts)` / `available()` – ekran nic nie montuje |
| `NotatkiOkno.vue`, `NotatkiPropozycja.vue`, `NotatkaNowa.vue`, `Nagrywanie.vue` | okienka `moduly/notatki` | same z modułu: `OESTNotatki.open/offer/write`, przytrzymanie przycisku nagrywania (`OESTVoice`) |
| `OdczytArkusz.vue` | arkusz `moduly/odczyt` | sam z modułu: `OESTOdczyt.pick(blob, { targets })` |
| `Ladowanie.vue` | `OESTLadowanie.inline` | `OESTLadowanie.show(t)/hide()` = ion-loading, `inline(el, t)` = ion-spinner + tekst, `ring()` = `<ion-spinner>` |

Wspólne moduły (aparat, notatki, ładowanie, odczyt) trzymają logikę i dane w „kontrolerze”: `{ dane() → zwykły obiekt, na(fn) → wyłącz, akcja(nazwa, …), zamknij() }`; część Vue tylko go pokazuje (`src/czesci/kontroler.js`: `uzyjKontrolera(k)`). Szkielet daje im `window.OESTCzesci`: `pokaz(nazwa, kontroler)` (ion-modal na cały ekran), `okno(nazwa, kontroler, o)` (`OESTOkna.okno` z częścią), `montuj(el, nazwa, wl)` (część w elemencie starego ekranu), `plotno(w, h)` (płótno w pamięci), `sluchacze(dane)` (`{ na, emit }`), `ladowanie`. Wygląd „Szkło i poświata” tych części: tylko zmienne Ionic w `src/szkielet.css`, kluczem atrybuty `data-oest-czesc` / `data-oest-okno` / `data-nt-*` (bez własnych klas); kolory przycisków `duch` (ciemny z ramką) i `poswiata` (gradient) jako kolory Ionic (`color="duch"`).

Okienka (ze szkieletu, `window.OESTOkna`): `pytaj({ tytul, tresc, ok, anuluj, niebezpieczne, tylkoOk })` → `true/false` (ion-alert; zastępuje `OESTPytaj`, `OESTKomunikat`, `OESTPrzycisk.confirm/alert/ask`), `okno({ tytul, komponent, wlasciwosci, ok, anuluj, bezPrzyciskow })` → `{ ok, dane }` (ion-modal z treścią Vue), `wybor({ tytul, opcje })` (ion-action-sheet).
Akcje paska ekranu: `OESTRama.ustaw({ akcje: [{ ikona, etykieta, fn | nav }] })` – ikony tylko z `ionicons/icons`.
Ikony: tylko Ionicons (`import { … } from 'ionicons/icons'`), bez własnych SVG i emoji w interfejsie.
Na koniec stary moduł (`moduly/<x>`) znika razem z ostatnim użytkownikiem; wpis `IONIC|modul-ui|<x>` z `quality/baselines/ionic.json` też.
