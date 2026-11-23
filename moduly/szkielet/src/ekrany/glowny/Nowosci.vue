<!-- Okienko „Nowości firm” (moduly/nowosci, Grzegorz 18/11/2026). Dane: OESTHome.nowosciLista(). Wpis otwiera stronę artykułu. -->
<template>
  <ion-list v-if="p.lista.length" lines="full">
    <ion-item v-for="(x, i) in p.lista" :key="i" :href="x.url" rel="noopener" :detail="true">
      <ion-badge slot="start" color="medium">{{ x.firma }}</ion-badge>
      <ion-label class="ion-text-wrap"><h2>{{ x.tytul }}</h2><p>{{ x.opis }}</p></ion-label>
    </ion-item>
  </ion-list>
  <ion-note v-if="p.pusto">{{ p.pusto }}</ion-note>
  <ion-note v-if="p.uwaga">{{ p.uwaga }}</ion-note>
</template>

<script setup>
import { IonList, IonItem, IonBadge, IonLabel, IonNote } from '@ionic/vue';
defineProps({ T: Function, p: Object });
</script>
