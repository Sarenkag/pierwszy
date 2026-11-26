<!-- Linia stanu klocka zlecenia Reactive (Grzegorz 26/11/2026: pokazuje, co jest, czego jest zero, czego nie ma – bez podsumowania):
     zdjęcia przed i po (wysłane/ile po założeniu w Vantify), notatki, Job Sheet. stan: [tekst]. -->
<template>
  <ion-item lines="none"><ion-note>{{ stan.join(' · ') }}</ion-note></ion-item>
</template>

<script setup>
import { IonItem, IonNote } from '@ionic/vue';
defineProps({ stan: { type: Array, default: () => [] } });
</script>
