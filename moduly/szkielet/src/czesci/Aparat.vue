<!-- Podgląd zdjęcia po zrobieniu (moduly/aparat: OESTAparat.take / review) – Powtórz · Edytuj · OK. Logika w module (kontroler review),
     tu tylko komponenty Ionic. Otwiera go OESTCzesci.pokaz('Aparat', kontroler); Wstecz telefonu = zamknij bez zdjęcia. -->
<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>{{ T('Podgląd zdjęcia', 'Photo preview') }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content class="ion-padding" data-r-podglad>
    <ion-img v-if="d.url" :src="d.url" :alt="T('Podgląd zdjęcia', 'Photo preview')"></ion-img>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <div v-if="d.komunikat" class="ion-padding-horizontal"><ion-note color="warning" role="status" data-r-komunikat>{{ d.komunikat }}</ion-note></div>
      <ion-grid>
        <ion-row>
          <ion-col size="4"><ion-button expand="block" fill="outline" data-r="retake" :disabled="d.zajety" @click="k.akcja('retake')"><ion-icon slot="start" :icon="refresh" aria-hidden="true"></ion-icon>{{ T('Powtórz', 'Retake') }}</ion-button></ion-col>
          <ion-col size="4"><ion-button expand="block" fill="outline" data-r="edit" :disabled="d.zajety" @click="k.akcja('edit')"><ion-icon slot="start" :icon="brush" aria-hidden="true"></ion-icon>{{ T('Edytuj', 'Edit') }}</ion-button></ion-col>
          <ion-col size="4"><ion-button expand="block" color="primary" data-r="ok" :disabled="d.zajety" @click="k.akcja('ok')"><ion-icon slot="start" :icon="checkmark" aria-hidden="true"></ion-icon>OK</ion-button></ion-col>
        </ion-row>
      </ion-grid>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup>
import { IonHeader, IonToolbar, IonTitle, IonContent, IonImg, IonFooter, IonNote, IonGrid, IonRow, IonCol, IonButton, IonIcon } from '@ionic/vue';
import { refresh, brush, checkmark } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
