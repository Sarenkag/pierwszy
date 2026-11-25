<!-- Klocek: jedna miniatura zdjęcia (zdjęcie + numer pod nim). Składa ją PasekZdjec.vue – jedno miejsce wyglądu miniatur w całej apce
     (Grzegorz 25.11.2026). Dotknięcie = zdarzenie „wybierz”; co dalej, decyduje pasek. Slot: dodatkowe znaczniki pod zdjęciem. -->
<template>
  <ion-card button :aria-label="alt" @click="emit('wybierz')">
    <ion-img :src="src" :alt="alt" />
    <ion-card-content><ion-badge color="medium">{{ numer }}</ion-badge><slot /></ion-card-content>
  </ion-card>
</template>

<script setup>
import { IonCard, IonCardContent, IonImg, IonBadge } from '@ionic/vue';
defineProps({ src: String, alt: { type: String, default: '' }, numer: [Number, String] });
const emit = defineEmits(['wybierz']);
</script>
