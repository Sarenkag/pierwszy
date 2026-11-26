<!-- Jedno pole karty Reactive (jak .rx-fr na main): etykieta · wartość (albo podpowiedź) · licznik · ▾/▴. Stuknięcie: OESTReactiveUI.akcja('row', { id }). -->
<template>
  <ion-item button :detail="!pod" :disabled="disabled" data-rx="row" :data-id="id" :data-on="otwarty || undefined" @click="A.akcja('row', { id })">
    <ion-label :position="pod ? 'stacked' : undefined">{{ etykieta }}</ion-label>
    <ion-text v-if="pod">{{ tekst || podpowiedz || wybierz }}</ion-text><!-- pod: wartość pod etykietą, jak para Kto | Gdzie na main -->
    <ion-note v-else slot="end">{{ tekst || podpowiedz || wybierz }}</ion-note>
    <ion-badge v-if="licznik && !otwarty" slot="end" :data-ntc="id">{{ licznik }}</ion-badge>
  </ion-item>
</template>

<script setup>
import { IonItem, IonLabel, IonNote, IonBadge, IonText } from '@ionic/vue';
defineProps({ disabled: Boolean, pod: Boolean, id: String, etykieta: String, tekst: String, podpowiedz: String, wybierz: String, otwarty: Boolean, licznik: String });
const A = window.OESTReactiveUI;
</script>
