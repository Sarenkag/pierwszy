<!-- Raporty i zdjęcia. Licznik: OESTSettingsUI.raportyLicznik() (app/www/settings-ui.js).
     „Moje raporty”: dane i akcje OESTRaportyUI (moduly/raporty/przegladarka.js) – lista z klocków (czesci/Klocek.vue), podgląd w OESTOkna.okno (RaportPodglad.vue). -->
<template>
  <div class="ion-padding">
    <ion-card class="oest-panel">
      <ion-list-header class="oest-tytul">{{ T('Raporty w telefonie', 'Reports on this phone') }}</ion-list-header>
      <ion-item class="oest-wybrane" lines="none">
        <ion-label id="rptStats" :color="licznik.ostrzezenie ? 'danger' : undefined">{{ licznik.tekst || T('Liczę…', 'Counting…') }}</ion-label>
      </ion-item>
      <ion-button fill="clear" href="#settings/drive">{{ T('Ustawienia Dysku', 'Drive settings') }}</ion-button>
    </ion-card>
    <ion-card class="oest-panel">
      <ion-list-header class="oest-tytul">Word + PDF · English</ion-list-header>
      <ion-note class="oest-opis">{{ T('Najmniejszy praktyczny plik przy zachowaniu czytelności. Zdjęcia w automatycznej siatce do 10 na stronę galerii.', 'Smallest practical file while retaining readability. Automatic photo grids up to 10 per gallery page.') }}</ion-note>
      <ion-note class="oest-opis">{{ T('To wspólne wymagania raportów. Generator i układ dokumentów są rozwijane w module inspekcji.', 'These are shared report requirements. Rendering and document layouts belong to the inspection module.') }}</ion-note>
    </ion-card>
    <div class="oest-zapisz">
      <ion-button class="oest-duzy" expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
      <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonButton } from '@ionic/vue';
import Klocek from '../czesci/Klocek.vue';
import RaportPodglad from './RaportPodglad.vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const R = window.OESTRaportyUI;
const licznik = ref({ tekst: '', ostrzezenie: false });
const wynik = ref(null);
// lista i licznik z modułu raportów – także po zmianie języka i po każdej zmianie archiwum
function rysuj() { S.raportyLicznik().then((d) => { licznik.value = d; }); }
let odpisz = null;
function zapisz() { S.zmiany(false); wynik.value = S.zapiszPola({}); }
watch(() => props.wersja, rysuj);
onMounted(() => { S.zmiany(false); rysuj(); odpisz = R.zmiany(rysuj); });
onUnmounted(() => { if (odpisz) odpisz(); });
</script>
