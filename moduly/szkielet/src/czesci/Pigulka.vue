<!-- Pigułka statusu – JEDNA w całej apce (Grzegorz 07/11/2026): ten sam kształt, różni się tylko kolor i napis.
     Wygląd jak dotąd (98 px, obwódka + tło stanu, 3D) i kolory w jednym miejscu: szkielet.css (.oest-pigulka): Zaległa danger, Nie rozpoczęta medium, W trakcie warning,
     Wstrzymana secondary (niebieski), Gotowa success, Odzyskana tertiary. tryb = 'zalegla'|'nierozpoczeta'|'wtrakcie'|'wstrzymana'|'gotowa'|'odzyskana'
     albo tekst + ton (0 szary, 1 żółty, 2 zielony, 3 czerwony, 4 niebieski) dla list spoza inspekcji. -->
<template>
  <ion-badge v-if="p" class="oest-pigulka" :data-kolor="p.kolor" :data-tryb="p.tryb" role="img" :aria-label="p.opis" :title="p.opis">{{ p.tekst }}</ion-badge>
</template>

<script setup>
import { computed } from 'vue';
import { IonBadge } from '@ionic/vue';
const props = defineProps({ T: Function, tryb: String, tekst: String, ton: Number });
const TRYB = {
  zalegla: ['danger', 'Zaległa', 'Overdue'], nierozpoczeta: ['medium', '– – – –', '– – – –'], wtrakcie: ['warning', 'W trakcie', 'In progress'],
  wstrzymana: ['secondary', 'Wstrzymana', 'On hold'], gotowa: ['success', 'Gotowa', 'Ready'], odzyskana: ['tertiary', 'Odzyskana', 'Recovered']
};
const OPIS = { nierozpoczeta: ['Nie rozpoczęta', 'Not started'] }; // pełna nazwa stanu w opisie pigułki (czytnik ekranu, przytrzymanie) – jak OESTZnacznik.status na main
const TON = ['medium', 'warning', 'success', 'danger', 'secondary'];
const p = computed(() => {
  const t = props.T || ((a) => a);
  if (props.tryb && TRYB[props.tryb]) { const x = TRYB[props.tryb], o = OPIS[props.tryb] || x.slice(1); return { kolor: x[0], tryb: props.tryb, tekst: t(x[1], x[2]), opis: t(o[0], o[1]) }; }
  if (props.tekst) return { kolor: TON[props.ton | 0] || 'medium', tekst: props.tekst, opis: props.tekst };
  return null;
});
</script>
