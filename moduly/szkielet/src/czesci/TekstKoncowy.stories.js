import TekstKoncowy from './TekstKoncowy.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Tekst końcowy', component: TekstKoncowy, args: { t: { etykieta: 'Tekst końcowy (Job Sheet)', wartosc: 'Work carried out in a safe manner, in line with health and safety procedures. Area left clean and tidy.', opcje: [{ id: 'Work carried out in a safe manner, in line with health and safety procedures. Area left clean and tidy.', nazwa: 'Work carried out in a safe manner, in line with health and safety procedures. Area left clean and tidy.' }], wlasny: 'Własny tekst — wpisz niżej' } },
  render: (a) => ({ components: { TekstKoncowy }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><TekstKoncowy v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
