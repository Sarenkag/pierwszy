<!-- Notatka zlecenia Reactive (Grzegorz 26/11/2026): Notatka na start, Co zrobione, Rekomendacja (opcjonalnie) – ten sam klocek.
     Napisz albo Nagraj (pasek notatek, czesci/Notatki.vue), tekst do poprawy; wysłana do Vantify = szara, bez zmian (Zablokowane).
     n: { id, etykieta, pole, wartosc, podpowiedz, licznik, zablokowane }, opcje: OESTReactiveUI.notatki(id). Wpis: zdarzenie „pole” (klucz, wartość). -->
<template>
  <div>
    <ion-item lines="none"><ion-label>{{ n.etykieta }}</ion-label><ion-badge v-if="n.licznik" slot="end">{{ n.licznik }}</ion-badge></ion-item>
    <Zablokowane :z="n.zablokowane"></Zablokowane>
    <Notatki v-if="!n.zablokowane && opcje" :T="T" :opcje="opcje"></Notatki>
    <ion-item><ion-textarea :aria-label="n.etykieta" :disabled="!!n.zablokowane" :maxlength="20000" :rows="3" :auto-grow="true" :placeholder="n.podpowiedz" :value="n.wartosc" @ionInput="e => emit('pole', n.pole, e.detail.value)"></ion-textarea></ion-item>
  </div>
</template>

<script setup>
import { IonItem, IonLabel, IonBadge, IonTextarea } from '@ionic/vue';
import Notatki from './Notatki.vue';
import Zablokowane from './Zablokowane.vue';
defineProps({ T: Function, n: Object, opcje: Object });
const emit = defineEmits(['pole']);
</script>
