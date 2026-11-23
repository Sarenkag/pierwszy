<!-- Pasek wysyłki raportów – JEDEN w całej apce, w stopce ramy (poza przewijaniem): lampka sieci, „Wysyłam raport 1/2”, czekam na Wi‑Fi,
     wysłano, błąd + Ponów; stuknięcie rozwija opis i przyciski nad paskiem. Dane i logika: moduly/wysylka (OESTSender.stan() i zdarzenie
     „oest:wysylka”); przyciski wołają OESTSender.akcja(a). Pasek niczego nie liczy.
     Wygląd piksel w piksel jak dawny pasek na main (.oest-sbar w moduly/wysylka i lampka z moduly/znacznik) – pasek jest na ~40 ekranach,
     więc ten sam układ: rząd 29 px, lampka 8 px z poświatą, kropka stanu 10 px, ▴ jako znak; style: szkielet.css (.oest-sbar*). -->
<template>
  <div v-if="s.widoczny" id="oest-pasek-wysylki" class="oest-sbar" :class="[s.ton, s.otwarty ? 'open' : '']" role="status">
    <div v-if="s.otwarty" class="oest-sbar-m">
      <small v-if="s.opis">{{ s.opis }}</small>
      <ion-button v-for="b in s.przyciski" :key="b.a" :data-a="b.a" :class="b.glowny ? 'oest-sbar-go' : 'oest-sbar-b'" fill="outline" @click="akcja(b.a)">{{ b.tekst }}</ion-button>
    </div>
    <ion-progress-bar class="oest-sbar-p" :value="s.postep || 0"></ion-progress-bar>
    <div class="oest-sbar-r" data-a="toggle" role="button" tabindex="0" @click="akcja('toggle')" @keydown.enter="akcja('toggle')">
      <span class="oest-sbar-n" :class="s.siec.stan"><span class="oest-sbar-l"></span><span>{{ s.siec.tekst }}</span></span>
      <span class="oest-sbar-i"></span>
      <span class="oest-sbar-t">{{ s.tekst }}</span>
      <span aria-hidden="true">▴</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { IonButton, IonProgressBar } from '@ionic/vue';
defineProps({ T: Function });
const PUSTY = { widoczny: false, siec: {}, przyciski: [] };
const s = ref(PUSTY);
const S = () => window.OESTSender;
function czytaj(e) { const d = e && e.detail; s.value = d || (S() && S().stan ? S().stan() : PUSTY); }
function akcja(a) { if (S() && S().akcja) S().akcja(a); }
onMounted(() => { czytaj(); window.addEventListener('oest:wysylka', czytaj); });
onUnmounted(() => window.removeEventListener('oest:wysylka', czytaj));
</script>
