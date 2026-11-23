<!-- Rama ekranu OEST (standard Ionic md): nagłówek pod paskiem telefonu (edge-to-edge), jedna przewijana treść, stopka z paskiem
     wysyłki poza przewijaniem. Ekran na Vue dostaje pasek narzędzi Ionic; ekran jeszcze w starym kodzie – sam pas pod godziną
     (jego nagłówek .top zostaje do przeniesienia); ekran główny i logowanie – bez pasa, tło apki pod godziną.
     Osobna strona (inspekcje, strona: true): tylko niewidoczny ion-app – Wstecz Androida i okienka, bez ramy. -->
<template>
  <ion-app :class="{ 'ion-hide': strona }">
    <div v-if="!strona" class="ion-page">
      <ion-header v-if="!stan.glowny">
        <ion-toolbar v-if="stan.komponent">
          <ion-buttons slot="start"><ion-back-button default-href="#" data-nav="up" :text="''" :aria-label="T('Wstecz', 'Back')"></ion-back-button></ion-buttons>
          <ion-title>{{ stan.tytul }}</ion-title>
          <ion-buttons slot="end">
            <ion-button v-for="(a, i) in akcjeVue" :key="i" :data-nav="a.nav || undefined" :disabled="a.wylaczona" @click="!a.nav && a.fn && a.fn()" :aria-label="a.etykieta"><ion-icon slot="icon-only" :icon="a.ikona"></ion-icon></ion-button>
            <ion-button data-jezyk-ramy @click="emit('jezyk')" :aria-label="T('Język: polski / angielski', 'Language: Polish / English')">{{ jezyk === 'pl' ? 'EN' : 'PL' }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
        <div v-else class="oest-pas"></div>
      </ion-header>
      <ion-content ref="tresc">
        <component v-if="stan.komponent" :is="stan.komponent" :key="stan.trasa" :T="Tj" :wersja="stan.wersja"></component>
      </ion-content>
      <ion-footer><div id="oest-stopka"></div></ion-footer>
    </div>
  </ion-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { IonApp, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonButton, IonIcon, IonContent, IonFooter } from '@ionic/vue';
const props = defineProps({ stan: Object, T: Function, strona: Boolean });
const emit = defineEmits(['gotowe', 'jezyk']);
const jezyk = computed(() => (props.stan.wersja, (window.OESTBledy && window.OESTBledy.lang ? window.OESTBledy.lang() : document.documentElement.lang) === 'en' ? 'en' : 'pl'));
const tresc = ref(null);
// T ekranu ma nową tożsamość po każdej zmianie języka (stan.wersja): teksty T(…) w treści komponentów Ionic (sloty ion-button, ion-toggle,
// ion-list-header…) przerysowują się w nowym języku – sam licznik wersja nie przerysowuje slotów dzieci (Vue: stabilne sloty)
const Tj = computed(() => { const w = props.stan.wersja; return (pl, en) => (w, props.T(pl, en)); });
// akcje paska ekranu na Vue (OESTRama.ustaw({ akcje: [{ ikona, etykieta, fn | nav }] })): ikony Ionicons; węzły DOM to akcje starych ekranów
const akcjeVue = computed(() => (props.stan.akcje || []).filter(a => a && !(a instanceof Node)));
onMounted(async () => {
  if (props.strona) return; // osobna strona (inspekcje): tylko Wstecz i okienka, bez ramy
  const wrap = document.querySelector('body > .wrap');
  const c = tresc.value && tresc.value.$el;
  if (wrap && c) c.appendChild(wrap);
  try { await customElements.whenDefined('ion-content'); emit('gotowe', await c.getScrollElement()); } catch (e) { emit('gotowe', null); }
});
</script>
