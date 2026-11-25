// Storybook: tło pod przyciskami nawigacji telefonu – osobny klocek ramy. W przeglądarce pas systemowy ma 0 px, więc tu udajemy 48 px jak na telefonie.
import TloNawigacji from './TloNawigacji.vue';
export default {
  title: 'Rama/Tło pod nawigacją telefonu',
  component: TloNawigacji,
  args: { wysokosc: 48 },
  render: (a) => ({
    components: { TloNawigacji },
    setup: () => ({ a }),
    template: '<div :style="{ \'--ion-safe-area-bottom\': a.wysokosc + \'px\', outline: \'1px dashed rgba(255,255,255,.3)\' }"><TloNawigacji /></div>',
  }),
};
export const Telefon = {};
