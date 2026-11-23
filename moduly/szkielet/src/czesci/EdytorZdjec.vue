<!-- Edytor zdjęć (moduly/aparat: OESTAparat.edit) – Anuluj · Cofnij · Zapisz, narzędzia (Rysuj / Kółko / Kadruj), 6 kolorów, grubość S/M/L.
     Logika rysowania, Cofnij, Zapisz i kadrowania w module (kontroler edytora); tu tylko komponenty Ionic i płótno do rysowania.
     Otwiera go OESTCzesci.pokaz('EdytorZdjec', kontroler); Wstecz telefonu = zamknij bez zmian (wraca do podglądu).
     <canvas>: powierzchnia rysowania – Ionic jej nie ma (pytanie do Grzegorza o wyjątek „element:canvas”, 23/11/2026). -->
<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button fill="clear" data-a="cancel" @click="k.akcja('anuluj')">{{ T('Anuluj', 'Cancel') }}</ion-button>
      </ion-buttons>
      <ion-buttons slot="end">
        <ion-button fill="outline" data-a="undo" @click="k.akcja('cofnij')"><ion-icon slot="start" :icon="arrowUndo" aria-hidden="true"></ion-icon>{{ T('Cofnij', 'Undo') }}</ion-button>
        <ion-button fill="solid" data-a="save" :disabled="d.zapisuje" @click="k.akcja('zapisz')">
          <ion-spinner v-if="d.zapisuje" slot="start" name="crescent"></ion-spinner><ion-icon v-else slot="start" :icon="checkmark" aria-hidden="true"></ion-icon>{{ d.zapisuje ? T('Zapisuję…', 'Saving…') : T('Zapisz', 'Save') }}
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>
  <ion-content ref="scena" :scroll-y="false" data-ed-scena>
    <canvas ref="plotno"></canvas>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-grid class="ion-no-padding" data-ed-panel>
        <ion-row class="ion-justify-content-around">
          <ion-col v-for="(g, i) in d.grupy" :key="i" size="auto" class="ion-text-center ion-no-padding">
            <div>
              <ion-button v-for="t in g.narzedzia" :key="t.k" color="primary" :fill="t.k === d.narzedzie ? 'solid' : 'clear'" :aria-pressed="t.k === d.narzedzie ? 'true' : 'false'" :data-t="t.k" :aria-label="t.etykieta" @click="k.akcja('narzedzie', t.k)">
                <ion-icon slot="icon-only" :icon="IKONY[t.k]" :size="ROZMIAR[t.k]"></ion-icon>
              </ion-button>
            </div>
            <ion-note>{{ g.podpis }}</ion-note>
          </ion-col>
        </ion-row>
        <ion-row class="ion-justify-content-center">
          <ion-button v-for="c in d.kolory" :key="c" fill="solid" :color="KOLORY[c]" :aria-pressed="c === d.kolor ? 'true' : 'false'" :data-c="c" :aria-label="d.etykietaKoloru" @click="k.akcja('kolor', c)">
            <ion-icon slot="icon-only" :icon="c === d.kolor ? checkmark : undefined" aria-hidden="true"></ion-icon>
          </ion-button>
        </ion-row>
        <ion-row class="ion-justify-content-center">
          <ion-button v-for="w in d.grubosci" :key="w.v" :fill="w.v === d.grubosc ? 'outline' : 'clear'" :color="KOLORY[d.kolor]" :aria-pressed="w.v === d.grubosc ? 'true' : 'false'" :data-w="w.v" :aria-label="w.etykieta" @click="k.akcja('grubosc', w.v)">
            <ion-icon slot="icon-only" :icon="ellipse" :size="w.k === 'S' ? 'small' : w.k === 'L' ? 'large' : undefined"></ion-icon>
          </ion-button>
        </ion-row>
      </ion-grid>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonHeader, IonToolbar, IonButtons, IonButton, IonIcon, IonSpinner, IonContent, IonFooter, IonGrid, IonRow, IonCol, IonNote } from '@ionic/vue';
import { arrowUndo, checkmark, ellipse, ellipseOutline, arrowForward, remove, squareOutline, cropOutline } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
const IKONY = { arrow: arrowForward, line: remove, rect: squareOutline, c1: ellipseOutline, c2: ellipseOutline, c3: ellipseOutline, crop: cropOutline };
const ROZMIAR = { c1: 'small', c3: 'large' };
// kolory rysowania (moduł) → kolory Ionic zdefiniowane w szkielet.css (tylko zmienne palety)
const KOLORY = { '#ff2d2d': 'ed-czerwony', '#ffd400': 'ed-zolty', '#21d36b': 'ed-zielony', '#2f8bff': 'ed-niebieski', '#ffffff': 'ed-bialy', '#111111': 'ed-czarny' };
const scena = ref(null), plotno = ref(null);
onMounted(async () => {
  const el = scena.value && scena.value.$el;
  try { await customElements.whenDefined('ion-content'); } catch (e) {}
  requestAnimationFrame(() => k.akcja('plotno', plotno.value, el));
});
</script>
