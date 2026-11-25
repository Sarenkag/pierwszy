// Storybook: linia stanu (Wi-Fi, HDD, licznik zdjęć) – osobny klocek pod headerem.
import LiniaStanu from './LiniaStanu.vue';
export default {
  title: 'Rama/Linia stanu',
  component: LiniaStanu,
  argTypes: {
    wifi: { control: 'inline-radio', options: ['on', 'mid', 'off'] },
    hdd: { control: 'inline-radio', options: ['on', 'mid', 'off'] },
    zdjeciaPoziom: { control: 'inline-radio', options: ['ok', 'mid', 'hi', 'full'] },
  },
  args: { wifi: 'on', hdd: 'mid', hddTekst: 'HDD · 26 w kolejce', zdjecia: '20/200MB', zdjeciaPoziom: 'ok' },
  render: (a) => ({
    components: { LiniaStanu },
    setup: () => ({ d: { siec: { stan: a.wifi, tekst: 'Wi-Fi' }, dysk: { stan: a.hdd, tekst: a.hddTekst }, zdjecia: { poziom: a.zdjeciaPoziom, tekst: a.zdjecia } }, T: (pl) => pl }),
    template: '<LiniaStanu :d="d" :T="T" />',
  }),
};
export const Normalnie = {};
export const BrakDysku = { args: { hdd: 'off', hddTekst: 'HDD · brak połączenia' } };
export const PelnyFolder = { args: { zdjecia: '200/200MB', zdjeciaPoziom: 'full' } };
