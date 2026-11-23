<!-- Klocek listy – JEDEN w całej apce (Grzegorz 04/11 i 07/11/2026; 23/11: linia 1 = cała nazwa, pigułka statusu w linii 2): inspekcje, dzień w Kalendarzu, Reactive, grupy, raporty.
     Każde miejsce stałe; lista tylko podaje dane (zwykły obiekt z modułu), klocek niczego nie liczy:
       { id, grupa (kolor paska z lewej: fire/water/elec/mech/sub – kolory w szkielet.css), nazwa, znak ('TA', 'TB/L13'), czestotliwosc ('3M'), formularz ('brak'|'ok'|'blad'), status: { tryb } | { tekst, ton },
         opis, termin: { tekst, ton: ''|'jutro'|'red' }, numer (zlecenie Vantify, linia 3 – Grzegorz 23/11), procent, ikony: [{ rodzaj: 'zdjecia'|'pytania'|'usterki'|'notatki'|'wysylka', n, ton }],
         miniatura (adres obrazka), przygaszony (planowane / gotowe na końcu), akcja ('Otwórz') }
     Wygląd jak dotąd (szkielet.css, .oest-klocek: szkło, pasek grupy z lewej, odstępy i separatory jak w moduly/klocek). Stuknięcie w dowolne miejsce: zdarzenie „wybierz” (bez strzałki z prawej – Grzegorz 23/11); przytrzymanie ~0,4 s: zdarzenie „przytrzymaj” (informacje o inspekcji). -->
<template>
  <ion-card button class="oest-klocek" :disabled="k.wylaczony" :data-id="k.id" :data-grupa="k.grupa || undefined" :data-przygaszony="k.przygaszony || undefined" :aria-description="k.akcja || undefined" @click="klik" @pointerdown="wcisnij" @pointermove="rusz" @pointerup="pusc" @pointerleave="pusc" @pointercancel="pusc" @contextmenu.prevent>
    <div class="oest-kr">
      <img v-if="k.miniatura" :src="k.miniatura" alt="">
      <h2>{{ k.nazwa }}</h2>
    </div>
    <div v-if="k.znak !== undefined || k.czestotliwosc || k.formularz || k.opis || k.status" class="oest-kr">
      <span v-if="k.znak !== undefined" class="oest-klok">{{ k.znak }}</span>
      <template v-if="k.czestotliwosc"><ion-icon :icon="I.czest" aria-hidden="true"></ion-icon><strong class="oest-kcz">{{ k.czestotliwosc }}</strong></template>
      <ion-icon v-if="k.formularz" :icon="I.dokument" :data-ton="k.formularz" :aria-label="T('Zdjęcie formularza', 'Form photo')"></ion-icon>
      <span v-if="k.opis" class="oest-kopis">{{ k.opis }}</span>
      <span class="oest-kodstep"></span>
      <Pigulka v-if="k.status" :T="T" :tryb="k.status.tryb" :tekst="k.status.tekst" :ton="k.status.ton"></Pigulka>
    </div>
    <div v-if="k.termin || widoczne.length || k.numer" class="oest-kr">
      <template v-if="k.termin"><ion-icon :icon="I.termin" aria-hidden="true"></ion-icon><span class="oest-kdt" :data-ton="k.termin.ton || undefined">{{ k.termin.tekst }}</span></template>
      <template v-for="(x, i) in widoczne" :key="i"><span class="oest-ksep"></span><ion-icon :icon="I[x.rodzaj] || I.punkt" :data-ton="x.ton || undefined" aria-hidden="true"></ion-icon><strong>{{ x.n }}</strong></template>
      <template v-if="k.numer"><span class="oest-ksep"></span><span class="oest-knr">{{ k.numer }}</span></template>
    </div>
    <ion-progress-bar v-if="k.procent != null" :value="(k.procent || 0) / 100" :color="k.procent >= 100 ? 'success' : 'primary'"></ion-progress-bar>
  </ion-card>
</template>

<script setup>
import { computed } from 'vue';
import { IonCard, IonIcon, IonProgressBar } from '@ionic/vue';
import { barChartOutline, documentTextOutline, calendarClearOutline, imageOutline, checkboxOutline, warningOutline, micOutline, paperPlaneOutline, ellipseOutline } from 'ionicons/icons';
import Pigulka from './Pigulka.vue';
const props = defineProps({ T: Function, k: Object });
const emit = defineEmits(['wybierz', 'przytrzymaj']);
const I = { czest: barChartOutline, dokument: documentTextOutline, termin: calendarClearOutline, zdjecia: imageOutline, pytania: checkboxOutline, usterki: warningOutline, notatki: micOutline, wysylka: paperPlaneOutline, punkt: ellipseOutline };
const widoczne = computed(() => (props.k.ikony || []).filter(x => x && x.n !== '' && x.n != null));
// przytrzymanie ~0,4 s (bez ruchu palca > 10 px) = informacje; po nim zwykłe stuknięcie się nie liczy
let zegar = null, przytrzymany = false, x0 = 0, y0 = 0;
function wcisnij(e) { przytrzymany = false; x0 = e.clientX; y0 = e.clientY; clearTimeout(zegar); zegar = setTimeout(() => { zegar = null; przytrzymany = true; try { navigator.vibrate && navigator.vibrate(20); } catch (er) {} emit('przytrzymaj', props.k); }, 400); }
function rusz(e) { if (zegar && (Math.abs(e.clientX - x0) > 10 || Math.abs(e.clientY - y0) > 10)) { clearTimeout(zegar); zegar = null; } }
function pusc() { clearTimeout(zegar); zegar = null; }
function klik() { if (przytrzymany) { przytrzymany = false; return; } emit('wybierz', props.k); }
</script>
