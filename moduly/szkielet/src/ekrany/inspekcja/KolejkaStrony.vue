<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template>
    <NaglowekInspekcji data-ui="top"><ion-button slot="start" data-ui="back" type="button" data-go="home" aria-label="Wstecz" data-en-aria-label="Back">‹</ion-button>
      <ion-grid data-ui="t"><ion-title><ion-text data-en="Queue">Kolejka</ion-text><ion-text data-ui="dot">.</ion-text></ion-title></ion-grid></NaglowekInspekcji>
    <ion-grid id="queueBox"></ion-grid>
  </template>

<script setup>
import { IonCard } from '@ionic/vue';
import NaglowekInspekcji from '../../czesci/NaglowekInspekcji.vue';
import { IonGrid, IonButton, IonTitle, IonText } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';
</script>
