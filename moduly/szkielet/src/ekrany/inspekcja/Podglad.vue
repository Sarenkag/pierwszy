<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template>
    <AkcjeEkranu :akcje="[]"><ion-note id="prevSub"></ion-note></AkcjeEkranu>
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
import AkcjeEkranu from '../../czesci/AkcjeEkranu.vue';
import { IonGrid, IonButton, IonNote } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';
</script>
