<template>
  <ion-toolbar @pointerdown="przytrzymaj" @pointerup="pusc" @pointercancel="pusc" @pointerleave="pusc">
    <slot />
    <ion-popover :is-open="pokaz" @didDismiss="pokaz = false">
      <ion-content class="ion-padding"><ion-text>{{ tytul }}</ion-text></ion-content>
    </ion-popover>
  </ion-toolbar>
</template>
<script setup>
import { ref, onBeforeUnmount } from 'vue';
import { IonToolbar, IonPopover, IonContent, IonText } from '@ionic/vue';
const pokaz = ref(false), tytul = ref('');
let timer = 0, zamkniecie = 0;
function przytrzymaj(e) {
  const el = e.target.closest('ion-title');
  if (!el) return;
  clearTimeout(timer); clearTimeout(zamkniecie);
  timer = setTimeout(() => { tytul.value = el.textContent; pokaz.value = true; }, 450);
}
function pusc() { clearTimeout(timer); if (pokaz.value) zamkniecie = setTimeout(() => { pokaz.value = false; }, 1500); }
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(zamkniecie); });
</script>
