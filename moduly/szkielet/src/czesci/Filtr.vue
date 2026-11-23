<!-- Filtr listy – JEDEN w całej apce (Grzegorz 23/11/2026: przyciski sortowania to wspólna część): lista Inspekcji (grupy + Rozpoczęte),
     Reactive (Aktywne / Zakończone / Wszystkie) i inne listy. Wybór z listy = ion-select (reguła „jeden sposób na pole”).
       <Filtr :T="T" :opcje="[{ id, nazwa }]" :wybrane="[id] | id" :wiele="true" :pusty="T('Wszystkie', 'All')" @zmiana="ids => …"></Filtr>
     wiele = kilka naraz (brak wyboru = wszystkie); bez „wiele” – jedna opcja. -->
<template>
  <ion-item>
    <ion-select :label="etykieta || T('Filtr', 'Filter')" :multiple="wiele" :value="wybrane" :placeholder="pusty" :cancel-text="T('Anuluj', 'Cancel')" ok-text="OK" interface="alert" @ionChange="emit('zmiana', $event.detail.value)">
      <ion-select-option v-for="o in opcje" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option>
    </ion-select>
  </ion-item>
</template>

<script setup>
import { IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
defineProps({ T: Function, etykieta: String, opcje: Array, wybrane: [Array, String], wiele: Boolean, pusty: String });
const emit = defineEmits(['zmiana']);
</script>
