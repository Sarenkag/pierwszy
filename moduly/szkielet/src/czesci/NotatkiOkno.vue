<!-- Okienko „Notatki” (OESTNotatki.open) – lista notatek (godzina, miejsce, długość, EN + polski oryginał, stan), odsłuch, Popraw, usuń
     (drugie stuknięcie), a w trybie poprawiania: PL / EN, „Ułóż z polskiego”, ostrzeżenie o liczbach, Anuluj / Zapisz.
     Logika i stan w module (kontroler); tu tylko komponenty Ionic. W trakcie poprawiania okienko chowa „Zamknij” (zdarzenie „przyciski”). -->
<template>
  <div data-nt-okno @click="tlo">
    <template v-if="d.tryb === 'edycja'">
      <p class="ion-padding-horizontal"><ion-note>{{ d.edycja.naglowek }}</ion-note></p>
      <ion-grid>
        <ion-row>
          <ion-col size="6"><ion-button expand="block" size="small" :fill="d.edycja.tab === 'pl' ? 'solid' : 'outline'" data-nt="tab-pl" @click="k.akcja('tab', 'pl')">{{ T('Po polsku', 'Polish') }}</ion-button></ion-col>
          <ion-col size="6"><ion-button expand="block" size="small" :fill="d.edycja.tab === 'en' ? 'solid' : 'outline'" data-nt="tab-en" @click="k.akcja('tab', 'en')">{{ T('Po angielsku', 'English') }}</ion-button></ion-col>
        </ion-row>
      </ion-grid>
      <ion-item :hidden="d.edycja.tab !== 'pl'">
        <ion-textarea data-nt-f="pl" :value="d.edycja.pl" :maxlength="4000" :auto-grow="true" :rows="5" :label="T('Oryginał', 'Original')" label-placement="stacked" @ionInput="e => k.akcja('pole', 'pl', e.detail.value)"></ion-textarea>
      </ion-item>
      <ion-item :hidden="d.edycja.tab !== 'en'">
        <ion-textarea data-nt-f="en" :value="d.edycja.en" :maxlength="4000" :auto-grow="true" :rows="5" :label="T('Do raportu', 'For the report')" label-placement="stacked" @ionInput="e => k.akcja('pole', 'en', e.detail.value)"></ion-textarea>
      </ion-item>
      <p class="ion-padding-horizontal"><ion-note color="warning" role="status" data-nt-warn>{{ d.edycja.ostrzezenie }}</ion-note></p>
      <ion-grid>
        <ion-row>
          <ion-col size="6"><ion-button expand="block" fill="outline" data-nt="redo" :disabled="d.edycja.uklada" @click="k.akcja('redo')"><ion-icon slot="start" :icon="sparkles" aria-hidden="true"></ion-icon>{{ T('Ułóż z polskiego', 'Rewrite from Polish') }}</ion-button></ion-col>
          <ion-col size="6"><ion-button v-if="d.edycja.audio" expand="block" fill="outline" data-nt="play" @click="k.akcja('play', null)"><ion-icon slot="start" :icon="d.edycja.gra ? stop : play" aria-hidden="true"></ion-icon>{{ d.edycja.gra ? T('Stop', 'Stop') : d.edycja.czas }}</ion-button></ion-col>
        </ion-row>
        <ion-row>
          <ion-col size="6"><ion-button expand="block" fill="clear" data-nt="cancel" @click="k.akcja('cancel')">{{ T('Anuluj', 'Cancel') }}</ion-button></ion-col>
          <ion-col size="6"><ion-button expand="block" data-nt="save" :disabled="d.edycja.zapisuje" @click="k.akcja('save')">{{ T('Zapisz', 'Save') }}</ion-button></ion-col>
        </ion-row>
      </ion-grid>
    </template>
    <template v-else>
      <p v-if="d.naglowek" class="ion-padding-horizontal"><ion-note>{{ d.naglowek }}</ion-note></p>
      <ion-item v-if="d.pusto" lines="none" data-nt-pusto><ion-label class="ion-text-center">{{ d.pusto }}</ion-label></ion-item>
      <ion-card v-for="n in d.notatki" :key="n.id" :data-nt-note="n.id">
        <ion-card-header>
          <ion-card-subtitle>{{ n.meta }}</ion-card-subtitle>
          <div><ion-badge :color="n.tag.kolor" data-nt-tag>{{ n.tag.tekst }}</ion-badge></div>
        </ion-card-header>
        <ion-card-content>
          <p v-if="n.en" data-nt-en>{{ n.en }}</p>
          <p v-if="n.pl" data-nt-pl><ion-note>{{ n.pl }}</ion-note></p>
          <p v-if="n.brak"><ion-text color="warning">{{ n.brak }}</ion-text></p>
          <p v-if="n.blad"><ion-text color="warning">{{ n.blad }}</ion-text></p>
          <ion-grid>
            <ion-row>
              <ion-col size="4">
                <ion-button v-if="n.audio" expand="block" fill="outline" size="small" data-nt="play" @click="k.akcja('play', n.id)"><ion-icon slot="start" :icon="n.gra ? stop : play" aria-hidden="true"></ion-icon>{{ n.gra ? T('Stop', 'Stop') : n.czas }}</ion-button>
                <ion-button v-else expand="block" fill="outline" size="small" disabled>—</ion-button>
              </ion-col>
              <template v-if="!d.readonly">
                <ion-col size="4"><ion-button expand="block" fill="outline" size="small" data-nt="edit" :disabled="n.zajeta" @click="k.akcja('edit', n.id)"><ion-icon slot="start" :icon="create" aria-hidden="true"></ion-icon>{{ T('Popraw', 'Edit') }}</ion-button></ion-col>
                <ion-col size="4"><ion-button expand="block" :fill="n.pewne ? 'solid' : 'outline'" color="danger" size="small" data-nt="del" :disabled="n.zajeta" :aria-label="T('Usuń notatkę', 'Delete note')" @click="k.akcja('del', n.id)">
                  <template v-if="n.pewne">{{ T('Usunąć?', 'Delete?') }}</template><ion-icon v-else slot="icon-only" :icon="trash" aria-hidden="true"></ion-icon>
                </ion-button></ion-col>
              </template>
            </ion-row>
          </ion-grid>
        </ion-card-content>
      </ion-card>
    </template>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { IonItem, IonNote, IonLabel, IonGrid, IonRow, IonCol, IonButton, IonIcon, IonTextarea, IonCard, IonCardHeader, IonCardSubtitle, IonCardContent, IonBadge, IonText } from '@ionic/vue';
import { play, stop, create, trash, sparkles } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const emit = defineEmits(['przyciski']);
const k = props.kontroler;
const d = uzyjKontrolera(k);
// w trakcie poprawiania okienko ma tylko Anuluj / Zapisz (bez „Zamknij”, które zgubiłoby poprawkę)
watch(() => d.value.tryb, t => emit('przyciski', t !== 'edycja'), { immediate: true });
function tlo(e) { if (!(e.target.closest && e.target.closest('[data-nt]'))) k.akcja('tlo'); }
</script>
