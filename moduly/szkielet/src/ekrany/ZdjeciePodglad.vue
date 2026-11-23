<!-- Podgląd zdjęcia z folderu OEST (treść okienka OESTOkna.okno): zdjęcie, nazwa, folder i rozmiar; „Usuń” (po pytaniu) i „Zamknij”.
     Dane: OESTZdjeciaUI.podglad(id); usunięcie: OESTZdjeciaUI.usun(id) – błąd zostaje w okienku. -->
<template>
  <div id="zdView">
    <ion-img :src="p.adres" alt=""></ion-img>
    <ion-item lines="none"><ion-label class="ion-text-wrap">{{ p.nazwa }}<p>{{ p.opis }}</p></ion-label></ion-item>
    <ion-item v-if="blad" lines="none"><ion-note color="danger" role="alert">{{ blad }}</ion-note></ion-item>
    <ion-button data-a="del" expand="block" fill="outline" color="danger" @click="usunTo"><ion-icon slot="start" :icon="trashOutline" aria-hidden="true"></ion-icon>{{ p.usun }}</ion-button>
    <ion-button data-a="close" expand="block" fill="outline" @click="emit('zamknij', false)">{{ p.zamknij }}</ion-button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { IonImg, IonItem, IonLabel, IonNote, IonButton, IonIcon } from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';
const props = defineProps({ T: Function, p: Object, usun: Function });
const emit = defineEmits(['dane', 'zamknij']);
const blad = ref('');
async function usunTo() { blad.value = ''; const r = await props.usun(props.p.id); if (r.ok) emit('zamknij', true); else if (r.blad) blad.value = r.blad; }
</script>
