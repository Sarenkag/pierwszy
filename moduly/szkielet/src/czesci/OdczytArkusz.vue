<!-- Arkusz „Odczyt ze zdjęcia” (OESTOdczyt.pick) – zdjęcie, podpowiedź, pole docelowe, odczytane liczby i linie tekstu.
     Stuknięcie wpisuje wartość do pola (robi to moduł; nic nie wpisuje się samo). „Gotowe” daje okienko (OESTOkna.okno). -->
<template>
  <div data-odczyt>
    <ion-img v-if="d.url" :src="d.url" :alt="T('Zdjęcie', 'Photo')"></ion-img>
    <p class="ion-padding-horizontal"><ion-note role="status" data-odczyt-podpowiedz>{{ d.podpowiedz }}</ion-note></p>
    <ion-item v-if="d.cele.length > 1">
      <ion-select :label="T('Wpisz do', 'Fill in')" :value="d.cel" interface="action-sheet" @ionChange="e => k.akcja('cel', e.detail.value)">
        <ion-select-option v-for="(c, i) in d.cele" :key="i" :value="i">{{ c }}</ion-select-option>
      </ion-select>
    </ion-item>
    <ion-item v-else-if="d.cele.length && (d.liczby.length || d.linie.length)" lines="none"><ion-label>{{ T('Wpisz do: ', 'Fill in: ') + d.cele[0] }}</ion-label></ion-item>
    <template v-if="d.liczby.length">
      <ion-list-header>{{ T('Liczby', 'Numbers') }}</ion-list-header>
      <div class="ion-padding-horizontal">
        <ion-chip v-for="x in d.liczby" :key="x.k" :data-k="x.k" :color="x.wpisane ? 'success' : undefined" :outline="!x.wpisane" @click="k.akcja('wybierz', x.k)"><ion-label>{{ x.tekst }}</ion-label></ion-chip>
      </div>
    </template>
    <template v-if="d.linie.length">
      <ion-list-header>{{ T('Linie tekstu', 'Text lines') }}</ion-list-header>
      <div class="ion-padding-horizontal">
        <ion-chip v-for="x in d.linie" :key="x.k" :data-k="x.k" :color="x.wpisane ? 'success' : undefined" :outline="!x.wpisane" @click="k.akcja('wybierz', x.k)"><ion-label>{{ x.tekst }}</ion-label></ion-chip>
      </div>
    </template>
  </div>
</template>

<script setup>
import { IonImg, IonItem, IonNote, IonSelect, IonSelectOption, IonLabel, IonListHeader, IonChip } from '@ionic/vue';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
