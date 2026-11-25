<!-- Pasek dni – JEDEN dla ekranu głównego i listy Inspekcji (Grzegorz 07/11/2026). 14 dni w jednym rzędzie, przewijany w bok (wygląd jak dotąd – Grzegorz 23/11/2026: dwa rzędy odrzucone).
     Każdy dzień: nazwa, numer, pogoda, licznik „zrobione/wszystkie” (albo „–”) – zawsze 4 rzędy, pasek nie skacze.
     Dni z modułu (moduly/pasek-dni → OESTPasekDni.dane): [{ k: 'RRRR-MM-DD', nazwa, numer, pogoda, licznik, dzis, minal, praca, wybrany }]
     Wygląd (szkielet.css, .oest-dzien): dzień pracy = fioletowy gradient jak w kalendarzu, dziś = obwódka akcentu z poświatą, wybrany = biała obwódka, miniony = przygaszony, wolny = nie przygaszony.
     Wygląd przycisków dni i ikony pogody: tylko komponenty Ionic (pogoda = nazwa ikony Ionicons z OESTPogoda). -->
<template>
  <div class="oest-dni">
    <ion-button v-for="x in dni" :key="x.k" class="oest-dzien" fill="clear" :data-day="x.k" :data-dzis="x.dzis || undefined" :data-praca="x.praca || undefined" :data-minal="x.minal || undefined" :data-wybrany="x.wybrany || undefined" @click="emit('dzien', x.k)">
      <ion-label>
        <small>{{ x.nazwa }}</small><strong>{{ x.numer }}</strong><ion-icon v-if="x.pogoda" :icon="POGODA[x.pogoda]" aria-hidden="true"></ion-icon><small v-else>&nbsp;</small><ion-badge :data-n="x.licznik ? 1 : undefined">{{ x.licznik || '–' }}</ion-badge>
      </ion-label>
    </ion-button>
  </div>
</template>

<script setup>
import { IonButton, IonLabel, IonIcon, IonBadge } from '@ionic/vue';
import { POGODA } from '../ekrany/glowny/ikony.js';
defineProps({ dni: Array });
const emit = defineEmits(['dzien']);
</script>
