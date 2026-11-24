<template>
  <ion-card>
    <ion-img :src="src" :alt="alt" />
    <ion-card-content><slot /></ion-card-content>
  </ion-card>
</template>
<script setup>
import { IonCard, IonCardContent, IonImg } from '@ionic/vue';
defineProps({ src: String, alt: { type: String, default: '' } });
</script>
