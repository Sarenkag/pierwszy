<!-- Zdjęcia karty Reactive dla jednej fazy (przed / po): Zrób zdjęcie · Z galerii i miniatury (stuknięcie = powiększenie w okienku apki,
     × usuwa, ✏️ edytor zdjęć). Dane: OESTReactiveUI.dane().zdjecia; akcje: camera / gallery / photo-del / photo-edit. -->
<template>
  <div>
    <div class="oest-rx-sub">{{ etykieta }}</div>
    <div class="oest-rx-phb">
      <ion-button fill="outline" data-rx="camera" :data-phase="faza" @click="A.akcja('camera', { phase: faza })"><div class="oest-rx-phb-w"><ion-icon :src="APARAT" aria-hidden="true"></ion-icon><span>{{ z.zrob }}</span></div></ion-button>
      <ion-button fill="outline" data-rx="gallery" :data-phase="faza" @click="A.akcja('gallery', { phase: faza })"><div class="oest-rx-phb-w"><ion-icon :src="GALERIA" aria-hidden="true"></ion-icon><span>{{ z.galeria }}</span></div></ion-button>
    </div>
    <div class="oest-rx-photos" :id="'rx-' + faza">
      <div v-for="p in lista" :key="p.id" class="oest-rx-ph">
        <img :src="p.url" :alt="p.alt" @click="powieksz(p)">
        <ion-button v-if="z.usuwanie" class="oest-rx-del" fill="clear" :aria-label="T('Usuń zdjęcie', 'Delete photo')" @click.stop="A.akcja('photo-del', { id: p.id, phase: faza })">×</ion-button>
        <ion-button v-if="z.edycja" class="oest-rx-ed" fill="clear" :aria-label="T('Edytuj zdjęcie', 'Edit photo')" @click.stop="A.akcja('photo-edit', { id: p.id, phase: faza })">✏️</ion-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { APARAT, GALERIA } from './ikony.js';
import Zdjecie from './Zdjecie.vue';
const props = defineProps({ T: Function, z: Object, faza: String, etykieta: String });
const A = window.OESTReactiveUI;
const lista = computed(() => (props.faza === 'after' ? props.z.po : props.z.przed) || []);
function powieksz(p) { window.OESTOkna.okno({ tytul: p.alt, komponent: Zdjecie, wlasciwosci: { url: p.url, alt: p.alt }, ok: props.T('Zamknij', 'Close'), anuluj: false, wyglad: 'zdjecie' }).catch(() => {}); }
</script>
