<!-- Linia stanu (Grzegorz 25.11.2026): Wi-Fi, HDD, licznik folderu zdjęć. Osobny klocek, NIE część stałego headera. -->
<template>
  <div class="oest-lampki">
    <Lampka :stan="d.siec.stan" :tekst="d.siec.tekst" @click="emit('okno', 'net')"></Lampka>
    <Lampka :stan="d.dysk.stan" :tekst="d.dysk.tekst" @click="emit('okno', 'drive')"></Lampka>
    <ion-chip :color="KOL[d.zdjecia.poziom]" data-nav="zdjecia" :aria-label="T('Folder zdjęć OEST', 'OEST photo folder')">
      <ion-icon v-if="d.zdjecia.poziom === 'full'" :icon="warningOutline" aria-hidden="true"></ion-icon><ion-label>{{ d.zdjecia.tekst }}</ion-label>
    </ion-chip>
  </div>
</template>

<script setup>
import { IonChip, IonIcon, IonLabel } from '@ionic/vue';
import { warningOutline } from 'ionicons/icons';
import Lampka from './Lampka.vue';
defineProps({ d: Object, T: Function });
const emit = defineEmits(['okno']);
const KOL = { ok: 'success', mid: 'warning', hi: 'danger', full: 'danger' };
</script>
