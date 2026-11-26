<!-- Linia 1 klocka zlecenia Reactive: nazwa zadania, po prawej numer zlecenia Vantify („#3084366”) albo „brak nr”. -->
<template>
  <ion-item lines="none"><ion-label>{{ nazwa }}</ion-label><ion-note slot="end">{{ nr }}</ion-note></ion-item>
</template>

<script setup>
import { IonItem, IonLabel, IonNote } from '@ionic/vue';
defineProps({ nazwa: String, nr: String });
</script>
