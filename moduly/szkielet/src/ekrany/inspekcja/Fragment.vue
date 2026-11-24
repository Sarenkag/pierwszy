<!-- Fragmenty zastanej strony: te same elementy, klasy i delegowane zdarzenia. -->
<template>
  <template v-if="d.rodzaj === 'zdjecia'">
    <div v-for="p in d.lista" :key="p.i" class="thumb">
      <img :alt="p.alt" :src="p.url"><span class="n">{{ p.i + 1 }}</span><button type="button" :aria-label="p.usun" @click="kontroler.akcja('usun', p.i)">×</button>
      <template v-for="sg in p.sugestie" :key="sg.n"><span v-if="sg.x != null" class="mk" :style="{ left: sg.x * 100 + '%', top: sg.y * 100 + '%' }">{{ sg.n }}</span></template>
      <button v-if="d.edycja" type="button" class="ed" :aria-label="p.edytuj" @click="kontroler.akcja('edytuj', p.i)">✏️</button>
    </div>
  </template>
  <template v-else-if="d.rodzaj === 'sugestie'">
    <div v-for="sg in d.lista" :key="sg.n" class="sug"><div><span class="n">{{ sg.n }}</span>{{ sg.tekst }}?</div><div class="row"><button class="btn" type="button" :data-sg="sg.n" data-ok="1">{{ T('Tak', 'Yes') }}</button><button class="btn" type="button" :data-sg="sg.n" data-ok="0">{{ T('Nie', 'No') }}</button></div></div>
  </template>
  <template v-else-if="d.rodzaj === 'data'">
    <span>{{ d.tekst }}</span><button v-for="b in d.przyciski" :key="b.dzien" class="btn" type="button" :data-day="b.dzien">{{ b.tekst }}</button>
  </template>
  <template v-else-if="d.rodzaj === 'flush'">
    <template v-for="r in d.lista" :key="r.i">
      <div v-if="r.grupa" class="fl-grp">{{ r.grupa }}</div>
      <div :class="['fl-row', r.stan]"><div class="fl-line"><div class="txt">{{ r.tekst }}</div><div class="seg"><button v-for="o in d.opcje" :key="o[0]" type="button" :data-fl="r.i" :data-s="o[0]" :class="[o[2], { on: r.stan === o[0] }]">{{ o[1] }}</button></div><button type="button" class="fl-ic" :data-flcam="r.i" :aria-label="r.aparat">📷<b v-if="r.zdjecia.length">{{ r.zdjecia.length }}</b></button><button type="button" class="fl-ic" :data-flnote="r.i" :aria-label="r.notatka">📝</button></div>
        <input v-if="r.otwarty" class="fl-note" type="text" :data-fln="r.i" :value="r.uwaga" :placeholder="r.placeholder" :inputmode="r.odczyt ? 'decimal' : undefined">
        <div v-if="r.zdjecia.length" class="fl-pics"><span v-for="p in r.zdjecia" :key="p.i"><img alt="" :src="p.url"><button type="button" :data-fldel="p.i" :aria-label="T('Usuń zdjęcie', 'Delete photo')">×</button></span></div>
      </div>
    </template>
  </template>
  <template v-else-if="d.rodzaj === 'sum'">
    <div class="label">{{ T('Podsumowanie (trafi do raportu)', 'Summary (goes into the report)') }}</div><ul class="sumlist"><li v-for="(p, i) in d.punkty" :key="i">{{ p }}</li></ul><p class="hint">{{ T('Zdjęcia z zapisanych urządzeń dochodzą same. Możesz dodać ogólne.', 'Photos from saved devices are added automatically. You can add general ones.') }}</p>
  </template>
  <template v-else-if="d.rodzaj === 'batch'">
    <div class="label">Zlecenie: {{ d.nazwa }}</div><div>{{ d.opis }}</div><div v-if="d.wznow" class="row"><button class="btn wide" type="button" id="batchResume" @click="kontroler.akcja('wznow')">{{ T('Wznów od', 'Resume from') }} {{ d.wznow }}</button></div><p class="hint">{{ T('Każde urządzenie zapisuje się od razu w telefonie. Możesz przerwać, zamknąć apkę i wrócić jutro.', 'Each device is saved on the phone straight away. You can stop, close the app and come back tomorrow.') }}</p><div class="row"><button class="go" type="button" id="batchEnd" @click="kontroler.akcja('koniec')">{{ T('Zakończ zlecenie', 'Finish job') }}</button></div><div v-if="d.zapisane" class="row"><button class="btn" type="button" id="batchClear" @click="kontroler.akcja('wyczysc')">{{ T('Zacznij od nowa', 'Start again') }}</button></div>
  </template>
  <template v-else-if="d.rodzaj === 'grupy'">
    <template v-if="d.lista.length"><div v-for="g in d.lista" :key="g.nazwa" class="group"><h2>{{ g.nazwa }}<small>{{ g.zrobione }}/{{ g.lista.length }}</small></h2><button v-for="r in g.lista" :key="r.kod" class="item" type="button" :data-code="r.kod" @click="kontroler.akcja(r.kod)"><div><div class="code">{{ r.kod }}</div><div class="where">{{ r.miejsce }}</div><div v-if="r.ostatnio" class="last">{{ r.ostatnio }}</div></div><span v-if="r.badge" :class="['badge', { q: r.uwaga }]">{{ r.badge }}</span><span v-else class="arrow" aria-hidden="true">›</span></button></div></template><p v-else class="hint">{{ T('Brak wyników. Wpisz kod niżej, żeby otworzyć inne urządzenie.', 'No results. Type a code below to open another device.') }}</p>
  </template>
  <template v-else-if="d.rodzaj === 'typy'">
    <Kafelki zastane klasa="type" :lista="d.lista" @wybierz="r => kontroler.akcja(r.id)"><template #ikona><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="9" y="5" width="30" height="38" rx="2"/><path d="M15 13h18M15 19h18M15 25h18"/><path d="M26 30l-5 7h5l-3 6"/></svg></template></Kafelki>
  </template>
  <template v-else-if="d.rodzaj === 'termin'"><label>Update <input type="date" :value="d.data" :disabled="d.blokada" :aria-label="T('Termin z systemu', 'Due date from the system')" @change="kontroler.akcja($event.target.value)"></label><b :class="{ late: d.spoznione }" :data-alt="d.alt">{{ d.tekst }}</b><span>{{ d.czestosc }}</span></template>
  <template v-else-if="d.rodzaj === 'etap'"><option v-for="o in d.opcje" :key="o[0]" :value="o[0]">{{ o[1] }}</option></template>
  <template v-else-if="d.rodzaj === 'komunikat'"><b>{{ d.tytul }}</b>{{ d.tekst }}</template>
  <template v-else-if="d.rodzaj === 'znacznik'"><span v-html="d.html"></span></template>
</template>
<script setup>
import { uzyjKontrolera } from '../../czesci/kontroler.js';
import Kafelki from '../../czesci/Kafelki.vue';
const props = defineProps({ kontroler: Object, T: Function });
const d = uzyjKontrolera(props.kontroler);
</script>
