# Moduł wyglądu (`moduly/wyglad`)

**Zasada (Grzegorz 04/11/2026):** każdy element, który powtarza się na ekranach, ma JEDEN wzór. Poprawka w jednym miejscu zmienia go na wszystkich ekranach.

| Co | Gdzie |
|---|---|
| Skala czcionek (5 stopni), wysokości przycisków, pól, pigułek, zaokrąglenia | `wyglad.css` → `:root` (`--fs-*`, `--h-*`, `--r-*`) |
| Ruch: wejście ekranu (do przodu z prawej, Wstecz z lewej), karty kolejno, lista po filtrze, okienka rosną z miejsca stuknięcia i zamykają się pomniejszeniem, rozwijane sekcje | `wyglad.js` + `wyglad.css` |
| Klocek listy (Inspekcje, Kalendarz, Reactive, grupy DB) | `moduly/klocek` |
| Kafelek (ekran główny, Ustawienia, Reactive, typy inspekcji) | `moduly/kafelek` |
| Nagłówek ekranu (Wstecz, tytuł, ikonki, PL/EN) | `moduly/naglowek` |
| Przełącznik PL/EN (i każdy wybór 2–3 opcji) | `moduly/przelacznik` |
| Kółko ładowania | `moduly/ladowanie` |
| Licznik, lampka, ikonka z liczbą | `moduly/znacznik` |
| Przycisk akcji + okienko „Na pewno?” (`OESTPytaj`, `OESTKomunikat`, `OESTPrzycisk.leave`) | `moduly/przycisk` |

Rozmiary przycisków: główna akcja ekranu 52 px, zwykły 48 px, mały 40 px, ikonka w nagłówku 40×40, pigułka 34 px, pole 48 px.

`wyglad.css` ładuje się jako ostatni arkusz (po `theme.css` i stylach ekranów). „Ogranicz animacje” w Ustawieniach i systemowe „mniej ruchu” wyłączają ruch.

## Tabela ruchu (07/11/2026)

Każda animacja w apce ma **rolę**, a każda rola ma parametry w jednym miejscu: `wyglad.css` → `:root`, zmienne `--ruch-<rola>-<parametr>`. Domyślne wartości = dotychczasowy ruch OEST.

| Rola | Gdzie działa | Parametry |
|---|---|---|
| `przycisk` | naciśnięcie każdego przycisku (`moduly/przycisk`) | `czas`, `easing`, `nacisk` (np. `scale(.97)`) |
| `kafelek` | naciśnięcie kafelka (`moduly/kafelek`) | `czas`, `easing`, `nacisk` |
| `stan` | płynna zmiana koloru/tła/ramki po wybraniu, włączeniu | `czas` |
| `znacznik` | licznik w rogu, ikonki stanu na klocku (`moduly/znacznik`) | `czas`, `easing`, `efekt` |
| `status` | komunikat „Zapisano”, toast | `czas`, `easing`, `efekt` |
| `okno` | okienko na wierzchu, menu ⋮, przyciemnione tło | `czas`, `easing`, `efekt`, `zamkniecie-czas`, `zamkniecie-efekt`, `tlo-czas` (+ `--ruch-menu-czas`) |
| `ekran` | przejście między ekranami | `czas`, `easing`, `efekt`, `przesuniecie` |
| `lista` | karty listy pojawiają się kolejno | `czas`, `easing`, `efekt`, `odstep` |

**Efekt** to nazwa `@keyframes` z biblioteki efektów w `wyglad.css` (`wyIn`, `wyUp`, `wyPop`, `wyOut`, `wyFade`; `oest-n-in` w `moduly/znacznik`).

Jak podmienić animację:
- na stałe: zmień wartość w tabeli `:root` (np. `--ruch-okno-efekt:wyFade`) – działa na wszystkich ekranach;
- nowy efekt: dopisz `@keyframes` do biblioteki efektów i wpisz jego nazwę w tabeli;
- w locie (np. przyszłe ustawienia animacji): `OESTWyglad.ruch.ustaw("okno", "zanikanie")` albo `ustaw("okno", { czas: ".3s", efekt: "wyFade" })`, odczyt `OESTWyglad.ruch.pobierz("okno")`, lista ról i gotowych wariantów `OESTWyglad.ruch.role()` / `.warianty("okno")`, powrót `OESTWyglad.ruch.domyslne()`.

Ograniczenie ruchu: systemowe „mniej ruchu” i „Ogranicz animacje” w Ustawieniach – jedno miejsce w `wyglad.css` (zeruje `nacisk` i `znacznik`, wyłącza animacje ekranu, listy i okien). Zasada: ekrany nie mają własnych liczb animacji; moduł czyta tabelę z wartością zapasową, np. `var(--ruch-stan-czas,.24s)`.

Przebudowa bez zmiany treści (zmiana języka, powrót do apki) nie uruchamia animacji: `wyglad.js` oznacza wtedy wstawione elementy klasą `wy-cisza`, a lista animuje tylko karty, których wcześniej nie było.

Nie przepięte jeszcze na tabelę (osobne zadanie): checkbox (`moduly/checkbox`), pole e-mail, przełącznik PL/EN, kółko ładowania, pasek wysyłki.
