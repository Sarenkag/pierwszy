<!-- Edytor zdjęć (moduly/aparat: OESTAparat.edit) – Anuluj · Cofnij · Zapisz, narzędzia (Rysuj / Kółko / Kadruj), 6 kolorów, grubość S/M/L.
     Logika rysowania, Cofnij, Zapisz i kadrowania w module (kontroler edytora); tu tylko komponenty Ionic i płótno do rysowania,
     wygląd jak na main (.oest-ed w szkielet.css: szklany panel z ramkami grup, kropki kolorów i grubości).
     Otwiera go OESTCzesci.pokaz('EdytorZdjec', kontroler); Wstecz telefonu = zamknij bez zmian (wraca do podglądu).
     <canvas>: powierzchnia rysowania – Ionic jej nie ma (pytanie do Grzegorza o wyjątek „element:canvas”, 23/11/2026). -->
<template>
  <div class="oest-ed">
    <div class="oest-ed-top">
      <ion-button class="oest-ed-b" fill="clear" data-a="cancel" @click="k.akcja('anuluj')">{{ T('Anuluj', 'Cancel') }}</ion-button>
      <span></span>
      <ion-button class="oest-ed-b" fill="clear" data-a="undo" @click="k.akcja('cofnij')"><ion-icon :icon="arrowUndo" aria-hidden="true"></ion-icon>{{ T('Cofnij', 'Undo') }}</ion-button>
      <ion-button class="oest-ed-b" data-a="save" :disabled="d.zapisuje" @click="k.akcja('zapisz')">
        <ion-spinner v-if="d.zapisuje" name="crescent"></ion-spinner><ion-icon v-else :icon="checkmark" aria-hidden="true"></ion-icon>{{ d.zapisuje ? T('Zapisuję…', 'Saving…') : T('Zapisz', 'Save') }}
      </ion-button>
    </div>
    <div ref="scena" class="oest-ed-scena" data-ed-scena><canvas ref="plotno"></canvas></div>
    <div class="oest-ed-panel" data-ed-panel>
      <div class="oest-ed-rzad">
        <div v-for="(g, i) in d.grupy" :key="i" class="oest-ed-grp">
          <div class="oest-ed-seg">
            <ion-button v-for="t in g.narzedzia" :key="t.k" class="oest-ed-t" fill="clear" :aria-pressed="t.k === d.narzedzie ? 'true' : 'false'" :data-on="t.k === d.narzedzie ? '' : undefined" :data-t="t.k" :aria-label="t.etykieta" @click="k.akcja('narzedzie', t.k)">
              <ion-icon :icon="IKONY[t.k]" aria-hidden="true"></ion-icon>
            </ion-button>
          </div>
          <small>{{ g.podpis }}</small>
        </div>
      </div>
      <div class="oest-ed-sep"></div>
      <div class="oest-ed-rzad" data-styl>
        <div class="oest-ed-kolory">
          <ion-button v-for="c in d.kolory" :key="c" class="oest-ed-c" fill="clear" :aria-pressed="c === d.kolor ? 'true' : 'false'" :data-on="c === d.kolor ? '' : undefined" :data-c="c" :aria-label="d.etykietaKoloru" @click="k.akcja('kolor', c)">
            <span class="oest-ed-kropka ion-color" :class="'ion-color-' + KOLORY[c]"></span>
          </ion-button>
        </div>
        <div class="oest-ed-seg ion-color" :class="'ion-color-' + KOLORY[d.kolor]">
          <ion-button v-for="w in d.grubosci" :key="w.v" class="oest-ed-t" fill="clear" :aria-pressed="w.v === d.grubosc ? 'true' : 'false'" :data-on="w.v === d.grubosc ? '' : undefined" :data-w="w.v" :aria-label="w.etykieta" @click="k.akcja('grubosc', w.v)">
            <span class="oest-ed-gr"></span>
          </ion-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonButton, IonIcon, IonSpinner } from '@ionic/vue';
import { arrowUndo, checkmark, ellipseOutline, arrowForward, remove, squareOutline, scanOutline } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
// ikony w miejscu dawnych znaków (↗ ／ ▢, ◯ w trzech rozmiarach, ⛶); rozmiary kółek jak na main (.oest-ed-t[data-t=c1…c3] w szkielet.css)
const IKONY = { arrow: arrowForward, line: remove, rect: squareOutline, c1: ellipseOutline, c2: ellipseOutline, c3: ellipseOutline, crop: scanOutline };
// kolory rysowania (moduł) → kolory Ionic zdefiniowane w szkielet.css (tylko zmienne palety)
const KOLORY = { '#ff2d2d': 'ed-czerwony', '#ffd400': 'ed-zolty', '#21d36b': 'ed-zielony', '#2f8bff': 'ed-niebieski', '#ffffff': 'ed-bialy', '#111111': 'ed-czarny' };
const scena = ref(null), plotno = ref(null);
onMounted(async () => {
  const el = scena.value;
  requestAnimationFrame(() => k.akcja('plotno', plotno.value, el));
});
</script>
