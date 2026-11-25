<!-- Fragment strony inspekcji: wspólna kolejka, bez drugiej implementacji listy i wysyłki. -->
<template>
  <KolejkaInsp :T="T" :kontroler="kontroler"></KolejkaInsp>
</template>

<script setup>
import KolejkaInsp from '../../czesci/KolejkaInsp.vue';
defineProps({ T: Function, kontroler: Object });
</script>
