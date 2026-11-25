<!-- Klocek 5 górnego paska: awatar z inicjałami (GS) i zieloną kropką; prowadzi do Mojego profilu. -->
<template>
  <ion-button class="oest-ikona oest-ja" data-nav="settings/profile" :aria-label="T('Mój profil', 'My Profile')">{{ inicjaly }}</ion-button>
</template>

<script setup>
import { IonButton } from '@ionic/vue';
defineProps({ inicjaly: String, T: Function });
</script>
