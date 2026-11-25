<!-- Klocek 4 górnego paska: dzwonek z czerwonym licznikiem. -->
<template>
  <ion-button class="oest-ikona" @click="emit('otworz')" :aria-label="T('Powiadomienia', 'Notifications')">
    <ion-icon slot="icon-only" :icon="notificationsOutline"></ion-icon><ion-badge v-if="licznik" color="danger">{{ licznik }}</ion-badge>
  </ion-button>
</template>

<script setup>
import { IonButton, IonIcon, IonBadge } from '@ionic/vue';
import { notificationsOutline } from 'ionicons/icons';
defineProps({ licznik: Number, T: Function });
const emit = defineEmits(['otworz']);
</script>
