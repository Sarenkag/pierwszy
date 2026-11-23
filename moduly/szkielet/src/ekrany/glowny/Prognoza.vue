<!-- Okienko „Prognoza 7 dni” (ekran główny). Dane: OESTHome.prognoza(). -->
<template>
  <ion-grid v-if="q.dni.length">
    <ion-row>
      <ion-col v-for="x in q.dni" :key="x.k" class="ion-text-center">
        <small>{{ x.nazwa }}</small><br><ion-icon :icon="POGODA[x.ikona]" size="large" aria-hidden="true"></ion-icon><br><strong>{{ x.hi }}</strong><br><small>{{ x.lo }}</small>
      </ion-col>
    </ion-row>
  </ion-grid>
  <ion-note>{{ q.uwaga }}</ion-note>
</template>

<script setup>
import { IonGrid, IonRow, IonCol, IonIcon, IonNote } from '@ionic/vue';
import { swieze } from './swieze.js';
import { POGODA } from './ikony.js';
const props = defineProps({ T: Function, p: Object, zrodlo: Function });
const q = swieze(props); // świeże dane okienka (zrodlo = OESTHome.…)
</script>
