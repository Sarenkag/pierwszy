<!-- Synchronizacja (kolejka wysyłki i dane mobilne). Dane i reguły: OESTSettingsUI.syncDane()/syncZapisz()/syncWyslij() (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-grid>
        <ion-row>
          <ion-col size="6">
            <ion-label>
              <p>{{ T('Zadania', 'Jobs') }}</p>
              <h2><strong>{{ d.zadania }}</strong></h2>
            </ion-label>
          </ion-col>
          <ion-col size="6">
            <ion-label>
              <p>{{ T('Rozmiar kolejki', 'Queue size') }}</p>
              <h2><strong>{{ d.rozmiar }}</strong></h2>
            </ion-label>
          </ion-col>
        </ion-row>
      </ion-grid>
      <ion-item lines="none">
        <ion-note :color="d.ostrzezenie ? 'danger' : undefined">{{ d.stan }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-select :label="T('Bez Wi-Fi', 'Without Wi-Fi')" label-placement="stacked" interface="popover" :value="f.mobile" @ionChange="zmien('mobile', $event.detail.value)">
          <ion-select-option value="manual">{{ T('Czekaj; dane mobilne uruchamiam ręcznie', 'Wait; I start mobile transfers manually') }}</ion-select-option>
          <ion-select-option value="automatic">{{ T('Zezwalaj na dane mobilne', 'Allow mobile data') }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input :label="T('Ostrzegaj powyżej (MB) — opcjonalnie', 'Warn above (MB) — optional')" label-placement="stacked" type="number" min="1" max="100000" step="1" :value="f.warnMB" @ionInput="zmien('warnMB', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Wi-Fi preferowane. Jeden transfer naraz. Brak internetu nie blokuje pracy.', 'Wi-Fi preferred. One transfer at a time. Offline work stays available.') }}</ion-note>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="wyslij">{{ T('Wyślij teraz przez dane mobilne', 'Send now using mobile data') }}</ion-button>
    </ion-card>
    <ion-note>{{ T('Politykę udostępniamy modułom. Dopóki silnik wysyłki nie podłączy tego kontraktu, te ustawienia nie zmieniają jego zachowania.', 'Policy is exposed to modules. Until the delivery engine integrates this contract, these settings do not change its behavior.') }}</ion-note>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue';
import { IonCard, IonGrid, IonRow, IonCol, IonLabel, IonItem, IonNote, IonSelect, IonSelectOption, IonInput, IonButton } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const odswiez = ref(0);
// PL/EN: dane liczone na nowo, wpisane pola zostają (Vue podmienia tylko teksty)
const d = computed(() => (props.wersja, odswiez.value, S.syncDane()));
const start = S.syncDane();
const f = reactive({ mobile: start.mobile, warnMB: start.warnMB === null ? '' : String(start.warnMB) });
const wynik = ref(null);
function zmien(k, v) { f[k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
function zapisz() { wynik.value = S.syncZapisz({ mobile: f.mobile, warnMB: f.warnMB === '' || f.warnMB == null ? null : Number(f.warnMB) }); odswiez.value++; }
async function wyslij() { const w = await S.syncWyslij(); if (w) wynik.value = w; }
onMounted(() => { S.zmiany(false); S.syncKolejka().then(() => { odswiez.value++; }, e => { wynik.value = { tekst: String(e && e.message || e), blad: true }; }); });
</script>
