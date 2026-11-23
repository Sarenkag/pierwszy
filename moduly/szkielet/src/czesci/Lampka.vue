<!-- Lampka stanu – JEDNA w całej apce (Wi‑Fi, Dysk, wysyłka): kolorowa kropka + napis. stan = 'on'|'mid'|'off'|'na'. -->
<template>
  <ion-chip :outline="true" v-bind="$attrs">
    <ion-icon :icon="ellipse" :color="KOLOR[stan] || 'medium'" aria-hidden="true"></ion-icon>
    <ion-label class="ion-text-nowrap">{{ tekst }}</ion-label>
  </ion-chip>
</template>

<script setup>
import { IonChip, IonIcon, IonLabel } from '@ionic/vue';
import { ellipse } from 'ionicons/icons';
defineOptions({ inheritAttrs: false });
defineProps({ stan: String, tekst: String });
const KOLOR = { on: 'success', mid: 'warning', off: 'danger', na: 'medium' };
</script>
