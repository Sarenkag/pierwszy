// Storybook: Pasek zdjęć – jeden moduł miniatur w całej apce (inspekcje, Flushing, Reactive). Miniatura: Klocki/Miniatura zdjęcia.
import PasekZdjec from './PasekZdjec.vue';

const foto = (n, kolor) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="${kolor}"/><text x="150" y="215" font-size="90" text-anchor="middle" fill="#fff">${n}</text></svg>`);
const lista = ['#4b6584', '#3867d6', '#20bf6b', '#eb3b5a', '#8854d0'].map((k, i) => ({ klucz: i, url: foto(i + 1, k), alt: 'Zdjęcie ' + (i + 1), numer: i + 1 }));

export default {
  title: 'Klocki/Pasek zdjęć',
  component: PasekZdjec,
  args: { lista, edycja: true, usuwanie: true },
  render: (a) => ({ components: { PasekZdjec }, setup: () => ({ a }), template: '<PasekZdjec v-bind="a" />' }),
};

export const ZEdycja = { name: 'Edytuj i usuń' };
export const TylkoUsuwanie = { name: 'Tylko usuń', args: { edycja: false } };
export const JednoZdjecie = { name: 'Jedno zdjęcie', args: { lista: lista.slice(0, 1) } };
