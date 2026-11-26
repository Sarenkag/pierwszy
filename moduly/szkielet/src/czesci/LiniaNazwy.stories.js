import LiniaNazwy from './LiniaNazwy.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Linia nazwy', component: LiniaNazwy, args: { nazwa: 'Przykład: nazwa zadania', nr: 'brak nr' },
  render: (a) => ({ components: { LiniaNazwy }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><LiniaNazwy v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
