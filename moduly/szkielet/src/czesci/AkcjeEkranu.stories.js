// Storybook: rząd przycisków ekranu pod headerem – Kalendarz (przełącznik miesiąca + Mój grafik) i Reactive (ustawienia).
import AkcjeEkranu from './AkcjeEkranu.vue';
import PrzelacznikMiesiaca from './PrzelacznikMiesiaca.vue';
import { settingsOutline } from 'ionicons/icons';
const T = (pl) => pl;
export default { title: 'Klocki/Przyciski ekranu', component: AkcjeEkranu };
export const Kalendarz = {
  render: () => ({ components: { AkcjeEkranu, PrzelacznikMiesiaca }, setup: () => ({ T, akcje: [{ ikona: settingsOutline, etykieta: 'Mój grafik', fn: () => {} }] }),
    template: '<AkcjeEkranu :akcje="akcje"><PrzelacznikMiesiaca miesiac="listopad 2026" :T="T" /></AkcjeEkranu>' }),
};
export const Reactive = {
  render: () => ({ components: { AkcjeEkranu }, setup: () => ({ akcje: [{ ikona: settingsOutline, etykieta: 'Ustawienia Reactive', fn: () => {} }] }),
    template: '<AkcjeEkranu :akcje="akcje" />' }),
};
