<!-- Linia klocka zlecenia Reactive: typ pracy · data zlecenia. -->
<template>
  <ion-item lines="none"><ion-note>{{ [typ, data].filter(Boolean).join(' · ') }}</ion-note></ion-item>
</template>

<script setup>
import { IonItem, IonNote } from '@ionic/vue';
defineProps({ typ: String, data: String });
</script>
