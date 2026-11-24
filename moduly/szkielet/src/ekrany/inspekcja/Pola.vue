<!-- Gotowe wartości i ocena pochodzą z i-checklista.js; zdarzenia obsługuje dotychczasowa delegacja. -->
<template>
  <template v-if="rodzaj === 'temperatury'">
    <div v-for="r in d.wiersze" :key="r.i" :class="['tp-row', { bad: r.blad }]">
      <div class="txt">{{ r.nazwa }}<small>{{ r.opis }}</small></div>
      <input type="text" inputmode="decimal" autocomplete="off" :data-t="r.i" :value="r.wartosc" :aria-label="r.etykieta">
    </div>
  </template>
  <template v-else>
    <button v-for="r in d.wiersze" :key="r.id" type="button" class="fault" :data-f="r.id" :aria-pressed="r.wybrany">{{ r.tekst }}</button>
  </template>
</template>

<script setup>
import { uzyjKontrolera } from '../../czesci/kontroler.js';
const props = defineProps({ kontroler: Object, rodzaj: String });
const d = uzyjKontrolera(props.kontroler);
</script>
