import LiniaTypData from './LiniaTypData.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Linia typ i data', component: LiniaTypData, args: { typ: 'REPAIR', data: '26/11/2026' },
  render: (a) => ({ components: { LiniaTypData }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><LiniaTypData v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
