<!-- Kafelki – siatka 2 kolumny z JEDNYM klockiem Kafel.vue powtórzonym dla każdej pozycji (ekran główny, Ustawienia, Reactive, wybór rodzaju inspekcji).
     Karty w rzędzie równej wysokości (.oest-rowne – jedna reguła „przyciski w grupie równe”). Lista z modułu: [{ id, trasa, ikona, tytul, podpis, licznik }] -->
<template>
  <ion-grid class="oest-kafelki oest-rowne">
    <ion-row>
      <ion-col size="6" v-for="it in lista" :key="it.id">
        <Kafel :it="it" :zastane="zastane" @wybierz="x => emit('wybierz', x)">
          <template #ikona="{ element }"><slot name="ikona" :element="element"></slot></template>
        </Kafel>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script setup>
import { IonGrid, IonRow, IonCol } from '@ionic/vue';
import Kafel from './Kafel.vue';
defineProps({ lista: Array, zastane: Boolean, klasa: String });
const emit = defineEmits(['wybierz']);
</script>
