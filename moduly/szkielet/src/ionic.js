// Start Ionic – JEDNO miejsce w całej apce. Każda aplikacja Vue szkieletu (Rama w main.js, części w czesci.js) woła uzyjIonic(app).
// Pierwsze wywołanie uruchamia Ionic (tryb md, systemowy Wstecz); kolejne nic nie robią – drugi start dodałby drugi nasłuch Wstecz.
// Bez startu Ionic przed pierwszym komponentem: tryb „undefined”, puste style w środku elementów (ekran inspekcji 25.11.2026: gołe przyciski, czarne trójkąty).
import { IonicVue } from '@ionic/vue';
const KONFIG = { mode: 'md', hardwareBackButton: true, animated: true, swipeBackEnabled: false };
let wystartowal = false;
export function uzyjIonic(app) {
  if (wystartowal) return;
  wystartowal = true;
  app.use(IonicVue, KONFIG);
}
