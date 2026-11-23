<!-- Kółko „pracuję” w miejscu treści (OESTLadowanie.inline(el, tekst)) – jedno w całej apce (Grzegorz 04/11/2026): ion-spinner + tekst. -->
<template>
  <div class="ion-padding ion-text-center" role="status">
    <ion-spinner name="crescent"></ion-spinner>
    <p><ion-note>{{ tekst }}</ion-note></p>
  </div>
</template>

<script setup>
import { IonSpinner, IonNote } from '@ionic/vue';
defineProps({ T: Function, tekst: String });
</script>
