<template>
  <ion-item ref="wiersz"><ion-select ref="pole" v-bind="$attrs" interface="alert"><slot /></ion-select></ion-item>
</template>
<script setup>
import { IonItem, IonSelect } from '@ionic/vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';
defineOptions({ inheritAttrs: false });
const wiersz = ref(null), pole = ref(null);
let obserwator;
onMounted(() => {
  const el = pole.value.$el;
  const synchronizuj = () => { wiersz.value.$el.hidden = el.hidden; };
  obserwator = new MutationObserver(synchronizuj);
  obserwator.observe(el, { attributes: true, attributeFilter: ['hidden'] });
  synchronizuj();
});
onBeforeUnmount(() => { if (obserwator) obserwator.disconnect(); });
</script>
