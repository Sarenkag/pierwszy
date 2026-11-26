<!-- Klocek zlecenia Reactive pod zakładkami (Grzegorz 26/11/2026): stoi na każdej zakładce i zbiera to, co jest we wszystkich.
     Linia 1: nazwa + nr zlecenia · pigułka W trakcie (żółta, zostaje) · typ · data · linia stanu. k: { nazwa, nr, tryb, typ, data, stan }. -->
<template>
  <ion-card>
    <LiniaNazwy :nazwa="k.nazwa" :nr="k.nr"></LiniaNazwy>
    <ion-item lines="none"><Pigulka :T="T" :tryb="k.tryb"></Pigulka></ion-item>
    <LiniaTypData :typ="k.typ" :data="k.data"></LiniaTypData>
    <LiniaZlecenia :stan="k.stan"></LiniaZlecenia>
  </ion-card>
</template>

<script setup>
import { IonCard, IonItem } from '@ionic/vue';
import Pigulka from './Pigulka.vue';
import LiniaNazwy from './LiniaNazwy.vue';
import LiniaTypData from './LiniaTypData.vue';
import LiniaZlecenia from './LiniaZlecenia.vue';
defineProps({ T: Function, k: Object });
</script>
