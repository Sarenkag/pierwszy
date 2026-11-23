<!-- Rząd pigułek wyboru na karcie Reactive (budynek, typ, stan, „Co”, powierzchnia…): ten sam wygląd co filtr listy (.oest-chipy), zawijany.
     opcje: [{ id, nazwa, on }]; stuknięcie: OESTReactiveUI.akcja(rx, { [klucz]: id }) – klucz: 'id' | 'value' | 'status'. -->
<template>
  <div class="oest-chipy oest-rx-chipy">
    <ion-chip v-for="o in opcje" :key="o.id" :data-rx="o.rx || rx" :data-id="klucz === 'id' ? o.id : undefined" :data-value="klucz === 'value' ? o.id : undefined" :data-status="klucz === 'status' ? o.id : undefined" :data-on="o.on || undefined" :aria-pressed="!!o.on" @click="A.akcja(o.rx || rx, { [klucz]: o.id })"><ion-label>{{ o.nazwa }}</ion-label></ion-chip>
  </div>
</template>

<script setup>
import { IonChip, IonLabel } from '@ionic/vue';
defineProps({ opcje: Array, rx: String, klucz: { type: String, default: 'id' } });
const A = window.OESTReactiveUI;
</script>
