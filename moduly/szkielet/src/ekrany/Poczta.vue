<!-- Poczta i wysyłka. Dane i reguły: OESTSettingsUI.mailDane()/zapiszPola()/mailTest() (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <component :is="Polaczenie" :T="T" :wersja="wersja" rodzaj="gmail" :licznik="odswiez" @wynik="wynik = $event"></component>
    <ion-card>
      <ion-list-header>{{ T('Inspekcje', 'Inspections') }}</ion-list-header>
      <ion-item lines="none">
        <ion-label>{{ d.firmowy }}</ion-label>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Tylko Twój firmowy adres. Nadawcą jest konto Gmail używane w aplikacji.', 'Only your work address. Your signed-in Gmail account is the sender.') }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-select :label="T('Drugi inżynier — Handover', 'Second engineer — Handover')" label-placement="stacked" interface="popover" :value="f.engineerId" @ionChange="zmien('engineerId', $event.detail.value)">
          <ion-select-option v-for="o in d.osoby" :key="o.id" :value="o.id">{{ o.tekst }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select :label="T('Manager — Handover', 'Manager — Handover')" label-placement="stacked" interface="popover" :value="f.managerId" @ionChange="zmien('managerId', $event.detail.value)">
          <ion-select-option v-for="o in d.osoby" :key="o.id" :value="o.id">{{ o.tekst }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Handover: Ty na adres firmowy + wskazany inżynier + manager.', 'Handover: your work address + selected engineer + manager.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-accordion-group expand="inset">
      <ion-accordion value="test">
        <ion-item slot="header">
          <ion-label>{{ T('Zaawansowane · test wysyłki', 'Advanced · delivery test') }}</ion-label>
        </ion-item>
        <div slot="content" class="ion-padding">
          <ion-note>{{ T('Test wysyła jedną wiadomość TEST na zapisany adres firmowy. Bez automatycznego ponawiania.', 'Sends one TEST message to the saved work email. No automatic retries.') }}</ion-note>
          <ion-button expand="block" fill="outline" @click="test">{{ T('Wyślij wiadomość TEST', 'Send a TEST email') }}</ion-button>
        </div>
      </ion-accordion>
    </ion-accordion-group>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonSelect, IonSelectOption, IonAccordionGroup, IonAccordion, IonButton } from '@ionic/vue';
import Polaczenie from '../czesci/Polaczenie.vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const odswiez = ref(0);
// PL/EN: dane liczone na nowo, wybrane pola zostają (Vue podmienia tylko teksty)
const d = computed(() => (props.wersja, odswiez.value, S.mailDane()));
const start = S.mailDane();
const f = reactive({ engineerId: start.engineerId, managerId: start.managerId });
const wynik = ref(null);
function zmien(k, v) { if (f[k] === v) return; f[k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
function zapisz() { wynik.value = S.zapiszPola({ 'mail.engineerId': f.engineerId, 'mail.managerId': f.managerId }); odswiez.value++; }
async function test() { const w = await S.mailTest(); odswiez.value++; if (w) wynik.value = w; } // test mógł połączyć Gmail albo unieważnić sesję – karta połączenia pokazuje stan na nowo
onMounted(() => { S.zmiany(false); });
</script>
