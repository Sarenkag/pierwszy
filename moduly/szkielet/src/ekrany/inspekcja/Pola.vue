<!-- Gotowe wartości i ocena pochodzą z i-checklista.js; zdarzenia obsługuje dotychczasowa delegacja. -->
<template>
  <template v-if="rodzaj === 'temperatury'">
    <ion-grid v-for="r in d.wiersze" :key="r.i">
      <ion-grid data-ui="txt">{{ r.nazwa }}<ion-note>{{ r.opis }}</ion-note></ion-grid>
      <ion-item><ion-input :color="r.blad ? 'danger' : undefined" type="text" inputmode="decimal" autocomplete="off" :data-t="r.i" :value="r.wartosc" :aria-label="r.etykieta"></ion-input></ion-item>
    </ion-grid>
  </template>
  <template v-else>
    <ion-item v-for="r in d.wiersze" :key="r.id"><ion-checkbox :data-f="r.id" :checked="r.wybrany">{{ r.tekst }}</ion-checkbox></ion-item>
  </template>
</template>

<script setup>
import { IonGrid, IonNote, IonItem, IonInput, IonCheckbox } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';

import { uzyjKontrolera } from '../../czesci/kontroler.js';
const props = defineProps({ kontroler: Object, rodzaj: String });
const d = uzyjKontrolera(props.kontroler);
</script>
