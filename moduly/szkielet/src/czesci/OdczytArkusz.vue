<!-- Arkusz „Odczyt ze zdjęcia” (OESTOdczyt.pick) – zdjęcie, podpowiedź, pole docelowe, odczytane liczby i linie tekstu.
     Stuknięcie wpisuje wartość do pola (robi to moduł; nic nie wpisuje się samo). „Gotowe” daje okienko (OESTOkna.okno).
     Wygląd jak na main (.oest-ocr w szkielet.css: arkusz od dołu, podpowiedź, zdjęcie, liczby i linie do stuknięcia). -->
<template>
  <div class="oest-ocr" data-odczyt>
    <p class="oest-ocr-hint" role="status" data-odczyt-podpowiedz>{{ d.podpowiedz }}</p>
    <img v-if="d.url" :src="d.url" :alt="T('Zdjęcie', 'Photo')">
    <template v-if="d.cele.length > 1">
      <div class="oest-ocr-lbl">{{ T('Wpisz do', 'Fill in') }}</div>
      <ion-item lines="none">
        <ion-select :aria-label="T('Wpisz do', 'Fill in')" :value="d.cel" interface="action-sheet" @ionChange="e => k.akcja('cel', e.detail.value)">
          <ion-select-option v-for="(c, i) in d.cele" :key="i" :value="i">{{ c }}</ion-select-option>
        </ion-select>
      </ion-item>
    </template>
    <div v-else-if="d.cele.length && (d.liczby.length || d.linie.length)" class="oest-ocr-lbl">{{ T('Wpisz do: ', 'Fill in: ') + d.cele[0] }}</div>
    <template v-if="d.liczby.length">
      <div class="oest-ocr-lbl">{{ T('Liczby', 'Numbers') }}</div>
      <div class="oest-ocr-chipy">
        <ion-button v-for="x in d.liczby" :key="x.k" class="oest-ocr-b" fill="outline" data-liczba :data-k="x.k" :aria-pressed="x.wpisane ? 'true' : 'false'" :data-on="x.wpisane ? '' : undefined" @click="k.akcja('wybierz', x.k)">{{ x.tekst }}</ion-button>
      </div>
    </template>
    <template v-if="d.linie.length">
      <div class="oest-ocr-lbl">{{ T('Linie tekstu', 'Text lines') }}</div>
      <div class="oest-ocr-chipy">
        <ion-button v-for="x in d.linie" :key="x.k" class="oest-ocr-b" fill="outline" :data-k="x.k" :aria-pressed="x.wpisane ? 'true' : 'false'" :data-on="x.wpisane ? '' : undefined" @click="k.akcja('wybierz', x.k)">{{ x.tekst }}</ion-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { IonItem, IonSelect, IonSelectOption, IonButton } from '@ionic/vue';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
