<!-- Ekran główny (Grzegorz 03/11/2026, makieta „Home experience”): nagłówek (logo, ONE EASTSIDE, data, pogoda, PL/EN, dzwonek, profil),
     lampki sieci i Dysku, licznik folderu zdjęć, pasek dni, kafelki modułów. Dane: OESTHome.dane() (app/www/home.js) – tu tylko wspólne części. -->
<template>
  <ion-header class="ion-no-border oest-glowny">
    <ion-toolbar>
      <ion-avatar slot="start" class="oest-logo" id="hmLogo"><span class="oest-inicjaly">OEST</span></ion-avatar>
      <ion-label>
        <h2><strong>ONE EASTSIDE</strong></h2>
        <p>{{ d.data }}<template v-if="d.pogoda"> · <ion-text color="primary" id="hmWx" @click="okno('wx')"><ion-icon :icon="POGODA[d.pogoda.ikona]" aria-hidden="true"></ion-icon> {{ d.pogoda.temp }}</ion-text></template></p>
      </ion-label>
      <ion-buttons slot="end">
        <div class="oest-jezyk" role="group" :aria-label="T('Język', 'Language')">
          <ion-button v-for="j in ['pl', 'en']" :key="j" :fill="T('pl', 'en') === j ? 'solid' : 'clear'" :aria-pressed="T('pl', 'en') === j" @click="T('pl', 'en') !== j && H.jezyk()">{{ j.toUpperCase() }}</ion-button>
        </div>
        <ion-button class="oest-ikona" id="hmBell" @click="okno('bell')" :aria-label="T('Powiadomienia', 'Notifications')">
          <ion-icon slot="icon-only" :icon="notificationsOutline"></ion-icon><ion-badge v-if="d.dzwonek" color="danger">{{ d.dzwonek }}</ion-badge>
        </ion-button>
        <ion-button class="oest-ikona oest-ja" data-nav="settings/profile" :aria-label="T('Mój profil', 'My Profile')">{{ d.inicjaly }}</ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <div class="oest-lampki" id="hmSt">
    <Lampka id="hmNet" :stan="d.siec.stan" :tekst="d.siec.tekst" @click="okno('net')"></Lampka>
    <Lampka id="hmDrive" :stan="d.dysk.stan" :tekst="d.dysk.tekst" @click="okno('drive')"></Lampka>
    <ion-chip id="hmPhotos" :color="KOL[d.zdjecia.poziom]" data-nav="zdjecia" :aria-label="T('Folder zdjęć OEST', 'OEST photo folder')">
      <ion-icon v-if="d.zdjecia.poziom === 'full'" :icon="warningOutline" aria-hidden="true"></ion-icon><ion-label>{{ d.zdjecia.tekst }}</ion-label>
    </ion-chip>
  </div>
  <PasekDni id="hmDays" :dni="d.dni" @dzien="dzien"></PasekDni>
  <Kafelki id="hmTiles" :lista="kafelki" @wybierz="it => it.id === 'news' && okno('news')"></Kafelki>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { IonHeader, IonToolbar, IonAvatar, IonLabel, IonText, IonIcon, IonButtons, IonButton, IonBadge, IonChip } from '@ionic/vue';
import { notificationsOutline, warningOutline } from 'ionicons/icons';
import Lampka from '../czesci/Lampka.vue';
import PasekDni from '../czesci/PasekDni.vue';
import Kafelki from '../czesci/Kafelki.vue';
import Prognoza from './glowny/Prognoza.vue';
import Powiadomienia from './glowny/Powiadomienia.vue';
import Opcje from './glowny/Opcje.vue';
import Nowosci from './glowny/Nowosci.vue';
import { POGODA, KAFELKI } from './glowny/ikony.js';
const props = defineProps({ T: Function, wersja: Number });
const H = window.OESTHome;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, H.dane()));
const kafelki = computed(() => d.value.kafelki.map(k => ({ ...k, ikona: KAFELKI[k.ikona] })));
const KOL = { ok: 'success', mid: 'warning', hi: 'danger', full: 'danger' };
function dzien(k) { window.OESTPpmUI.ustawDzien(k); window.OESTEkrany.go('ppm'); }
// okienka: prognoza, powiadomienia, Dysk, sieć, nowości – jedno okienko apki (ion-modal), Wstecz telefonu je zamyka
async function okno(rodzaj) {
  const O = window.OESTOkna;
  if (rodzaj === 'wx') { const r = O.okno({ tytul: H.prognoza().tytul, komponent: Prognoza, wlasciwosci: { p: H.prognoza() }, bezPrzyciskow: true }); H.odswiez(true); return r; }
  if (rodzaj === 'bell') { await H.rxCount(); const p = H.powiadomienia(); return O.okno({ tytul: p.tytul, komponent: Powiadomienia, wlasciwosci: { p }, bezPrzyciskow: true }); }
  if (rodzaj === 'drive' || rodzaj === 'net') { const p = rodzaj === 'drive' ? H.dysk() : H.siec(); return O.okno({ tytul: p.tytul, komponent: Opcje, wlasciwosci: { p }, bezPrzyciskow: true }); }
  if (rodzaj === 'news') { const p = H.nowosciLista(); return O.okno({ tytul: p.tytul, komponent: Nowosci, wlasciwosci: { p }, bezPrzyciskow: true }); }
}
onMounted(() => { window.addEventListener('oest:home', odswiez); window.addEventListener('oest:ppm-ui', odswiez); window.addEventListener('oest:settings-changed', odswiez); /* grafik z profilu i zmiany z Kalendarza Google */ H.odswiez(false); });
onUnmounted(() => { window.removeEventListener('oest:home', odswiez); window.removeEventListener('oest:ppm-ui', odswiez); window.removeEventListener('oest:settings-changed', odswiez); });
</script>
