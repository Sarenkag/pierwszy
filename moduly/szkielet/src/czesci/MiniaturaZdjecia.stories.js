// Storybook: Miniatura zdjęcia – jeden klocek, składany przez Klocki/Pasek zdjęć (PasekZdjec.vue).
import MiniaturaZdjecia from './MiniaturaZdjecia.vue';

const foto = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#3867d6"/></svg>');

export default {
  title: 'Klocki/Miniatura zdjęcia',
  component: MiniaturaZdjecia,
  args: { src: foto, alt: 'Zdjęcie 1', numer: 1 },
  render: (a) => ({ components: { MiniaturaZdjecia }, setup: () => ({ a }), template: '<ion-grid data-ui="pasek-zdjec"><MiniaturaZdjecia v-bind="a" /></ion-grid>' }),
};

export const Jedna = {};
