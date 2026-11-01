# Moduł aparatu (`moduly/aparat`)

**Zasada:** każde miejsce w apkach OEST, które robi zdjęcie, korzysta z tego modułu. Nie piszemy własnego aparatu ani edytora.

Przebieg: aparat systemowy → podgląd **✓ OK / ✏️ Edytuj / ↺ Powtórz** → gotowe zdjęcie. „Edytuj” otwiera edytor z telefonu (Markup, a gdy go nie ma Google Zdjęcia) i wraca do podglądu.

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
