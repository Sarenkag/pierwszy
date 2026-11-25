import { ref } from 'vue';
import PoleDaty from './PoleDaty.vue';
// Jeden klocek daty/godziny dla całej apki: inspekcja, Reactive, Mój profil.
export default { title: 'Klocki/Pole daty', component: PoleDaty,
  render: args => ({ components: { PoleDaty }, setup: () => { const v = ref(args.value); return { args, v }; },
    template: '<ion-list><PoleDaty v-bind="args" :value="v" @zmiana="x => v = x" /></ion-list>' }) };
export const Data = { name: 'Data', args: { id: 'sb-data', label: 'Data wykonania', value: '2026-11-25' } };
export const BezDaty = { name: 'Bez daty', args: { id: 'sb-pusta', label: 'Data wykonania', value: '' } };
export const Godzina = { name: 'Godzina', args: { id: 'sb-godz', label: 'Godzina', value: '08:00', rodzaj: 'godzina' } };
export const Wylaczone = { name: 'Wyłączone', args: { id: 'sb-wyl', label: 'Data wykonania', value: '2026-11-25', disabled: true } };
