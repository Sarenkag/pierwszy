<!-- Propozycja komentarza z notatek (OESTNotatki.offer) – pole do poprawienia i ostrzeżenie o liczbach z notatek, których w nim brakuje.
     Ostrzeżenie liczy moduł (kontroler); „Wstaw” / „Anuluj” daje okienko (OESTOkna.okno). Nic nie wstawia się samo. -->
<template>
  <div class="oest-nt" data-nt-propozycja>
    <div class="oest-nt-h">{{ d.naglowek }}</div>
    <ion-item lines="none">
      <ion-textarea data-nt-f="en" :value="d.tekst" :maxlength="8000" :auto-grow="true" :rows="4" :aria-label="T('Propozycja', 'Suggestion')" @ionInput="e => k.akcja('tekst', e.detail.value)"></ion-textarea>
    </ion-item>
    <div class="oest-nt-warn" role="status" data-nt-warn><template v-if="d.ostrzezenie"><ion-icon :icon="warningOutline" aria-hidden="true"></ion-icon> {{ d.ostrzezenie }}</template></div>
  </div>
</template>

<script setup>
import { IonItem, IonIcon, IonTextarea } from '@ionic/vue';
import { warningOutline } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
