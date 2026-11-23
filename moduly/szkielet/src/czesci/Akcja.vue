<!-- Przycisk akcji – JEDNO zachowanie w całej apce (Grzegorz 02/11/2026): naciśnięcie → kółko + etap („Sprawdzam połączenie…”)
     → „✓ Gotowe” na chwilę → dalej; przy błędzie wraca zwykły napis. Przycisk nie zmienia rozmiaru (zasada „nic nie drga”).
       <Akcja :T="T" :fn="wyslij" busy="Wysyłam">Wyślij</Akcja>   fn(etap) → Promise; etap('Wysyłam 1/2…') zmienia napis w trakcie -->
<template>
  <ion-button v-bind="$attrs" :disabled="trwa || wylaczony" @click="uruchom">
    <template v-if="trwa"><ion-spinner name="crescent" slot="start"></ion-spinner>{{ napis }}</template>
    <template v-else-if="gotowe"><ion-icon :icon="checkmark" slot="start" aria-hidden="true"></ion-icon>{{ gotoweTekst || T('Gotowe', 'Done') }}</template>
    <slot v-else></slot>
  </ion-button>
</template>

<script setup>
import { ref } from 'vue';
import { IonButton, IonSpinner, IonIcon } from '@ionic/vue';
import { checkmark } from 'ionicons/icons';
defineOptions({ inheritAttrs: false });
const props = defineProps({ T: Function, fn: Function, busy: String, gotoweTekst: String, wylaczony: Boolean, hold: { type: Number, default: 900 } });
const emit = defineEmits(['wynik', 'blad']);
const trwa = ref(false), gotowe = ref(false), napis = ref('');
async function uruchom() {
  if (trwa.value || !props.fn) return;
  trwa.value = true; napis.value = props.busy ? props.busy + '…' : props.T('Pracuję…', 'Working…');
  try {
    const r = await props.fn(t => { napis.value = t; });
    trwa.value = false; gotowe.value = true;
    await new Promise(res => setTimeout(res, props.hold));
    gotowe.value = false; emit('wynik', r);
  } catch (e) { trwa.value = false; emit('blad', e); }
}
</script>
