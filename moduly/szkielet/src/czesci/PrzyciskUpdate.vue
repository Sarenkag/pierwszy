<!-- Przycisk Update w zakładkach Zdjęcia i Notatki (Grzegorz 26/11/2026): jeden klocek; przed wysyłką zawsze podgląd (PodgladUpdate).
     u: { tekst, podglad }, ile: ile rzeczy czeka na wysłanie (0 = przygaszony). Stuknięcie: zdarzenie „klik”. -->
<template>
  <ion-item lines="none">
    <ion-button expand="block" :fill="ile ? 'solid' : 'outline'" data-akcja="update" @click="emit('klik')">{{ u.tekst }}<ion-badge v-if="ile" slot="end">{{ ile }}</ion-badge></ion-button>
    <ion-note slot="end">{{ u.podglad }}</ion-note>
  </ion-item>
</template>

<script setup>
import { IonItem, IonButton, IonBadge, IonNote } from '@ionic/vue';
defineProps({ u: Object, ile: Number });
const emit = defineEmits(['klik']);
</script>
