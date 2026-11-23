<!-- Ekran nagrywania notatki głosowej (moduly/notatki/glos.js: przycisk „przytrzymaj i mów”) – mikrofon (pulsuje), czas / limit, postęp, Zakończ – wygląd jak na main (.oest-rec w szkielet.css).
     Stan (czas, postęp) liczy moduł; Wstecz telefonu = Zakończ (nagranie zapisane). Otwiera go OESTCzesci.pokaz('Nagrywanie', kontroler). -->
<template>
  <div class="oest-rec" data-nagrywanie>
    <div class="oest-rec-mic"><ion-icon :icon="mic" aria-hidden="true"></ion-icon></div>
    <div class="oest-rec-t" role="timer">{{ d.czas }}</div>
    <ion-progress-bar :value="d.postep"></ion-progress-bar>
    <div class="oest-rec-h">{{ d.podpowiedz }}</div>
    <ion-button class="oest-rec-b" data-nagrywanie-zakoncz @click="k.akcja('zakoncz')"><ion-icon :icon="stop" aria-hidden="true"></ion-icon>&nbsp;{{ d.zakoncz }}</ion-button>
  </div>
</template>

<script setup>
import { IonIcon, IonProgressBar, IonButton } from '@ionic/vue';
import { mic, stop } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
