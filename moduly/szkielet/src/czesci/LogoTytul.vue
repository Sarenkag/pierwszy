<!-- Klocek 2 górnego paska: logo OEST + tytuł bieżącego ekranu WIELKIMI LITERAMI (ekran główny: MENU GŁÓWNE) + data i pogoda (same się zmieniają). -->
<template>
  <ion-avatar slot="start" class="oest-logo"><span class="oest-inicjaly">OEST</span></ion-avatar>
  <ion-label class="ion-text-nowrap">
    <h2><strong class="ion-text-uppercase">{{ tytul }}</strong></h2>
    <p>{{ data }}<template v-if="pogoda"> · <ion-text color="primary" @click="emit('pogoda')"><ion-icon :icon="POGODA[pogoda.ikona]" aria-hidden="true"></ion-icon> {{ pogoda.temp }}</ion-text></template></p>
  </ion-label>
</template>

<script setup>
import { IonAvatar, IonLabel, IonText, IonIcon } from '@ionic/vue';
import { POGODA } from '../ekrany/glowny/ikony.js';
defineProps({ tytul: String, data: String, pogoda: Object });
const emit = defineEmits(['pogoda']);
</script>
