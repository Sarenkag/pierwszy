import Zablokowane from './Zablokowane.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Zablokowane', component: Zablokowane, args: { z: { tekst: '✓ w Vantify, 14:05' } },
  render: (a) => ({ components: { Zablokowane }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><Zablokowane v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
