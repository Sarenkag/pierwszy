<!-- OCR i modele AI. Pola: OESTSettingsUI.aiDane()/zapiszPola(); panel modelu tekstowego: OESTModel.panel()/akcja()/setKey() (moduly/model/model.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card v-if="M">
      <ion-list-header>{{ T('Model tekstowy na telefonie', 'On-device text model') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Układa notatki w dobre zdania po angielsku i łączy je w jeden akapit raportu.', 'Turns notes into good English sentences and joins them into one report paragraph.') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Nie dodaje faktów; wynik zawsze sprawdzasz Ty. Bez modelu apka działa jak dotąd.', 'It adds no facts; you always check the result. Without the model the app works as before.') }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-select label="Model" label-placement="stacked" interface="popover" :value="m.klucz" @ionChange="wybierzModel($event.detail.value)">
          <ion-select-option v-for="o in m.opcje" :key="o.v" :value="o.v">{{ o.t }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="none">
        <ion-label>
          <p>{{ m.linia }}</p>
          <p v-if="m.blad">{{ m.blad }}</p>
        </ion-label>
      </ion-item>
      <ion-button v-if="m.pobierz" expand="block" fill="outline" @click="akcja('download')">{{ T('⬇ Pobierz model (Wi‑Fi)', '⬇ Download model (Wi‑Fi)') }}</ion-button>
      <ion-button v-if="m.anuluj" expand="block" fill="outline" @click="akcja('remove')">{{ T('Anuluj pobieranie', 'Cancel download') }}</ion-button>
      <ion-button v-if="m.usun" expand="block" fill="outline" @click="akcja('remove')">{{ T('Usuń model z telefonu', 'Remove model from phone') }}</ion-button>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Modele na telefonie', 'On-device models') }}</ion-list-header>
      <ion-item>
        <ion-input :label="T('Model wizyjny', 'Vision model')" label-placement="stacked" :value="f.visionModel" @ionInput="zmien('visionModel', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Każde nowe zdjęcie ma być analizowane lokalnie: OCR + wizja, jedno zadanie naraz. Analiza nie blokuje zapisu, może czekać na bezpieczne warunki pracy telefonu.', 'Every new photo requires local OCR + vision, one job at a time. Analysis does not block saving and may wait for safe device conditions.') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Model tekstowy ma zachować fakty, liczby i polski oryginał; angielska propozycja pozostaje do Twojej korekty.', 'The text model must preserve facts, numbers and the Polish original; you can edit the English suggestion.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-card>
      <ion-item>
        <ion-select :label="T('Opcjonalne wsparcie w chmurze — na żądanie', 'Optional cloud assistance — on request')" label-placement="stacked" interface="popover" :value="f.provider" @ionChange="zmien('provider', $event.detail.value)">
          <ion-select-option value="local">{{ T('Tylko lokalnie', 'Local only') }}</ion-select-option>
          <ion-select-option value="openai">OpenAI</ion-select-option>
          <ion-select-option value="anthropic">Claude / Anthropic</ion-select-option>
          <ion-select-option value="gemini">Gemini</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input :label="T('Identyfikator wybranego modelu chmurowego', 'Selected cloud model ID')" label-placement="stacked" :value="f.cloudModel" @ionInput="zmien('cloudModel', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Bez automatycznego wysyłania zdjęć do chmury. Klucze nie są przechowywane w ustawieniach ani kopii JSON.', 'No automatic cloud photo uploads. API keys are not stored in settings or JSON backups.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-note>{{ T('To konfiguracja dla adaptera AI. Silnik OCR, modele i edytor zdjęć nie są zainstalowane przez ten ekran. Wymiana modeli i bezpieczne klucze wymagają adaptera wykonawczego.', 'This configures the AI adapter. OCR runtime, models and photo editor are not installed by this screen. Model replacement and secure credentials require a runtime adapter.') }}</ion-note>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { reactive, ref, watch, onMounted, onUnmounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonInput, IonSelect, IonSelectOption, IonButton } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const M = window.OESTModel;
const f = reactive(S.aiDane());
const m = ref({ opcje: [] });
const wynik = ref(null);
let zegar = null, zywy = true;
// stan modelu czyta moduł; w trakcie pobierania odświeżamy co 3 s (jak dawny panel)
function odswiez(blad) { if (!M) return; M.panel(blad).then((d) => { if (!zywy) return; m.value = d; clearTimeout(zegar); if (d.trwa) zegar = setTimeout(odswiez, 3000); }); }
function wybierzModel(k) { if (k === m.value.klucz) return; M.setKey(k); odswiez(); }
async function akcja(a) { odswiez(await M.akcja(a)); }
function zmien(k, v) { if (f[k] === v) return; f[k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
function zapisz() { wynik.value = S.zapiszPola({ 'ai.visionModel': String(f.visionModel || '').trim(), 'ai.provider': f.provider, 'ai.cloudModel': String(f.cloudModel || '').trim() }); }
watch(() => props.wersja, () => odswiez()); // PL/EN: teksty z modułu w nowym języku
onMounted(() => { S.zmiany(false); odswiez(); });
onUnmounted(() => { zywy = false; clearTimeout(zegar); });
</script>
