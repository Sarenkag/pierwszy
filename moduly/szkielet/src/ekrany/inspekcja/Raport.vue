<!-- Podgląd jest widokiem danych raportu; generowanie Word/PDF pozostaje w JS. -->
<template>
  <template v-if="d.rodzaj === 'pliki'">
    <template v-if="d.brakPdf"><template v-for="(f, n) in d.pliki" :key="n"><br v-if="n">{{ f.name }}</template><br><b>{{ d.blad }}</b></template>
    <template v-else><template v-for="(f, n) in d.pliki" :key="n"><br v-if="n">{{ f.nazwa }}<em>{{ f.rozszerzenie }}</em>{{ f.opis }}</template></template>
  </template>
  <template v-else-if="d.rodzaj === 'temperatury' || d.rodzaj === 'flush'">
    <b>{{ d.tytul }}</b><p>{{ d.podpis }}</p><table><template v-for="(r, n) in d.wiersze" :key="n"><tr v-if="r.grupa"><td colspan="2"><b>{{ r.grupa }}</b></td></tr><tr><td class="k">{{ r.nazwa }}<template v-if="r.opis"><br><small>{{ r.opis }}</small></template></td><td :style="r.blad ? { color: 'var(--bad)' } : undefined">{{ r.wartosc }}<template v-if="r.uwaga"><br><small>{{ r.uwaga }}</small></template></td></tr></template></table><p><b>{{ d.stan }}.</b></p>
    <div v-for="(p, n) in d.zdjecia" :key="n" class="pimg"><img alt="" :src="p.url"><small v-if="p.opis">{{ p.opis }}</small></div>
  </template>
  <template v-else-if="d.rodzaj === 'kartki'"><div v-for="(p, n) in d.zdjecia" :key="n" class="pimg"><img :alt="'Strona ' + (n + 1)" :src="p.url"></div></template>
  <template v-else-if="d.rodzaj === 'raport'">
    <Naglowek :tytul="d.tytul" :logo="d.logo" />
    <table>
      <tr><td class="k">Site</td><td>{{ d.raport.site }}</td></tr>
      <tr><td class="k">Date</td><td>{{ d.raport.data }}<span style="float:right"><b>ID:</b> {{ d.numer }}</span></td></tr>
      <tr><td class="k">Engineer</td><td>{{ d.raport.inspektor }}<span style="float:right"><b>Location:</b> {{ d.miejsce }}</span></td></tr>
      <tr><td colspan="2" class="big"><p style="text-align:center"><b>{{ d.raport.tytul }}</b></p><p>Overall Condition: {{ d.raport.stan_ogolny }}</p><div style="white-space:pre-wrap"><template v-for="(r, n) in d.wiersze" :key="n">{{ n ? '\n' : '' }}<template v-if="r.komorki"><span v-for="(c, j) in r.komorki" :key="j" style="display:inline-block;width:33%;line-height:2.2">{{ c }}</span></template><template v-else>{{ r.tekst }}</template></template></div><div v-if="d.raport.zakres" class="scope">{{ d.raport.zakres }}</div></td></tr>
      <tr><td colspan="2">Works Complete: {{ d.raport.data }}</td></tr><tr><td colspan="2">Quote Required: {{ d.raport.quote }}</td></tr><tr><td colspan="2" style="height:44px">Signed: {{ d.raport.inspektor }}</td></tr>
    </table><div class="foot">{{ d.stopka }}</div>
    <div v-for="(p, n) in d.zdjecia" :key="n" class="pimg"><Naglowek :tytul="d.tytul" :logo="d.logo" /><img :alt="p.alt" :src="p.url"></div>
  </template>
</template>
<script setup>
import { uzyjKontrolera } from '../../czesci/kontroler.js';
import Naglowek from './RaportNaglowek.vue';
const props = defineProps({ kontroler: Object });
const d = uzyjKontrolera(props.kontroler);
</script>
