<!-- Pole daty albo godziny – JEDEN klocek w całej apce (Grzegorz 25.11.2026: inspekcja, Reactive, Mój profil): ion-item, wybór w ion-modal z ion-datetime.
       <PoleDaty :T="T" id="od" :label="T('Obowiązuje od','Effective from')" value="2026-10-01" @zmiana="v => …" />
       <PoleDaty :T="T" id="godz" label="…" value="08:00" rodzaj="godzina" @zmiana="…" />
       <PoleDaty :T="T" id="dzien"><ion-checkbox slot="start" …>Data</ion-checkbox></PoleDaty>   własna etykieta (np. znacznik) – data jako przycisk obok
     Wartość: 'RRRR-MM-DD' (rodzaj „data”, domyślny) albo 'GG:MM' (rodzaj „godzina”). Zdarzenie „zmiana” dostaje ten sam format.
     Pokazana wartość = wartość ion-datetime (także ustawiona z kodu, np. i-*.js inspekcji) – zdarzenie ionValueChange.
     Przycisk daty przy własnej etykiecie ma id „<id>-przycisk” (kod strony może go wyłączyć, np. odznaczona „Data” w inspekcji). -->
<template>
  <ion-item :button="!wlasna" :detail="!wlasna" :disabled="!wlasna && disabled" lines="none" @click="!wlasna && otworz()">
    <slot><ion-label>{{ label }}</ion-label></slot>
    <ion-button v-if="wlasna" :id="id + '-przycisk'" fill="outline" :disabled="disabled" @click.stop="otworz">{{ tekst }}<ion-icon slot="end" :icon="calendarOutline" aria-hidden="true"></ion-icon></ion-button>
    <ion-note v-else slot="end">{{ tekst }}</ion-note>
    <ion-modal ref="okno" :keep-contents-mounted="true">
      <ion-datetime ref="kal" :id="id" :disabled="disabled" :presentation="rodzaj === 'godzina' ? 'time' : 'date'" :value="wartosc" :locale="T('pl-PL', 'en-GB')" :first-day-of-week="1" :show-default-buttons="true" :done-text="T('Gotowe', 'Done')" :cancel-text="T('Anuluj', 'Cancel')" @ionChange="zmien($event.detail.value)" @ionCancel="zamknij"></ion-datetime>
    </ion-modal>
  </ion-item>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, useSlots } from 'vue';
import { IonItem, IonLabel, IonNote, IonModal, IonDatetime, IonButton, IonIcon } from '@ionic/vue';
import { calendarOutline } from 'ionicons/icons';
const props = defineProps({ disabled: Boolean, T: { type: Function, default: (pl) => pl }, id: String, label: String, value: String, rodzaj: { type: String, default: 'data' } });
const emit = defineEmits(['zmiana']);
const wlasna = !!useSlots().default;
const okno = ref(null), kal = ref(null);
// wartość pokazana: z właściwości albo z samego ion-datetime (kod strony ustawia ją bez Vue)
const biezaca = ref(props.value || '');
watch(() => props.value, v => { biezaca.value = v || ''; });
const zIso = v => { const t = String(Array.isArray(v) ? v[0] : v || ''); return props.rodzaj === 'godzina' ? (/(\d\d):(\d\d)/.exec(t) || [''])[0] : t.slice(0, 10); };
const tekst = computed(() => props.rodzaj === 'godzina' ? biezaca.value || '—' : biezaca.value ? biezaca.value.split('-').reverse().join('/') : '—');
// ion-datetime chce pełnej daty ISO; godzinę podajemy z dowolnym dniem
const wartosc = computed(() => (props.rodzaj === 'godzina' ? '2000-01-01T' + (props.value || '00:00') + ':00' : props.value || undefined));
const naWartosc = e => { biezaca.value = zIso(e.detail.value); };
onMounted(() => { const el = kal.value && kal.value.$el; if (!el) return; el.addEventListener('ionValueChange', naWartosc); if (!biezaca.value && el.value) biezaca.value = zIso(el.value); });
onBeforeUnmount(() => { const el = kal.value && kal.value.$el; if (el) el.removeEventListener('ionValueChange', naWartosc); });
function otworz() { const m = okno.value && okno.value.$el; if (m && m.present) m.present(); }
function zamknij() { const m = okno.value && okno.value.$el; if (m && m.dismiss) m.dismiss(); }
function zmien(v) {
  const wynik = zIso(v);
  if (wynik) biezaca.value = wynik;
  if (wynik && wynik !== props.value) emit('zmiana', wynik);
  zamknij();
}
</script>
