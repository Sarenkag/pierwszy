<!-- Pole daty albo godziny – JEDEN sposób w całej apce (PRZEPIS.md): ion-item + ion-datetime-button, wybór w ion-modal z ion-datetime.
       <PoleDaty :T="T" :id="'od'" :label="T('Obowiązuje od','Effective from')" :value="'2026-10-01'" @zmiana="v => …" />
       <PoleDaty :T="T" id="godz" label="…" value="08:00" rodzaj="godzina" @zmiana="…" />
     Wartość: 'RRRR-MM-DD' (rodzaj „data”, domyślny) albo 'GG:MM' (rodzaj „godzina”). Zdarzenie „zmiana” dostaje ten sam format. -->
<template>
  <ion-item>
    <div class="oest-pole">
      <ion-label>{{ label }}</ion-label>
      <ion-datetime-button :datetime="id"></ion-datetime-button>
    </div>
    <ion-modal ref="okno" :keep-contents-mounted="true">
      <ion-datetime :id="id" :presentation="rodzaj === 'godzina' ? 'time' : 'date'" :value="wartosc" :locale="T('pl-PL', 'en-GB')" :first-day-of-week="1" :show-default-buttons="true" :done-text="T('Gotowe', 'Done')" :cancel-text="T('Anuluj', 'Cancel')" @ionChange="zmien($event.detail.value)" @ionCancel="zamknij"></ion-datetime>
    </ion-modal>
  </ion-item>
</template>

<script setup>
import { computed, ref } from 'vue';
import { IonItem, IonLabel, IonDatetimeButton, IonModal, IonDatetime } from '@ionic/vue';
const props = defineProps({ T: Function, id: String, label: String, value: String, rodzaj: { type: String, default: 'data' } });
const emit = defineEmits(['zmiana']);
const okno = ref(null);
// ion-datetime chce pełnej daty ISO; godzinę podajemy z dowolnym dniem
const wartosc = computed(() => (props.rodzaj === 'godzina' ? '2000-01-01T' + (props.value || '00:00') + ':00' : props.value || undefined));
function zamknij() { const m = okno.value && okno.value.$el; if (m && m.dismiss) m.dismiss(); }
function zmien(v) {
  const t = String(Array.isArray(v) ? v[0] : v || '');
  const wynik = props.rodzaj === 'godzina' ? (/(\d\d):(\d\d)/.exec(t) || [])[0] : t.slice(0, 10);
  if (wynik && wynik !== props.value) emit('zmiana', wynik);
  zamknij();
}
</script>
