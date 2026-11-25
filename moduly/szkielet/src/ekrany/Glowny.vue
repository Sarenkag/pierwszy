<!-- Ekran główny (Grzegorz 25.11.2026): stały górny pasek jest w ramie (czesci/GornyPasek.vue, tytuł „MENU GŁÓWNE”). Tu: linia stanu
     i pasek dni – przypięte pod paskiem (nie przewijają się), oraz menu główne (8 kafelków). Ekran stoi w miejscu, bez przewijania.
     Dane: OESTHome.dane() (app/www/home.js) – tu tylko wspólne części. -->
<template>
  <Teleport defer to="#oest-pod-paskiem">
    <LiniaStanu id="hmSt" :d="d" :T="T" @okno="okno"></LiniaStanu>
    <PasekDni id="hmDays" :dni="d.dni" @dzien="dzien"></PasekDni>
  </Teleport>
  <MenuGlowne id="hmTiles" :kafelki="d.kafelki" @wybierz="it => it.id === 'news' && okno('news')"></MenuGlowne>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import LiniaStanu from '../czesci/LiniaStanu.vue';
import PasekDni from '../czesci/PasekDni.vue';
import MenuGlowne from '../czesci/MenuGlowne.vue';
import { okno } from './glowny/okna.js';
const props = defineProps({ T: Function, wersja: Number });
const H = window.OESTHome;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, H.dane()));
function dzien(k) { window.OESTPpmUI.ustawDzien(k); window.OESTEkrany.go('ppm'); }
onMounted(() => { window.addEventListener('oest:home', odswiez); window.addEventListener('oest:ppm-ui', odswiez); window.addEventListener('oest:settings-changed', odswiez); /* grafik z profilu i zmiany z Kalendarza Google */ H.odswiez(false); });
onUnmounted(() => { window.removeEventListener('oest:home', odswiez); window.removeEventListener('oest:ppm-ui', odswiez); window.removeEventListener('oest:settings-changed', odswiez); });
</script>
