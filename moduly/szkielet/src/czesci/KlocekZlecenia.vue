<!-- Klocek zlecenia Reactive pod zakładkami (Grzegorz 26/11/2026): stoi na każdej zakładce i zbiera to, co jest we wszystkich.
     Jedna zwarta linia: nazwa · nr zlecenia, typ · data, stan; pigułka W trakcie (żółta, zostaje) po prawej. k: { nazwa, nr, tryb, typ, data, stan }. -->
<template>
  <ion-card>
    <ion-item lines="none">
      <ion-label><LiniaNazwy :nazwa="k.nazwa" :nr="k.nr"></LiniaNazwy><LiniaTypData :typ="k.typ" :data="k.data"></LiniaTypData><LiniaZlecenia :stan="k.stan"></LiniaZlecenia></ion-label>
      <Pigulka slot="end" :T="T" :tryb="k.tryb"></Pigulka>
    </ion-item>
  </ion-card>
</template>

<script setup>
import { IonCard, IonItem, IonLabel } from '@ionic/vue';
import Pigulka from './Pigulka.vue';
import LiniaNazwy from './LiniaNazwy.vue';
import LiniaTypData from './LiniaTypData.vue';
import LiniaZlecenia from './LiniaZlecenia.vue';
defineProps({ T: Function, k: Object });
</script>
