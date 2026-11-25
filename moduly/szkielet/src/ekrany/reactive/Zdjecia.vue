<!-- Zdjęcia karty Reactive dla jednej fazy (przed / po): Zrób zdjęcie · Z galerii i pasek zdjęć (czesci/PasekZdjec.vue: Powiększ / Edytuj / Usuń). Dane: OESTReactiveUI.dane().zdjecia; akcje: camera / gallery / photo-del / photo-edit. -->
<template>
  <div>
    <ion-note>{{ etykieta }}</ion-note><!-- kafelki jak w inspekcji: Zrób zdjęcie · Z galerii obok siebie (czesci/KafelZdjecia.vue, Grzegorz 25.11.2026) -->
    <ion-grid v-if="z.usuwanie"><ion-row>
      <ion-col size="6"><DodajZdjecie :T="T" tryb="aparat" data-rx="camera" :data-phase="faza" @oest:wybor-zdjec="kontekst" @oest:koniec-wyboru-zdjec="A.wyborZdjec(false)" @zdjecia="pliki => A.przyjmijZdjecia(pliki, faza)" @blad="blad"></DodajZdjecie></ion-col>
      <ion-col size="6"><DodajZdjecie :T="T" tryb="galeria" @oest:wybor-zdjec="kontekst" @oest:koniec-wyboru-zdjec="A.wyborZdjec(false)" data-rx="gallery" :data-phase="faza" @zdjecia="pliki => A.przyjmijZdjecia(pliki, faza, true)" @blad="blad"></DodajZdjecie></ion-col>
    </ion-row></ion-grid>
    <PasekZdjec :T="T" :lista="lista.map((p, n) => ({ klucz: p.id, url: p.url, alt: p.alt, numer: n + 1 }))" :edycja="!!z.edycja" :usuwanie="!!z.usuwanie" @edytuj="p => A.akcja('photo-edit', { id: p.klucz, phase: faza })" @usun="p => A.akcja('photo-del', { id: p.klucz, phase: faza })" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonGrid, IonRow, IonCol, IonNote } from '@ionic/vue';
import DodajZdjecie from '../../czesci/DodajZdjecie.vue';
import PasekZdjec from '../../czesci/PasekZdjec.vue';
const props = defineProps({ T: Function, z: Object, faza: String, etykieta: String });
const A = window.OESTReactiveUI;
const lista = computed(() => (props.faza === 'after' ? props.z.po : props.z.przed) || []);
function kontekst(e) { A.wyborZdjec(true); e.detail.opcje = { max: window.OESTZdjecia?.maxPx?.('ogolne') || 0, prepare: b => window.OESTZdjecia.prepare(b, 'ogolne') }; }
function blad(e) { window.OESTOkna.toast(window.OESTBledy?.text(e) || e.message); }
</script>
