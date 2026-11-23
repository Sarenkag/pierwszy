<!-- Wybór pytań dla inspekcji: tytuł, nazwa pliku, pytania z działów, domyślne odpowiedzi, nadpisanie zdań EN. Dane i akcje: OESTQuestionsUI (app/www/questions-ui.js). -->
<template>
  <div>
    <ion-card>
      <ion-item>
        <ion-select fill="solid" id="qqTask" :label="T('Inspekcja — katalog tylko do odczytu', 'Inspection — read-only catalogue')" label-placement="stacked" interface="popover" :value="i.zadanie" @ionChange="zadanie($event)">
          <ion-select-option v-for="t in i.zadania" :key="t.id" :value="t.id">{{ t.nazwa }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card>
    <ion-card v-if="i.tylkoOdczyt">
      <ion-item lines="none">
        <ion-note>{{ T('Formularz wg wzoru firmy — tylko do odczytu. Konfiguracja 024 pozostaje w osobnym module.', 'Company template form — read only. The 024 configuration stays in a separate module.') }}</ion-note>
      </ion-item>
    </ion-card>
    <template v-else>
      <ion-card>
        <ion-list-header id="qqCountHead">{{ i.status }}</ion-list-header>
        <ion-item>
          <ion-input fill="solid" id="qq-title" :label="T('Tytuł raportu EN', 'EN report title')" label-placement="stacked" :maxlength="5000" :value="i.profil.title" @ionInput="U.profilPole('title', $event.detail.value)"></ion-input>
        </ion-item>
        <ion-item>
          <ion-textarea fill="solid" id="qq-scope" :label="T('Scope EN — opcjonalnie', 'EN scope — optional')" label-placement="stacked" :auto-grow="true" :rows="2" :maxlength="5000" :value="i.profil.scope" @ionInput="U.profilPole('scope', $event.detail.value)"></ion-textarea>
        </ion-item>
        <ion-item>
          <ion-input fill="solid" id="qq-filePattern" :label="T('Wzór nazwy pliku: KOD DDMMRRRR lub {code} {date}', 'File name pattern: CODE DDMMYYYY or {code} {date}')" label-placement="stacked" :maxlength="5000" :value="i.profil.filePattern" @ionInput="U.profilPole('filePattern', $event.detail.value)"></ion-input>
        </ion-item>
        <ion-item lines="none">
          <ion-note id="qqFilePreview">{{ i.plik }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-select fill="solid" id="qqCopy" :label="T('Skopiuj wybór i ustawienia z inspekcji', 'Copy selection and settings from an inspection')" label-placement="stacked" interface="popover" :value="kopia" @ionChange="kopia = $event.detail.value">
            <ion-select-option v-for="t in i.kopiuj" :key="t.id" :value="t.id">{{ t.nazwa }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-grid>
          <ion-row>
            <ion-col size="12"><ion-button expand="block" id="qqCopyBtn" fill="outline" :disabled="zajety || !kopia" @click="U.kopiuj(kopia)">{{ T('Skopiuj wybór', 'Copy selection') }}</ion-button></ion-col>
            <ion-col size="12"><ion-button expand="block" v-if="i.przywroc" id="qqRestore" fill="outline" :disabled="zajety" @click="U.przywroc()">{{ T('Przywróć wybór wbudowany', 'Restore built-in selection') }}</ion-button></ion-col>
          </ion-row>
        </ion-grid>
        <ion-item lines="none">
          <ion-button id="qqReportBtn" fill="outline" @click="U.raport()">{{ T('Podgląd tekstu raportu', 'Report text preview') }}</ion-button>
        </ion-item>
      </ion-card>

      <ion-accordion-group :multiple="true" :value="otwarte" @ionChange="otwarte = $event.detail.value">
        <ion-accordion v-for="d in i.dzialy" :key="d.id" :value="d.id">
          <ion-item slot="header">
            <ion-label>{{ d.nazwa }} ({{ d.wybrano }})</ion-label>
          </ion-item>
          <div slot="content">
            <template v-for="r in d.wiersze" :key="r.id">
              <ion-item>
                <ion-toggle :id="'qq-pick-' + r.id" :checked="r.wybrany" :disabled="r.zablokowany" @ionChange="wybierz(r, $event.detail.checked)">{{ r.tekst }}</ion-toggle>
              </ion-item>
              <template v-if="r.wybrany">
                <ion-item>
                  <ion-toggle :id="'qq-pin-' + r.id" :checked="r.przypiety" @ionChange="U.wpis(r.id, 'pinned', $event.detail.checked)">
                    <ion-icon :icon="star"></ion-icon> {{ T('Ulubione — pierwsza sekcja inspekcji', 'Favourites — first section of the inspection') }}
                  </ion-toggle>
                </ion-item>
                <template v-if="r.typ === 'measure'">
                  <ion-item>
                    <ion-input fill="solid" :id="'qq-unit-' + r.id" :label="T('Jednostka', 'Unit')" label-placement="stacked" :value="r.jednostka" @ionInput="U.wpis(r.id, 'unit', $event.detail.value)"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input fill="solid" :id="'qq-min-' + r.id" type="number" label="min" label-placement="stacked" :value="r.min" @ionInput="U.wpis(r.id, 'min', $event.detail.value)"></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input fill="solid" :id="'qq-max-' + r.id" type="number" label="max" label-placement="stacked" :value="r.max" @ionInput="U.wpis(r.id, 'max', $event.detail.value)"></ion-input>
                  </ion-item>
                </template>
                <ion-item v-else>
                  <ion-select fill="solid" :id="'qq-default-' + r.id" :label="T('Domyślna odpowiedź', 'Default answer')" label-placement="stacked" interface="popover" :value="r.domyslna" @ionChange="U.wpis(r.id, 'default', $event.detail.value)">
                    <ion-select-option v-for="o in r.opcje" :key="o[0]" :value="o[0]">{{ o[0] === U.X0 ? T('Bez domyślnej', 'No default') : o[1] }}</ion-select-option>
                  </ion-select>
                </ion-item>
                <ion-item>
                  <ion-toggle :id="'qq-override-' + r.id" :checked="r.nadpisanie" @ionChange="U.nadpisanie(r.id, $event.detail.checked)">{{ T('Włącz nadpisanie EN — zdania raportu tylko dla tej inspekcji', 'Enable EN override — report sentences only for this inspection') }}</ion-toggle>
                </ion-item>
                <component v-if="r.nadpisanie" :is="Pola" :T="T" :obj="r.pola" :typ="r.typ" :pre="'qq-ov-' + r.id + '-'" @zmiana="U.brudne()"></component>
                <ion-grid>
                  <ion-row>
                    <ion-col size="12"><ion-button expand="block" :id="'qq-up-' + r.id" fill="clear" :aria-label="T('W górę', 'Move up')" @click="U.ruch(r.id, true)"><ion-icon slot="icon-only" :icon="arrowUp"></ion-icon></ion-button></ion-col>
                    <ion-col size="12"><ion-button expand="block" :id="'qq-down-' + r.id" fill="clear" :aria-label="T('W dół', 'Move down')" @click="U.ruch(r.id, false)"><ion-icon slot="icon-only" :icon="arrowDown"></ion-icon></ion-button></ion-col>
                  </ion-row>
                </ion-grid>
              </template>
            </template>
          </div>
        </ion-accordion>
      </ion-accordion-group>
      <ion-item lines="none">
        <ion-button id="qqProfileSave" :disabled="zajety" @click="U.zapiszWybor()">{{ T('Zapisz wybór inspekcji', 'Save inspection selection') }}</ion-button>
      </ion-item>
    </template>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { IonCard, IonItem, IonLabel, IonNote, IonInput, IonTextarea, IonSelect, IonSelectOption, IonToggle, IonButton, IonIcon, IonListHeader, IonAccordionGroup, IonAccordion, IonGrid, IonRow, IonCol } from '@ionic/vue';
import { star, arrowUp, arrowDown } from 'ionicons/icons';
import Pola from './Pola.vue';
const props = defineProps({ T: Function, i: Object, zajety: Boolean });
const U = window.OESTQuestionsUI;
const otwarte = ref([]); // rozwinięte działy zostają rozwinięte po każdej zmianie
const kopia = ref('');
// inna inspekcja: pytanie o niezapisany wybór; po odmowie lista wraca do bieżącej
function zadanie(ev) { const v = ev.detail.value; if (v === props.i.zadanie) return; const el = ev.target; U.zadanie(v).then((t) => { if (t !== v) el.value = t; }); }
function wybierz(r, on) { if (r.wybrany === on) return; U.wybierz(r.id, on); }
</script>
