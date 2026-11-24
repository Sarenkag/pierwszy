<!-- Tylko widok: kolejność, treść i stan pochodzą z i-checklista.js.
     Zachowane elementy i klasy są kontraktem insp.css, form-ui.js i delegacji zdarzeń. -->
<template>
  <template v-for="r in d.wiersze" :key="r.i">
    <ion-grid v-if="r.pokoj" data-ui="room-h"><ion-text>{{ r.pokoj.nazwa }}</ion-text><ion-text>{{ r.pokoj.miejsce }}</ion-text></ion-grid>
    <ion-grid data-ui="ck-row" :data-state="r.stan">
      <ion-grid>
        <ion-text v-if="r.sugestia" data-ui="mkn">{{ r.sugestia }}</ion-text>{{ r.tekst }}<ion-note v-if="r.poprzednio" data-ui="was">ostatnio NIE ({{ r.data }})</ion-note>
      </ion-grid>
      <WyborInspekcji :data-i="r.i" :value="r.stan" :aria-label="r.etykieta"><ion-select-option v-for="b in r.przyciski" :key="b.stan" :value="b.stan">{{ b.etykieta || b.tekst }}</ion-select-option></WyborInspekcji>
      <ion-grid v-if="r.powody.length" data-ui="chips rs">
        <ion-item v-for="p in r.powody" :key="p.id"><ion-checkbox :data-ri="r.i" :data-r="p.id" :checked="p.wybrany">{{ p.tekst }}</ion-checkbox></ion-item>
      </ion-grid>
    </ion-grid>
    <ion-item v-if="r.uwaga"><ion-input data-ui="room-note" type="text" :data-room="r.uwaga.id" :value="r.uwaga.tekst" :placeholder="r.uwaga.podpowiedz" :aria-label="r.uwaga.etykieta"></ion-input></ion-item>
  </template>
</template>

<script setup>
import { IonGrid, IonText, IonNote, IonSelectOption, IonItem, IonCheckbox, IonInput } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';

import { uzyjKontrolera } from '../../czesci/kontroler.js';
const props = defineProps({ kontroler: Object, T: Function });
const d = uzyjKontrolera(props.kontroler);
</script>
