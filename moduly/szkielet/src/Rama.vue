<!-- Rama ekranu OEST (standard Ionic md): nagłówek pod paskiem telefonu (edge-to-edge), jedna przewijana treść, stopka z paskiem
     wysyłki poza przewijaniem i tło pod przyciskami nawigacji telefonu (czesci/TloNawigacji.vue).
     Każdy ekran na Vue (oprócz logowania) ma TEN SAM górny pasek (czesci/GornyPasek.vue, Grzegorz 25.11.2026): zmienia się tylko tytuł –
     nazwa ekranu WIELKIMI LITERAMI, na ekranie głównym „MENU GŁÓWNE”. Bez strzałki Wstecz (Wstecz telefonu). Stałe klocki ekranu
     (linia stanu, pasek dni) trafiają pod pasek przez <Teleport to="#oest-pod-paskiem"> i się nie przewijają; ekran główny się nie przewija.
     Ekran jeszcze w starym kodzie – sam pas pod godziną (jego nagłówek .top zostaje do przeniesienia).
     Osobna strona (inspekcje, strona: true): ta sama rama, ten sam górny pasek (tytuł ustawia strona przez OESTRama.ustaw) i przewijanie Ionic. -->
<template>
  <ion-app>
    <div class="ion-page" :data-inspekcja="strona ? '' : undefined">
      <GornyPasek v-if="strona || (stan.komponent && stan.meta.id !== 'start')" :tytul="tytul" :d="pasek" :T="T" @okno="okno" @jezyk="emit('jezyk')"><div id="oest-pod-paskiem"></div></GornyPasek>
      <ion-header v-else-if="!stan.glowny"><div class="oest-pas"></div></ion-header>
      <ion-content ref="tresc" :scroll-y="stan.meta.id !== 'home'">
        <component v-if="stan.komponent" :is="stan.komponent" :key="stan.trasa" :T="Tj" :wersja="stan.wersja"></component>
      </ion-content>
      <ion-footer class="ion-no-border"><div id="oest-stopka"><PasekWysylki :T="T"></PasekWysylki></div></ion-footer>
      <TloNawigacji></TloNawigacji>
    </div>
  </ion-app>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import PasekWysylki from './czesci/PasekWysylki.vue';
import GornyPasek from './czesci/GornyPasek.vue';
import TloNawigacji from './czesci/TloNawigacji.vue';
import { okno } from './ekrany/glowny/okna.js';
import { IonApp, IonHeader, IonContent, IonFooter } from '@ionic/vue';
const props = defineProps({ stan: Object, T: Function, strona: Boolean });
const emit = defineEmits(['gotowe', 'jezyk']);
// górny pasek: tytuł = nazwa ekranu (ekran główny: „Menu główne”); data, pogoda, dzwonek, inicjały z OESTHome.dane()
const tytul = computed(() => props.stan.meta.id === 'home' ? props.T('Menu główne', 'Main menu') : props.stan.tytul);
const n = ref(0), odswiez = () => { n.value++; };
const pasek = computed(() => (props.stan.wersja, n.value, window.OESTHome ? window.OESTHome.dane() : {}));
const ZDARZENIA = ['oest:home', 'oest:ppm-ui', 'oest:settings-changed'];
const tresc = ref(null);
// T ekranu ma nową tożsamość po każdej zmianie języka (stan.wersja): teksty T(…) w treści komponentów Ionic (sloty ion-button, ion-toggle,
// ion-list-header…) przerysowują się w nowym języku – sam licznik wersja nie przerysowuje slotów dzieci (Vue: stabilne sloty)
const Tj = computed(() => { const w = props.stan.wersja; return (pl, en) => (w, props.T(pl, en)); });
onMounted(async () => {
  for (const z of ZDARZENIA) window.addEventListener(z, odswiez);
  if (window.OESTHome) window.OESTHome.odswiez(false);
  const wrap = document.querySelector('body > .wrap');
  const c = tresc.value && tresc.value.$el;
  if (wrap && c) c.appendChild(wrap);
  try { await customElements.whenDefined('ion-content'); emit('gotowe', await c.getScrollElement()); } catch (e) { emit('gotowe', null); }
});
onUnmounted(() => { for (const z of ZDARZENIA) window.removeEventListener(z, odswiez); });
</script>
