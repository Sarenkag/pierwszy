<!-- Okienko „Powiadomienia” (dzwonek). Dane: OESTHome.powiadomienia(); stuknięcie wpisu zamyka okienko i otwiera źródło. -->
<template>
  <ion-list v-if="q.lista.length" lines="full">
    <ion-item v-for="n in q.lista" :key="n.cel" button :detail="true" :data-hgo="n.cel" @click="idz(n.cel)">
      <ion-icon slot="start" :icon="POWIADOMIENIA[n.ikona]" color="primary" aria-hidden="true"></ion-icon>
      <ion-label class="ion-text-wrap"><h2>{{ n.tytul }}</h2><p>{{ n.opis }}</p></ion-label>
      <ion-button v-if="n.pozniej" slot="end" fill="outline" size="small" data-akcja="pozniej" @click.stop="pozniej">{{ q.pozniej }}</ion-button>
    </ion-item>
  </ion-list>
  <ion-note v-else>{{ q.pusto }}</ion-note>
</template>

<script setup>
import { IonList, IonItem, IonIcon, IonLabel, IonButton, IonNote } from '@ionic/vue';
import { swieze } from './swieze.js';
import { POWIADOMIENIA } from './ikony.js';
const props = defineProps({ T: Function, p: Object, zrodlo: Function });
const emit = defineEmits(['zamknij']);
const H = window.OESTHome;
function idz(cel) { emit('zamknij'); H.idz(cel); }
function pozniej() { H.pozniej(); } // jak na main: okienko zostaje, wpis znika (swieze)
const q = swieze(props); // świeże dane okienka (zrodlo = OESTHome.…)
</script>
