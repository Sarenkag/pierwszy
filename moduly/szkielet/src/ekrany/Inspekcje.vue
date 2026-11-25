<!-- Inspekcje (ppm): linia stanu (Wi-Fi, HDD, folder zdjęć – ten sam klocek co ekran główny) i pasek dni (przypięty pod górnym paskiem ramy – nie przewija się, Grzegorz 25.11.2026), filtr grup (czesci/Filtr.vue), lista klocków. Dane i reguły: OESTPpmUI.ppmDane() (app/www/ppm-ui.js) – tu tylko wspólne części. -->
<template>
  <div>
    <Teleport defer to="#oest-pod-paskiem"><LiniaStanu :d="h" :T="T" @okno="okno"></LiniaStanu><PasekDni id="ppmDays" :dni="d.dni" @dzien="P.dzien"></PasekDni></Teleport>
    <Filtr :T="T" :opcje="d.filtry" :wybrane="d.wybrane" :wiele="true" :pusty="T('Wszystkie', 'All')" @zmiana="P.filtry"></Filtr>
    <Klocek v-for="k in d.klocki" :key="(k.fam || '') + '|' + (k.id || '')" :T="T" :k="k" @wybierz="wybierz" @przytrzymaj="przytrzymaj"></Klocek>
    <ion-item v-if="!d.klocki.length" lines="none"><ion-note>{{ d.pusto }}</ion-note></ion-item>
    <div class="ion-padding">
      <ion-button expand="block" fill="outline" @click="P.goInsp('inspekcje/index.html#queue')">{{ T('Kolejka raportów i wysyłka', 'Report queue and sending') }}</ion-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { IonItem, IonNote, IonButton } from '@ionic/vue';
import Filtr from '../czesci/Filtr.vue';
import PasekDni from '../czesci/PasekDni.vue';
import LiniaStanu from '../czesci/LiniaStanu.vue';
import { okno } from './glowny/okna.js';
import Klocek from '../czesci/Klocek.vue';
import { wybierz, przytrzymaj } from '../czesci/listaInspekcji.js';
const props = defineProps({ T: Function, wersja: Number });
const P = window.OESTPpmUI;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, P.ppmDane()));
const h = computed(() => (props.wersja, n.value, window.OESTHome.dane())); // linia stanu: te same dane co ekran główny
onMounted(() => { window.addEventListener('oest:home', odswiez); window.addEventListener('oest:ppm-ui', odswiez); window.addEventListener('oest:settings-changed', odswiez); /* grafik z profilu i zmiany z Kalendarza Google */ const y = P.powrot(); if (y) setTimeout(() => window.OESTEkrany.przewin(y), 0); });
onUnmounted(() => { window.removeEventListener('oest:home', odswiez); window.removeEventListener('oest:ppm-ui', odswiez); window.removeEventListener('oest:settings-changed', odswiez); });
</script>
