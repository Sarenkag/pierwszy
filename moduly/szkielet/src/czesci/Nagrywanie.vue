<!-- Ekran nagrywania notatki głosowej (moduly/notatki/glos.js: przycisk „przytrzymaj i mów”) – mikrofon, czas / limit, postęp, Zakończ.
     Stan (czas, postęp) liczy moduł; Wstecz telefonu = Zakończ (nagranie zapisane). Otwiera go OESTCzesci.pokaz('Nagrywanie', kontroler). -->
<template>
  <ion-content class="ion-padding ion-text-center" data-nagrywanie>
    <h1><ion-icon :icon="mic" color="danger" size="large" aria-hidden="true"></ion-icon></h1>
    <h2 role="timer">{{ d.czas }}</h2>
    <ion-progress-bar :value="d.postep" color="primary"></ion-progress-bar>
    <p><ion-note>{{ d.podpowiedz }}</ion-note></p>
    <ion-button mode="ios" size="large" data-nagrywanie-zakoncz @click="k.akcja('zakoncz')"><ion-icon slot="start" :icon="stop" aria-hidden="true"></ion-icon>{{ d.zakoncz }}</ion-button>
  </ion-content>
</template>

<script setup>
import { IonContent, IonIcon, IonProgressBar, IonNote, IonButton } from '@ionic/vue';
import { mic, stop } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
