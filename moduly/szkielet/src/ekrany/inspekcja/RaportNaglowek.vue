<template><ion-card-header><ion-img v-if="logo" alt="" :src="logo"></ion-img><ion-card-title>{{ tytul }}</ion-card-title></ion-card-header></template>
<script setup>
import { IonCardHeader, IonCardTitle, IonImg } from '@ionic/vue';
defineProps({ logo: String, tytul: String });
</script>
