<!-- Jedno pole karty Reactive (jak .rx-fr na main): etykieta · wartość (albo podpowiedź) · licznik · ▾/▴. Stuknięcie: OESTReactiveUI.akcja('row', { id }). -->
<template>
  <ion-item button :detail="true" data-rx="row" :data-id="id" :data-on="otwarty || undefined" @click="A.akcja('row', { id })">
    <ion-label>{{ etykieta }}</ion-label>
    <ion-note slot="end">{{ tekst || podpowiedz || wybierz }}</ion-note>
    <ion-badge v-if="licznik && !otwarty" slot="end" :data-ntc="id">{{ licznik }}</ion-badge>
  </ion-item>
</template>

<script setup>
import { IonItem, IonLabel, IonNote, IonBadge } from '@ionic/vue';
defineProps({ id: String, etykieta: String, tekst: String, podpowiedz: String, wybierz: String, otwarty: Boolean, licznik: String });
const A = window.OESTReactiveUI;
</script>
