<!-- Kafel – JEDEN klocek kafelka w całej apce (Grzegorz 25.11.2026: „jeden klocek zduplikowany 8 razy”). Kafelki.vue tylko go powtarza.
     Stałe miejsca: ikona w gradientowym kwadracie, nazwa, podpis (gdy jest), licznik w rogu. Wygląd: szkielet.css (.oest-kafelki).
     it = { id, trasa (data-nav) | bez trasy = zdarzenie „wybierz”, ikona (adres svg albo ikona ionicons), tytul, podpis, licznik } -->
<template>
  <ion-card button :data-nav="it.trasa || undefined" :data-id="it.id" :data-type="zastane ? it.id : undefined" @click="!it.trasa && emit('wybierz', it)">
    <ion-card-header>
      <slot name="ikona" :element="it"></slot>
      <ion-icon v-if="it.ikona" :src="typeof it.ikona === 'string' ? it.ikona : undefined" :icon="typeof it.ikona === 'string' ? undefined : it.ikona" aria-hidden="true"></ion-icon>
      <ion-badge v-if="it.licznik" color="danger">{{ it.licznik }}</ion-badge>
      <ion-card-title>{{ it.tytul }}</ion-card-title>
      <ion-card-subtitle :ref="el => rezerwuj(el && el.$el, it.podpisAlt)">{{ it.podpis }}</ion-card-subtitle>
    </ion-card-header>
  </ion-card>
</template>

<script setup>
import { IonCard, IonCardHeader, IonIcon, IonBadge, IonCardTitle, IonCardSubtitle } from '@ionic/vue';
defineProps({ it: Object, zastane: Boolean });
const emit = defineEmits(['wybierz']);
function rezerwuj(el, tekst) { if (el && tekst != null && window.OESTPodmien) window.OESTPodmien.miejsce(el, tekst); }
</script>
