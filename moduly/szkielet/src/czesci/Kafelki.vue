<!-- Kafelki – JEDEN kafelek w całej apce (Grzegorz 04/11/2026): ekran główny, Ustawienia, Reactive, wybór rodzaju inspekcji.
     Stałe miejsca: ikona, nazwa, podpis (gdy lista ma podpisy – zawsze miejsce na 2 linie, karty równe), licznik w rogu. Lista z modułu:
       [{ id, trasa (data-nav) | bez trasy = zdarzenie „wybierz”, ikona (adres svg albo ikona ionicons), tytul, podpis, licznik }] -->
<template>
  <ion-grid :class="['oest-kafelki', { 'oest-rowne': lista.some(x => x.podpis) }]">
    <ion-row>
      <ion-col size="6" v-for="it in lista" :key="it.id">
        <ion-card button :data-nav="it.trasa || undefined" :data-id="it.id" @click="!it.trasa && emit('wybierz', it)">
          <ion-card-header>
            <ion-icon v-if="it.ikona" :src="typeof it.ikona === 'string' ? it.ikona : undefined" :icon="typeof it.ikona === 'string' ? undefined : it.ikona" aria-hidden="true"></ion-icon>
            <ion-badge v-if="it.licznik" color="danger">{{ it.licznik }}</ion-badge>
            <ion-card-title>{{ it.tytul }}</ion-card-title>
            <ion-card-subtitle>{{ it.podpis }}</ion-card-subtitle>
          </ion-card-header>
        </ion-card>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script setup>
import { IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonIcon, IonBadge, IonCardTitle, IonCardSubtitle } from '@ionic/vue';
defineProps({ lista: Array });
const emit = defineEmits(['wybierz']);
</script>
