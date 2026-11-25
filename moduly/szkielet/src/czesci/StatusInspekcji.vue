<!-- Klocek: status inspekcji – pigułka etapu, dotknięcie = wybór w okienku Ionic (alertController). Jeden klocek dla wszystkich inspekcji.
     Pełna szerokość miejsca, w którym stoi (Grzegorz 25.11.2026: zawsze na środku rzędu, zawsze tej samej wielkości).
     Kolor = kolor Ionic ze stanu: '' nie rozpoczęta (medium), prog w trakcie (warning), hold wstrzymana (secondary), done/sent zakończona (success), queued w kolejce (primary).
     <StatusInspekcji :T="T" stan="prog" :opcje="[['','○ Nie rozpoczęta'],['prog','◐ W trakcie'],…]" @zmien="v => …" /> -->
<template>
  <ion-button data-ui="status" expand="block" fill="outline" shape="round" :color="kolor" @click="wybierz">{{ etykieta }}<ion-icon slot="end" :icon="caretDown" aria-hidden="true"></ion-icon></ion-button>
</template>

<script setup>
import { computed } from 'vue';
import { IonButton, IonIcon, alertController } from '@ionic/vue';
import { caretDown } from 'ionicons/icons';
const props = defineProps({ stan: { type: String, default: '' }, opcje: { type: Array, default: () => [] }, T: { type: Function, default: pl => pl } });
const emit = defineEmits(['zmien']);
const KOLOR = { prog: 'warning', hold: 'secondary', done: 'success', sent: 'success', queued: 'primary' };
const kolor = computed(() => KOLOR[props.stan] || 'medium');
const etykieta = computed(() => (props.opcje.find(o => o[0] === props.stan) || ['', props.stan])[1]);
async function wybierz() {
  const a = await alertController.create({
    header: props.T('Etap inspekcji', 'Inspection stage'),
    inputs: props.opcje.map(o => ({ type: 'radio', value: o[0], label: o[1], checked: o[0] === props.stan })),
    buttons: [{ text: props.T('Anuluj', 'Cancel'), role: 'cancel' }, { text: 'OK', handler: v => { if (v !== undefined && v !== props.stan) emit('zmien', v); } }]
  });
  await a.present();
}
</script>
