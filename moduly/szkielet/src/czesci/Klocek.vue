<!-- Klocek listy – JEDEN w całej apce (Grzegorz 04/11 i 07/11/2026; 23/11: linia 1 = cała nazwa, pigułka statusu w linii 2): inspekcje, dzień w Kalendarzu, Reactive, grupy, raporty.
     Każde miejsce stałe; lista tylko podaje dane (zwykły obiekt z modułu), klocek niczego nie liczy:
       { id, grupa (kolor paska z lewej: fire/water/elec/mech/sub – kolory w szkielet.css), nazwa, znak ('TA', 'TB/L13'), czestotliwosc ('3M'), formularz ('brak'|'ok'|'blad'), status: { tryb } | { tekst, ton },
         opis, termin: { tekst, ton: ''|'jutro'|'red' }, numer (zlecenie Vantify, linia 3 – Grzegorz 23/11), procent, ikony: [{ rodzaj: 'zdjecia'|'pytania'|'usterki'|'notatki'|'wysylka', n, ton }],
         miniatura (adres obrazka), przygaszony (planowane / gotowe na końcu), akcja ('Otwórz') }
     Stuknięcie w dowolne miejsce: zdarzenie „wybierz” (bez strzałki z prawej – Grzegorz 23/11); przytrzymanie ~0,4 s: zdarzenie „przytrzymaj” (informacje o inspekcji). -->
<template>
  <ion-card button :disabled="k.wylaczony"   :data-id="k.id" :aria-description="k.akcja || undefined" @click="klik" @pointerdown="wcisnij" @pointermove="rusz" @pointerup="pusc" @pointerleave="pusc" @pointercancel="pusc" @contextmenu.prevent>
    <ion-item lines="none" :detail="false" :data-grupa="k.grupa || undefined">
      <ion-thumbnail v-if="k.miniatura" slot="start"><img :src="k.miniatura" alt=""></ion-thumbnail>
      <ion-label :color="k.przygaszony ? 'medium' : undefined">
        <h2 class="ion-text-nowrap">{{ k.nazwa }}</h2>
        <p v-if="k.znak !== undefined || k.czestotliwosc || k.formularz || k.opis || k.status">
          <ion-badge v-if="k.znak !== undefined" color="light">{{ k.znak || '—' }}</ion-badge>
          <template v-if="k.czestotliwosc"> <ion-icon :icon="I.czest" aria-hidden="true"></ion-icon> {{ k.czestotliwosc }}</template>
          <template v-if="k.formularz"> <ion-icon :icon="I.dokument" :color="FORM[k.formularz]" :aria-label="T('Zdjęcie formularza', 'Form photo')"></ion-icon></template>
          <template v-if="k.opis"> {{ k.opis }}</template>
          <template v-if="k.status"> <Pigulka :T="T" :tryb="k.status.tryb" :tekst="k.status.tekst" :ton="k.status.ton"></Pigulka></template>
        </p>
        <p v-if="k.termin || (k.ikony && k.ikony.length) || k.numer">
          <template v-if="k.termin"><ion-icon :icon="I.termin" aria-hidden="true"></ion-icon> <ion-text :color="TERMIN[k.termin.ton || '']">{{ k.termin.tekst }}</ion-text></template>
          <template v-for="(x, i) in widoczne" :key="i"> · <ion-icon :icon="I[x.rodzaj] || I.punkt" :color="x.ton" aria-hidden="true"></ion-icon> {{ x.n }}</template>
          <template v-if="k.numer"> · <ion-text color="medium">{{ k.numer }}</ion-text></template>
        </p>
      </ion-label>
    </ion-item>
    <ion-progress-bar v-if="k.procent != null" :value="(k.procent || 0) / 100" :color="k.procent >= 100 ? 'success' : 'primary'"></ion-progress-bar>
  </ion-card>
</template>

<script setup>
import { computed } from 'vue';
import { IonCard, IonItem, IonThumbnail, IonLabel, IonBadge, IonIcon, IonText, IonProgressBar } from '@ionic/vue';
import { barChartOutline, documentTextOutline, calendarOutline, imagesOutline, checkboxOutline, warningOutline, micOutline, paperPlaneOutline, ellipseOutline } from 'ionicons/icons';
import Pigulka from './Pigulka.vue';
const props = defineProps({ T: Function, k: Object });
const emit = defineEmits(['wybierz', 'przytrzymaj']);
const I = { czest: barChartOutline, dokument: documentTextOutline, termin: calendarOutline, zdjecia: imagesOutline, pytania: checkboxOutline, usterki: warningOutline, notatki: micOutline, wysylka: paperPlaneOutline, punkt: ellipseOutline };
const FORM = { brak: 'medium', ok: 'success', blad: 'danger' };
const TERMIN = { '': undefined, jutro: 'warning', red: 'danger' };
const widoczne = computed(() => (props.k.ikony || []).filter(x => x && x.n !== '' && x.n != null));
// przytrzymanie ~0,4 s (bez ruchu palca > 10 px) = informacje; po nim zwykłe stuknięcie się nie liczy
let zegar = null, przytrzymany = false, x0 = 0, y0 = 0;
function wcisnij(e) { przytrzymany = false; x0 = e.clientX; y0 = e.clientY; clearTimeout(zegar); zegar = setTimeout(() => { zegar = null; przytrzymany = true; try { navigator.vibrate && navigator.vibrate(20); } catch (er) {} emit('przytrzymaj', props.k); }, 400); }
function rusz(e) { if (zegar && (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10)) { clearTimeout(zegar); zegar = null; } }
function pusc() { clearTimeout(zegar); zegar = null; }
function klik() { if (przytrzymany) { przytrzymany = false; return; } emit('wybierz', props.k); }
</script>
