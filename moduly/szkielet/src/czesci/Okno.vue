<!-- Okienko z własną treścią (ion-modal) – JEDNO w całej apce: tytuł, treść (komponent Vue ekranu) i przyciski na dole.
     Otwiera je OESTOkna.okno({ tytul, komponent, wlasciwosci, ok, anuluj, bezPrzyciskow }) → Promise<{ ok, dane }>.
     Treść oddaje dane przez zdarzenie „dane” (np. zaznaczone pola); Wstecz telefonu i „Anuluj” = { ok: false }.
     wyglad (wspólne moduły): małe okienko na środku jak na main – pogrubiony tytuł z ikoną, bez ✕ (zamyka Wstecz), wysokość z treści,
     dwa równe przyciski na dole (wygląd w szkielet.css: .oest-okno, data-oest-okno).
     Treść może schować przyciski na dole zdarzeniem „przyciski” (false), np. notatki w trakcie poprawiania (własne Anuluj / Zapisz). -->
<template>
  <div v-if="wyglad" class="oest-okno">
    <b class="oest-okno-tytul"><ion-icon v-if="IKONY[wyglad]" :icon="IKONY[wyglad]" aria-hidden="true"></ion-icon>{{ tytul }}</b>
    <div class="oest-okno-tresc">
      <component :is="komponent" v-bind="wlasciwosci || {}" :T="T" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)" @przyciski="v => (przyciski = v !== false)"></component>
    </div>
    <div v-if="!bezPrzyciskow && przyciski" class="oest-okno-rzad" :data-jeden="anuluj === false ? '' : undefined">
      <ion-button v-if="anuluj !== false" class="oest-okno-b" fill="outline" data-okno="anuluj" @click="zamknij(false)">{{ anuluj || T('Anuluj', 'Cancel') }}</ion-button>
      <ion-button class="oest-okno-b" :data-zle="niebezpieczne ? '' : undefined" data-okno="ok" @click="zamknij(true)">{{ ok || 'OK' }}</ion-button>
    </div>
  </div>
  <template v-else>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ tytul }}</ion-title>
        <ion-buttons slot="end"><ion-button data-okno="zamknij" @click="zamknij(false)" :aria-label="T('Zamknij', 'Close')"><ion-icon slot="icon-only" :icon="close"></ion-icon></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <component :is="komponent" v-bind="wlasciwosci || {}" :T="T" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)" @przyciski="v => (przyciski = v !== false)"></component>
    </ion-content>
    <ion-footer v-if="!bezPrzyciskow && przyciski">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="clear" v-if="anuluj !== false" data-okno="anuluj" @click="zamknij(false)">{{ anuluj || T('Anuluj', 'Cancel') }}</ion-button>
          <ion-button fill="solid" :color="niebezpieczne ? 'danger' : 'primary'" data-okno="ok" @click="zamknij(true)">{{ ok || 'OK' }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </template>
</template>

<script setup>
import { ref } from 'vue';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonFooter, modalController } from '@ionic/vue';
import { close, documentText, sparkles, search } from 'ionicons/icons';
const props = defineProps({ T: Function, tytul: String, komponent: Object, wlasciwosci: Object, ok: String, anuluj: [String, Boolean], niebezpieczne: Boolean, bezPrzyciskow: Boolean, wyglad: String });
// ikona przed tytułem w miejscu dawnego emoji (📝 Notatki / Nowa notatka, ✨ Połącz notatki, 🔍 Odczyt ze zdjęcia)
const IKONY = { NotatkiOkno: documentText, NotatkaNowa: documentText, NotatkiPropozycja: sparkles, OdczytArkusz: search };
const dane = ref(null), przyciski = ref(true);
function zamknij(ok) { modalController.dismiss({ ok, dane: dane.value }, ok ? 'ok' : 'cancel'); }
</script>
