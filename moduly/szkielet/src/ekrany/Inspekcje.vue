<!-- Inspekcje (ppm): pasek dni, filtr grup, lista klocków. Dane i reguły: OESTPpmUI.ppmDane() (app/www/ppm-ui.js) – tu tylko wspólne części. -->
<template>
  <div>
    <PasekDni :dni="d.dni" @dzien="P.dzien"></PasekDni>
    <ion-item>
      <ion-select :label="T('Filtr', 'Filter')" :multiple="true" :value="d.wybrane" :placeholder="T('Wszystkie', 'All')" :cancel-text="T('Anuluj', 'Cancel')" ok-text="OK" @ionChange="P.filtry($event.detail.value)">
        <ion-select-option v-for="f in d.filtry" :key="f.id" :value="f.id">{{ f.nazwa }}</ion-select-option>
      </ion-select>
    </ion-item>
    <Klocek v-for="k in d.klocki" :key="(k.fam || '') + '|' + (k.id || '')" :T="T" :k="k" @wybierz="wybierz" @przytrzymaj="przytrzymaj"></Klocek>
    <ion-item v-if="!d.klocki.length" lines="none"><ion-note>{{ d.pusto }}</ion-note></ion-item>
    <div class="ion-padding">
      <ion-button expand="block" fill="outline" @click="P.goInsp('inspekcje/index.html#queue')">{{ T('Kolejka raportów i wysyłka', 'Report queue and sending') }}</ion-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { IonItem, IonSelect, IonSelectOption, IonNote, IonButton } from '@ionic/vue';
import PasekDni from '../czesci/PasekDni.vue';
import Klocek from '../czesci/Klocek.vue';
import { wybierz, przytrzymaj } from '../czesci/listaInspekcji.js';
const props = defineProps({ T: Function, wersja: Number });
const P = window.OESTPpmUI;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, P.ppmDane()));
onMounted(() => { window.addEventListener('oest:ppm-ui', odswiez); const y = P.powrot(); if (y) setTimeout(() => window.OESTEkrany.przewin(y), 0); });
onUnmounted(() => window.removeEventListener('oest:ppm-ui', odswiez));
</script>
