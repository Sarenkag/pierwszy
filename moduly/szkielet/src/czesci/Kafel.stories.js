// Storybook: Kafel – jeden klocek. 8 kafelków ekranu głównego: Klocki/Menu główne (MenuGlowne.vue).
import Kafel from './Kafel.vue';
import { KAFELKI } from '../ekrany/glowny/ikony.js';

export default {
  title: 'Klocki/Kafel',
  component: Kafel,
  argTypes: { ikona: { control: 'select', options: Object.keys(KAFELKI) } },
  args: { tytul: 'Inspekcje', ikona: 'inspekcje', licznik: 0, podpis: '' },
  render: (a) => ({
    components: { Kafel },
    setup: () => ({ it: { id: 'x', tytul: a.tytul, ikona: KAFELKI[a.ikona], licznik: a.licznik, podpis: a.podpis } }),
    template: '<div class="oest-kafelki" style="max-width: 210px"><Kafel :it="it" /></div>',
  }),
};

export const Jeden = {};
export const ZLicznikiem = { args: { tytul: 'Nowości firm', ikona: 'nowosci', licznik: 1 } };
