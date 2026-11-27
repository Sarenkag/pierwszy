<!-- Karta urządzenia szablonu (Templates, Grzegorz 27/11/2026, np. Firmware update): pola z app/www/reactive-szablony.js.
     Idą tylko do Job Sheetu (sekcja „Device details”), nie do Vantify – dlatego nie blokują się po założeniu zlecenia. -->
<template>
  <div>
    <ion-list-header><ion-label>{{ k.etykieta }}</ion-label></ion-list-header>
    <ion-item v-for="p in k.pola" :key="p.id"><ion-input :label="p.etykieta" label-placement="stacked" :maxlength="200" :data-tpl-pole="p.id" :value="p.wartosc" @ionInput="e => A.akcja('tpl-pole', { id: p.id, value: e.detail.value })"></ion-input></ion-item>
  </div>
</template>

<script setup>
import { IonListHeader, IonLabel, IonItem, IonInput } from '@ionic/vue';
defineProps({ k: Object });
const A = window.OESTReactiveUI;
</script>
