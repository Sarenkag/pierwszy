<!-- Klocek zlecenia Reactive pod zakładkami (Grzegorz 26/11/2026): stoi na każdej zakładce i zbiera to, co jest we wszystkich.
     Nazwa · nr zlecenia w jednej linii (za długa skracana „…”, Grzegorz 26/11 16:50: klocek za wielki), pod nią typ · data i stan;
     po prawej pigułka W trakcie (żółta, zostaje) i ⋮ (stan, części, kosztorys – zamiast osobnego paska nad treścią). k: { nazwa, nr, tryb, typ, data, stan }, wiecej: opis ⋮ albo ''. -->
<template>
  <ion-card>
    <ion-item lines="none">
      <ion-label><LiniaNazwy :nazwa="k.nazwa" :nr="k.nr"></LiniaNazwy><LiniaTypData :typ="k.typ" :data="k.data"></LiniaTypData><LiniaZlecenia :stan="k.stan"></LiniaZlecenia></ion-label>
      <Pigulka slot="end" :T="T" :tryb="k.tryb"></Pigulka>
      <ion-button v-if="wiecej" slot="end" fill="clear" :aria-label="wiecej" @click="emit('wiecej')"><ion-icon slot="icon-only" :icon="ellipsisVertical"></ion-icon></ion-button>
    </ion-item>
  </ion-card>
</template>

<script setup>
import { IonCard, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/vue';
import { ellipsisVertical } from 'ionicons/icons';
import Pigulka from './Pigulka.vue';
import LiniaNazwy from './LiniaNazwy.vue';
import LiniaTypData from './LiniaTypData.vue';
import LiniaZlecenia from './LiniaZlecenia.vue';
defineProps({ T: Function, k: Object, wiecej: String });
const emit = defineEmits(['wiecej']);
</script>
