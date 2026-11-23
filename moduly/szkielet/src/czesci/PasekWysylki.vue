<!-- Pasek wysyłki raportów – JEDEN w całej apce, w stopce ramy (poza przewijaniem): lampka sieci, „Wysyłam raport 1/2”, czekam na Wi‑Fi,
     wysłano, błąd + Ponów; stuknięcie rozwija opis i przyciski nad paskiem. Dane i logika: moduly/wysylka (OESTSender.stan() i zdarzenie
     „oest:wysylka”); przyciski wołają OESTSender.akcja(a). Pasek niczego nie liczy. -->
<template>
  <ion-toolbar v-if="s.widoczny" id="oest-pasek-wysylki" class="oest-pasek" role="status">
    <template v-if="s.otwarty">
      <ion-item v-if="s.opis" lines="none"><ion-note>{{ s.opis }}</ion-note></ion-item>
      <ion-item lines="full">
        <ion-button v-for="b in s.przyciski" :key="b.a" :data-a="b.a" size="small" :fill="b.glowny ? 'solid' : 'outline'" @click="akcja(b.a)">{{ b.tekst }}</ion-button>
      </ion-item>
    </template>
    <ion-progress-bar v-if="s.ton === 'run'" :value="s.postep || 0" :color="KOLOR[s.ton] || 'primary'"></ion-progress-bar>
    <ion-item button lines="none" :detail="false" data-a="toggle" @click="akcja('toggle')">
      <Lampka slot="start" :stan="s.siec.stan" :tekst="s.siec.tekst"></Lampka>
      <ion-spinner v-if="s.ton === 'run'" slot="start" name="crescent" aria-hidden="true"></ion-spinner>
      <ion-icon v-else slot="start" :icon="ellipse" :color="KOLOR[s.ton] || 'medium'" aria-hidden="true"></ion-icon>
      <ion-label class="ion-text-nowrap">{{ s.tekst }}</ion-label>
      <ion-icon slot="end" :icon="s.otwarty ? chevronDown : chevronUp" aria-hidden="true"></ion-icon>
    </ion-item>
  </ion-toolbar>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { IonToolbar, IonItem, IonNote, IonButton, IonProgressBar, IonSpinner, IonIcon, IonLabel } from '@ionic/vue';
import { ellipse, chevronUp, chevronDown } from 'ionicons/icons';
import Lampka from './Lampka.vue';
defineProps({ T: Function });
const KOLOR = { ok: 'success', wait: 'warning', err: 'danger', run: 'primary' };
const PUSTY = { widoczny: false, siec: {}, przyciski: [] };
const s = ref(PUSTY);
const S = () => window.OESTSender;
function czytaj(e) { const d = e && e.detail; s.value = d || (S() && S().stan ? S().stan() : PUSTY); }
function akcja(a) { if (S() && S().akcja) S().akcja(a); }
onMounted(() => { czytaj(); window.addEventListener('oest:wysylka', czytaj); });
onUnmounted(() => window.removeEventListener('oest:wysylka', czytaj));
</script>
