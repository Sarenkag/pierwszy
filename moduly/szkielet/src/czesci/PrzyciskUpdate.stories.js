import PrzyciskUpdate from './PrzyciskUpdate.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Przycisk Update', component: PrzyciskUpdate, args: { u: { tekst: 'Update', podglad: 'Podgląd przed wysłaniem' }, ile: 2 },
  render: (a) => ({ components: { PrzyciskUpdate }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><PrzyciskUpdate v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
