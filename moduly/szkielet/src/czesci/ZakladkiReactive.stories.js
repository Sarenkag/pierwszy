import ZakladkiReactive from './ZakladkiReactive.vue';
// Ekran zlecenia Reactive, wariant B (Grzegorz 26/11/2026). Teksty w przykładzie to przykład, nie dane.
export default { title: 'Reactive/Zakładki', component: ZakladkiReactive, args: { z: { aktywna: 'zdjecia', lista: [{ id: 'zlecenie', tekst: 'Zlecenie', wyslane: true }, { id: 'zdjecia', tekst: 'Zdjęcia', wyslane: false }, { id: 'notatki', tekst: 'Notatki', wyslane: false }, { id: 'zamkniecie', tekst: 'Zamknięcie', wyslane: false }] } },
  render: (a) => ({ components: { ZakladkiReactive }, setup: () => ({ a, T: (pl) => pl }), template: '<ion-list><ZakladkiReactive v-bind="a" :T="T" /></ion-list>' }) };
export const Normalnie = {};
