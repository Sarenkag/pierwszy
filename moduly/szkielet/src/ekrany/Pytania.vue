<!-- Edytor inspekcji i pytań. Dane i akcje: OESTQuestionsUI (app/www/questions-ui.js); stan odświeża zdarzenie oest:pytania-stan. Tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding oest-ekran">
    <ion-item v-if="d.ladowanie" lines="none">
      <ion-spinner slot="start"></ion-spinner>
      <ion-label role="status">{{ T('Wczytywanie pytań…', 'Loading questions…') }}</ion-label>
    </ion-item>
    <ion-item v-else-if="d.blad" lines="none">
      <ion-note color="danger">{{ d.blad }}</ion-note>
    </ion-item>
    <template v-else>
      <div class="oest-chipy">
        <ion-chip id="qqTabBase" :data-on="d.zakladka === 'base' || undefined" :disabled="d.zajety" @click="U.zakladka('base')"><ion-label>{{ T('Baza pytań', 'Question library') }}</ion-label></ion-chip>
        <ion-chip id="qqTabTasks" :data-on="d.zakladka === 'tasks' || undefined" :disabled="d.zajety" @click="U.zakladka('tasks')"><ion-label>{{ T('Inspekcje', 'Inspections') }}</ion-label></ion-chip>
      </div>
      <component v-if="d.edytor" :is="Edytor" :T="T" :e="U.edytor()" :zajety="d.zajety"></component>
      <component v-else-if="d.zakladka === 'base'" :is="Baza" :T="T" :b="U.baza()" :zajety="d.zajety"></component>
      <component v-else :is="Inspekcje" :T="T" :i="U.inspekcje()" :zajety="d.zajety"></component>

      <ion-card v-if="d.import" id="qqImportPreview">
        <template v-if="d.import.rodzaj === 'propozycje'">
          <ion-list-header>{{ T('Podgląd propozycji — bez zapisu i przypisań', 'Proposal preview — no saving or assignment') }}</ion-list-header>
          <template v-for="p in d.import.wiersze" :key="p.index">
            <ion-item>
              <ion-toggle :id="'qqImport-' + p.index" :checked="p.wybrany" @ionChange="U.importWybierz(p.index, $event.detail.checked)">
                {{ p.tekst }}<template v-if="p.duplikat"> · {{ T('PODOBNE / DUPLIKAT — zaznacz tylko świadomie', 'SIMILAR / DUPLICATE — select only on purpose') }}</template>
              </ion-toggle>
            </ion-item>
            <ion-item lines="none">
              <ion-note>{{ p.opis }}</ion-note>
            </ion-item>
            <ion-item lines="none">
              <ion-note>{{ p.tresc }}</ion-note>
            </ion-item>
          </template>
          <div class="oest-rzad">
          <ion-button expand="block" id="qqImportCommit" :disabled="d.zajety" @click="U.importPropozycje()">{{ T('Importuj zaznaczone jako propozycje', 'Import selected as proposals') }}</ion-button>
          <ion-button expand="block" fill="outline" @click="U.importAnuluj()">{{ T('Anuluj', 'Cancel') }}</ion-button>
        </div>
        </template>
        <template v-else>
          <ion-list-header>{{ T('Kopia: ', 'Backup: ') }}{{ d.import.pytan }} {{ T('pytań,', 'questions,') }} {{ d.import.dzialow }} {{ T('działów', 'sections') }}</ion-list-header>
          <ion-item>
            <ion-toggle id="qqReplace" :checked="d.import.zastap" @ionChange="U.importZastap($event.detail.checked)">{{ T('Zastąp całą bazę tego konta (inaczej scalaj ID, obecne dane wygrywają)', 'Replace this account\'s whole library (otherwise merge by ID, current data wins)') }}</ion-toggle>
          </ion-item>
          <div class="oest-rzad">
          <ion-button expand="block" id="qqBackupCommit" :disabled="d.zajety" @click="U.importKopia()">{{ T('Zatwierdź import kopii', 'Approve backup import') }}</ion-button>
          <ion-button expand="block" fill="outline" @click="U.importAnuluj()">{{ T('Anuluj', 'Cancel') }}</ion-button>
        </div>
        </template>
      </ion-card>
      <ion-card v-if="d.raport !== null">
        <ion-list-header>{{ T('Podgląd tekstu raportu', 'Report text preview') }}</ion-list-header>
        <ion-item v-for="(l, n) in d.raport.split('\n')" :key="n" lines="none">
          <ion-label class="ion-text-wrap">{{ l }}</ion-label>
        </ion-item>
      </ion-card>
      <ion-item v-if="d.komunikat" lines="none">
        <ion-note id="qqMessage" role="status" aria-live="polite">{{ d.komunikat }}</ion-note>
      </ion-item>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { IonCard, IonItem, IonLabel, IonNote, IonButton, IonSpinner, IonToggle, IonListHeader, IonChip } from '@ionic/vue';
import Edytor from './pytania/Edytor.vue';
import Baza from './pytania/Baza.vue';
import Inspekcje from './pytania/Inspekcje.vue';
defineProps({ T: Function, wersja: Number });
const U = window.OESTQuestionsUI;
const odswiez = ref(0);
const d = computed(() => (odswiez.value, U.dane()));
const nasluch = () => { odswiez.value++; };
onMounted(() => { window.addEventListener('oest:pytania-stan', nasluch); U.open(); });
onBeforeUnmount(() => { window.removeEventListener('oest:pytania-stan', nasluch); U.close(); });
</script>
