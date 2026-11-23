<!-- Nowa notatka pisana (OESTNotatki.write) – pole tekstu; angielski tekst do raportu robi moduł w tle. „Zapisz” / „Anuluj” daje okienko. -->
<template>
  <div class="oest-nt" data-nt-nowa>
    <div class="oest-nt-h">{{ d.naglowek }}</div>
    <ion-item lines="none">
      <ion-textarea data-nt-f="pl" :value="d.tekst" :maxlength="4000" :auto-grow="true" :rows="4" :autofocus="true" :aria-label="T('Notatka', 'Note')" @ionInput="e => k.akcja('tekst', e.detail.value)"></ion-textarea>
    </ion-item>
  </div>
</template>

<script setup>
import { IonItem, IonTextarea } from '@ionic/vue';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
