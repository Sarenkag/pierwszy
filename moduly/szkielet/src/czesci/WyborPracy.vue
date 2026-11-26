<!-- Wybór pracy w zakładce Zamknięcie (Grzegorz 26/11/2026): Completed / Not completed / Temporary repair / Inspected – fault confirmed;
     wybrany trafia na koniec tekstu Job Sheet. w: { etykieta, wartosc, opcje: [{ id, nazwa }] }; wybór: zdarzenie „wybierz” (id). -->
<template>
  <ion-item><ion-select :label="w.etykieta" label-placement="stacked" interface="popover" :value="w.wartosc || undefined" data-akcja="praca" @ionChange="e => emit('wybierz', e.detail.value)"><ion-select-option v-for="o in w.opcje" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option></ion-select></ion-item>
</template>

<script setup>
import { IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
defineProps({ w: Object });
const emit = defineEmits(['wybierz']);
</script>
