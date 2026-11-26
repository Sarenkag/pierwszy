<!-- Podgląd przed wysłaniem do Vantify (Grzegorz 26/11/2026, wspólny dla Zdjęć i Notatek): okienko (Okno.vue przez OESTCzesci.okno).
     Wiadomości po angielsku do poprawy, każda osobno; zdjęcia do wysłania. kontroler: { dane() → { wiadomosci: [{ id, etykieta, tekst }], zdjecia: [{ url, tytul }], etZdjecia }, akcja('tekst', i, wartość) }. -->
<template>
  <div>
    <ion-item v-for="(m, i) in d.wiadomosci" :key="m.id"><ion-textarea label-placement="stacked" :label="m.etykieta" :auto-grow="true" :rows="3" :maxlength="20000" :value="m.tekst" @ionInput="e => kontroler.akcja('tekst', i, e.detail.value)"></ion-textarea></ion-item>
    <template v-if="d.zdjecia.length">
      <ion-note>{{ d.etZdjecia }}: {{ d.zdjecia.length }}</ion-note>
      <ion-grid><ion-row><ion-col v-for="(p, i) in d.zdjecia" :key="i" size="4"><ion-img :src="p.url" :alt="p.tytul"></ion-img></ion-col></ion-row></ion-grid>
    </template>
  </div>
</template>

<script setup>
import { IonItem, IonTextarea, IonNote, IonGrid, IonRow, IonCol, IonImg } from '@ionic/vue';
const props = defineProps({ T: Function, kontroler: Object });
const d = props.kontroler.dane();
</script>
