<!-- Powiększone zdjęcie karty Reactive w okienku apki (OESTOkna.okno): osobne okno w WebView doklejało zdjęcie pod ekrany (Grzegorz 19/11/2026). -->
<template>
  <img class="oest-rx-foto" :src="url" :alt="alt">
</template>

<script setup>
defineProps({ T: Function, url: String, alt: String });
</script>
