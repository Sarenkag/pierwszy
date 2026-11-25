// Storybook: górny pasek ramy. Tytuł, dzwonek, pogodę i język zmieniasz w panelu Controls.
import GornyPasek from './GornyPasek.vue';
import LogoTytul from './LogoTytul.vue';
import PrzelacznikJezyka from './PrzelacznikJezyka.vue';
import Dzwonek from './Dzwonek.vue';
import Awatar from './Awatar.vue';

const dane = (a) => ({
  data: a.data, inicjaly: 'GS', dzwonek: a.dzwonek,
  pogoda: { ikona: a.pogodaIkona, temp: a.temperatura },
});

export default {
  title: 'Rama/Górny pasek/1 Pasek (całość)',
  component: GornyPasek,
  argTypes: {
    pogodaIkona: { control: 'select', options: ['sunny', 'partly-sunny', 'cloudy', 'cloud', 'rainy', 'snow', 'thunderstorm'] },
    jezyk: { control: 'inline-radio', options: ['pl', 'en'] },
  },
  args: {
    tytul: 'Inspekcje', data: 'śr., 25 lis', temperatura: '4°C', pogodaIkona: 'cloud', dzwonek: 3,
    jezyk: 'pl',
  },
  render: (a) => ({
    components: { GornyPasek },
    setup: () => ({ a, d: dane(a), T: (pl, en) => (a.jezyk === 'en' ? en : pl) }),
    template: '<GornyPasek :tytul="a.tytul" :d="d" :T="T" />',
  }),
};

export const Inspekcje = {};
export const EkranGlowny = { args: { tytul: 'Menu główne' } };
export const Reactive = { args: { tytul: 'Reactive', dzwonek: 0 } };

// Klocki 2–5 osobno (każdy w pasku Ionic, żeby wyglądał jak w apce)
const wPasku = (komponent, szablon) => (a) => ({
  components: { K: komponent },
  setup: () => ({ a, d: dane(a), T: (pl, en) => (a.jezyk === 'en' ? en : pl) }),
  template: '<ion-header class="ion-no-border oest-glowny"><ion-toolbar>' + szablon + '</ion-toolbar></ion-header>',
});
export const Klocek2_LogoTytul = { render: wPasku(LogoTytul, '<K :tytul="a.tytul" :data="d.data" :pogoda="d.pogoda" />') };
export const Klocek3_PLEN = { render: wPasku(PrzelacznikJezyka, '<ion-buttons slot="end"><K :jezyk="a.jezyk" :T="T" /></ion-buttons>') };
export const Klocek4_Dzwonek = { render: wPasku(Dzwonek, '<ion-buttons slot="end"><K :licznik="a.dzwonek" :T="T" /></ion-buttons>') };
export const Klocek5_Awatar = { render: wPasku(Awatar, '<ion-buttons slot="end"><K inicjaly="GS" :T="T" /></ion-buttons>') };
