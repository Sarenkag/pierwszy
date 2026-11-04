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
