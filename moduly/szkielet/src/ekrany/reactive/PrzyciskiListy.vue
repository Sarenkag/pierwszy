<!-- Przyciski na górze listy Reactive (Grzegorz 27/11/2026: „zmniejszamy go o połowę… nowe zadanie, a drugi templates”): dwa równe obok siebie. -->
<template>
  <ion-grid class="ion-padding-horizontal ion-padding-top"><ion-row>
    <ion-col size="6"><ion-button expand="block" data-rx="new" @click="A.akcja('new')">{{ nowe }}</ion-button></ion-col>
    <ion-col size="6"><ion-button expand="block" data-rx="tpl-list" @click="A.akcja('tpl-list')">{{ szablony }}</ion-button></ion-col>
  </ion-row></ion-grid>
</template>

<script setup>
import { IonGrid, IonRow, IonCol, IonButton } from '@ionic/vue';
defineProps({ nowe: String, szablony: String });
const A = window.OESTReactiveUI;
</script>
