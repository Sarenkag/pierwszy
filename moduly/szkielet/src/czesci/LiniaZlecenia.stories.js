import LiniaZlecenia from './LiniaZlecenia.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Linia stanu zlecenia', component: LiniaZlecenia, args: { stan: ['Przed 1/2', 'Po 0/0', 'Notatki 1', 'Job Sheet –'] },
  render: (a) => ({ components: { LiniaZlecenia }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><LiniaZlecenia v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
