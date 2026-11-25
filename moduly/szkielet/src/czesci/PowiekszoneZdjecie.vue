<!-- Klocek: powiększone zdjęcie w okienku apki (OESTOkna.okno), opcja „Powiększ zdjęcie” paska zdjęć (PasekZdjec.vue). Okienko apki, nie osobne okno WebView (Grzegorz 19/11/2026). -->
<template>
  <img class="oest-rx-foto" :src="url" :alt="alt">
</template>

<script setup>
defineProps({ T: Function, url: String, alt: String });
</script>
