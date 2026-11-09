# Moduł przycisku akcji (`moduly/przycisk`)

**Zasada (Grzegorz 02/11/2026):** jeden przycisk akcji z jednym zachowaniem we wszystkich apkach OEST. W każdym miejscu podmieniamy tylko akcję (wyślij, zapisz…).

Zachowanie: naciśnięcie → kręciołek (przycisk lekko wciśnięty, zablokowany) → „✓ Gotowe” przez ~0,9 s → dalej. Przez cały czas przycisk ma swój rozmiar i miejsce sprzed naciśnięcia (09/11/2026): kręciołek ani dłuższy napis etapu go nie powiększają i nie ściskają sąsiada (za długi napis kończy się „…”). Przy błędzie przycisk wraca do zwykłego napisu, a błąd idzie dalej do ekranu. Wygląd przycisku (kolor, kształt) zostaje z ekranu.

Test zasad: `app/tests/moduly-zasady-ui-check.cjs` (blokada w trakcie, „✓ Gotowe” tylko po sukcesie, powrót po błędzie, równe przyciski okienka; stały rozmiar i miejsce w trakcie pracy, PL i EN; lista znanych skoków `quality/baselines/moduly-zasady.json` jest pusta).

## Użycie
```js
OESTPrzycisk.run(btn, () => wyslij());                 // najprościej
const h = OESTPrzycisk.start(btn);                     // gdy ekran zmienia się po sukcesie
wyslij().then(() => h.ok()).then(pokazListe, () => h.fail());
```
Opcje: `{ done: "Wysłano", busy: "Wysyłam…", hold: 900 }`.

Strona: `<script src="moduly/przycisk/przycisk.js"></script>` (inspekcje: `../moduly/przycisk/przycisk.js`). CSS moduł dokłada sam.

## Naciśnięcie (wszystkie przyciski)
Moduł dokłada też jedną regułę dla całej strony: każdy przycisk, kafelek (`button`, `.btn`, `.tile`, `.pbtn`, `.go`, `[role=button]`) przy naciśnięciu płynnie zmniejsza się do 97% i płynnie wraca po puszczeniu (0,16 s, ta sama krzywa w obie strony, bez szarpnięcia). Zerowa waga (`:where`), więc elementy z własnym `transform` się nie zmieniają.
