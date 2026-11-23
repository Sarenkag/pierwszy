<!-- Okienko „Prognoza 7 dni” (ekran główny). Dane: OESTHome.prognoza(). -->
<template>
  <ion-grid v-if="p.dni.length">
    <ion-row>
      <ion-col v-for="x in p.dni" :key="x.k" class="ion-text-center">
        <small>{{ x.nazwa }}</small><br><ion-icon :icon="POGODA[x.ikona]" size="large" aria-hidden="true"></ion-icon><br><strong>{{ x.hi }}</strong><br><small>{{ x.lo }}</small>
      </ion-col>
    </ion-row>
  </ion-grid>
  <ion-note>{{ p.uwaga }}</ion-note>
</template>

<script setup>
import { IonGrid, IonRow, IonCol, IonIcon, IonNote } from '@ionic/vue';
import { POGODA } from './ikony.js';
defineProps({ T: Function, p: Object });
</script>
