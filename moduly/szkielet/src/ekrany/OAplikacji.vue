<!-- O aplikacji (Grzegorz 09/11/2026: twórca, numer apki, historia wszystkich zmian). Dane: OESTSettingsUI.aboutDane() (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-item lines="none">
        <ion-label>
          <p>{{ T('Twórca', 'Creator') }}</p>
          <h2>{{ d.tworca }}</h2>
        </ion-label>
      </ion-item>
      <ion-item lines="none">
        <ion-label>
          <p>{{ T('Wersja apki', 'App version') }}</p>
          <h2>{{ d.wersja }}</h2>
        </ion-label>
      </ion-item>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Historia zmian', 'Change log') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ d.zmiany.length ? T('Wszystkie zmiany wprowadzone do apki, od najnowszej.', 'Every change made to the app, newest first.') : T('Brak historii w tej wersji.', 'No history in this build.') }}</ion-note>
      </ion-item>
      <ion-item v-for="(z, i) in d.zmiany" :key="i" lines="none">
        <ion-label class="ion-text-wrap">
          <h3><strong>{{ z.t }}</strong></h3>
          <p>{{ z.info }}</p>
        </ion-label>
      </ion-item>
    </ion-card>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
// PL/EN: dane liczone na nowo, ekran się nie przerysowuje (Vue podmienia tylko teksty)
const d = computed(() => (props.wersja, window.OESTSettingsUI.aboutDane()));
</script>
