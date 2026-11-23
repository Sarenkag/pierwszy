<!-- Kółko „pracuję” w miejscu treści (OESTLadowanie.inline(el, tekst)) – jedno w całej apce (Grzegorz 04/11/2026): ion-spinner + tekst, wygląd jak na main
     (.oest-inline w szkielet.css: kółko 22 px z gradientem obok tekstu). -->
<template>
  <div class="oest-inline" role="status">
    <ion-spinner name="crescent" aria-hidden="true"></ion-spinner>
    <span>{{ tekst }}</span>
  </div>
</template>

<script setup>
import { IonSpinner } from '@ionic/vue';
defineProps({ T: Function, tekst: String });
</script>
