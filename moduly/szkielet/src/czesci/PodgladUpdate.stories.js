import PodgladUpdate from './PodgladUpdate.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Podgląd Update', component: PodgladUpdate, args: { kontroler: { dane: () => ({ wiadomosci: [{ id: 'done', etykieta: 'Co zrobione', tekst: 'Przykład: tekst po angielsku' }, { id: 'final', etykieta: 'Prośba o zatwierdzenie', tekst: 'Works completed. Please approve so the job can be closed.' }], zdjecia: [], etZdjecia: 'Zdjęcia do wysłania' }), akcja: () => {} } },
  render: (a) => ({ components: { PodgladUpdate }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><PodgladUpdate v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
