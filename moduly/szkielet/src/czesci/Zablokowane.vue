<!-- Znak „wysłane do Vantify” (Grzegorz 26/11/2026): to, co poszło do Vantify, jest szare i nie do zmiany. z: { tekst } („✓ w Vantify, 14:05”). -->
<template>
  <ion-item v-if="z" lines="none"><ion-note color="medium">{{ z.tekst }}</ion-note></ion-item>
</template>

<script setup>
import { IonItem, IonNote } from '@ionic/vue';
defineProps({ z: Object });
</script>
