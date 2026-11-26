import Notatka from './Notatka.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Notatka', component: Notatka, args: { n: { id: 'end', etykieta: 'Co zrobione', pole: 'endNote', wartosc: '', podpowiedz: 'co zrobiono', licznik: '', zablokowane: null }, opcje: null },
  render: (a) => ({ components: { Notatka }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><Notatka v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
