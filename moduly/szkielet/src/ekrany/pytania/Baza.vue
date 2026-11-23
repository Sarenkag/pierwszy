<!-- Baza pytań: lista, szukanie, działy, nazwy skali, wklejanie propozycji i kopia zapasowa. Dane i akcje: OESTQuestionsUI (app/www/questions-ui.js). -->
<template>
  <div>
    <ion-card>
      <ion-item lines="none">
        <ion-button id="qqNew" :disabled="zajety" @click="U.nowe()">{{ T('Dodaj pytanie', 'Add question') }}</ion-button>
      </ion-item>
      <ion-accordion-group>
        <ion-accordion value="kopia">
          <ion-item slot="header">
            <ion-icon slot="start" :icon="settingsOutline"></ion-icon>
            <ion-label>{{ T('Kopia zapasowa / import', 'Backup / import') }}</ion-label>
          </ion-item>
          <div slot="content">
            <ion-item lines="none">
              <ion-button id="qqExport" :disabled="zajety" @click="U.eksport()">{{ T('Zapisz kopię', 'Save backup') }}</ion-button>
              <ion-button id="qqFile" fill="outline" :disabled="zajety" @click="U.plikWybierz()">{{ T('Wczytaj plik (kopia / propozycje)', 'Load file (backup / proposals)') }}</ion-button>
            </ion-item>
          </div>
        </ion-accordion>
      </ion-accordion-group>
      <ion-item>
        <ion-input id="qqSearch" :label="T('Szukaj: tekst, tag, źródło', 'Search: text, tag, source')" label-placement="stacked" :value="b.szukaj" @ionChange="U.ustawSzukaj($event.detail.value || '')"></ion-input>
      </ion-item>
      <ion-item>
        <ion-select id="qqFilter" :label="T('Dział', 'Section')" label-placement="stacked" interface="popover" :value="b.filtr" @ionChange="U.ustawFiltr($event.detail.value)">
          <ion-select-option :value="U.X0">{{ T('Wszystkie', 'All') }}</ion-select-option>
          <ion-select-option v-for="x in b.dzialy" :key="x.id" :value="x.id">{{ x.nazwa }}</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-card>

    <ion-card>
      <ion-accordion-group>
        <ion-accordion value="dzialy">
          <ion-item slot="header">
            <ion-label>{{ T('Działy i poddziały', 'Sections and subsections') }}</ion-label>
          </ion-item>
          <div slot="content">
            <ion-item v-for="x in b.sekcje" :key="x.id">
              <ion-label>{{ x.nazwa }}</ion-label>
              <ion-button fill="clear" :aria-label="T('W górę', 'Move up')" :disabled="zajety" @click="U.dzialRuch(x.id, true)"><ion-icon slot="icon-only" :icon="arrowUp"></ion-icon></ion-button>
              <ion-button fill="clear" :aria-label="T('W dół', 'Move down')" :disabled="zajety" @click="U.dzialRuch(x.id, false)"><ion-icon slot="icon-only" :icon="arrowDown"></ion-icon></ion-button>
              <ion-button fill="clear" :disabled="zajety" @click="U.dzialEdytuj(x.id)">{{ T('Edytuj', 'Edit') }}</ion-button>
              <ion-button fill="clear" color="danger" :disabled="zajety" @click="U.dzialUsun(x.id)">{{ T('Usuń pusty', 'Delete empty') }}</ion-button>
            </ion-item>
            <ion-item>
              <ion-input id="qq-sectionName" :label="T('Nazwa działu', 'Section name')" label-placement="stacked" :maxlength="5000" :value="b.formDzial.nazwa" @ionInput="U.formDzial('name', $event.detail.value)"></ion-input>
            </ion-item>
            <ion-item>
              <ion-select id="qq-sectionParent" :label="T('Poddział należy do', 'Subsection belongs to')" label-placement="stacked" interface="popover" :value="b.formDzial.rodzic" @ionChange="U.formDzial('parentId', $event.detail.value)">
                <ion-select-option :value="U.X0">{{ T('Brak — dział główny', 'None — main section') }}</ion-select-option>
                <ion-select-option v-for="x in b.dzialy" :key="x.id" :value="x.id">{{ x.nazwa }}</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item lines="none">
              <ion-button id="qqSectionSave" :disabled="zajety" @click="U.dzialZapisz()">{{ T('Zapisz dział', 'Save section') }}</ion-button>
            </ion-item>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-card>

    <ion-card>
      <ion-accordion-group>
        <ion-accordion value="skala">
          <ion-item slot="header">
            <ion-label>{{ T('Nazwy poziomów skali', 'Scale level names') }}</ion-label>
          </ion-item>
          <div slot="content">
            <ion-item v-for="k in ['A', 'B', 'C', 'D', 'NA']" :key="k">
              <ion-input :id="'qq-scale-' + k" :label="k" label-placement="stacked" :maxlength="5000" :value="b.skala[k]" @ionInput="U.skala(k, $event.detail.value)"></ion-input>
            </ion-item>
            <ion-item lines="none">
              <ion-button id="qqScaleSave" :disabled="zajety" @click="U.skalaZapisz()">{{ T('Zapisz nazwy skali', 'Save scale names') }}</ion-button>
            </ion-item>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-card>

    <ion-card>
      <ion-accordion-group>
        <ion-accordion value="json">
          <ion-item slot="header">
            <ion-label>{{ T('Wklej propozycje lub kopię JSON', 'Paste proposals or a JSON backup') }}</ion-label>
          </ion-item>
          <div slot="content">
            <ion-item>
              <ion-textarea id="qqJSON" aria-label="JSON" :rows="5" :value="b.json" @ionInput="U.ustawJson($event.detail.value || '')"></ion-textarea>
            </ion-item>
            <ion-item lines="none">
              <ion-button id="qqPreviewImport" :disabled="zajety" @click="U.podgladImportu()">{{ T('Podgląd importu', 'Import preview') }}</ion-button>
            </ion-item>
          </div>
        </ion-accordion>
      </ion-accordion-group>
    </ion-card>

    <ion-item lines="none">
      <ion-note id="qqCount">{{ b.pytan }} {{ T('pytań · propozycje wymagają zatwierdzenia', 'questions · proposals need approval') }}</ion-note>
    </ion-item>
    <ion-card v-for="q in b.wiersze" :key="q.id">
      <ion-card-header>
        <ion-card-title>{{ q.tekst }}</ion-card-title>
        <ion-card-subtitle>{{ q.typ }}</ion-card-subtitle>
      </ion-card-header>
      <ion-card-content>
        <p>{{ q.opis }}</p>
        <ion-chip v-for="(r, i) in q.powody" :key="i">{{ r }}</ion-chip>
      </ion-card-content>
      <ion-item lines="none">
        <ion-button :id="'qqEdit-' + q.id" fill="outline" :disabled="zajety" @click="U.edytuj(q.id)">{{ T('Edytuj', 'Edit') }}</ion-button>
        <ion-button fill="outline" :disabled="zajety" @click="U.edytuj(q.id, true)">{{ T('Duplikuj', 'Duplicate') }}</ion-button>
        <ion-button v-if="q.propozycja" fill="outline" :disabled="zajety" @click="U.zatwierdz(q.id)">{{ T('Zatwierdź', 'Approve') }}</ion-button>
        <ion-button fill="outline" color="danger" :disabled="zajety" @click="U.usun(q.id)">{{ T('Usuń', 'Delete') }}</ion-button>
      </ion-item>
    </ion-card>
    <ion-item v-if="b.wiecej" lines="none">
      <ion-note>{{ T('Doprecyzuj filtr — pokazano 200 pytań.', 'Narrow the filter — 200 questions shown.') }}</ion-note>
    </ion-item>
  </div>
</template>

<script setup>
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItem, IonLabel, IonNote, IonInput, IonTextarea, IonSelect, IonSelectOption, IonButton, IonIcon, IonChip, IonAccordionGroup, IonAccordion } from '@ionic/vue';
import { settingsOutline, arrowUp, arrowDown } from 'ionicons/icons';
defineProps({ T: Function, b: Object, zajety: Boolean });
const U = window.OESTQuestionsUI;
</script>
