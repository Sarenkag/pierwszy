<!-- Okienka „Google Drive” i „Połączenie” (ekran główny): opis + lista opcji. Opcja z „op” = akcja Dysku (wynik pod listą),
     z „cel” = przejście (okienko się zamyka). Dane: OESTHome.dysk() / siec(). -->
<template>
  <ion-note v-if="p.opis">{{ p.opis }}</ion-note>
  <ion-list lines="full">
    <ion-item v-for="o in p.opcje" :key="o.op || o.cel" button :detail="!!o.cel" :data-hop="o.op || undefined" :disabled="trwa === o.op" @click="wybierz(o)">
      <ion-spinner v-if="trwa === o.op" slot="start" name="crescent"></ion-spinner>
      <ion-label>{{ o.tekst }}</ion-label>
      <ion-note slot="end">{{ o.opis }}</ion-note>
    </ion-item>
  </ion-list>
  <ion-note v-if="wynik" :color="blad ? 'danger' : undefined">{{ wynik }}</ion-note>
</template>

<script setup>
import { ref } from 'vue';
import { IonList, IonItem, IonSpinner, IonLabel, IonNote } from '@ionic/vue';
const props = defineProps({ T: Function, p: Object, odswiez: Function });
const emit = defineEmits(['zamknij']);
const H = window.OESTHome, trwa = ref(''), wynik = ref(''), blad = ref(false);
async function wybierz(o) {
  if (o.cel) { emit('zamknij'); H.idz(o.cel); return; }
  if (trwa.value) return;
  trwa.value = o.op; wynik.value = ''; blad.value = false;
  try { wynik.value = await H.dyskAkcja(o.op); } catch (e) { wynik.value = e.message; blad.value = true; }
  trwa.value = ''; if (props.odswiez) props.odswiez();
}
</script>
