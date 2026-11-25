<!-- Klocek: menu główne – 8 kafelków modułów (Grzegorz 25.11.2026). Jeden Kafel powtórzony przez Kafelki.vue; lista z OESTHome.dane().kafelki. -->
<template>
  <Kafelki :lista="lista" @wybierz="it => emit('wybierz', it)"></Kafelki>
</template>

<script setup>
import { computed } from 'vue';
import Kafelki from './Kafelki.vue';
import { KAFELKI } from '../ekrany/glowny/ikony.js';
const props = defineProps({ kafelki: Array });
const emit = defineEmits(['wybierz']);
const lista = computed(() => (props.kafelki || []).map(k => ({ ...k, ikona: KAFELKI[k.ikona] })));
</script>
