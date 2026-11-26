<!-- ⋮ na ekranie zlecenia Reactive: Stan, części, kosztorys, Odłóż (przeniesione z dawnej karty bez zmian). -->
<template>
  <ion-card>
    <div>{{ w.etykieta }}</div>
    <Chipy :opcje="w.statusy" rx="status" klucz="status"></Chipy>
    <template v-if="w.czesci">
      <ion-item><ion-input label-placement="stacked" :label="w.czesci.etCzesci" data-rx-field="partsNote" :maxlength="300" :value="w.czesci.partsNote" @ionInput="e => A.pole('partsNote', e.detail.value)"></ion-input></ion-item>
      <PoleDaty :T="T" id="rxExpected" :label="w.czesci.etData" :value="w.czesci.expectedDate" data-rx-field="expectedDate" @zmiana="v => A.pole('expectedDate', v)"></PoleDaty>
    </template>
    <ion-item><ion-checkbox label-placement="end" justify="start" data-rx-field="quote" :checked="w.quote.on" @ionChange="e => A.pole('quote', e.detail.checked)">{{ w.quote.etykieta }}</ion-checkbox></ion-item>
    <div><ion-button fill="outline" data-akcja="park" @click="A.akcja('park')">{{ w.odloz }}</ion-button></div>
  </ion-card>
</template>

<script setup>
import { IonCard, IonItem, IonInput, IonCheckbox, IonButton } from '@ionic/vue';
import PoleDaty from '../../czesci/PoleDaty.vue';
import Chipy from './Chipy.vue';
defineProps({ T: Function, w: Object });
const A = window.OESTReactiveUI;
</script>
