<!-- Jedno pole karty Reactive (jak .rx-fr na main): etykieta · wartość (albo podpowiedź) · licznik · ▾/▴. Stuknięcie: OESTReactiveUI.akcja('row', { id }). -->
<template>
  <ion-item button :detail="false" lines="none" class="oest-rx-fr" data-rx="row" :data-id="id" :data-on="otwarty || undefined" @click="A.akcja('row', { id })">
    <div class="oest-rx-fr-w">
      <span class="oest-rx-k">{{ etykieta }}</span>
      <span class="oest-rx-v" :data-ph="!tekst || undefined">{{ tekst || podpowiedz || wybierz }}</span>
      <span v-if="licznik && !otwarty" class="oest-rx-ntc" :data-ntc="id">{{ licznik }}</span>
      <span class="oest-rx-ar">{{ otwarty ? '▴' : '▾' }}</span>
    </div>
  </ion-item>
</template>

<script setup>
import { IonItem } from '@ionic/vue';
defineProps({ id: String, etykieta: String, tekst: String, podpowiedz: String, wybierz: String, otwarty: Boolean, licznik: String });
const A = window.OESTReactiveUI;
</script>
