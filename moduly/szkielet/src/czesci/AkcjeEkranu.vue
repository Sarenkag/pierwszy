<!-- Klocek: rząd przycisków ekranu na górze jego treści, pod headerem (Grzegorz 25.11.2026: przyciski ekranu nie są headerem).
     Pasek Ionic (ion-toolbar) w treści: po lewej treść ekranu (slot, np. przełącznik miesiąca), po prawej przyciski: [{ ikona, etykieta, fn | nav, ui }] (ui = data-ui dla starego kodu, np. menu ⋮ inspekcji). -->
<template>
  <ion-toolbar>
    <slot></slot>
    <ion-buttons slot="end">
      <ion-button v-for="(a, i) in akcje" :key="i" :data-nav="a.nav || undefined" :data-ui="a.ui || undefined" :aria-label="a.etykieta" @click="!a.nav && a.fn && a.fn()"><ion-icon slot="icon-only" :icon="a.ikona"></ion-icon></ion-button>
    </ion-buttons>
  </ion-toolbar>
</template>

<script setup>
import { IonToolbar, IonButtons, IonButton, IonIcon } from '@ionic/vue';
defineProps({ akcje: Array });
</script>
