# Moduł przycisku akcji (`moduly/przycisk`)

**Zasada (Grzegorz 02/11/2026):** jeden przycisk akcji z jednym zachowaniem we wszystkich apkach OEST. W każdym miejscu podmieniamy tylko akcję (wyślij, zapisz…).

Zachowanie: naciśnięcie → kręciołek (przycisk lekko wciśnięty, zablokowany) → „✓ Gotowe” przez ~0,9 s → dalej. Przy błędzie przycisk wraca do zwykłego napisu, a błąd idzie dalej do ekranu. Wygląd przycisku (kolor, kształt) zostaje z ekranu.

## Użycie
```js
OESTPrzycisk.run(btn, () => wyslij());                 // najprościej
const h = OESTPrzycisk.start(btn);                     // gdy ekran zmienia się po sukcesie
wyslij().then(() => h.ok()).then(pokazListe, () => h.fail());
```
Opcje: `{ done: "Wysłano", busy: "Wysyłam…", hold: 900 }`.

Strona: `<script src="moduly/przycisk/przycisk.js"></script>` (inspekcje: `../moduly/przycisk/przycisk.js`). CSS moduł dokłada sam.
