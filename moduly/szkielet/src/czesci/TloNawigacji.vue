<!-- Klocek ramy: tło pod przyciskami nawigacji telefonu (trójkąt, kółko, kwadrat). Ten sam kolor co tło apki; wysokość = pas systemowy:
     ostatni ion-toolbar w ion-footer dostaje od Ionic odstęp safe-area dołu, sam pasek ma wysokość 0 (szkielet.css). Jeden na wszystkie ekrany. -->
<template>
  <ion-footer class="ion-no-border" aria-hidden="true"><ion-toolbar></ion-toolbar></ion-footer>
</template>
<script setup>
import { IonFooter, IonToolbar } from '@ionic/vue';
</script>
