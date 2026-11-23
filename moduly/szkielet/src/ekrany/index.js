// Ekrany przeniesione na Ionic + Vue: id z moduly/ekrany/ekrany.json → komponent. Każdy nowy wpis zmniejsza licznik bramki
// „Poza Ionic/Vue” (quality/baselines/ionic.json). Przepis przenoszenia: moduly/szkielet/PRZEPIS.md.
import Ustawienia from './Ustawienia.vue';
import OAplikacji from './OAplikacji.vue';
import Synchronizacja from './Synchronizacja.vue';
import Poczta from './Poczta.vue';
import Kontakty from './Kontakty.vue';
import Dysk from './Dysk.vue';
export const EKRANY_VUE = { settings: Ustawienia, 'settings/about': OAplikacji, 'settings/sync': Synchronizacja, 'settings/mail': Poczta, 'settings/contacts': Kontakty, 'settings/drive': Dysk };
