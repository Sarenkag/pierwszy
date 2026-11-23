<!-- Pigułka statusu – JEDNA w całej apce (Grzegorz 07/11/2026): ten sam kształt, różni się tylko kolor i napis.
     Kolory w jednym miejscu motywu (szkielet.css, zmienne --ion-color-*): Zaległa danger, Nie rozpoczęta medium, W trakcie warning,
     Wstrzymana secondary (niebieski), Gotowa success, Odzyskana tertiary. tryb = 'zalegla'|'nierozpoczeta'|'wtrakcie'|'wstrzymana'|'gotowa'|'odzyskana'
     albo tekst + ton (0 szary, 1 żółty, 2 zielony, 3 czerwony, 4 niebieski) dla list spoza inspekcji. -->
<template>
  <ion-badge v-if="p" :color="p.kolor">{{ p.tekst }}</ion-badge>
</template>

<script setup>
import { computed } from 'vue';
import { IonBadge } from '@ionic/vue';
const props = defineProps({ T: Function, tryb: String, tekst: String, ton: Number });
const TRYB = {
  zalegla: ['danger', 'Zaległa', 'Overdue'], nierozpoczeta: ['medium', '– – – –', '– – – –'], wtrakcie: ['warning', 'W trakcie', 'In progress'],
  wstrzymana: ['secondary', 'Wstrzymana', 'On hold'], gotowa: ['success', 'Gotowa', 'Ready'], odzyskana: ['tertiary', 'Odzyskana', 'Recovered']
};
const TON = ['medium', 'warning', 'success', 'danger', 'secondary'];
const p = computed(() => {
  const t = props.T || ((a) => a);
  if (props.tryb && TRYB[props.tryb]) { const x = TRYB[props.tryb]; return { kolor: x[0], tekst: t(x[1], x[2]) }; }
  if (props.tekst) return { kolor: TON[props.ton | 0] || 'medium', tekst: props.tekst };
  return null;
});
</script>
