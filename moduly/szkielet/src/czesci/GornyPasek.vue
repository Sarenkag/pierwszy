<!-- Klocek 1 górnego paska ramy (Grzegorz 25.11.2026): sam pasek – tło, nieruchomy u góry, pod godziną i baterią, bez ostrej krawędzi.
     Składa 4 osobne klocki: LogoTytul (logo + tytuł ekranu + data i pogoda), PrzelacznikJezyka (PL|EN), Dzwonek, Awatar (GS).
     Ten sam na każdym ekranie; zmienia się tylko tytuł. Linia Wi-Fi/HDD i pasek dni to osobne klocki. Dane: d = OESTHome.dane(). -->
<template>
  <ion-header class="ion-no-border oest-glowny">
    <ion-toolbar>
      <LogoTytul :tytul="tytul" :data="d.data" :pogoda="d.pogoda" @pogoda="emit('okno', 'wx')" />
      <ion-buttons slot="end">
        <PrzelacznikJezyka :jezyk="T('pl', 'en')" :T="T" @zmien="emit('jezyk')" />
        <Dzwonek :licznik="d.dzwonek" :T="T" @otworz="emit('okno', 'bell')" />
        <Awatar :inicjaly="d.inicjaly" :T="T" />
      </ion-buttons>
    </ion-toolbar>
    <slot></slot><!-- stałe klocki pod paskiem danego ekranu (linia stanu, pasek dni) – nie przewijają się -->
  </ion-header>
</template>

<script setup>
import { IonHeader, IonToolbar, IonButtons } from '@ionic/vue';
import LogoTytul from './LogoTytul.vue';
import PrzelacznikJezyka from './PrzelacznikJezyka.vue';
import Dzwonek from './Dzwonek.vue';
import Awatar from './Awatar.vue';
defineProps({ tytul: String, d: Object, T: Function });
const emit = defineEmits(['okno', 'jezyk']);
</script>
