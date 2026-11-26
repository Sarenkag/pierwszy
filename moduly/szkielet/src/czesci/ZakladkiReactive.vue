<!-- Zakładki zlecenia Reactive (Grzegorz 26/11/2026, wariant B): 4 wąskie zakładki Zlecenie · Zdjęcia · Notatki · Zamknięcie, stoją pod paskiem.
     Zielona zakładka = to, co w niej jest, poszło do Vantify. z: { aktywna, lista: [{ id, tekst, wyslane }] }; stuknięcie: zdarzenie „wybierz” (id). -->
<template>
  <ion-grid class="ion-no-padding"><ion-row>
    <ion-col v-for="t in z.lista" :key="t.id" size="3">
      <ion-button expand="block" size="small" :fill="t.id === z.aktywna ? 'solid' : 'outline'" :color="t.wyslane ? 'success' : undefined" data-akcja="zakladka" :data-id="t.id" :aria-pressed="t.id === z.aktywna" @click="emit('wybierz', t.id)">{{ t.tekst }}</ion-button>
    </ion-col>
  </ion-row></ion-grid>
</template>

<script setup>
import { IonGrid, IonRow, IonCol, IonButton } from '@ionic/vue';
defineProps({ T: Function, z: Object });
const emit = defineEmits(['wybierz']);
</script>
