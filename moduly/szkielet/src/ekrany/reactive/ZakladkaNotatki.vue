<!-- Zakładka 3 „Notatki” (Grzegorz 26/11/2026): Notatka na start (z dawnymi nagraniami), Co zrobione, Rekomendacja (opcjonalnie), Dodatkowe informacje (opcjonalnie, 27/11/2026) – Napisz / Nagraj;
     Update wysyła do Vantify osobne wiadomości: co zrobione, rekomendacja (gdy jest), na końcu prośba o zatwierdzenie. -->
<template>
  <!-- każda rubryka na osobnej karcie (Grzegorz 27/11/2026: cienka kreska ledwo rozdzielała rubryki) -->
  <ion-card>
    <Notatka :key="'start' + d.jezyk" :T="T" :n="d.start" :opcje="A.notatki('start')" @pole="A.pole"></Notatka>
    <template v-if="d.nagrania.length">
      <p id="rxRecord">{{ d.wczesniej }}</p>
      <Nagrania :T="T" :lista="d.nagrania" :edycja="!d.start.zablokowane"></Nagrania>
    </template>
  </ion-card>
  <ion-card v-for="n in d.koncowe" :key="n.id + d.jezyk">
    <Notatka :T="T" :n="n" :opcje="A.notatki(n.id)" @pole="A.pole"></Notatka>
  </ion-card>
  <ion-card>
    <PrzyciskUpdate :u="d.update" :ile="d.update.notatki" @klik="A.akcja('vt-notatki')"></PrzyciskUpdate>
  </ion-card>
</template>

<script setup>
import { IonCard } from '@ionic/vue';
import Notatka from '../../czesci/Notatka.vue';
import PrzyciskUpdate from '../../czesci/PrzyciskUpdate.vue';
import Nagrania from './Nagrania.vue';
defineProps({ T: Function, d: Object });
const A = window.OESTReactiveUI;
</script>
