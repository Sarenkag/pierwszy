<!-- Dawne nagrania głosowe karty Reactive (sprzed notatek): odsłuch, „Na tekst” (transcribe), × usuwa; tekst każdego nagrania osobno do poprawy.
     Zakończone zadanie: tylko odsłuch i tekst do odczytu. Dane: OESTReactiveUI.dane().nagrania. -->
<template>
  <div id="rxAudio">
    <template v-for="a in lista" :key="a.id">
      <div class="oest-rx-voice">
        <ion-button class="oest-rx-play" fill="outline" :data-id="a.id" :aria-label="T('Odtwórz nagranie', 'Play recording')" @click="graj(a)"><ion-icon slot="icon-only" :icon="gra === a.id ? stop : play"></ion-icon></ion-button>
        <span class="oest-rx-odstep"></span>
        <template v-if="edycja">
          <ion-button class="oest-rx-tx" fill="outline" data-rx="transcribe" :data-id="a.id" @click="A.akcja('transcribe', { id: a.id })">{{ a.przycisk }}</ion-button>
          <ion-button class="oest-rx-vdel" :aria-label="T('Usuń nagranie', 'Delete recording')" @click="A.akcja('voice-del', { id: a.id })">×</ion-button>
        </template>
      </div>
      <ion-item v-if="a.ma" class="oest-rx-vt"><ion-textarea :aria-label="T('Tekst nagrania', 'Recording text')" :rows="2" :maxlength="4000" :readonly="!edycja" :value="a.tekst" @ionInput="e => A.akcja('voice-text', { id: a.id, value: e.detail.value })"></ion-textarea></ion-item>
    </template>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { IonButton, IonIcon, IonItem, IonTextarea } from '@ionic/vue';
import { play, stop } from 'ionicons/icons';
defineProps({ T: Function, lista: Array, edycja: Boolean });
const A = window.OESTReactiveUI;
const gra = ref('');
let dzwiek = null;
function zatrzymaj() { if (dzwiek) { dzwiek.pause(); dzwiek = null; } gra.value = ''; }
function graj(a) {
  const ten = gra.value === a.id; zatrzymaj(); if (ten) return;
  dzwiek = new Audio(a.url); gra.value = a.id; dzwiek.onended = zatrzymaj; dzwiek.play().catch(zatrzymaj);
}
onUnmounted(zatrzymaj);
</script>
