<!-- Raporty i zdjęcia. Licznik i opcja zdjęć: OESTSettingsUI.raportyLicznik()/zdjeciaStempel()/zapiszStempel() (app/www/settings-ui.js).
     „Moje raporty”: dane i akcje OESTRaportyUI (moduly/raporty/przegladarka.js) – lista z klocków (czesci/Klocek.vue), podgląd w OESTOkna.okno (RaportPodglad.vue). -->
<template>
  <div class="ion-padding">
    <ion-card class="oest-panel">
      <ion-list-header class="oest-tytul">{{ T('Moje raporty', 'My reports') }}</ion-list-header>
      <div v-if="odzyskane.length" id="rptRec" class="oest-lista">
        <ion-note class="oest-pod">{{ T('Odzyskane inspekcje', 'Recovered inspections') }}</ion-note>
        <Klocek v-for="k in odzyskane" :key="k.id" :T="T" :k="k" @wybierz="R.otworzOdzyskana(k.id)"></Klocek>
      </div>
      <div class="oest-szukaj">
        <ion-item class="oest-ramka-pola" lines="none">
          <ion-input id="rptQ" type="search" autocomplete="off" :aria-label="T('Kod, budynek, data…', 'Code, building, date…')" :placeholder="T('Kod, budynek, data…', 'Code, building, date…')" :value="szuk.q" :debounce="0" @ionInput="szukaj({ q: $event.detail.value })"></ion-input>
        </ion-item>
        <ion-item class="oest-ramka-pola" lines="none">
          <ion-select id="rptB" :aria-label="T('Budynek', 'Building')" interface="popover" :value="szuk.b" @ionChange="szukaj({ b: $event.detail.value })">
            <ion-select-option v-for="o in budynki" :key="o.v" :value="o.v">{{ o.t }}</ion-select-option>
          </ion-select>
        </ion-item>
      </div>
      <div id="rptList" class="oest-lista">
        <Klocek v-for="k in raporty" :key="k.id" :T="T" :k="k" @wybierz="pokaz(k.id)"></Klocek>
        <ion-note v-if="pusto" class="oest-opis">{{ pusto }}</ion-note>
      </div>
    </ion-card>
    <ion-card class="oest-panel">
      <ion-list-header class="oest-tytul">{{ T('Raporty w telefonie', 'Reports on this phone') }}</ion-list-header>
      <ion-item class="oest-wybrane" lines="none">
        <ion-label id="rptStats" :color="licznik.ostrzezenie ? 'danger' : undefined">{{ licznik.tekst || T('Liczę…', 'Counting…') }}</ion-label>
      </ion-item>
      <ion-note class="oest-opis">{{ T('Mail: Word + PDF. Dysk Google: tylko Word, w folderze OEST Raporty / budynek / rodzaj; ponowne wysłanie nadpisuje ten sam plik. Telefon: do 200 MB, potem znikają najstarsze, tylko te już na Dysku.', 'Email: Word + PDF. Google Drive: Word only, in OEST Raporty / building / type; sending again overwrites the same file. Phone: up to 200 MB, then the oldest go, only those already on Drive.') }}</ion-note>
    </ion-card>
    <ion-card v-if="z.jest" class="oest-panel">
      <ion-list-header class="oest-tytul">{{ T('Zdjęcia', 'Photos') }}</ion-list-header>
      <ion-item class="oest-check" lines="none">
        <ion-checkbox id="photoStamp" label-placement="end" justify="start" :checked="stempel" @ionChange="zmienStempel($event.detail.checked)">{{ T('Data i godzina na zdjęciach', 'Date and time on photos') }}</ion-checkbox>
      </ion-item>
      <ion-note class="oest-opis">{{ T('Każde nowe zdjęcie dostaje w prawym dolnym rogu datę i godzinę zrobienia (dd/mm/rrrr GG:MM). Zdjęć już zrobionych nie zmienia.', 'Each new photo gets the date and time it was taken in the bottom right corner (dd/mm/yyyy HH:MM). Photos already taken are not changed.') }}</ion-note>
    </ion-card>
    <ion-card class="oest-panel">
      <ion-list-header class="oest-tytul">Word + PDF · English</ion-list-header>
      <ion-note class="oest-opis">{{ T('Najmniejszy praktyczny plik przy zachowaniu czytelności. Zdjęcia w automatycznej siatce do 10 na stronę galerii.', 'Smallest practical file while retaining readability. Automatic photo grids up to 10 per gallery page.') }}</ion-note>
      <ion-note class="oest-opis">{{ T('To wspólne wymagania raportów. Generator i układ dokumentów są rozwijane w module inspekcji.', 'These are shared report requirements. Rendering and document layouts belong to the inspection module.') }}</ion-note>
    </ion-card>
    <div class="oest-zapisz">
      <ion-button class="oest-duzy" expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
      <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonCheckbox, IonButton, IonInput, IonSelect, IonSelectOption } from '@ionic/vue';
import Klocek from '../czesci/Klocek.vue';
import RaportPodglad from './RaportPodglad.vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const R = window.OESTRaportyUI;
const szuk = ref(R.szukanie());
const budynki = computed(() => (props.wersja, R.budynki()));
const odzyskane = ref([]), raporty = ref([]), pusto = ref('');
const licznik = ref({ tekst: '', ostrzezenie: false });
const z = S.zdjeciaStempel();
const stempel = ref(z.stempel);
const wynik = ref(null);
// lista i licznik z modułu raportów – także po zmianie języka i po każdej zmianie archiwum
function lista() { R.lista().then(d => { if (d.aktualne === false) return; odzyskane.value = d.odzyskane; raporty.value = d.raporty; pusto.value = d.pusto; }); }
function rysuj() { lista(); S.raportyLicznik().then((d) => { licznik.value = d; }); }
function szukaj(o) { R.szukaj(o); szuk.value = R.szukanie(); lista(); } // szukanie to nie zmiana ustawień (bez „niezapisanych zmian”)
async function pokaz(id) {
  const p = await R.podglad(id); if (!p) return;
  const w = await window.OESTOkna.okno({ tytul: p.tytul, komponent: RaportPodglad, wlasciwosci: { p }, ok: p.ok, anuluj: p.anuluj });
  p.zwolnij();
  await R.wynik(id, w);
}
let odpisz = null;
function zmienStempel(v) { if (stempel.value === v) return; stempel.value = v; S.zmiany(true); } // dopiero „Zapisz ustawienia” zapisuje w module zdjęć
function zapisz() { const w = S.zapiszStempel(stempel.value); if (w) wynik.value = w; else { S.zmiany(false); wynik.value = S.zapiszPola({}); } }
watch(() => props.wersja, rysuj);
onMounted(() => { S.zmiany(false); rysuj(); odpisz = R.zmiany(rysuj); });
onUnmounted(() => { if (odpisz) odpisz(); });
</script>
