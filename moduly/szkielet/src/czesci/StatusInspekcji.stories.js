import StatusInspekcji from './StatusInspekcji.vue';
const opcje = [['', '○ Nie rozpoczęta'], ['prog', '◐ W trakcie'], ['hold', '⏸ Wstrzymana'], ['done', '✓ Zakończona']];
export default { title: 'Klocki/Inspekcja/Status inspekcji', component: StatusInspekcji,
  render: args => ({ components: { StatusInspekcji }, setup: () => ({ args }), template: '<ion-grid><ion-row><ion-col size="4" offset="4"><StatusInspekcji v-bind="args" @zmien="v => args.stan = v" /></ion-col></ion-row></ion-grid>' }) };
export const WTrakcie = { name: 'W trakcie', args: { stan: 'prog', opcje } };
export const NieRozpoczeta = { name: 'Nie rozpoczęta', args: { stan: '', opcje } };
export const Wstrzymana = { name: 'Wstrzymana', args: { stan: 'hold', opcje } };
export const Zakonczona = { name: 'Zakończona', args: { stan: 'done', opcje } };
