<!-- Okienko „Nowości firm” (moduly/nowosci, Grzegorz 18/11/2026). Dane: OESTHome.nowosciLista(). Wpis otwiera stronę artykułu. -->
<template>
  <ion-list v-if="q.lista.length" lines="full">
    <ion-item v-for="(x, i) in q.lista" :key="i" :href="x.url" rel="noopener" :detail="true">
      <ion-badge slot="start" color="medium">{{ x.firma }}</ion-badge>
      <ion-label class="ion-text-wrap"><h2>{{ x.tytul }}</h2><p>{{ x.opis }}</p></ion-label>
    </ion-item>
  </ion-list>
  <ion-note v-if="q.pusto">{{ q.pusto }}</ion-note>
  <ion-note v-if="q.uwaga">{{ q.uwaga }}</ion-note>
</template>

<script setup>
import { IonList, IonItem, IonBadge, IonLabel, IonNote } from '@ionic/vue';
import { swieze } from './swieze.js';
const props = defineProps({ T: Function, p: Object, zrodlo: Function });
const q = swieze(props); // świeże dane okienka (zrodlo = OESTHome.…)
</script>
