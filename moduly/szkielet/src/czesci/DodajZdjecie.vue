<template>
  <ion-button ref="przycisk" :disabled="zajety" @click="dodaj"><ion-icon :src="formularz ? ikony.formularz : tryb === 'aparat' ? ikony.aparat : ikony.galeria" aria-hidden="true" /><slot>{{ tryb === 'aparat' ? T('Zrób zdjęcie', 'Take photo') : T('Z galerii', 'From gallery') }}</slot></ion-button>
</template>
<script setup>
import { ref } from 'vue';
import { IonButton, IonIcon } from '@ionic/vue';
import { Camera } from '@capacitor/camera';
const ikony = {"galeria":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20aria-hidden%3D%22true%22%3E%3Crect%20x%3D%223%22%20y%3D%224%22%20width%3D%2218%22%20height%3D%2216%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M3%2016l5-5%204%204%203-3%206%206%22%2F%3E%3C%2Fsvg%3E","aparat":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20aria-hidden%3D%22true%22%3E%3Cpath%20d%3D%22M3%208h4l2-3h6l2%203h4v11H3z%22%2F%3E%3Ccircle%20cx%3D%2212%22%20cy%3D%2213%22%20r%3D%224%22%2F%3E%3C%2Fsvg%3E","formularz":"data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20aria-hidden%3D%22true%22%3E%3Crect%20x%3D%225%22%20y%3D%224%22%20width%3D%2214%22%20height%3D%2217%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M9%204V3h6v1M8.5%2010l1.5%201.5%202.5-3M8.5%2016l1.5%201.5%202.5-3M14.5%2010h1.5M14.5%2016h1.5%22%2F%3E%3C%2Fsvg%3E"};
const props = defineProps({ formularz: Boolean, tryb: { type: String, default: 'aparat' }, T: { type: Function, default: (pl) => pl } });
const emit = defineEmits(['zdjecia', 'blad']);
const przycisk = ref(null), zajety = ref(false);
async function dodaj() {
  if (zajety.value) return;
  const el = przycisk.value.$el;
  // Konsument ustala kontekst przed otwarciem aparatu/galerii, żeby zmiana formularza
  // w trakcie wyboru nie przypisała zdjęcia innemu urządzeniu.
  const kontekst = {};
  el.dispatchEvent(new CustomEvent('oest:wybor-zdjec', { bubbles: true, detail: kontekst }));
  zajety.value = true;
  try {
    let lista;
    if (props.tryb === 'aparat') {
      if (!window.OESTAparat) throw new Error(props.T('Aparat jest niedostępny.', 'Camera is unavailable.'));
      const blob = await window.OESTAparat.take(kontekst.opcje || {});
      lista = blob ? [new File([blob], 'zdjecie.jpg', { type: blob.type || 'image/jpeg', lastModified: Date.now() })] : [];
    } else {
      const wynik = await Camera.pickImages({});
      lista = await Promise.all(wynik.photos.map(async (p, i) => {
        const response = await fetch(p.webPath);
        if (!response.ok) throw new Error(props.T('Nie udało się wczytać zdjęcia.', 'Could not load photo.'));
        const blob = await response.blob();
        return new File([blob], `zdjecie-${i + 1}.${p.format || 'jpg'}`, { type: blob.type, lastModified: Date.now() });
      }));
    }
    emit('zdjecia', lista);
    el.dispatchEvent(new CustomEvent('oest:zdjecia', { bubbles: true, detail: { lista, kontekst } }));
  } catch (blad) {
    if (/cancel|anulow/i.test(String(blad && blad.message || blad))) return;
    emit('blad', blad);
    el.dispatchEvent(new CustomEvent('oest:blad-zdjec', { bubbles: true, detail: { blad, kontekst } }));
  } finally { zajety.value = false; el.dispatchEvent(new CustomEvent('oest:koniec-wyboru-zdjec', { bubbles: true, detail: { kontekst } })); }
}
</script>
