<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template>
    <NaglowekInspekcji data-ui="top"><ion-button slot="start" data-ui="back" type="button" data-go="form" aria-label="Wróć do edycji" data-en-aria-label="Back to editing">‹</ion-button>
      <ion-grid data-ui="t"><ion-title><ion-text data-en="Preview">Podgląd</ion-text><ion-text data-ui="dot">.</ion-text></ion-title><ion-grid data-ui="sub" id="prevSub"></ion-grid></ion-grid></NaglowekInspekcji>
    <ion-grid data-ui="wrapscroll"><ion-grid data-ui="paper" id="paper"></ion-grid></ion-grid>
    <ion-card data-ui="panel">
      <ion-grid data-ui="label" data-en="Files">Pliki</ion-grid>
      <ion-grid data-ui="fname" id="fname">—</ion-grid>
      <ion-button data-ui="go" id="prevQueue" type="button" data-en="To queue">Do kolejki</ion-button>
      <ion-button data-ui="btn wide" type="button" id="editBtn" data-en="Back to editing">Wróć do edycji</ion-button>
    </ion-card>
  </template>

<script setup>
import { IonCard } from '@ionic/vue';
import NaglowekInspekcji from '../../czesci/NaglowekInspekcji.vue';
import { IonGrid, IonButton, IonTitle, IonText } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';
</script>
