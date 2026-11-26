import KlocekZlecenia from './KlocekZlecenia.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Klocek zlecenia', component: KlocekZlecenia, args: { k: { nazwa: 'Przykład: nazwa zadania', nr: 'brak nr', tryb: 'wtrakcie', typ: 'REPAIR', data: '26/11/2026', stan: ['Przed 2', 'Po 0', 'Notatki 1', 'Job Sheet –'] }, wiecej: 'Więcej: stan, części, kosztorys' },
  render: (a) => ({ components: { KlocekZlecenia }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><KlocekZlecenia v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
