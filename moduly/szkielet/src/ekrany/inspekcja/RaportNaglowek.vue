<template><div class="ph"><img v-if="logo" alt="" :src="logo"><div>{{ tytul }}</div></div></template>
<script setup>
defineProps({ logo: String, tytul: String });
</script>
