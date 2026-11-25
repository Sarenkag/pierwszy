// Storybook: menu główne – 8 kafelków (ten sam Kafel 8 razy).
import MenuGlowne from './MenuGlowne.vue';
const OSIEM = [['inspekcje', 'Inspekcje'], ['reactive', 'Reactive'], ['powertrace', 'Power trace'], ['kalendarz', 'Kalendarz'],
  ['klucze', 'Klucze'], ['handover', 'Handover'], ['nowosci', 'Nowości firm'], ['ustawienia', 'Ustawienia']]
  .map(([id, tytul]) => ({ id, tytul, ikona: id, licznik: id === 'nowosci' ? 1 : 0 }));
export default {
  title: 'Klocki/Menu główne (8 kafelków)',
  component: MenuGlowne,
  render: () => ({ components: { MenuGlowne }, setup: () => ({ kafelki: OSIEM }), template: '<MenuGlowne :kafelki="kafelki" />' }),
};
export const OsiemKafelkow = {};
