# Przepis: przeniesienie ekranu na Ionic + Vue

Wzór: `src/ekrany/Ustawienia.vue` (ekran `settings`). Jeden ekran = jeden PR. Bramka G1 (reguła IONIC) pilnuje wszystkiego poniżej.

1. **Dane i reguły zostają w module ekranu** (np. `app/www/keys.js`). Moduł wystawia funkcję z danymi, np. `OESTKeys.dane()`, która zwraca zwykły obiekt. Ekran Vue niczego nie liczy.
2. **Utwórz `src/ekrany/<Nazwa>.vue`.** W `<template>` używasz tylko komponentów Ionic (`ion-list`, `ion-item`, `ion-label`, `ion-button`, `ion-input`, `ion-select`, `ion-toggle`, `ion-card`, `ion-grid`, `ion-note`…) oraz `div`/`span`/`p`/`h1–h6`/`img`.
   - Nie wolno: własnych `button`/`input`/`a`/`ul`/`dialog`, `style=`, `<style>` ani klas spoza `ion-*`.
   - Teksty zawsze jako `T('polski', 'English')`.
   - Przejście: `data-nav="<id z ekrany.json>"`. Strzałka i Wstecz telefonu są w ramie.
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
