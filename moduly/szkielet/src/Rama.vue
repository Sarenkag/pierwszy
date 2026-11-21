<!-- Rama ekranu OEST: powłoka Ionic (ion-app) i jedna treść (ion-content), do której trafia cała apka (.wrap).
     Wspólny pasek ekranu (nagłówek) dochodzi po ustaleniu wyglądu z Grzegorzem (21/11/2026) – do tego czasu ekrany mają swoje .top. -->
<template>
  <ion-app>
    <div class="ion-page oest-rama">
      <ion-content v-if="rama" ref="tresc" class="oest-rama-tresc"></ion-content>
    </div>
  </ion-app>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { IonApp, IonContent } from '@ionic/vue';
const props = defineProps({ stan: Object, rama: Boolean, T: Function });
const emit = defineEmits(['gotowe']);
const tresc = ref(null);
onMounted(async () => {
  if (!props.rama) return;
  const wrap = document.querySelector('body > .wrap');
  const c = tresc.value && tresc.value.$el;
  if (wrap && c) c.appendChild(wrap);
  try { await customElements.whenDefined('ion-content'); emit('gotowe', await c.getScrollElement()); } catch (e) { emit('gotowe', null); }
});
</script>
