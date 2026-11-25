<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template>
    <AkcjeEkranu :akcje="[]"><ion-note id="listSub"></ion-note></AkcjeEkranu>
    <ion-grid data-ui="ppmbar" hidden></ion-grid>
    <ion-item><ion-input data-ui="search" id="search" type="search" placeholder="Szukaj kodu, np. LL-UG" data-en-placeholder="Search code, e.g. LL-UG" autocomplete="off" spellcheck="false"></ion-input></ion-item>
    <ion-card data-ui="panel" id="batchBar" hidden></ion-card>
    <ion-grid id="groups"></ion-grid>
    <ion-card data-ui="panel">
      <ion-label data-ui="label" for="customCode" data-en="Other device">Inne urządzenie</ion-label>
      <ion-grid data-ui="addrow"><ion-item><ion-input id="customCode" type="text" placeholder="np. DB-TA-L3-01" data-en-placeholder="e.g. DB-TA-L3-01" autocapitalize="characters" spellcheck="false"></ion-input></ion-item><WyborInspekcji id="customLoc" aria-label="Lokalizacja" data-en-aria-label="Location"><ion-select-option value="Tower A">Tower A</ion-select-option><ion-select-option value="Tower B">Tower B</ion-select-option><ion-select-option value="Pavilion">Pavilion</ion-select-option></WyborInspekcji><ion-button data-ui="btn" type="button" id="customGo" data-en="Add">Dodaj</ion-button></ion-grid>
      <ion-note data-ui="hint" data-en="The device stays on the list permanently, with this location.">Urządzenie zostanie na liście na stałe, z tą lokalizacją.</ion-note>
    </ion-card>
  </template>

<script setup>
import { IonCard } from '@ionic/vue';
import AkcjeEkranu from '../../czesci/AkcjeEkranu.vue';
import { IonGrid, IonButton, IonTitle, IonItem, IonInput, IonLabel, IonSelectOption, IonNote } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';
</script>
