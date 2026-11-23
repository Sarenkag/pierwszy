<!-- Kalendarz (cal): miesiąc (6 tygodni), zmiany z grafiku, liczba inspekcji w dniu, klocki wybranego dnia.
     Dane i reguły: OESTPpmUI.kalDane() (app/www/ppm-ui.js). Poprzedni/następny miesiąc i grafik – akcje paska ramy. -->
<template>
  <div>
    <ion-list-header>{{ d.tytul }}</ion-list-header>
    <ion-grid>
      <ion-row><ion-col v-for="n in d.tydzien" :key="n" class="ion-text-center"><small>{{ n }}</small></ion-col></ion-row>
      <ion-row v-for="r in tygodnie" :key="r[0].k">
        <ion-col v-for="x in r" :key="x.k">
          <ion-button expand="block" size="small" :data-cd="x.k" :fill="x.dzis || x.praca ? 'solid' : x.wybrany ? 'outline' : 'clear'" :color="x.dzis ? 'primary' : x.praca ? 'tertiary' : x.inny ? 'medium' : 'dark'" @click="P.kalDzien(x.k)">
            {{ x.d }}<ion-badge v-if="x.n" :color="x.plan ? 'medium' : 'warning'">{{ x.n }}</ion-badge>
          </ion-button>
        </ion-col>
      </ion-row>
    </ion-grid>
    <ion-item lines="none">
      <ion-label><ion-icon :icon="ellipse" color="tertiary" aria-hidden="true"></ion-icon> {{ T('Zmiana', 'Shift') }} &nbsp; <ion-icon :icon="ellipse" color="warning" aria-hidden="true"></ion-icon> {{ T('Zlecenie Vantify', 'Vantify job') }} &nbsp; <ion-icon :icon="ellipse" color="medium" aria-hidden="true"></ion-icon> {{ T('Planowane', 'Planned') }}</ion-label>
    </ion-item>
    <ion-item v-if="d.brakGrafiku" button data-nav="settings/profile" lines="none">
      <ion-label class="ion-text-wrap">{{ T('Brak grafiku – ustaw swoje zmiany w', 'No shift pattern – set your shifts in') }} <strong>{{ T('Mój profil → Mój grafik', 'My Profile → My shifts') }}</strong></ion-label>
    </ion-item>
    <template v-if="d.wybrany">
      <Klocek v-for="k in d.klocki" :key="k.id" :T="T" :k="k" @wybierz="wybierz" @przytrzymaj="przytrzymaj"></Klocek>
      <ion-item v-if="!d.klocki.length" lines="none"><ion-note>{{ d.pusto }}</ion-note></ion-item>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { IonListHeader, IonGrid, IonRow, IonCol, IonButton, IonBadge, IonItem, IonLabel, IonNote, IonIcon } from '@ionic/vue';
import { chevronBack, chevronForward, settingsOutline, ellipse } from 'ionicons/icons';
import Klocek from '../czesci/Klocek.vue';
import { wybierz, przytrzymaj } from '../czesci/listaInspekcji.js';
const props = defineProps({ T: Function, wersja: Number });
const P = window.OESTPpmUI;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, P.kalDane()));
const tygodnie = computed(() => { const k = d.value.kratki, r = []; for (let i = 0; i < k.length; i += 7) r.push(k.slice(i, i + 7)); return r; });
function akcje() {
  window.OESTRama.ustaw({ akcje: [
    { ikona: chevronBack, etykieta: props.T('Poprzedni miesiąc', 'Previous month'), fn: () => P.kalMiesiac(-1) },
    { ikona: chevronForward, etykieta: props.T('Następny miesiąc', 'Next month'), fn: () => P.kalMiesiac(1) },
    { ikona: settingsOutline, etykieta: props.T('Mój grafik', 'My shifts'), nav: 'settings/profile' }
  ] });
}
watch(() => props.wersja, akcje);
onMounted(() => { akcje(); window.addEventListener('oest:ppm-ui', odswiez); const y = P.powrot(); if (y) setTimeout(() => window.OESTEkrany.przewin(y), 0); });
onUnmounted(() => window.removeEventListener('oest:ppm-ui', odswiez));
</script>
