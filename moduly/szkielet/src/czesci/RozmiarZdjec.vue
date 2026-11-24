<!-- Ten sam przełącznik i CSS moduly/przelacznik, w dotychczasowym miejscu ekranu zdjęć. -->
<template>
  <span class="oest-photo-size">
    <button type="button" class="oest-sw" data-sw="photoSize" :data-val="d.value" :style="{ '--n': d.options.length, '--i': d.index }" :aria-label="tekst('Rozmiar zdjęć ogólnych', 'General photo size')" @click="k.akcja()">
      <span class="th" aria-hidden="true"></span>
      <i v-for="(o, i) in d.options" :key="o.v" :data-v="o.v" :class="{ on: i === d.index }" @click.stop="k.akcja(o.v)">{{ tekst(o.pl, o.en) }}</i>
    </button>
  </span>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler || window.OESTZdjecia.rozmiar();
const d = uzyjKontrolera(k);
const jezyk = ref(0);
function tekst(pl, en) { void jezyk.value; return props.T(pl, en); }
function zmienJezyk() { jezyk.value++; }
onMounted(() => {
  window.OESTPrzelacznik.css();
  window.addEventListener('oest:lang', zmienJezyk);
});
onUnmounted(() => window.removeEventListener('oest:lang', zmienJezyk));
</script>

<style>
.oest-photo-size .oest-sw{width:16.5em}
</style>
