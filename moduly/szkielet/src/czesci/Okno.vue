<!-- Okienko z własną treścią (ion-modal) – JEDNO w całej apce: tytuł, treść (komponent Vue ekranu) i przyciski na dole.
     Otwiera je OESTOkna.okno({ tytul, komponent, wlasciwosci, ok, anuluj, bezPrzyciskow }) → Promise<{ ok, dane }>.
     Treść oddaje dane przez zdarzenie „dane” (np. zaznaczone pola); Wstecz telefonu i „Anuluj” = { ok: false }. -->
<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ tytul }}</ion-title>
      <ion-buttons slot="end"><ion-button @click="zamknij(false)" :aria-label="T('Zamknij', 'Close')"><ion-icon slot="icon-only" :icon="close"></ion-icon></ion-button></ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding">
    <component :is="komponent" v-bind="wlasciwosci || {}" :T="T" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)"></component>
  </ion-content>
  <ion-footer v-if="!bezPrzyciskow">
    <ion-toolbar>
      <ion-buttons slot="end">
        <ion-button fill="clear" v-if="anuluj !== false" @click="zamknij(false)">{{ anuluj || T('Anuluj', 'Cancel') }}</ion-button>
        <ion-button fill="solid" :color="niebezpieczne ? 'danger' : 'primary'" @click="zamknij(true)">{{ ok || 'OK' }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup>
import { ref } from 'vue';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonFooter, modalController } from '@ionic/vue';
import { close } from 'ionicons/icons';
const props = defineProps({ T: Function, tytul: String, komponent: Object, wlasciwosci: Object, ok: String, anuluj: [String, Boolean], niebezpieczne: Boolean, bezPrzyciskow: Boolean });
const dane = ref(null);
function zamknij(ok) { modalController.dismiss({ ok, dane: dane.value }, ok ? 'ok' : 'cancel'); }
</script>
