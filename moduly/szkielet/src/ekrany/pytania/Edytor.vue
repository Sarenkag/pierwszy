<!-- Edytor jednego pytania. Dane i akcje: OESTQuestionsUI (app/www/questions-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div>
    <ion-card>
      <ion-button expand="block" id="qqCancel" fill="outline" :disabled="zajety" @click="U.wroc()">{{ T('Wróć do bazy', 'Back to library') }}</ion-button>
      <ion-item lines="none">
        <ion-note>ID: {{ e.d.id }}<template v-if="e.legacy"> · legacyKey: {{ e.legacy }}</template></ion-note>
      </ion-item>
      <ion-item>
        <ion-select id="qq-section" :label="T('Dział', 'Section')" label-placement="stacked" interface="popover" :value="e.d.section" @ionChange="ust('section', $event.detail.value)">
          <ion-select-option v-for="x in e.dzialy" :key="x.id" :value="x.id">{{ x.nazwa }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-textarea id="qq-text" :label="T('Pytanie w aplikacji', 'Question in the app')" label-placement="stacked" :auto-grow="true" :rows="2" :maxlength="5000" :value="e.d.text" @ionInput="ust('text', $event.detail.value)"></ion-textarea>
      </ion-item>
      <ion-item>
        <ion-select id="qq-type" :label="T('Typ odpowiedzi', 'Answer type')" label-placement="stacked" interface="popover" :value="e.d.type" @ionChange="zmienTyp($event.detail.value)">
          <ion-select-option value="pass">{{ T('OK / Nie OK / N/A', 'OK / Not OK / N/A') }}</ion-select-option>
          <ion-select-option value="scale">{{ T('Skala A–D + N/A', 'Scale A–D + N/A') }}</ion-select-option>
          <ion-select-option value="measure">{{ T('Pomiar — zawsze nowa wartość', 'Measurement — always a new value') }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select id="qq-status" :label="T('Status', 'Status')" label-placement="stacked" interface="popover" :value="e.d.status" @ionChange="ust('status', $event.detail.value)">
          <ion-select-option value="proposal">{{ T('Propozycja', 'Proposal') }}</ion-select-option>
          <ion-select-option value="approved">{{ T('Zatwierdzone', 'Approved') }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input id="qq-source" :label="T('Źródło', 'Source')" label-placement="stacked" :maxlength="5000" :value="e.d.source" @ionInput="ust('source', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-list-header>{{ T('Tagi', 'Tags') }}</ion-list-header>
      <ion-item v-for="t in e.tagi" :key="t.t">
        <ion-toggle :id="'qq-tag-' + t.t" :checked="t.on" @ionChange="U.tag(t.t, $event.detail.checked)">{{ t.t }}</ion-toggle>
      </ion-item>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Zdania raportu EN', 'EN report sentences') }}</ion-list-header>
      <component :is="Pola" :T="T" :obj="e.d" :typ="e.d.type" :etykieta="true" @zmiana="U.brudne()"></component>
      <template v-if="e.mierzone">
        <ion-item>
          <ion-input id="qq-unit" :label="T('Jednostka', 'Unit')" label-placement="stacked" :maxlength="5000" :value="e.d.unit" @ionInput="ust('unit', $event.detail.value)"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input id="qq-min" type="number" :label="T('Minimum — opcjonalne', 'Minimum — optional')" label-placement="stacked" :value="e.d.min" @ionInput="ust('min', $event.detail.value)"></ion-input>
        </ion-item>
        <ion-item>
          <ion-input id="qq-max" type="number" :label="T('Maksimum — opcjonalne', 'Maximum — optional')" label-placement="stacked" :value="e.d.max" @ionInput="ust('max', $event.detail.value)"></ion-input>
        </ion-item>
        <ion-item lines="none">
          <ion-note>{{ T('Wartości pomiaru nigdy nie zapisujemy jako domyślnej.', 'A measured value is never saved as a default.') }}</ion-note>
        </ion-item>
      </template>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Powody Nie OK', 'Not OK reasons') }}</ion-list-header>
      <template v-for="(r, i) in e.d.reasons" :key="r.id">
        <ion-item>
          <ion-input :id="'qq-reason-label-' + i" :label="T('Chip powodu', 'Reason chip')" label-placement="stacked" :maxlength="5000" :value="r.label" @ionInput="powod(r, 'label', $event.detail.value)"></ion-input>
        </ion-item>
        <ion-item>
          <ion-textarea :id="'qq-reason-text-' + i" :label="T('Gotowe zdanie EN', 'Ready EN sentence')" label-placement="stacked" :auto-grow="true" :rows="2" :maxlength="5000" :value="r.text" @ionInput="powod(r, 'text', $event.detail.value)"></ion-textarea>
        </ion-item>
        <ion-button expand="block" :id="'qq-reason-delete-' + i" fill="outline" color="danger" @click="U.powodUsun(i)">{{ T('Usuń powód', 'Delete reason') }}</ion-button>
      </template>
      <div class="oest-rzad">
          <ion-button expand="block" id="qqReasonAdd" fill="outline" @click="U.powodDodaj()">{{ T('Dodaj powód', 'Add reason') }}</ion-button>
          <ion-button expand="block" id="qqQuestionSave" :disabled="zajety" @click="U.zapiszPytanie()">{{ T('Zapisz pytanie', 'Save question') }}</ion-button>
        </div>
    </ion-card>
  </div>
</template>

<script setup>
import { IonCard, IonItem, IonNote, IonInput, IonTextarea, IonSelect, IonSelectOption, IonToggle, IonButton, IonListHeader  } from '@ionic/vue';
import Pola from './Pola.vue';
const props = defineProps({ T: Function, e: Object, zajety: Boolean });
const U = window.OESTQuestionsUI;
function ust(k, v) { if (props.e.d[k] === v) return; props.e.d[k] = v; U.brudne(); }
function powod(r, k, v) { if (r[k] === v) return; r[k] = v; U.brudne(); }
function zmienTyp(v) { if (props.e.d.type !== v) U.typ(v); }
</script>
