<!-- Zakładka 4 „Zamknięcie” (Grzegorz 26/11/2026): wybór pracy, tekst końcowy, Job Sheet (dotychczasowe „Zakończenie i raport” z podglądem),
     „Zamknij w Vantify”, „Wyślij do siebie”, „Zakończ zadanie”. -->
<template>
  <div>
    <ion-card>
      <WyborPracy :w="d.wyborPracy" @wybierz="v => A.akcja('work', { value: v })"></WyborPracy>
      <TekstKoncowy :t="d.tekstKoncowy" @wybierz="v => A.akcja('closing-pick', { value: v })" @pole="v => A.pole('closingText', v)"></TekstKoncowy>
    </ion-card>
    <ion-card>
      <ion-item lines="none"><ion-label>{{ d.koniec.etykieta }}</ion-label><ion-note slot="end">{{ d.koniec.tekst || d.koniec.podpowiedz }}</ion-note></ion-item>
      <Chipy :opcje="d.koniec.akcje" rx="action"></Chipy>
      <ion-item><ion-textarea label-placement="stacked" :label="d.koniec.etRaport" data-rx-field="reportText" :rows="6" :maxlength="30000" :value="d.koniec.raport" @ionInput="e => A.pole('reportText', e.detail.value)"></ion-textarea></ion-item>
      <div>
        <ion-button fill="outline" data-akcja="podglad" @click="A.akcja('sum-view')">{{ d.koniec.podglad }}</ion-button>
        <ion-button v-if="d.koniec.przywroc" fill="outline" data-akcja="przywroc" @click="A.akcja('report-reset')">{{ d.koniec.przywroc }}</ion-button>
      </div>
    </ion-card>
    <ion-button v-if="d.zamknij" expand="block" :fill="d.zamknij.ton === 'go' ? 'solid' : 'outline'" :color="d.zamknij.ton === 'done' ? 'success' : undefined" data-akcja="vantify-zamknij" @click="A.akcja(d.zamknij.rx)">{{ d.zamknij.tekst }}</ion-button>
    <ion-button expand="block" fill="outline" data-akcja="wyslij" @click="A.akcja('send')">{{ d.wyslij }}</ion-button>
    <ion-button expand="block" :fill="d.zakoncz.go ? 'solid' : 'outline'" data-akcja="zakoncz" @click="A.akcja('close')">{{ d.zakoncz.tekst }}</ion-button>
    <ion-button v-if="d.usunSzkic" fill="outline" data-akcja="usun-szkic" @click="A.akcja('drop-draft')">{{ d.usunSzkic }}</ion-button>
  </div>
</template>

<script setup>
import { IonCard, IonItem, IonLabel, IonNote, IonTextarea, IonButton } from '@ionic/vue';
import WyborPracy from '../../czesci/WyborPracy.vue';
import TekstKoncowy from '../../czesci/TekstKoncowy.vue';
import Chipy from './Chipy.vue';
defineProps({ T: Function, d: Object });
const A = window.OESTReactiveUI;
</script>
