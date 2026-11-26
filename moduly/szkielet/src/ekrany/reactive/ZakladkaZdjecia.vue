<!-- Zakładka 2 „Zdjęcia” (Grzegorz 26/11/2026): Przed | Po i Update (podgląd, potem do Vantify tylko te, których tam jeszcze nie ma). -->
<template>
  <ion-card>
    <ion-grid><ion-row>
      <ion-col size="6"><Zdjecia :T="T" :z="d.zdjecia" faza="before" :etykieta="d.zdjecia.etPrzed"></Zdjecia></ion-col>
      <ion-col size="6"><Zdjecia :T="T" :z="d.zdjecia" faza="after" :etykieta="d.zdjecia.etPo"></Zdjecia></ion-col>
    </ion-row></ion-grid>
    <PrzyciskUpdate :u="d.update" :ile="d.update.zdjecia" @klik="A.akcja('vt-zdjecia')"></PrzyciskUpdate>
  </ion-card>
</template>

<script setup>
import { IonCard, IonGrid, IonRow, IonCol } from '@ionic/vue';
import PrzyciskUpdate from '../../czesci/PrzyciskUpdate.vue';
import Zdjecia from './Zdjecia.vue';
defineProps({ T: Function, d: Object });
const A = window.OESTReactiveUI;
</script>
