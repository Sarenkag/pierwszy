<!-- Pasek dni – JEDEN dla ekranu głównego i listy Inspekcji (Grzegorz 07/11/2026). 14 dni w dwóch rzędach po 7 (bez przewijania w bok).
     Każdy dzień: nazwa, numer, pogoda, licznik „zrobione/wszystkie” (albo „–”) – zawsze 4 rzędy, pasek nie skacze.
     Dni z modułu (moduly/pasek-dni → OESTPasekDni.dane): [{ k: 'RRRR-MM-DD', nazwa, numer, pogoda, licznik, dzis, minal, praca, wybrany }]
     Kolory: dziś = primary (wypełniony), dzień pracy z grafiku = tertiary (wypełniony), wybrany = jasna obwódka, pozostałe = szara obwódka.
     Wygląd przycisków dni i ikony pogody: tylko komponenty Ionic (pogoda = nazwa ikony Ionicons z OESTPogoda). -->
<template>
  <ion-grid>
    <ion-row v-for="r in rzedy" :key="r[0].k">
      <ion-col v-for="x in r" :key="x.k">
        <ion-button expand="block" size="small" :data-day="x.k" :fill="x.dzis || x.praca ? 'solid' : 'outline'" :color="x.dzis ? 'primary' : x.praca ? 'tertiary' : x.wybrany ? 'dark' : 'medium'" @click="emit('dzien', x.k)">
          <ion-label class="ion-text-center">
            <small>{{ x.nazwa }}</small><br><strong>{{ x.numer }}</strong><br><ion-icon v-if="x.pogoda" :icon="POGODA[x.pogoda]" aria-hidden="true"></ion-icon><small v-else>&nbsp;</small><br><small>{{ x.licznik || '–' }}</small>
          </ion-label>
        </ion-button>
      </ion-col>
    </ion-row>
  </ion-grid>
</template>

<script setup>
import { computed } from 'vue';
import { IonGrid, IonRow, IonCol, IonButton, IonLabel, IonIcon } from '@ionic/vue';
import { POGODA } from '../ekrany/glowny/ikony.js';
const props = defineProps({ dni: Array });
const emit = defineEmits(['dzien']);
const rzedy = computed(() => { const d = props.dni || [], r = []; for (let i = 0; i < d.length; i += 7) r.push(d.slice(i, i + 7)); return r; });
</script>
