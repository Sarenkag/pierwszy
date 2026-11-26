<!-- Linia klocka zlecenia Reactive: typ pracy · data zlecenia. -->
<template>
  <p>{{ [typ, data].filter(Boolean).join(' · ') }}</p>
</template>

<script setup>
defineProps({ typ: String, data: String });
</script>
