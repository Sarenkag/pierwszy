<!-- Podgląd raportu z archiwum (treść okienka OESTOkna.okno): tekst Worda, zdjęcia, „Odzyskaj do edycji”, „Otwórz na Dysku ›” i adresaci.
     Wygląd jak dawny podgląd na main (.rpt-meta, .rpt-view, .rpt-pics, .rpt-drive, .rpt-to).
     Dane: OESTRaportyUI.podglad(id) (moduly/raporty/przegladarka.js); wynik (zaznaczeni adresaci / odzyskaj) wraca zdarzeniem „dane”. -->
<template>
  <div id="rptView" class="oest-raport">
    <p class="oest-raport-meta">{{ p.meta }}</p>
    <div class="oest-raport-tresc">
      <p v-for="(l, i) in p.linie" :key="i">{{ l }}</p>
      <div v-if="p.zdjecia.length" id="rptPics" class="oest-raport-zdjecia">
        <ion-img v-for="(u, i) in p.zdjecia" :key="i" :src="u" alt=""></ion-img>
      </div>
    </div>
    <ion-button v-if="p.odzyskaj" id="rptRecover" class="oest-szary oest-szeroki" fill="outline" @click="odzyskaj">{{ p.odzyskaj }}</ion-button>
    <ion-button v-if="p.zachowaj" fill="outline" expand="block" @click="zachowaj">{{ p.zachowaj }}</ion-button>
    <ion-button v-if="p.dysk" id="rptDrive" class="oest-link" fill="clear" :href="p.dysk.adres" target="_blank" rel="noopener">{{ p.dysk.tekst }}</ion-button>
    <div class="oest-adresaci">
      <ion-item v-for="a in p.adresaci" :key="a.k" class="oest-adresat" lines="none">
        <ion-checkbox :data-to="a.k" label-placement="end" justify="start" :checked="!!wybor[a.k]" :disabled="a.wylaczony" @ionChange="zmien(a.k, $event.detail.checked)">{{ a.tekst }} <small>{{ a.adres }}</small></ion-checkbox>
      </ion-item>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { IonImg, IonButton, IonItem, IonCheckbox } from '@ionic/vue';
const props = defineProps({ T: Function, p: Object });
const emit = defineEmits(['dane', 'zamknij']);
const wybor = reactive({});
props.p.adresaci.forEach(a => { wybor[a.k] = !!a.zaznaczony && !a.wylaczony; });
function wyslij(extra) { emit('dane', { adresaci: { ...wybor }, ...(extra || {}) }); }
function zmien(k, v) { wybor[k] = v; wyslij(); }
function zachowaj() { wyslij({ zachowaj: true }); emit('zamknij'); }
function odzyskaj() { wyslij({ odzyskaj: true }); emit('zamknij'); }
wyslij();
</script>
