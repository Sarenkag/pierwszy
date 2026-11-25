<!-- Wybór rozmiaru zdjęć przez wspólny kontroler i pole Ionic. -->
<template>
  <ion-item>
    <ion-select :label="tekst('Rozmiar zdjęć ogólnych', 'General photo size')" :value="d.value" @ionChange="k.akcja($event.detail.value)">
      <ion-select-option v-for="o in d.options" :key="o.v" :value="o.v">{{ tekst(o.pl, o.en) }}</ion-select-option>
    </ion-select>
  </ion-item>
</template>

<script setup>
import { IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
import { ref, onMounted, onUnmounted } from 'vue';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler || window.OESTZdjecia.rozmiar();
const d = uzyjKontrolera(k);
const jezyk = ref(0);
function tekst(pl, en) { void jezyk.value; return props.T(pl, en); }
function zmienJezyk() { jezyk.value++; }
onMounted(() => {
  window.addEventListener('oest:lang', zmienJezyk);
});
onUnmounted(() => window.removeEventListener('oest:lang', zmienJezyk));
</script>
