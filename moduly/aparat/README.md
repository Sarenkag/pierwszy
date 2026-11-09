# Moduł aparatu (`moduly/aparat`)

**Zasada:** każde miejsce w apkach OEST, które robi zdjęcie, korzysta z tego modułu. Nie piszemy własnego aparatu. Edytor jest własny i wbudowany (decyzja Grzegorza 01/11/2026), bo edytory Google nie otwierają plików z wnętrza apki.

Przebieg: aparat systemowy → podgląd **✓ OK / ✏️ Edytuj / ↺ Powtórz** → gotowe zdjęcie. „Edytuj” otwiera edytor w apce (strzałka, gotowe kółka S/M/L — stuknij, żeby postawić, przeciągnij, żeby przesunąć — kwadrat, linia, 6 kolorów, grubość S/M/L, kadrowanie, cofnij) i wraca do podglądu. Wynik: JPEG w pełnej rozdzielczości, offline, nic nie trafia do Galerii.

## Wygląd edytora (lifting 07/11/2026, zatwierdzony przez Grzegorza)
- Góra: **Anuluj** (sam tekst) · **↶ Cofnij** (szkło z ramką) · **✓ Zapisz** (gradient z poświatą) – wszystkie 44 px, jedno zaokrąglenie.
- Dół: jedna szklana karta, dwa rzędy. Rząd 1: grupy z podpisem **Rysuj** (↗ ／ ▢), **Kółko** (3 rozmiary), **Kadruj**. Rząd 2: 6 kolorów i grubość S/M/L jako kropki w wybranym kolorze.
- Aktywne: przygaszony akcent + cienka ramka + poświata; wybrany kolor – biały pierścień.
- Style w `aparat.js` (`CSS`, `<style id="oest-aparat-css">`), tylko tokeny z `theme.css` i `moduly/wyglad` (z wartościami zapasowymi). Logika rysowania, Cofnij i Zapisz bez zmian.
- Test: `app/tests/edytor-zdjec-ui-check.cjs` (PL/EN, geometria, hierarchia, przepływ Anuluj/Cofnij/Zapisz).

Test zasady: `app/tests/moduly-zasady.test.cjs` (M1 – każde pole „Zrób zdjęcie” w apce idzie przez `OESTAparat.take`, wtyczkę aparatu woła tylko `aparat.js`).

## Użycie
```js
OESTAparat.take().then(blob => { if (blob) dodajZdjecie(blob); });   // zrobienie zdjęcia
OESTAparat.edit(blob).then(nowy => { if (nowy) podmien(nowy); });     // ✏️ przy miniaturce
```
`OESTAparat.available()` = apka Android. W przeglądarce zostaje zwykłe `<input type=file>`.

## Podłączenie
1. Android: wtyczki `OESTKeys` (capture/release: aparat systemowy, plik w katalogu apki) i `OESTPhotoEdit` (`PhotoEditPlugin.java`, ACTION_EDIT) zarejestrowane w `MainActivity`; w manifeście `<queries>`: IMAGE_CAPTURE, EDIT `image/*`, pakiety `com.google.android.markup` i `com.google.android.apps.photos`; FileProvider z `cache-path`.
2. Strona: `<script src="moduly/aparat/aparat.js"></script>`.

## Pułapki
- Ekranu potwierdzenia w aplikacji aparatu nie da się rozszerzyć, dlatego podgląd jest nasz.
- Kolejność edytorów: Google Zdjęcia, potem Markup (Markup wywalał się na pliku z apki, 01/11). Bez `EXTRA_OUTPUT`; edytor zwraca nowy plik (`data.getData()`) albo nadpisuje nasz – wtyczka obsługuje oba, brak zmian → `null`.
- Przed startem edytora usuń duże dane z `call.getData()` (base64): Capacitor zapisuje je w stanie aktywności → TransactionTooLargeException i zamknięcie apki (01/11).
- Pliki robocze leżą w `cache/photo-edit` i są kasowane po powrocie. PNG/WebP są zamieniane na JPEG.

- 01/11 wieczorem: Google Zdjęcia odrzucały plik z FileProvidera („Editing is not supported for this image”), Markup dawał czarny ekran. Dlatego `edit()` używa edytora w apce; wtyczka `OESTPhotoEdit` zostaje w kodzie, ale nie jest wołana.
