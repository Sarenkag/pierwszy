<!-- Zdjęcia karty Reactive dla jednej fazy (przed / po): Zrób zdjęcie · Z galerii i miniatury (stuknięcie = powiększenie w okienku apki,
     × usuwa, ✏️ edytor zdjęć). Dane: OESTReactiveUI.dane().zdjecia; akcje: camera / gallery / photo-del / photo-edit. -->
<template>
  <div>
    <ion-note>{{ etykieta }}</ion-note><!-- kafelki jak w inspekcji: Zrób zdjęcie · Z galerii obok siebie (czesci/KafelZdjecia.vue, Grzegorz 25.11.2026) -->
    <ion-grid v-if="z.usuwanie"><ion-row>
      <ion-col size="6"><DodajZdjecie :T="T" tryb="aparat" data-rx="camera" :data-phase="faza" @oest:wybor-zdjec="kontekst" @oest:koniec-wyboru-zdjec="A.wyborZdjec(false)" @zdjecia="pliki => A.przyjmijZdjecia(pliki, faza)" @blad="blad"></DodajZdjecie></ion-col>
      <ion-col size="6"><DodajZdjecie :T="T" tryb="galeria" @oest:wybor-zdjec="kontekst" @oest:koniec-wyboru-zdjec="A.wyborZdjec(false)" data-rx="gallery" :data-phase="faza" @zdjecia="pliki => A.przyjmijZdjecia(pliki, faza, true)" @blad="blad"></DodajZdjecie></ion-col>
    </ion-row></ion-grid>
    <div class="oest-rx-photos" :id="'rx-' + faza">
      <div v-for="p in lista" :key="p.id" class="oest-rx-ph">
        <img :src="p.url" :alt="p.alt" @click="powieksz(p)">
        <ion-note v-if="p.wyslane" color="medium">{{ p.wyslane }}</ion-note><!-- wysłane do Vantify: szare, bez usuwania i edycji (Grzegorz 26/11/2026) -->
        <ion-button v-if="z.usuwanie && !p.wyslane" class="oest-rx-del" fill="clear" :aria-label="T('Usuń zdjęcie', 'Delete photo')" @click.stop="A.akcja('photo-del', { id: p.id, phase: faza })">×</ion-button>
        <ion-button v-if="z.edycja && !p.wyslane" class="oest-rx-ed" fill="clear" :aria-label="T('Edytuj zdjęcie', 'Edit photo')" @click.stop="A.akcja('photo-edit', { id: p.id, phase: faza })">✏️</ion-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonButton, IonGrid, IonRow, IonCol, IonNote } from '@ionic/vue';
import DodajZdjecie from '../../czesci/DodajZdjecie.vue';
import Zdjecie from './Zdjecie.vue';
const props = defineProps({ T: Function, z: Object, faza: String, etykieta: String });
const A = window.OESTReactiveUI;
const lista = computed(() => (props.faza === 'after' ? props.z.po : props.z.przed) || []);
function kontekst(e) { A.wyborZdjec(true); e.detail.opcje = { max: window.OESTZdjecia?.maxPx?.('ogolne') || 0, prepare: b => window.OESTZdjecia.prepare(b, 'ogolne') }; }
function blad(e) { window.OESTOkna.toast(window.OESTBledy?.text(e) || e.message); }
function powieksz(p) { window.OESTOkna.okno({ tytul: p.alt, komponent: Zdjecie, wlasciwosci: { url: p.url, alt: p.alt }, ok: props.T('Zamknij', 'Close'), anuluj: false, wyglad: 'zdjecie' }).catch(() => {}); }
</script>
