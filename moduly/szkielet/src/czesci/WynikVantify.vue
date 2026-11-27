<!-- Wynik zakładania w Vantify (Grzegorz 27/11/2026: „podzielić akapitami czy punktami”, większe okno): każda rzecz w osobnym wierszu.
     Okienko (Okno.vue przez OESTCzesci.okno). kontroler: { dane() → { wiersze: [{ etykieta, tekst, uwaga }] } }; uwaga = wiersz z ⚠. -->
<template>
  <ion-list lines="full">
    <ion-item v-for="(r, i) in d.wiersze" :key="i">
      <ion-icon v-if="r.uwaga" slot="start" :icon="warning" color="warning" aria-hidden="true"></ion-icon>
      <ion-label class="ion-text-wrap"><p>{{ r.etykieta }}</p><h2>{{ r.tekst }}</h2></ion-label>
    </ion-item>
  </ion-list>
</template>

<script setup>
import { IonList, IonItem, IonLabel, IonIcon } from '@ionic/vue';
import { warning } from 'ionicons/icons';
const props = defineProps({ T: Function, kontroler: Object });
const d = props.kontroler.dane();
</script>
