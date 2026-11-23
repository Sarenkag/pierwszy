<!-- Połączenie z usługą Google (Poczta, Dysk, Kontakty): stan + „Połącz / odśwież uprawnienia”. Dane i akcja: OESTSettingsUI.polaczenieStan/polacz. -->
<template>
  <ion-card>
    <ion-item lines="none">
      <ion-label>
        <h2><strong>{{ stan }}</strong></h2>
      </ion-label>
    </ion-item>
    <ion-item lines="none">
      <ion-note>{{ T('Dostęp tylko po Twojej zgodzie. Apka sama odnawia połączenie w tle.', 'Access requires your permission. The app renews the connection in the background.') }}</ion-note>
    </ion-item>
    <ion-button expand="block" fill="outline" @click="polacz">{{ T('Połącz / odśwież uprawnienia', 'Connect / renew permission') }}</ion-button>
  </ion-card>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { IonCard, IonItem, IonLabel, IonNote, IonButton } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number, rodzaj: String, licznik: Number }) // licznik: ekran zwiększa go po akcji, która mogła zmienić połączenie (np. test wysyłki);
const emit = defineEmits(['wynik']);
const S = window.OESTSettingsUI;
const odswiez = ref(0);
const stan = computed(() => (props.wersja, props.licznik, odswiez.value, S.polaczenieStan(props.rodzaj)));
async function polacz() { const w = await S.polacz(props.rodzaj); odswiez.value++; if (w) emit('wynik', w); }
onMounted(() => { S.polaczenieSprawdz(props.rodzaj).then(() => { odswiez.value++; }); });
</script>
