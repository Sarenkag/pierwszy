<!-- Kafelek zdjęć – JEDEN wygląd kafelków w panelu zdjęć inspekcji (Grzegorz 25.11.2026: 4 kafelki jak na main – Z galerii, Zrób zdjęcie, Formularz, Notatka).
     Ikona nad napisem, pełna szerokość kolumny, szara obwódka, czerwona przy data-alarm (brak wymaganego zdjęcia formularza – ustawia i-zdjecia.js).
     Tryb ios Ionic: napis zwykłymi literami 13 px jak na main (md daje WERSALIKI). Atrybuty (id, data-form-note) trafiają na ion-button – w szablonie jeden korzeń, bez komentarzy.
     <KafelZdjecia :ikona="adres svg">Notatka</KafelZdjecia> -->
<template>
  <ion-button data-ui="kafel-zdjecia" mode="ios" expand="block" fill="outline" size="small">
    <ion-label class="ion-text-center ion-text-wrap"><ion-icon :src="ikona" aria-hidden="true"></ion-icon><br v-if="$slots.default"><slot></slot></ion-label>
  </ion-button>
</template>

<script setup>
import { IonButton, IonLabel, IonIcon } from '@ionic/vue';
defineProps({ ikona: String });
</script>
