<!-- Podgląd zdjęcia z folderu OEST (treść okienka OESTOkna.okno({ pelny: true })): zdjęcie, nazwa, folder i rozmiar; „Usuń” (po pytaniu) i „Zamknij”.
     Wygląd jak dawny podgląd na main (.zd-full): czarne tło, zdjęcie w naturalnym rozmiarze na środku, dwa przyciski 120 px.
     Dane: OESTZdjeciaUI.podglad(id); usunięcie: OESTZdjeciaUI.usun(id) – błąd zostaje w okienku. -->
<template>
  <div id="zdView" class="oest-podglad-tresc">
    <ion-img :src="p.adres" alt=""></ion-img>
    <p>{{ p.nazwa }}<br><span class="oest-podpis">{{ p.opis }}</span></p>
    <ion-note v-if="blad" color="danger" role="alert">{{ blad }}</ion-note>
    <div class="oest-akcje">
      <ion-button data-a="del" fill="outline" class="oest-szary" @click="usunTo"><ion-icon slot="start" :icon="trashOutline" aria-hidden="true"></ion-icon>{{ p.usun }}</ion-button>
      <ion-button data-a="close" fill="outline" class="oest-szary" @click="emit('zamknij', false)">{{ p.zamknij }}</ion-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { IonImg, IonNote, IonButton, IonIcon } from '@ionic/vue';
import { trashOutline } from 'ionicons/icons';
const props = defineProps({ T: Function, p: Object, usun: Function });
const emit = defineEmits(['dane', 'zamknij']);
const blad = ref('');
async function usunTo() { blad.value = ''; const r = await props.usun(props.p.id); if (r.ok) emit('zamknij', true); else if (r.blad) blad.value = r.blad; }
</script>
