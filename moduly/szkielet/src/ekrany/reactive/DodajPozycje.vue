<!-- „＋ Dodaj” w kreatorze Reactive: własna pozycja grupy (po angielsku do raportu, po polsku opcjonalnie). Zapis: OESTReactiveUI.akcja('kr-add', { en, pl }). -->
<template>
  <div class="oest-kolumna">
    <ion-item><ion-input class="oest-rx-kr-new" label-placement="stacked" :label="T('Nazwa po angielsku (trafia do raportu)', 'Name in English (goes into the report)')" :maxlength="60" :value="en" @ionInput="e => { en = e.detail.value || ''; wyslij(); }"></ion-input></ion-item>
    <ion-item><ion-input class="oest-rx-kr-pl" label-placement="stacked" :label="T('Po polsku (opcjonalnie)', 'In Polish (optional)')" :maxlength="60" :value="pl" @ionInput="e => { pl = e.detail.value || ''; wyslij(); }"></ion-input></ion-item>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { IonItem, IonInput } from '@ionic/vue';
defineProps({ T: Function });
const emit = defineEmits(['dane']);
const en = ref(''), pl = ref('');
function wyslij() { emit('dane', { en: en.value, pl: pl.value }); }
</script>
