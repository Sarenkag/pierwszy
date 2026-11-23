// Część Vue ↔ kontroler modułu (moduly/aparat, moduly/notatki, moduly/odczyt): dane() to zwykły obiekt, na(fn) daje nowe dane po każdej zmianie.
// Część tylko pokazuje dane i woła kontroler.akcja(…) – niczego nie liczy.
import { shallowRef, onUnmounted } from 'vue';
export function uzyjKontrolera(k) {
  const d = shallowRef(k.dane());
  const wylacz = k.na ? k.na(x => { d.value = x; }) : null;
  onUnmounted(() => { if (wylacz) wylacz(); });
  return d;
}
