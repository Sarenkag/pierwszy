<!-- Okienko z własną treścią (ion-modal) – JEDNO w całej apce: tytuł, treść (komponent Vue ekranu) i przyciski na dole.
     Otwiera je OESTOkna.okno({ tytul, komponent, wlasciwosci, ok, anuluj, bezPrzyciskow, pelny }) → Promise<{ ok, dane }>.
     Wygląd jak dawne okienko apki na main (.oest-ask): karta 360 px na środku, wysokość według treści, tytuł 17 px, dwa równe przyciski.
     ✕ tylko w okienku bez przycisków (inaczej zamyka „Anuluj”/„Zamknij”, Wstecz telefonu albo stuknięcie obok).
     pelny: podgląd na cały ekran bez tytułu (np. zdjęcie) – treść na środku czarnego tła.
     Treść oddaje dane przez zdarzenie „dane” (np. zaznaczone pola); Wstecz telefonu i „Anuluj” = { ok: false }. -->
<template>
  <ion-content v-if="pelny">
    <component :is="komponent" v-bind="wlasciwosci || {}" :T="T" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)"></component>
  </ion-content>
  <template v-else>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ tytul }}</ion-title>
        <ion-buttons v-if="bezPrzyciskow" slot="end"><ion-button @click="zamknij(false)" :aria-label="T('Zamknij', 'Close')"><ion-icon slot="icon-only" :icon="close"></ion-icon></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <div class="oest-okno-tresc">
      <component :is="komponent" v-bind="wlasciwosci || {}" :T="T" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)"></component>
    </div>
    <ion-footer v-if="!bezPrzyciskow">
      <div class="oest-okno-przyciski">
        <ion-button fill="outline" v-if="anuluj !== false" @click="zamknij(false)">{{ anuluj || T('Anuluj', 'Cancel') }}</ion-button>
        <ion-button fill="solid" :color="niebezpieczne ? 'danger' : undefined" @click="zamknij(true)">{{ ok || 'OK' }}</ion-button>
      </div>
    </ion-footer>
  </template>
</template>

<script setup>
import { ref } from 'vue';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonFooter, modalController } from '@ionic/vue';
import { close } from 'ionicons/icons';
const props = defineProps({ T: Function, tytul: String, komponent: Object, wlasciwosci: Object, ok: String, anuluj: [String, Boolean], niebezpieczne: Boolean, bezPrzyciskow: Boolean, pelny: Boolean });
const dane = ref(null);
function zamknij(ok) { modalController.dismiss({ ok, dane: dane.value }, ok ? 'ok' : 'cancel'); }
</script>
