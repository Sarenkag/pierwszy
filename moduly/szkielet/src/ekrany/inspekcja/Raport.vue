<!-- Widok danych raportu; generowanie Word/PDF pozostaje w JS. -->
<template>
  <ion-list v-if="d.rodzaj === 'pliki'">
    <ion-item v-for="(f, n) in d.pliki" :key="n">
      <ion-label v-if="d.brakPdf">{{ f.name }}</ion-label>
      <ion-label v-else>{{ f.nazwa }} <ion-note>{{ f.rozszerzenie }}</ion-note> {{ f.opis }}</ion-label>
    </ion-item>
    <ion-item v-if="d.brakPdf"><ion-note color="danger">{{ d.blad }}</ion-note></ion-item>
  </ion-list>
  <template v-else-if="d.rodzaj === 'temperatury' || d.rodzaj === 'flush'">
    <ion-card-header><ion-card-title>{{ d.tytul }}</ion-card-title><ion-card-subtitle>{{ d.podpis }}</ion-card-subtitle></ion-card-header>
    <ion-list>
      <template v-for="(r, n) in d.wiersze" :key="n">
        <ion-item-divider v-if="r.grupa"><ion-label>{{ r.grupa }}</ion-label></ion-item-divider>
        <ion-item><ion-label>{{ r.nazwa }} <ion-note v-if="r.opis">{{ r.opis }}</ion-note></ion-label><ion-label slot="end" :color="r.blad ? 'danger' : undefined">{{ r.wartosc }} <ion-note v-if="r.uwaga">{{ r.uwaga }}</ion-note></ion-label></ion-item>
      </template>
      <ion-item><ion-label>{{ d.stan }}.</ion-label></ion-item>
    </ion-list>
    <ion-card v-for="(p, n) in d.zdjecia" :key="n"><ion-img alt="" :src="p.url"></ion-img><ion-card-content v-if="p.opis">{{ p.opis }}</ion-card-content></ion-card>
  </template>
  <template v-else-if="d.rodzaj === 'kartki'"><ion-img v-for="(p, n) in d.zdjecia" :key="n" :alt="'Strona ' + (n + 1)" :src="p.url"></ion-img></template>
  <template v-else-if="d.rodzaj === 'raport'">
    <Naglowek :tytul="d.tytul" :logo="d.logo" />
    <ion-list>
      <ion-item><ion-label>Site</ion-label><ion-label>{{ d.raport.site }}</ion-label></ion-item>
      <ion-item><ion-label>Date</ion-label><ion-label>{{ d.raport.data }} · ID: {{ d.numer }}</ion-label></ion-item>
      <ion-item><ion-label>Engineer</ion-label><ion-label>{{ d.raport.inspektor }} · Location: {{ d.miejsce }}</ion-label></ion-item>
      <ion-item><ion-label>{{ d.raport.tytul }}</ion-label></ion-item>
      <ion-item><ion-label>Overall Condition: {{ d.raport.stan_ogolny }}</ion-label></ion-item>
      <ion-item v-for="(r, n) in d.wiersze" :key="n">
        <template v-if="r.komorki"><ion-label v-for="(c, j) in r.komorki" :key="j">{{ c }}</ion-label></template><ion-label v-else>{{ r.tekst }}</ion-label>
      </ion-item>
      <ion-item v-if="d.raport.zakres"><ion-label>{{ d.raport.zakres }}</ion-label></ion-item>
      <ion-item><ion-label>Works Complete: {{ d.raport.data }}</ion-label></ion-item>
      <ion-item><ion-label>Quote Required: {{ d.raport.quote }}</ion-label></ion-item>
      <ion-item><ion-label>Signed: {{ d.raport.inspektor }}</ion-label></ion-item>
    </ion-list>
    <ion-note>{{ d.stopka }}</ion-note>
    <ion-card v-for="(p, n) in d.zdjecia" :key="n"><Naglowek :tytul="d.tytul" :logo="d.logo" /><ion-img :alt="p.alt" :src="p.url"></ion-img></ion-card>
  </template>
</template>
<script setup>
import { IonList, IonItem, IonLabel, IonNote, IonCard, IonImg, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonItemDivider } from '@ionic/vue';
import { uzyjKontrolera } from '../../czesci/kontroler.js';
import Naglowek from './RaportNaglowek.vue';
const props = defineProps({ kontroler: Object });
const d = uzyjKontrolera(props.kontroler);
</script>
