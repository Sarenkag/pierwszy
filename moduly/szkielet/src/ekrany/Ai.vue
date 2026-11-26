<!-- OCR i modele AI. Pola: OESTSettingsUI.aiDane()/zapiszPola(); panel modelu tekstowego: OESTModel.panel()/akcja()/setKey() (moduly/model/model.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card v-if="M">
      <ion-list-header>{{ T('Model tekstowy na telefonie', 'On-device text model') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Układa notatki w dobre zdania po angielsku, łączy je w akapit raportu i tłumaczy pola przed Vantify.', 'Turns notes into good English sentences, joins them into a report paragraph and translates fields before Vantify.') }}</ion-note>
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
      <ion-button v-if="m.zezwol" expand="block" fill="outline" @click="akcja('allow')">{{ T('Zezwól na odczyt folderu Modele', 'Allow reading the Modele folder') }}</ion-button>
      <ion-button v-if="m.pobierz" expand="block" fill="outline" @click="akcja('download')">{{ T('⬇ Pobierz model (Wi‑Fi)', '⬇ Download model (Wi‑Fi)') }}</ion-button>
      <ion-button v-if="m.anuluj" expand="block" fill="outline" @click="akcja('remove')">{{ T('Anuluj pobieranie', 'Cancel download') }}</ion-button>
      <ion-button v-if="m.usun" expand="block" fill="outline" @click="akcja('remove')">{{ T('Usuń model z telefonu', 'Remove model from phone') }}</ion-button>
      <ion-item v-if="m.prompt" lines="none">
        <ion-label class="ion-text-wrap">
          <h3>{{ T('Stały prompt (po angielsku, tylko do podglądu)', 'Fixed prompt (read only)') }}</h3>
          <p>{{ m.prompt }}</p>
        </ion-label>
      </ion-item>
    </ion-card>
    <ion-card v-if="M">
      <ion-list-header>{{ T('Słownik pojęć', 'Glossary') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Model zawsze używa tych tłumaczeń. Stuknij wiersz, żeby go poprawić.', 'The model always uses these translations. Tap a row to edit it.') }}</ion-note>
      </ion-item>
      <ion-item v-for="(g, i) in slownik" :key="i" button :detail="false" @click="wybierzPojecie(i)">
        <ion-label class="ion-text-wrap">
          <h3>{{ g.pl }} → {{ g.en }}</h3>
          <p v-if="g.note">{{ g.note }}</p>
        </ion-label>
        <ion-button slot="end" fill="clear" @click.stop="usunPojecie(i)">✕</ion-button>
      </ion-item>
      <ion-item>
        <ion-input :label="T('Termin po polsku', 'Polish term')" label-placement="stacked" :value="nowe.pl" @ionInput="nowe.pl = $event.detail.value"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input :label="T('Po angielsku', 'English')" label-placement="stacked" :value="nowe.en" @ionInput="nowe.en = $event.detail.value"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input :label="T('Znaczenie (opcjonalnie)', 'Meaning (optional)')" label-placement="stacked" :value="nowe.note" @ionInput="nowe.note = $event.detail.value"></ion-input>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="zapiszPojecie">{{ edytowane < 0 ? T('＋ Dodaj', '＋ Add') : T('Zapisz poprawkę', 'Save change') }}</ion-button>
      <ion-note v-if="slownikWynik" role="status" aria-live="polite" :color="slownikWynik.blad ? 'danger' : 'success'">{{ slownikWynik.tekst }}</ion-note>
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
// słownik pojęć: każda zmiana od razu zapisana w ustawieniach (OESTSettingsUI); stuknięty wiersz trafia do pól do poprawy
const slownik = ref(S.slownikDane ? S.slownikDane() : []);
const nowe = reactive({ pl: '', en: '', note: '' });
const edytowane = ref(-1);
const slownikWynik = ref(null);
function zapiszSlownik(lista) { const r = S.zapiszPola({ 'ai.glossary': lista }); slownikWynik.value = r; if (!r.blad) slownik.value = S.slownikDane(); return !r.blad; }
function wybierzPojecie(i) { const g = slownik.value[i]; Object.assign(nowe, { pl: g.pl, en: g.en, note: g.note }); edytowane.value = i; }
function zapiszPojecie() {
  const g = { pl: String(nowe.pl || '').trim(), en: String(nowe.en || '').trim(), note: String(nowe.note || '').trim() };
  if (!g.pl || !g.en) { slownikWynik.value = { tekst: props.T('Wpisz termin po polsku i po angielsku.', 'Enter the Polish and the English term.'), blad: true }; return; }
  const lista = slownik.value.slice(); if (edytowane.value >= 0) lista[edytowane.value] = g; else lista.push(g);
  if (zapiszSlownik(lista)) { Object.assign(nowe, { pl: '', en: '', note: '' }); edytowane.value = -1; }
}
function usunPojecie(i) { const lista = slownik.value.slice(); lista.splice(i, 1); if (zapiszSlownik(lista) && edytowane.value === i) { Object.assign(nowe, { pl: '', en: '', note: '' }); edytowane.value = -1; } }
let zegar = null, zywy = true;
// stan modelu czyta moduł; w trakcie pobierania odświeżamy co 3 s (jak dawny panel)
function odswiez(blad) { if (!M) return; M.panel(blad).then((d) => { if (!zywy) return; m.value = d; clearTimeout(zegar); if (d.trwa) zegar = setTimeout(odswiez, 3000); }); }
function wybierzModel(k) { if (k === m.value.klucz) return; M.setKey(k); odswiez(); }
async function akcja(a) { odswiez(await M.akcja(a)); }
function zmien(k, v) { if (f[k] === v) return; f[k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
function zapisz() { wynik.value = S.zapiszPola({ 'ai.visionModel': String(f.visionModel || '').trim(), 'ai.provider': f.provider, 'ai.cloudModel': String(f.cloudModel || '').trim() }); }
watch(() => props.wersja, () => odswiez()); // PL/EN: teksty z modułu w nowym języku
// po powrocie z ustawień Androida („Dostęp do wszystkich plików”) stan modelu czytamy od nowa
function widoczna() { if (document.visibilityState === 'visible') odswiez(); }
onMounted(() => { S.zmiany(false); odswiez(); document.addEventListener('visibilitychange', widoczna); });
onUnmounted(() => { zywy = false; clearTimeout(zegar); document.removeEventListener('visibilitychange', widoczna); });
</script>
