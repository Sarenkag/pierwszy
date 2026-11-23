<!-- Kalendarz (cal): miesiąc (6 tygodni), zmiany z grafiku, liczba inspekcji w dniu, klocki wybranego dnia.
     Dane i reguły: OESTPpmUI.kalDane() (app/www/ppm-ui.js). Poprzedni/następny miesiąc i grafik – akcje paska ramy. -->
<template>
  <div class="ion-padding-horizontal">
    <div class="oest-kal">
      <small v-for="n in d.tydzien" :key="n">{{ n }}</small>
      <ion-button v-for="x in d.kratki" :key="x.k" class="oest-cd" fill="clear" :data-cd="x.k" :data-ot="x.inny || undefined" :data-sh="x.praca || undefined" :data-td="x.dzis || undefined" :data-on="x.wybrany || undefined" @click="P.kalDzien(x.k)">
        {{ x.d }}<ion-badge v-if="x.n" :data-plan="x.plan || undefined">{{ x.n }}</ion-badge>
      </ion-button>
    </div>
    <p class="oest-legenda"><span data-l="sh">{{ T('Zmiana', 'Shift') }}</span><span data-l="dn">{{ T('Zlecenie Vantify', 'Vantify job') }}</span><span data-l="pl">{{ T('Planowane', 'Planned') }}</span></p>
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
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { IonButton, IonBadge, IonItem, IonNote } from '@ionic/vue';
import { caretBack, caretForward, settingsOutline } from 'ionicons/icons';
import Klocek from '../czesci/Klocek.vue';
import { wybierz, przytrzymaj } from '../czesci/listaInspekcji.js';
const props = defineProps({ T: Function, wersja: Number });
const P = window.OESTPpmUI;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, P.kalDane()));
function akcje() {
  window.OESTRama.ustaw({ tytul: d.value.tytul, akcje: [
    { ikona: caretBack, etykieta: props.T('Poprzedni miesiąc', 'Previous month'), fn: () => P.kalMiesiac(-1) },
    { ikona: caretForward, etykieta: props.T('Następny miesiąc', 'Next month'), fn: () => P.kalMiesiac(1) },
    { ikona: settingsOutline, etykieta: props.T('Mój grafik', 'My shifts'), nav: 'settings/profile' }
  ] });
}
watch(() => [props.wersja, d.value.tytul], akcje);
onMounted(() => { akcje(); window.addEventListener('oest:ppm-ui', odswiez); const y = P.powrot(); if (y) setTimeout(() => window.OESTEkrany.przewin(y), 0); });
onUnmounted(() => window.removeEventListener('oest:ppm-ui', odswiez));
</script>
