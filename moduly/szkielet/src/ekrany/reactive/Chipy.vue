<!-- Rząd pigułek wyboru na karcie Reactive (budynek, typ, stan, „Co”, powierzchnia…): ten sam wygląd co filtr listy (.oest-chipy), zawijany.
     opcje: [{ id, nazwa, on }]; stuknięcie: OESTReactiveUI.akcja(rx, { [klucz]: id }) – klucz: 'id' | 'value' | 'status'. -->
<template>
  <ion-item><ion-select interface="popover" :aria-label="window.OESTT('Wybór', 'Choice')" :placeholder="window.OESTT('Wybierz', 'Choose')" :data-rx-select="rx" :value="opcje.find(o => o.on)?.id" @ionChange="wybierz"><ion-select-option v-for="o in opcje" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option></ion-select></ion-item>
</template>

<script setup>
import { IonItem, IonSelect, IonSelectOption } from '@ionic/vue';
const props = defineProps({ opcje: Array, rx: String, klucz: { type: String, default: 'id' } });
const window = globalThis.window;
const A = window.OESTReactiveUI;
function wybierz(e) { const o = props.opcje.find(o => o.id === e.detail.value); if (o) A.akcja(o.rx || props.rx, { [props.klucz]: o.id }); }
</script>
