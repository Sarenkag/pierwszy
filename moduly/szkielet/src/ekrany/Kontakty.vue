<!-- Zespół i kontakty. Dane i reguły: OESTSettingsUI.kontaktyDane()/kontaktDodaj()/kontaktUsun()/kontaktyEtykiety()/kontaktyImport()/zapiszPola() (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-list-header>{{ T('Osoby', 'People') }}</ion-list-header>
      <ion-item v-if="!d.osoby.length" lines="none"><ion-note>{{ T('Brak osób.', 'No people yet.') }}</ion-note></ion-item>
      <template v-for="o in d.osoby" :key="o.id">
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <h2><strong>{{ o.nazwa }}</strong></h2>
            <p>{{ o.info }}</p>
          </ion-label>
          <ion-button v-if="o.usun" slot="end" fill="clear" :aria-label="T('Usuń', 'Remove')" @click="usun(o.id)">🗑</ion-button>
        </ion-item>
        <template v-if="o.zEtykiety">
          <ion-item>
            <ion-input :label="T('Stanowisko', 'Position')" label-placement="stacked" :value="pola[o.i].position" @ionInput="zmien(o.i, 'position', $event.detail.value)"></ion-input>
          </ion-item>
          <ion-item>
            <ion-select :label="T('Rola', 'Role')" label-placement="stacked" interface="popover" :value="pola[o.i].role" @ionChange="zmien(o.i, 'role', $event.detail.value)">
              <ion-select-option value="engineer">{{ T('Inżynier', 'Engineer') }}</ion-select-option>
              <ion-select-option value="manager">{{ T('Manager', 'Manager') }}</ion-select-option>
              <ion-select-option value="other">{{ T('Inna', 'Other') }}</ion-select-option>
            </ion-select>
          </ion-item>
        </template>
      </template>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Działy', 'Departments') }}</ion-list-header>
      <ion-item v-if="!d.dzialy.length" lines="none"><ion-note>{{ T('Brak działów.', 'No departments yet.') }}</ion-note></ion-item>
      <ion-item v-for="x in d.dzialy" :key="x.id" lines="none">
        <ion-label><h2><strong>{{ x.nazwa }}</strong></h2></ion-label>
        <ion-button v-if="x.usun" slot="end" fill="clear" :aria-label="T('Usuń', 'Remove')" @click="usun(x.id)">🗑</ion-button>
      </ion-item>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Dodaj', 'Add') }}</ion-list-header>
      <ion-item>
        <ion-input :label="T('Imię lub nazwa działu', 'Name or department')" label-placement="stacked" maxlength="120" :placeholder="T('np. Ania P. / Reception', 'e.g. Ania P. / Reception')" :value="nowy" @ionInput="nowy = $event.detail.value"></ion-input>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="dodaj('person')">{{ T('＋ Osoba', '＋ Person') }}</ion-button>
      <ion-button expand="block" fill="outline" @click="dodaj('department')">{{ T('＋ Dział', '＋ Department') }}</ion-button>
      <ion-item lines="none">
        <ion-note>{{ T('E-mail nie jest potrzebny. Osoby bez e-maila nie pojawiają się tylko na liście adresatów maili.', 'No email needed. People without email just do not appear as mail recipients.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-accordion-group expand="inset">
      <ion-accordion value="google">
        <ion-item slot="header">
          <ion-label>⚙ {{ T('Google i import', 'Google & import') }}</ion-label>
        </ion-item>
        <div slot="content">
          <component :is="Polaczenie" :T="T" :wersja="wersja" rodzaj="contacts" @wynik="wynik = $event"></component>
          <ion-card>
            <ion-list-header>{{ T('Import według etykiety', 'Import by label') }}</ion-list-header>
            <ion-item lines="none">
              <ion-note>{{ T('Pobieramy tylko osoby z wybranej etykiety Google Contacts. Bez skanowania całej książki w tle.', 'Only people in your selected Google Contacts label are imported. No background address-book scanning.') }}</ion-note>
            </ion-item>
            <ion-button expand="block" fill="outline" @click="etykiety">{{ T('Pobierz etykiety', 'Load labels') }}</ion-button>
            <ion-item>
              <ion-select :label="T('Wybrana etykieta', 'Selected label')" label-placement="stacked" interface="popover" :value="etykieta" @ionChange="etykieta = $event.detail.value">
                <ion-select-option v-for="e in listaEtykiet" :key="e.id" :value="e.id">{{ e.nazwa }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-button expand="block" fill="outline" @click="importuj">{{ T('Importuj / odśwież kontakty', 'Import / refresh contacts') }}</ion-button>
          </ion-card>
        </div>
      </ion-accordion>
    </ion-accordion-group>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik && wynik.tekst" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonButton, IonInput, IonSelect, IonSelectOption, IonAccordionGroup, IonAccordion } from '@ionic/vue';
import Polaczenie from '../czesci/Polaczenie.vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const odswiez = ref(0);
// PL/EN: dane liczone na nowo, wpisane pola zostają (Vue podmienia tylko teksty)
const d = computed(() => (props.wersja, odswiez.value, S.kontaktyDane()));
const pola = reactive({});
function wczytaj() { for (const k of Object.keys(pola)) delete pola[k]; for (const o of S.kontaktyDane().osoby) pola[o.i] = { position: o.position, role: o.role }; }
wczytaj();
const nowy = ref('');
const wynik = ref(null);
const zaladowane = ref(null); // etykiety pobrane z Google (do tego czasu: zapisana etykieta)
const etykieta = ref(S.kontaktyDane().etykieta.id);
const listaEtykiet = computed(() => zaladowane.value || [d.value.etykieta]);
function zmien(i, k, v) { if (pola[i][k] === v) return; pola[i][k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
function przeladuj(w) { if (!w) return; wynik.value = w; if (!w.blad) { wczytaj(); odswiez.value++; } }
function zapisz() { const z = {}; for (const i of Object.keys(pola)) { z['contacts.' + i + '.position'] = String(pola[i].position || '').trim(); z['contacts.' + i + '.role'] = pola[i].role; } przeladuj(S.zapiszPola(z)); }
async function usun(id) { przeladuj(await S.kontaktUsun(id)); }
async function dodaj(rodzaj) { const w = await S.kontaktDodaj(rodzaj, nowy.value); if (w && !w.blad) nowy.value = ''; przeladuj(w); }
async function etykiety() { const w = await S.kontaktyEtykiety(); if (!w) return; wynik.value = w; if (w.etykiety) { zaladowane.value = w.etykiety; etykieta.value = w.etykiety[0] ? w.etykiety[0].id : ''; } }
async function importuj() { const e = listaEtykiet.value.find(x => x.id === etykieta.value); przeladuj(await S.kontaktyImport(etykieta.value, e ? e.nazwa : '')); }
onMounted(() => { S.zmiany(false); });
</script>
