<!-- Ustawienia wysyłki (⚙ w inspekcji) – jak wcześniejsza wersja (Grzegorz 25.11.2026): znacznik z lewej, tekst obok, uwaga pod spodem, „Jak” jako dwa przełączniki. Dane i zapis: i-formularz.js (sendCfg).
     Zablokowane pole ma atrybut disabled (.attr): zapis i-formularz.js pomija „ion-checkbox[data-sn]:not([disabled])” – bez atrybutu Vue ustawiałby tylko właściwość i zablokowane pole nadpisywało ustawienie na „nie”. -->
<template>
  <ion-list lines="none">
    <template v-for="(sekcja, i) in d.sekcje" :key="i">
      <ion-list-header>{{ sekcja.tytul }}</ion-list-header>
      <ion-radio-group v-if="sekcja.pola.some(r => r.radio)" name="sn-one" :value="(sekcja.pola.find(r => r.radio && r.wybrane) || {}).wartosc">
        <ion-item v-for="r in sekcja.pola" :key="r.wartosc"><ion-radio :value="r.wartosc" justify="start" label-placement="end"><ion-label class="ion-text-wrap">{{ r.tekst }}</ion-label></ion-radio></ion-item>
      </ion-radio-group>
      <template v-else>
        <ion-item v-for="r in sekcja.pola" :key="r.klucz"><ion-checkbox :data-sn="r.klucz" :checked="r.wybrane" :disabled.attr="r.blokada || null" justify="start" label-placement="end"><ion-label class="ion-text-wrap">{{ r.tekst }}<br v-if="r.uwaga"><ion-note v-if="r.uwaga">{{ r.uwaga }}</ion-note></ion-label></ion-checkbox></ion-item>
      </template>
    </template>
  </ion-list>
</template>
<script setup>
import { IonList, IonListHeader, IonItem, IonCheckbox, IonRadioGroup, IonRadio, IonLabel, IonNote } from '@ionic/vue';
import { uzyjKontrolera } from '../../czesci/kontroler.js';
const props = defineProps({ kontroler: Object });
const d = uzyjKontrolera(props.kontroler);
</script>
