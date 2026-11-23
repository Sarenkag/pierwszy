<!-- Pasek notatek głosowych dla ekranu (moduly/notatki, Grzegorz 08–18/11/2026): Nagraj notatkę · Notatki N · Połącz…
     Układ „Głos / Tekst” (opcje.icons, Reactive): nagranie, notatka pisana i rząd ponumerowanych notatek (stuknięcie = ta jedna notatka).
     Ekran Vue:  <Notatki :T="T" :opcje="{ scope: () => klucz, ctx: () => miejsce, title: () => tytuł, join: 'Połącz notatki w opis', ok: 'Wstaw', icons: true,
                                            onJoin: tekst => …, onSaved: notatka => …, onError: blad => … }" />
     Stary kod: OESTNotatki.mount(box, opcje) wstawia tę samą część do elementu. Logika (licznik, stan notatek, nagrywanie) w module (kontroler paska). -->
<template>
  <div ref="pudlo" data-nt-pasek>
    <ion-grid>
      <ion-row>
        <ion-col size="6">
          <ion-button ref="nagraj" expand="block" fill="outline" color="danger" data-nt-bar="rec" :disabled="d.bezNagrywania" :aria-label="T('Nagraj notatkę', 'Record note')">
            <ion-icon slot="start" :icon="mic" aria-hidden="true"></ion-icon>{{ d.ikonyTryb ? T('Głos', 'Voice') : T('Nagraj notatkę', 'Record note') }}
          </ion-button>
        </ion-col>
        <ion-col size="6">
          <ion-button v-if="d.ikonyTryb" expand="block" fill="outline" data-nt-bar="add" :disabled="d.dodaje" :aria-label="T('Dopisz notatkę', 'Write a note')" @click="k.akcja('dopisz')">
            <ion-icon slot="start" :icon="create" aria-hidden="true"></ion-icon>{{ T('Tekst', 'Text') }}
          </ion-button>
          <ion-button v-else expand="block" fill="outline" data-nt-bar="open" @click="k.akcja('otworz')">
            <ion-icon slot="start" :icon="documentText" aria-hidden="true"></ion-icon>{{ T('Notatki', 'Notes') }}<ion-badge slot="end" data-nt-bar="n">{{ d.n }}</ion-badge>
          </ion-button>
        </ion-col>
      </ion-row>
      <ion-row v-if="d.ikonyTryb">
        <ion-col>
          <ion-chip v-for="x in d.ikony" :key="x.id" :outline="x.stan === 'ready'" :color="x.stan === 'w' ? 'warning' : undefined" :disabled="x.stan === 'busy'" :data-nt-id="x.id" :data-rodzaj="x.rodzaj" @click="k.akcja('otworz', x.id)">
            <ion-icon :icon="x.rodzaj === 'glos' ? mic : documentText" aria-hidden="true"></ion-icon><ion-label>{{ x.nr }}</ion-label>
          </ion-chip>
          <ion-chip data-nt-bar="open" :aria-label="T('Wszystkie notatki', 'All notes')" @click="k.akcja('otworz')">
            <ion-label>{{ T('Notatki', 'Notes') }}</ion-label><ion-badge data-nt-bar="n">{{ d.n }}</ion-badge>
          </ion-chip>
        </ion-col>
      </ion-row>
      <ion-row v-if="d.polacz">
        <ion-col>
          <ion-button expand="block" data-nt-bar="join" :disabled="d.laczy" @click="k.akcja('polacz')"><ion-icon slot="start" :icon="sparkles" aria-hidden="true"></ion-icon>{{ d.napisPolacz }}</ion-button>
        </ion-col>
      </ion-row>
    </ion-grid>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonGrid, IonRow, IonCol, IonButton, IonIcon, IonBadge, IonChip, IonLabel } from '@ionic/vue';
import { mic, create, documentText, sparkles } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object, opcje: Object });
// stary kod (OESTNotatki.mount) daje gotowy kontroler; ekran Vue – opcje, z których kontroler robi moduł
const k = props.kontroler || window.OESTNotatki.pasek(props.opcje || {});
const d = uzyjKontrolera(k);
const pudlo = ref(null), nagraj = ref(null);
onMounted(() => {
  if (!k.box) k.akcja('podlacz', pudlo.value);
  k.akcja('nagraj', nagraj.value && nagraj.value.$el); // przytrzymaj = nagrywa do puszczenia; stuknij = do „Zakończ” (moduly/notatki/glos.js)
});
</script>
