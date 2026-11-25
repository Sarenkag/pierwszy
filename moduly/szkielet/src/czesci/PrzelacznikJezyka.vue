<!-- Klocek 3 górnego paska: przełącznik PL | EN. -->
<template>
  <div class="oest-jezyk" role="group" :aria-label="T('Język', 'Language')">
    <ion-button v-for="j in ['pl', 'en']" :key="j" :fill="jezyk === j ? 'solid' : 'clear'" :aria-pressed="jezyk === j" @click="jezyk !== j && emit('zmien')">{{ j.toUpperCase() }}</ion-button>
  </div>
</template>

<script setup>
import { IonButton } from '@ionic/vue';
defineProps({ jezyk: String, T: Function });
const emit = defineEmits(['zmien']);
</script>
