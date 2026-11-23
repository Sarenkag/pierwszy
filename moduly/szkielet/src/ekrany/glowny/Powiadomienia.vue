<!-- Okienko „Powiadomienia” (dzwonek). Dane: OESTHome.powiadomienia(); stuknięcie wpisu zamyka okienko i otwiera źródło. -->
<template>
  <ion-list v-if="p.lista.length" lines="full">
    <ion-item v-for="n in p.lista" :key="n.cel" button :detail="true" @click="idz(n.cel)">
      <ion-icon slot="start" :icon="POWIADOMIENIA[n.ikona]" color="primary" aria-hidden="true"></ion-icon>
      <ion-label class="ion-text-wrap"><h2>{{ n.tytul }}</h2><p>{{ n.opis }}</p></ion-label>
      <ion-button v-if="n.pozniej" slot="end" fill="outline" size="small" data-akcja="pozniej" @click.stop="pozniej">{{ p.pozniej }}</ion-button>
    </ion-item>
  </ion-list>
  <ion-note v-else>{{ p.pusto }}</ion-note>
</template>

<script setup>
import { IonList, IonItem, IonIcon, IonLabel, IonButton, IonNote } from '@ionic/vue';
import { POWIADOMIENIA } from './ikony.js';
defineProps({ T: Function, p: Object });
const emit = defineEmits(['zamknij']);
const H = window.OESTHome;
function idz(cel) { emit('zamknij'); H.idz(cel); }
function pozniej() { H.pozniej(); emit('zamknij'); }
</script>
