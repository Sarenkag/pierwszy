<!-- Podgląd zdjęcia po zrobieniu (moduly/aparat: OESTAparat.take / review) – Powtórz · Edytuj · OK. Logika w module (kontroler review),
     tu tylko komponenty Ionic; wygląd jak na main (zdjęcie na środku, .oest-podglad w szkielet.css). Otwiera go OESTCzesci.pokaz('Aparat', kontroler); Wstecz telefonu = zamknij bez zdjęcia. -->
<template>
  <div class="oest-podglad" data-r-podglad>
    <div class="oest-podglad-scena"><img v-if="d.url" :src="d.url" :alt="T('Podgląd zdjęcia', 'Photo preview')"></div>
    <p class="oest-podglad-msg" role="status" data-r-komunikat>{{ d.komunikat }}</p>
    <div class="oest-podglad-rzad">
      <ion-button class="oest-podglad-b" fill="outline" data-r="retake" :disabled="d.zajety" @click="k.akcja('retake')"><ion-icon :icon="refresh" aria-hidden="true"></ion-icon>{{ T('Powtórz', 'Retake') }}</ion-button>
      <ion-button class="oest-podglad-b" fill="outline" data-r="edit" :disabled="d.zajety" @click="k.akcja('edit')"><ion-icon :icon="brush" aria-hidden="true"></ion-icon>{{ T('Edytuj', 'Edit') }}</ion-button>
      <ion-button class="oest-podglad-b" data-r="ok" :disabled="d.zajety" @click="k.akcja('ok')"><ion-icon :icon="checkmark" aria-hidden="true"></ion-icon>OK</ion-button>
    </div>
  </div>
</template>

<script setup>
import { IonButton, IonIcon } from '@ionic/vue';
import { refresh, brush, checkmark } from 'ionicons/icons';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler;
const d = uzyjKontrolera(k);
</script>
