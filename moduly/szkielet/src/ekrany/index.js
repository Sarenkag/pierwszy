// Ekrany przeniesione na Ionic + Vue: id z moduly/ekrany/ekrany.json → komponent. Każdy nowy wpis zmniejsza licznik bramki
// „Poza Ionic/Vue” (quality/baselines/ionic.json). Przepis przenoszenia: moduly/szkielet/PRZEPIS.md.
import Ustawienia from './Ustawienia.vue';
import OAplikacji from './OAplikacji.vue';
import Synchronizacja from './Synchronizacja.vue';
import Poczta from './Poczta.vue';
import Kontakty from './Kontakty.vue';
import Dysk from './Dysk.vue';
import Konto from './Konto.vue';
import Ai from './Ai.vue';
import Czat from './Czat.vue';
import Raporty from './Raporty.vue';
import MojeRaporty from './MojeRaporty.vue';
import Zdjecia from './Zdjecia.vue';
import Glowny from './Glowny.vue';
import Inspekcje from './Inspekcje.vue';
import Kalendarz from './Kalendarz.vue';
import Profil from './Profil.vue';
import KalendarzGrafik from './KalendarzGrafik.vue';
import Vantify from './Vantify.vue';
import Start from './Start.vue';
import Pytania from './Pytania.vue';
import Reactive from './Reactive.vue';
import WBudowie from './WBudowie.vue';
import FormularzInspekcji from './inspekcja/Formularz.vue';
import PolaInspekcji from './inspekcja/Pola.vue';
import ChecklistaInspekcji from './inspekcja/Checklista.vue';
import KolejkaInspekcji from './inspekcja/Kolejka.vue';
import StartInspekcji from "./inspekcja/Start.vue";
import ListaInspekcji from "./inspekcja/Lista.vue";
import PodgladInspekcji from "./inspekcja/Podglad.vue";
import KolejkaStronyInspekcji from "./inspekcja/KolejkaStrony.vue";
import FragmentInspekcji from "./inspekcja/Fragment.vue";
import WysylkaInspekcji from "./inspekcja/Wysylka.vue";
import RaportInspekcji from "./inspekcja/Raport.vue";
// Fragment osobnej strony, montowany przez OESTCzesci; nie przejmuje tras aplikacji.
export const WIDOKI_INSPEKCJI = { 'inspekcja/start': StartInspekcji, 'inspekcja/lista': ListaInspekcji, 'inspekcja/podglad': PodgladInspekcji, 'inspekcja/kolejkastrony': KolejkaStronyInspekcji, 'inspekcja/fragment': FragmentInspekcji, 'inspekcja/wysylka': WysylkaInspekcji, 'inspekcja/raport': RaportInspekcji, 'inspekcja/formularz': FormularzInspekcji, 'inspekcja/pola': PolaInspekcji, 'inspekcja/checklista': ChecklistaInspekcji, 'inspekcja/kolejka': KolejkaInspekcji };
export const EKRANY_VUE = { 'soon/handover': WBudowie, 'soon/keys': WBudowie, 'soon/powertrace': WBudowie, home: Glowny, ppm: Inspekcje, cal: Kalendarz, settings: Ustawienia, 'settings/about': OAplikacji, 'settings/sync': Synchronizacja, 'settings/mail': Poczta, 'settings/contacts': Kontakty, 'settings/drive': Dysk, 'settings/account': Konto, 'settings/ai': Ai, 'settings/ai/czat': Czat, 'settings/reports': Raporty, 'settings/my-reports': MojeRaporty, 'settings/profile': Profil, 'settings/calendar': KalendarzGrafik, 'settings/vantify': Vantify, start: Start, questions: Pytania, zdjecia: Zdjecia, reactive: Reactive, 'reactive/new/:id': Reactive, 'reactive/draft/:id': Reactive, 'reactive/job/:id': Reactive, 'reactive/complete/:id': Reactive, 'reactive/vantify/:id': Reactive, 'reactive/tree/:id': Reactive, 'reactive/history': Reactive };
