<!-- Pasek notatek głosowych dla ekranu (moduly/notatki, Grzegorz 08–18/11/2026): Nagraj notatkę · Notatki N · Połącz…
     Układ „Głos / Tekst” (opcje.icons, Reactive): nagranie, notatka pisana i rząd ponumerowanych notatek (stuknięcie = ta jedna notatka).
     Ekran Vue:  <Notatki :T="T" :opcje="{ scope: () => klucz, ctx: () => miejsce, title: () => tytuł, join: 'Połącz notatki w opis', ok: 'Wstaw', icons: true,
                                            onJoin: tekst => …, onSaved: notatka => …, onError: blad => … }" />
     Stary kod: OESTNotatki.mount(box, opcje) wstawia tę samą część do elementu. Logika (licznik, stan notatek, nagrywanie) w module (kontroler paska). -->
<template>
  <div ref="pudlo" data-nt-pasek>
    <div class="oest-ntp-2">
      <ion-button ref="nagraj" class="oest-ntp-b" fill="outline" data-nt-bar="rec" :disabled="d.bezNagrywania" :aria-label="T('Nagraj notatkę', 'Record note')">
        <ion-icon :icon="mic" aria-hidden="true"></ion-icon><ion-icon v-if="d.ikonyTryb" :icon="add" aria-hidden="true"></ion-icon><span v-else>&nbsp;</span>{{ d.ikonyTryb ? T('Głos', 'Voice') : T('Nagraj notatkę', 'Record note') }}
      </ion-button>
      <ion-button v-if="d.ikonyTryb" class="oest-ntp-b" fill="outline" data-nt-bar="add" :disabled="d.dodaje" :aria-label="T('Dopisz notatkę', 'Write a note')" @click="k.akcja('dopisz')">
        <ion-icon :icon="documentText" aria-hidden="true"></ion-icon><ion-icon :icon="add" aria-hidden="true"></ion-icon>{{ T('Tekst', 'Text') }}
      </ion-button>
      <ion-button v-else class="oest-ntp-b" fill="outline" data-nt-bar="open" @click="k.akcja('otworz')">
        <ion-icon :icon="documentText" aria-hidden="true"></ion-icon>&nbsp;{{ T('Notatki', 'Notes') }}<span class="oest-ntp-n" data-nt-bar="n">{{ d.n }}</span>
      </ion-button>
    </div>
    <div v-if="d.ikonyTryb" class="oest-ntp-ikony">
      <ion-button v-for="x in d.ikony" :key="x.id" class="oest-ntp-i" fill="outline" :data-stan="x.stan" :data-nt-id="x.id" :data-rodzaj="x.rodzaj" @click="k.akcja('otworz', x.id)">
        <ion-icon :icon="x.rodzaj === 'glos' ? mic : documentText" aria-hidden="true"></ion-icon>{{ x.nr }}
      </ion-button>
      <ion-button class="oest-ntp-i" fill="outline" data-nt-bar="open" :aria-label="T('Wszystkie notatki', 'All notes')" @click="k.akcja('otworz')">
        {{ T('Notatki', 'Notes') }}<span class="oest-ntp-n" data-nt-bar="n">{{ d.n }}</span>
      </ion-button>
    </div>
    <ion-button v-if="d.polacz" size="small" fill="outline" data-nt-bar="join" :disabled="d.laczy" @click="k.akcja('polacz')"><ion-icon :icon="sparkles" aria-hidden="true"></ion-icon>&nbsp;{{ d.napisPolacz }}</ion-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { mic, add, documentText, sparkles } from 'ionicons/icons';
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
