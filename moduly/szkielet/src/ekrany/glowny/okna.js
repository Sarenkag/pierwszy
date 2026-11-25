// Okienka ekranu głównego i górnego paska ramy: prognoza, powiadomienia, sieć, Dysk, nowości – jedno okienko apki (ion-modal),
// Wstecz telefonu je zamyka. Jedno miejsce dla ramy (czesci/GornyPasek.vue) i ekranu głównego. Dane: OESTHome (app/www/home.js).
import Prognoza from './Prognoza.vue';
import Powiadomienia from './Powiadomienia.vue';
import Opcje from './Opcje.vue';
import Nowosci from './Nowosci.vue';
export async function okno(rodzaj) {
  const H = window.OESTHome, O = window.OESTOkna;
  if (rodzaj === 'wx') { const r = O.okno({ tytul: () => H.prognoza().tytul, komponent: Prognoza, wlasciwosci: { p: H.prognoza(), zrodlo: H.prognoza }, bezPrzyciskow: true }); H.odswiez(true); return r; }
  if (rodzaj === 'bell') { await H.rxCount(); const p = H.powiadomienia(); return O.okno({ tytul: () => H.powiadomienia().tytul, komponent: Powiadomienia, wlasciwosci: { p, zrodlo: H.powiadomienia }, bezPrzyciskow: true }); }
  if (rodzaj === 'drive' || rodzaj === 'net') { const z = rodzaj === 'drive' ? H.dysk : H.siec, p = z(); return O.okno({ tytul: () => z().tytul, komponent: Opcje, wlasciwosci: { p, zrodlo: z }, bezPrzyciskow: true }); }
  if (rodzaj === 'news') { const p = H.nowosciLista(); return O.okno({ tytul: () => H.nowosciLista().tytul, komponent: Nowosci, wlasciwosci: { p, zrodlo: H.nowosciLista }, bezPrzyciskow: true }); }
}
