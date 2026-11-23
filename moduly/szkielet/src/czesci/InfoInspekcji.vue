<!-- Okno informacji o inspekcji (przytrzymanie klocka, Grzegorz 07/11/2026): wiersze z ikoną i tekstem, pogrubione liczby.
     Dane: OESTPpmUI.info(klocek) → { tytul, wiersze: [{ ikona, czesci: [{ t, b, kolor }] }] }. Otwiera: OESTOkna.okno({ komponent, bezPrzyciskow }). -->
<template>
  <ion-list lines="none" @click="emit('zamknij')">
    <ion-item><ion-label class="ion-text-wrap"><h2><strong>{{ nazwa }}</strong></h2></ion-label></ion-item>
    <ion-item v-for="(r, i) in wiersze" :key="i">
      <ion-icon slot="start" :icon="IK[r.ikona] || IK.punkt" :color="KOL[r.ikona]" aria-hidden="true"></ion-icon>
      <ion-label class="ion-text-wrap"><template v-for="(c, j) in r.czesci" :key="j"><ion-text v-if="c.b" :color="c.kolor"><strong>{{ c.t }}</strong></ion-text><template v-else>{{ c.t }}</template></template></ion-label>
    </ion-item>
    <ion-item><ion-note>{{ T('Stuknij gdziekolwiek, aby zamknąć', 'Tap anywhere to close') }}</ion-note></ion-item>
  </ion-list>
</template>

<script setup>
import { IonList, IonItem, IonIcon, IonLabel, IonText, IonNote } from '@ionic/vue';
import { locationOutline, barChartOutline, calendarOutline, documentTextOutline, imagesOutline, checkboxOutline, warningOutline, ellipseOutline } from 'ionicons/icons';
defineProps({ T: Function, nazwa: String, wiersze: Array }); // pełna nazwa (na klocku jedna linia z wielokropkiem)
const emit = defineEmits(['zamknij']);
const IK = { lok: locationOutline, czest: barChartOutline, termin: calendarOutline, 'form-blad': documentTextOutline, 'form-ok': documentTextOutline, 'form-brak': documentTextOutline,
  zdjecia: imagesOutline, pytania: checkboxOutline, 'pytania-ok': checkboxOutline, 'pytania-mid': checkboxOutline, usterki: warningOutline, punkt: ellipseOutline };
const KOL = { 'form-blad': 'danger', 'form-ok': 'success', 'pytania-ok': 'success', 'pytania-mid': 'warning', usterki: 'warning' };
</script>
