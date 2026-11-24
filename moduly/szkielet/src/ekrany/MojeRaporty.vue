<!-- Raporty i zdjęcia. Licznik i opcja zdjęć: OESTSettingsUI.raportyLicznik()/zdjeciaStempel()/zapiszStempel() (app/www/settings-ui.js).
     „Moje raporty”: dane i akcje OESTRaportyUI (moduly/raporty/przegladarka.js) – lista z klocków (czesci/Klocek.vue), podgląd w OESTOkna.okno (RaportPodglad.vue). -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-list-header>{{ T('Moje raporty', 'My reports') }}</ion-list-header>
      <div v-if="odzyskane.length" id="rptRec">
        <ion-note>{{ T('Odzyskane inspekcje', 'Recovered inspections') }}</ion-note>
        <Klocek v-for="k in odzyskane" :key="k.id" :T="T" :k="k" @wybierz="R.otworzOdzyskana(k.id)"></Klocek>
      </div>
      <div>
        <ion-item lines="none">
          <ion-input id="rptQ" type="search" autocomplete="off" :aria-label="T('Dzień, typ, kod, budynek…', 'Day, type, code, building…')" :placeholder="T('Dzień, typ, kod, budynek…', 'Day, type, code, building…')" :value="szuk.q" :debounce="0" @ionInput="szukaj({ q: $event.detail.value })"></ion-input>
        </ion-item>
        <ion-item lines="none">
          <ion-select id="rptB" :aria-label="T('Budynek', 'Building')" interface="popover" :value="szuk.b" @ionChange="szukaj({ b: $event.detail.value })">
            <ion-select-option v-for="o in budynki" :key="o.v" :value="o.v">{{ o.t }}</ion-select-option>
          </ion-select>
        </ion-item>
      </div>
      <div id="rptList">
        <Klocek v-for="k in raporty" :key="k.id" :T="T" :k="k" @wybierz="pokaz(k.id)"></Klocek>
        <ion-note v-if="pusto">{{ pusto }}</ion-note>
      </div>
    </ion-card>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonNote, IonInput, IonSelect, IonSelectOption } from '@ionic/vue';
import Klocek from '../czesci/Klocek.vue';
import RaportPodglad from './RaportPodglad.vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const R = window.OESTRaportyUI;
const szuk = ref(R.szukanie());
const budynki = computed(() => (props.wersja, R.budynki()));
const odzyskane = ref([]), raporty = ref([]), pusto = ref('');


// lista i licznik z modułu raportów – także po zmianie języka i po każdej zmianie archiwum
function lista() { R.lista().then(d => { if (d.aktualne === false) return; odzyskane.value = d.odzyskane; raporty.value = d.raporty; pusto.value = d.pusto; }); }
function rysuj() { lista(); }
function szukaj(o) { R.szukaj(o); szuk.value = R.szukanie(); lista(); } // szukanie to nie zmiana ustawień (bez „niezapisanych zmian”)
async function pokaz(id) {
  let p;
  try { p = await R.podglad(id); } catch (e) { await window.OESTOkna.pytaj({ tytul: props.T('Nie pobrano raportu', 'Report download failed'), tresc: window.OESTBledy.text(e), tylkoOk: true }); return; }
  if (!p) return;
  id = p.id;
  let w;
  try { w = await window.OESTOkna.okno({ tytul: p.tytul, komponent: RaportPodglad, wlasciwosci: { p }, ok: p.ok, anuluj: p.anuluj, karta: true }); } finally { p.zwolnij(); }
  await R.wynik(id, w);
}
let odpisz = null;
watch(() => props.wersja, rysuj);
onMounted(() => { S.zmiany(false); rysuj(); odpisz = R.zmiany(rysuj); });
onUnmounted(() => { if (odpisz) odpisz(); });
</script>
