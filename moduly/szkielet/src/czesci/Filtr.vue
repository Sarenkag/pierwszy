<!-- Filtr listy – JEDEN w całej apce (Grzegorz 23/11/2026: przyciski sortowania to wspólna część): lista Inspekcji (grupy + Rozpoczęte),
     Reactive (Aktywne / Zakończone / Wszystkie) i inne listy. Wygląd jak dotąd: rząd pigułek przewijany w bok, „Wszystkie” na początku,
     wybrana = gradient wciśnięty, grupa z kolorową kropką (szkielet.css, .oest-chipy).
       <Filtr :T="T" :opcje="[{ id, nazwa, kolor }]" :wybrane="[id] | id" :wiele="true" :pusty="T('Wszystkie', 'All')" @zmiana="ids => …"></Filtr>
     wiele = kilka naraz (brak wyboru = wszystkie); bez „wiele” – jedna opcja. -->
<template>
  <div class="oest-chipy">
    <ion-chip v-if="pusty" :data-on="!lista.length || undefined" :aria-pressed="!lista.length" @click="emit('zmiana', wiele ? [] : '')"><ion-label>{{ pusty }}</ion-label></ion-chip>
    <ion-chip v-for="o in opcje" :key="o.id" :data-on="lista.includes(o.id) || undefined" :aria-pressed="lista.includes(o.id)" @click="przelacz(o.id)">
      <ion-icon v-if="o.kolor" :icon="ellipse" :data-grupa="o.id" aria-hidden="true"></ion-icon><ion-label>{{ o.nazwa }}</ion-label>
    </ion-chip>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonChip, IonIcon, IonLabel } from '@ionic/vue';
import { ellipse } from 'ionicons/icons';
const props = defineProps({ T: Function, opcje: Array, wybrane: [Array, String], wiele: Boolean, pusty: String });
const emit = defineEmits(['zmiana']);
const lista = computed(() => Array.isArray(props.wybrane) ? props.wybrane : props.wybrane ? [props.wybrane] : []);
function przelacz(id) {
  if (!props.wiele) return emit('zmiana', id);
  const l = lista.value.slice(), i = l.indexOf(id);
  if (i >= 0) l.splice(i, 1); else l.push(id);
  emit('zmiana', l);
}
</script>
