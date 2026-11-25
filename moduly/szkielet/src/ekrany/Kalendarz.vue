<!-- Kalendarz (cal): miesiąc (6 tygodni), zmiany z grafiku, liczba inspekcji w dniu, klocki wybranego dnia.
     Dane i reguły: OESTPpmUI.kalDane() (app/www/ppm-ui.js). Poprzedni/następny miesiąc – rząd na górze treści (nie header). Bez zębatki „Mój grafik” – profil otwiera awatar GS (Grzegorz 25.11.2026).
     Linia stanu (Wi-Fi, HDD, folder zdjęć) przypięta pod paskiem, nad miesiącem – ten sam klocek co na ekranie głównym (Grzegorz 25.11.2026). -->
<template>
  <Teleport defer to="#oest-pod-paskiem">
    <LiniaStanu :d="h" :T="T" @okno="okno"></LiniaStanu>
  </Teleport>
  <div>
    <AkcjeEkranu :akcje="[]"><PrzelacznikMiesiaca :miesiac="d.tytul" :T="T" @zmien="P.kalMiesiac"></PrzelacznikMiesiaca></AkcjeEkranu>
    <div class="ion-padding-horizontal">
      <div class="oest-kal">
        <small v-for="(n, i) in d.tydzien" :key="i">{{ n }}</small>
        <div v-for="x in d.kratki" :key="x.k" class="oest-cdk">
        <ion-button class="oest-cd" fill="clear" :data-cd="x.k" :data-ot="x.inny || undefined" :data-sh="x.praca || undefined" :data-td="x.dzis || undefined" :data-on="x.wybrany || undefined" @click="P.kalDzien(x.k)">{{ x.d }}</ion-button>
        <ion-badge v-if="x.n" :data-plan="x.plan || undefined" :data-ot="x.inny || undefined" aria-hidden="true">{{ x.n }}</ion-badge>
      </div>
      </div>
      <!-- legenda: napis w drugim języku zajmuje miejsce niewidocznie – PL/EN nic nie przesuwa (jak rezerwacja OESTPodmien na main) -->
      <p class="oest-legenda"><span data-l="sh"><span>{{ T('Zmiana', 'Shift') }}</span><span aria-hidden="true">{{ inny('Zmiana', 'Shift') }}</span></span><span data-l="dn"><span>{{ T('Zlecenie Vantify', 'Vantify job') }}</span><span aria-hidden="true">{{ inny('Zlecenie Vantify', 'Vantify job') }}</span></span><span data-l="pl"><span>{{ T('Planowane', 'Planned') }}</span><span aria-hidden="true">{{ inny('Planowane', 'Planned') }}</span></span></p>
      <ion-button v-if="d.brakGrafiku" class="oest-podpowiedz" fill="clear" expand="block" data-nav="settings/profile">
        <span>{{ T('Brak grafiku – ustaw swoje zmiany w', 'No shift pattern – set your shifts in') }} <strong>{{ T('Mój profil → Mój grafik', 'My Profile → My shifts') }}</strong> ›</span>
      </ion-button>
    </div>
    <div>
      <template v-if="d.wybrany">
        <Klocek v-for="k in d.klocki" :key="k.id" :T="T" :k="k" @wybierz="wybierz" @przytrzymaj="przytrzymaj"></Klocek>
        <ion-item v-if="!d.klocki.length" lines="none"><ion-note>{{ d.pusto }}</ion-note></ion-item>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { IonButton, IonBadge, IonItem, IonNote } from '@ionic/vue';
import AkcjeEkranu from '../czesci/AkcjeEkranu.vue';
import PrzelacznikMiesiaca from '../czesci/PrzelacznikMiesiaca.vue';
import Klocek from '../czesci/Klocek.vue';
import LiniaStanu from '../czesci/LiniaStanu.vue';
import { okno } from './glowny/okna.js';
import { wybierz, przytrzymaj } from '../czesci/listaInspekcji.js';
const props = defineProps({ T: Function, wersja: Number });
const inny = (pl, en) => (props.T(pl, en) === en ? pl : en); // napis legendy w drugim języku (niewidoczny, trzyma miejsce)
const P = window.OESTPpmUI;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, P.kalDane()));
const h = computed(() => (props.wersja, n.value, window.OESTHome.dane())); // linia stanu: te same dane co ekran główny
onMounted(() => { window.addEventListener('oest:home', odswiez); window.addEventListener('oest:ppm-ui', odswiez); window.addEventListener('oest:settings-changed', odswiez); /* grafik z profilu i zmiany z Kalendarza Google */ const y = P.powrot(); if (y) setTimeout(() => window.OESTEkrany.przewin(y), 0); });
onUnmounted(() => { window.removeEventListener('oest:home', odswiez); window.removeEventListener('oest:ppm-ui', odswiez); window.removeEventListener('oest:settings-changed', odswiez); });
</script>
