<template>
  <template v-for="(sekcja, i) in d.sekcje" :key="i">
    <div class="sct">{{ sekcja.tytul }}</div>
    <label v-for="r in sekcja.pola" :key="r.klucz || r.wartosc" :class="['need', { dis: r.blokada }]">
      <input :type="r.radio ? 'radio' : 'checkbox'" :data-sn="r.radio ? undefined : r.klucz" :name="r.radio ? 'sn-one' : undefined" :value="r.radio ? r.wartosc : undefined" :checked="r.wybrane" :disabled="r.blokada">
      <span>{{ r.tekst }}<template v-if="r.uwaga"> <small>{{ r.uwaga }}</small></template></span>
    </label>
  </template>
</template>
<script setup>
import { uzyjKontrolera } from '../../czesci/kontroler.js';
const props = defineProps({ kontroler: Object });
const d = uzyjKontrolera(props.kontroler);
</script>
