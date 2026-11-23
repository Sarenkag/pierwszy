<!-- Podgląd raportu z archiwum (treść okienka OESTOkna.okno): tekst Worda, zdjęcia, „Otwórz na Dysku”, „Odzyskaj do edycji” i adresaci.
     Dane: OESTRaportyUI.podglad(id) (moduly/raporty/przegladarka.js); wynik (zaznaczeni adresaci / odzyskaj) wraca zdarzeniem „dane”. -->
<template>
  <div id="rptView">
    <ion-note>{{ p.meta }}</ion-note>
    <ion-list lines="none">
      <ion-item v-for="(l, i) in p.linie" :key="i"><ion-label class="ion-text-wrap">{{ l }}</ion-label></ion-item>
    </ion-list>
    <ion-grid v-if="p.zdjecia.length" id="rptPics">
      <ion-row>
        <ion-col v-for="(u, i) in p.zdjecia" :key="i" size="4"><ion-img :src="u" alt=""></ion-img></ion-col>
      </ion-row>
    </ion-grid>
    <ion-button v-if="p.odzyskaj" id="rptRecover" expand="block" fill="outline" @click="odzyskaj">{{ p.odzyskaj }}</ion-button>
    <ion-button v-if="p.dysk" id="rptDrive" expand="block" fill="clear" :href="p.dysk.adres" target="_blank" rel="noopener">{{ p.dysk.tekst }}<ion-icon slot="end" :icon="openOutline" aria-hidden="true"></ion-icon></ion-button>
    <ion-list>
      <ion-list-header>{{ p.adresaciTytul }}</ion-list-header>
      <ion-item v-for="a in p.adresaci" :key="a.k">
        <ion-toggle :data-to="a.k" :checked="!!wybor[a.k]" :disabled="a.wylaczony" @ionChange="zmien(a.k, $event.detail.checked)">
          <ion-label class="ion-text-wrap">{{ a.tekst }}<p>{{ a.adres }}</p></ion-label>
        </ion-toggle>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { IonNote, IonList, IonItem, IonLabel, IonGrid, IonRow, IonCol, IonImg, IonButton, IonIcon, IonListHeader, IonToggle } from '@ionic/vue';
import { openOutline } from 'ionicons/icons';
const props = defineProps({ T: Function, p: Object });
const emit = defineEmits(['dane', 'zamknij']);
const wybor = reactive({});
props.p.adresaci.forEach(a => { wybor[a.k] = !!a.zaznaczony && !a.wylaczony; });
function wyslij(extra) { emit('dane', { adresaci: { ...wybor }, ...(extra || {}) }); }
function zmien(k, v) { wybor[k] = v; wyslij(); }
function odzyskaj() { wyslij({ odzyskaj: true }); emit('zamknij'); }
wyslij();
</script>
