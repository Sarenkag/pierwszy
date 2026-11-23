<!-- Propozycja komentarza z notatek (OESTNotatki.offer) – pole do poprawienia i ostrzeżenie o liczbach z notatek, których w nim brakuje.
     Ostrzeżenie liczy moduł (kontroler); „Wstaw” / „Anuluj” daje okienko (OESTOkna.okno). Nic nie wstawia się samo. -->
<template>
  <div data-nt-propozycja>
    <p class="ion-padding-horizontal"><ion-note>{{ d.naglowek }}</ion-note></p>
    <ion-item>
      <ion-textarea data-nt-f="en" :value="d.tekst" :maxlength="8000" :auto-grow="true" :rows="5" :aria-label="T('Propozycja', 'Suggestion')" @ionInput="e => k.akcja('tekst', e.detail.value)"></ion-textarea>
    </ion-item>
    <p v-if="d.ostrzezenie" class="ion-padding-horizontal"><ion-note color="warning" role="status" data-nt-warn>{{ d.ostrzezenie }}</ion-note></p>
  </div>
</template>

<script setup>
import { IonItem, IonNote, IonTextarea } from '@ionic/vue';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
