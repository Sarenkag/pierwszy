// Wspólne zachowanie list z klockami inspekcji (lista Inspekcji, dzień w Kalendarzu): stuknięcie otwiera inspekcję,
// przytrzymanie pokazuje okno informacji (czesci/InfoInspekcji.vue). Dane i przejścia: OESTPpmUI (app/www/ppm-ui.js).
import InfoInspekcji from './InfoInspekcji.vue';
export function wybierz(k) { window.OESTPpmUI.wybierz(k); }
export function przytrzymaj(k) {
  const d = window.OESTPpmUI.info(k);
  if (d) window.OESTOkna.okno({ tytul: window.OESTT('Informacje', 'Details'), komponent: InfoInspekcji, wlasciwosci: { nazwa: d.tytul, wiersze: d.wiersze }, bezPrzyciskow: true });
}
