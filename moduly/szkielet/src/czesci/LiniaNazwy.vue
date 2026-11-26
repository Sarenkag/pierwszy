<!-- Linia 1 klocka zlecenia Reactive: nazwa zadania · numer zlecenia Vantify („#3084366”) albo „brak nr”. Wewnątrz ion-label klocka. -->
<template>
  <h2 class="ion-text-nowrap">{{ nazwa }} · {{ nr }}</h2>
</template>

<script setup>
defineProps({ nazwa: String, nr: String });
</script>
