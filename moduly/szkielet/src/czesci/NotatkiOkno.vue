<!-- Okienko „Notatki” (OESTNotatki.open) – lista notatek (godzina, miejsce, długość, EN + polski oryginał, stan), odsłuch, Popraw, usuń
     (drugie stuknięcie), a w trybie poprawiania: PL / EN, „Ułóż z polskiego”, ostrzeżenie o liczbach, Anuluj / Zapisz.
     Logika i stan w module (kontroler); tu tylko komponenty Ionic, wygląd jak na main (.oest-nt-* w szkielet.css). W trakcie poprawiania okienko chowa „Zamknij” (zdarzenie „przyciski”). -->
<template>
  <div class="oest-nt" data-nt-okno @click="tlo">
    <template v-if="d.tryb === 'edycja'">
      <div class="oest-nt-h"><ion-icon :icon="createOutline" aria-hidden="true"></ion-icon> {{ d.edycja.naglowek }}</div>
      <div class="oest-nt-tabs oest-rowne">
        <ion-button class="oest-nt-b" fill="outline" :data-on="d.edycja.tab === 'pl' ? '' : undefined" data-nt="tab-pl" @click="k.akcja('tab', 'pl')">{{ T('Po polsku (oryginał)', 'Polish (original)') }}</ion-button>
        <ion-button class="oest-nt-b" fill="outline" :data-on="d.edycja.tab === 'en' ? '' : undefined" data-nt="tab-en" @click="k.akcja('tab', 'en')">{{ T('Po angielsku (do raportu)', 'English (for the report)') }}</ion-button>
      </div>
      <ion-item lines="none" :hidden="d.edycja.tab !== 'pl'">
        <ion-textarea data-nt-f="pl" :value="d.edycja.pl" :maxlength="4000" :auto-grow="true" :rows="4" :aria-label="T('Po polsku (oryginał)', 'Polish (original)')" @ionInput="e => k.akcja('pole', 'pl', e.detail.value)"></ion-textarea>
      </ion-item>
      <ion-item lines="none" :hidden="d.edycja.tab !== 'en'">
        <ion-textarea data-nt-f="en" :value="d.edycja.en" :maxlength="4000" :auto-grow="true" :rows="4" :aria-label="T('Po angielsku (do raportu)', 'English (for the report)')" @ionInput="e => k.akcja('pole', 'en', e.detail.value)"></ion-textarea>
      </ion-item>
      <div class="oest-nt-warn" role="status" data-nt-warn><template v-if="d.edycja.ostrzezenie"><ion-icon :icon="warningOutline" aria-hidden="true"></ion-icon> {{ d.edycja.ostrzezenie }}</template></div>
      <div class="oest-nt-rzad oest-rowne">
        <ion-button class="oest-nt-b" fill="outline" data-nt="redo" :disabled="d.edycja.uklada" @click="k.akcja('redo')"><ion-icon :icon="sparkles" aria-hidden="true"></ion-icon>{{ T('Ułóż z polskiego', 'Rewrite from Polish') }}</ion-button>
        <ion-button v-if="d.edycja.audio" class="oest-nt-b" fill="outline" data-nt="play" @click="k.akcja('play', null)"><ion-icon :icon="d.edycja.gra ? stop : play" aria-hidden="true"></ion-icon>{{ d.edycja.gra ? T('Stop', 'Stop') : d.edycja.czas }}</ion-button>
        <span v-else></span>
      </div>
      <div class="oest-nt-rzad oest-rowne">
        <ion-button class="oest-nt-b" fill="outline" data-nt="cancel" @click="k.akcja('cancel')">{{ T('Anuluj', 'Cancel') }}</ion-button>
        <ion-button class="oest-nt-b" data-nt="save" :disabled="d.edycja.zapisuje" @click="k.akcja('save')">{{ T('Zapisz', 'Save') }}</ion-button>
      </div>
    </template>
    <template v-else>
      <div v-if="d.naglowek" class="oest-nt-h">{{ d.naglowek }}</div>
      <div v-if="d.pusto" class="oest-nt-pusto" data-nt-pusto>{{ d.pusto }}</div>
      <div v-for="n in d.notatki" :key="n.id" class="oest-nt-karta" :data-nt-note="n.id">
        <div class="oest-nt-m">
          <span>{{ n.meta }}</span>
          <span class="oest-nt-tag" data-nt-tag :data-stan="n.stan" :data-kolor="n.tag.kolor"><ion-icon v-if="n.stan === 'ready'" :icon="checkmark" aria-hidden="true"></ion-icon><ion-icon v-else-if="n.stan === 'check'" :icon="warningOutline" aria-hidden="true"></ion-icon>{{ n.tag.tekst }}</span>
        </div>
        <div v-if="n.en" class="oest-nt-en" data-nt-en>{{ n.en }}</div>
        <div v-if="n.pl" class="oest-nt-pl" data-nt-pl>{{ n.pl }}</div>
        <div v-if="n.brak" class="oest-nt-blad">{{ n.brak }}</div>
        <div v-if="n.blad" class="oest-nt-blad">{{ n.blad }}</div>
        <div class="oest-nt-ic oest-rowne">
          <ion-button v-if="n.audio" class="oest-nt-b" fill="outline" data-nt="play" @click="k.akcja('play', n.id)"><ion-icon :icon="n.gra ? stop : play" aria-hidden="true"></ion-icon>{{ n.gra ? T('Stop', 'Stop') : n.czas }}</ion-button>
          <ion-button v-else class="oest-nt-b" fill="outline" disabled>—</ion-button>
          <template v-if="!d.readonly">
            <ion-button class="oest-nt-b" fill="outline" data-nt="edit" :disabled="n.zajeta" @click="k.akcja('edit', n.id)"><ion-icon :icon="createOutline" aria-hidden="true"></ion-icon>{{ T('Popraw', 'Edit') }}</ion-button>
            <ion-button class="oest-nt-b" fill="outline" data-nt="del" :data-pewne="n.pewne ? '' : undefined" :disabled="n.zajeta" :aria-label="T('Usuń notatkę', 'Delete note')" @click="k.akcja('del', n.id)">
              <template v-if="n.pewne">{{ T('Usunąć?', 'Delete?') }}</template><ion-icon v-else slot="icon-only" :icon="trash" aria-hidden="true"></ion-icon>
            </ion-button>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { watch } from 'vue';
import { IonItem, IonButton, IonIcon, IonTextarea } from '@ionic/vue';
import { play, stop, createOutline, trash, sparkles, checkmark, warningOutline } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const emit = defineEmits(['przyciski']);
const k = props.kontroler;
const d = uzyjKontrolera(k);
// w trakcie poprawiania okienko ma tylko Anuluj / Zapisz (bez „Zamknij”, które zgubiłoby poprawkę)
watch(() => d.value.tryb, t => emit('przyciski', t !== 'edycja'), { immediate: true });
function tlo(e) { if (!(e.target.closest && e.target.closest('[data-nt]'))) k.akcja('tlo'); }
</script>
