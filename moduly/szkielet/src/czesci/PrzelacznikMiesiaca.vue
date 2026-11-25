<!-- Klocek: przełącznik miesiąca w Kalendarzu – ‹ miesiąc rok ›, cały rząd na środku (Grzegorz 25.11.2026). Część treści ekranu, nie headera (w pasku AkcjeEkranu.vue). -->
<template>
  <div class="ion-display-flex ion-justify-content-center"><ion-buttons>
    <ion-button :aria-label="T('Poprzedni miesiąc', 'Previous month')" @click="emit('zmien', -1)"><ion-icon slot="icon-only" :icon="caretBack"></ion-icon></ion-button>
    <ion-label class="ion-text-capitalize"><strong>{{ miesiac }}</strong></ion-label>
    <ion-button :aria-label="T('Następny miesiąc', 'Next month')" @click="emit('zmien', 1)"><ion-icon slot="icon-only" :icon="caretForward"></ion-icon></ion-button>
  </ion-buttons></div>
</template>

<script setup>
import { IonButtons, IonButton, IonIcon, IonLabel } from '@ionic/vue';
import { caretBack, caretForward } from 'ionicons/icons';
defineProps({ miesiac: String, T: Function });
const emit = defineEmits(['zmien']);
</script>
