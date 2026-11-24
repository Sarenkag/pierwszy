<!-- Tylko widok: kolejność, treść i stan pochodzą z i-checklista.js.
     Zachowane elementy i klasy są kontraktem insp.css, form-ui.js i delegacji zdarzeń. -->
<template>
  <template v-for="r in d.wiersze" :key="r.i">
    <div v-if="r.pokoj" class="room-h"><b>{{ r.pokoj.nazwa }}</b><span>{{ r.pokoj.miejsce }}</span></div>
    <div :class="['ck-row', r.stan]">
      <div :class="['txt', { prevq: r.poprzednio }]">
        <span v-if="r.sugestia" class="mkn">{{ r.sugestia }}</span>{{ r.tekst }}<small v-if="r.poprzednio" class="was">ostatnio NIE ({{ r.data }})</small>
      </div>
      <div class="seg" role="group" :aria-label="r.etykieta">
        <button v-for="b in r.przyciski" :key="b.stan" type="button" :class="[b.klasa, { on: r.stan === b.stan }]" :data-i="r.i" :data-s="b.stan" :aria-label="b.etykieta" :aria-pressed="r.stan === b.stan" :style="d.pytania ? { width: '58px' } : undefined">{{ b.tekst }}</button>
      </div>
      <div v-if="r.powody.length" class="chips rs">
        <button v-for="p in r.powody" :key="p.id" type="button" :class="['rchip', { prev: p.poprzednio }]" :data-ri="r.i" :data-r="p.id" :aria-pressed="p.wybrany">{{ p.tekst }}</button>
      </div>
    </div>
    <input v-if="r.uwaga" class="room-note" type="text" :data-room="r.uwaga.id" :value="r.uwaga.tekst" :placeholder="r.uwaga.podpowiedz" :aria-label="r.uwaga.etykieta">
  </template>
</template>

<script setup>
import { uzyjKontrolera } from '../../czesci/kontroler.js';
const props = defineProps({ kontroler: Object, T: Function });
const d = uzyjKontrolera(props.kontroler);
</script>
