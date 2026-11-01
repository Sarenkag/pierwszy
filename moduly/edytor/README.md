# Moduł edycji zdjęć (`moduly/edytor`)

Nie piszemy własnego edytora. Moduł otwiera **gotowy edytor z telefonu** (Markup / Google Zdjęcia), a poprawione zdjęcie wraca do apki.

## Podłączenie
1. Android: `PhotoEditPlugin.java` (wtyczka `OESTPhotoEdit`) zarejestrowana w `MainActivity`, w manifeście `<queries>` dla `android.intent.action.EDIT` + pakiety `com.google.android.markup`, `com.google.android.apps.photos`. FileProvider z `cache-path`.
2. Strona: `<script src="moduly/edytor/edytor.js"></script>`.
3. Kod: `OESTEdytor.edit(blob).then(nowy => { if (nowy) podmień(nowy); })`.

## Pułapki
- Edytor może zwrócić nowy plik (`data.getData()`) albo nadpisać nasz (`EXTRA_OUTPUT`) – wtyczka obsługuje oba; brak zmian → `null`.
- Pliki robocze leżą tylko w `cache/photo-edit` i są kasowane po powrocie.
- PNG/WebP są zamieniane na JPEG przed edycją.
