<!-- Okienko z własną treścią (ion-modal) – JEDNO w całej apce: tytuł, treść (komponent Vue ekranu) i przyciski na dole.
     Otwiera je OESTOkna.okno({ tytul, komponent, wlasciwosci, ok, anuluj, bezPrzyciskow, pelny, karta }) → Promise<{ ok, dane }>.
     karta: wygląd jak dawne okienko apki na main (.oest-ask): karta 360 px na środku, wysokość według treści, tytuł 17 px, dwa równe przyciski.
     ✕ tylko w okienku bez przycisków (inaczej zamyka „Anuluj”/„Zamknij”, Wstecz telefonu albo stuknięcie obok).
     pelny: podgląd na cały ekran bez tytułu (np. zdjęcie) – treść na środku czarnego tła.
     tytul może być funkcją (np. OESTHome.prognoza().tytul) – po zmianie PL/EN okienko pokazuje tytuł i swoje przyciski w nowym języku.
     Treść oddaje dane przez zdarzenie „dane” (np. zaznaczone pola); Wstecz telefonu i „Anuluj” = { ok: false }.
     wyglad (wspólne moduły): małe okienko na środku jak na main – pogrubiony tytuł z ikoną, bez ✕ (zamyka Wstecz), wysokość z treści,
     dwa równe przyciski na dole (wygląd w szkielet.css: .oest-okno, data-oest-okno).
     Treść może schować przyciski na dole zdarzeniem „przyciski” (false), np. notatki w trakcie poprawiania (własne Anuluj / Zapisz). -->
<template>
  <div v-if="wyglad" class="oest-okno">
    <b class="oest-okno-tytul"><ion-icon v-if="IKONY[wyglad]" :icon="IKONY[wyglad]" aria-hidden="true"></ion-icon>{{ naglowek }}</b>
    <div class="oest-okno-tresc">
      <component :is="komponent" v-bind="wlasciwosci || {}" :T="t" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)" @przyciski="v => (przyciski = v !== false)"></component>
    </div>
    <div v-if="!bezPrzyciskow && przyciski" class="oest-okno-rzad" :data-jeden="anuluj === false ? '' : undefined">
      <ion-button v-if="anuluj !== false" class="oest-okno-b" fill="outline" data-okno="anuluj" @click="zamknij(false)">{{ anuluj || t('Anuluj', 'Cancel') }}</ion-button>
      <ion-button class="oest-okno-b" :data-zle="niebezpieczne ? '' : undefined" data-okno="ok" @click="zamknij(true)">{{ ok || 'OK' }}</ion-button>
    </div>
  </div>
  <ion-content v-else-if="pelny">
    <component :is="komponent" v-bind="wlasciwosci || {}" :T="t" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)"></component>
  </ion-content>
  <template v-else-if="karta">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ naglowek }}</ion-title>
        <ion-buttons v-if="bezPrzyciskow" slot="end"><ion-button data-okno="zamknij" @click="zamknij(false)" :aria-label="t('Zamknij', 'Close')"><ion-icon slot="icon-only" :icon="close"></ion-icon></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <div class="oest-karta-tresc">
      <component :is="komponent" v-bind="wlasciwosci || {}" :T="t" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)" @przyciski="v => (przyciski = v !== false)"></component>
    </div>
    <ion-footer v-if="!bezPrzyciskow && przyciski">
      <div class="oest-karta-przyciski">
        <ion-button fill="outline" v-if="anuluj !== false" data-okno="anuluj" @click="zamknij(false)">{{ anuluj || t('Anuluj', 'Cancel') }}</ion-button>
        <ion-button fill="solid" :color="niebezpieczne ? 'danger' : undefined" data-okno="ok" @click="zamknij(true)">{{ ok || 'OK' }}</ion-button>
      </div>
    </ion-footer>
  </template>
  <template v-else>
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ naglowek }}</ion-title>
        <ion-buttons slot="end"><ion-button data-okno="zamknij" @click="zamknij(false)" :aria-label="t('Zamknij', 'Close')"><ion-icon slot="icon-only" :icon="close"></ion-icon></ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <component :is="komponent" v-bind="wlasciwosci || {}" :T="t" @dane="v => (dane = v)" @zamknij="v => zamknij(v !== false)" @przyciski="v => (przyciski = v !== false)"></component>
    </ion-content>
    <ion-footer v-if="!bezPrzyciskow && przyciski">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button fill="clear" v-if="anuluj !== false" data-okno="anuluj" @click="zamknij(false)">{{ anuluj || t('Anuluj', 'Cancel') }}</ion-button>
          <ion-button fill="solid" :color="niebezpieczne ? 'danger' : 'primary'" data-okno="ok" @click="zamknij(true)">{{ ok || 'OK' }}</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-footer>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonFooter, modalController } from '@ionic/vue';
import { close, documentText, sparkles, search } from 'ionicons/icons';
const props = defineProps({ T: Function, tytul: [String, Function], komponent: Object, wlasciwosci: Object, ok: String, anuluj: [String, Boolean], niebezpieczne: Boolean, bezPrzyciskow: Boolean, wyglad: String, pelny: Boolean, karta: Boolean });
// ikona przed tytułem w miejscu dawnego emoji (📝 Notatki / Nowa notatka, ✨ Połącz notatki, 🔍 Odczyt ze zdjęcia)
const IKONY = { NotatkiOkno: documentText, NotatkaNowa: documentText, NotatkiPropozycja: sparkles, OdczytArkusz: search };
const dane = ref(null), przyciski = ref(true);
// zmiana PL/EN przy otwartym okienku: t z nową tożsamością (teksty w slotach przycisków i treści się przerysowują), tytuł liczony od nowa
const jezyk = ref(0), nowyJezyk = () => { jezyk.value++; };
const t = computed(() => { const n = jezyk.value; return (pl, en) => (n, props.T(pl, en)); });
const naglowek = computed(() => (jezyk.value, typeof props.tytul === 'function' ? props.tytul() : props.tytul));
onMounted(() => window.addEventListener('oest:lang', nowyJezyk));
onUnmounted(() => window.removeEventListener('oest:lang', nowyJezyk));
function zamknij(ok) { modalController.dismiss({ ok, dane: dane.value }, ok ? 'ok' : 'cancel'); }
</script>
