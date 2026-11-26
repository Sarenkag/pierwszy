import WyborPracy from './WyborPracy.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Wybór pracy', component: WyborPracy, args: { w: { etykieta: 'Praca', wartosc: 'completed', opcje: [{ id: 'completed', nazwa: 'Zakończone · Completed' }, { id: 'not-completed', nazwa: 'Niezakończone · Not completed' }, { id: 'temporary', nazwa: 'Naprawa tymczasowa · Temporary repair' }, { id: 'inspected', nazwa: 'Sprawdzone – usterka potwierdzona · Inspected – fault confirmed' }] } },
  render: (a) => ({ components: { WyborPracy }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><WyborPracy v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
