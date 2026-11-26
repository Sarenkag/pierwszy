<!-- Tekst końcowy Job Sheet (Grzegorz 26/11/2026): zdanie końcowe składa się samo, do wyboru z listy albo własne, zawsze do poprawy.
     t: { etykieta, wartosc, opcje: [{ id, nazwa }], wlasny }; wybór z listy: zdarzenie „wybierz” (tekst), wpis: zdarzenie „pole” (tekst). -->
<template>
  <div>
    <ion-item><ion-select :label="t.etykieta" label-placement="stacked" interface="popover" :placeholder="t.wlasny" :value="t.opcje.some(o => o.id === t.wartosc) ? t.wartosc : undefined" data-akcja="tekst-koncowy" @ionChange="e => emit('wybierz', e.detail.value)"><ion-select-option v-for="o in t.opcje" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option></ion-select></ion-item>
    <ion-item><ion-textarea :aria-label="t.etykieta" :auto-grow="true" :rows="2" :maxlength="4000" :value="t.wartosc" @ionInput="e => emit('pole', e.detail.value)"></ion-textarea></ion-item>
  </div>
</template>

<script setup>
import { IonItem, IonSelect, IonSelectOption, IonTextarea } from '@ionic/vue';
defineProps({ t: Object });
const emit = defineEmits(['wybierz', 'pole']);
</script>
