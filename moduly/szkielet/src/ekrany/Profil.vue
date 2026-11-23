<!-- Mój profil: dane, zdjęcie, podpis i grafik 4 on / 4 off z datą odniesienia (edytowalne dane profilu, nie stałe w kodzie).
     Dane i reguły: OESTSettingsUI.profilDane()/zapiszPola()/obrazWybierz()/obrazUsun()/grafikDane()/grafikDodaj() (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-item>
        <ion-input fill="solid" id="profile-first" :label="T('Imię', 'First name')" label-placement="stacked" :value="f.first" @ionInput="zmien('first', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="profile-last" :label="T('Nazwisko', 'Last name')" label-placement="stacked" :value="f.last" @ionInput="zmien('last', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="profile-title" :label="T('Tytuł', 'Title')" label-placement="stacked" :placeholder="T('Mr, Mrs, Dr…', 'Mr, Mrs, Dr…')" :value="f.title" @ionInput="zmien('title', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="profile-position" :label="T('Stanowisko', 'Position')" label-placement="stacked" :value="f.position" @ionInput="zmien('position', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="profile-workplace" :label="T('Główne miejsce pracy', 'Main workplace')" label-placement="stacked" :value="f.workplace" @ionInput="zmien('workplace', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="profile-companyEmail" type="email" :label="T('Mój firmowy e-mail', 'My work email')" label-placement="stacked" :value="f.companyEmail" @ionInput="zmien('companyEmail', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="profile-privateEmail" type="email" :label="T('Mój prywatny e-mail', 'My private email')" label-placement="stacked" :value="f.privateEmail" @ionInput="zmien('privateEmail', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="profile-formSignature" :label="T('Podpis tekstowy w formularzach', 'Printed name in forms')" label-placement="stacked" :value="f.formSignature" @ionInput="zmien('formSignature', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Wpisz dokładnie np. G. S., G Sarna', 'Type exactly how it should appear,') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('lub pełne imię i nazwisko.', 'e.g. G. S. or G Sarna.') }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-select fill="solid" id="profile-language" :label="T('Język apki (domyślny)', 'App language (default)')" label-placement="stacked" interface="popover" :value="f.language" @ionChange="zmien('language', $event.detail.value)">
          <ion-select-option value="pl">Polski</ion-select-option>
          <ion-select-option value="en">English</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Po zapisaniu profilu to język całej apki. PL/EN u góry przełącza tylko do zamknięcia apki.', 'After saving your profile this is the language of the whole app. PL/EN at the top switches only until the app is closed.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Zdjęcie profilowe', 'Profile photo') }}</ion-list-header>
      <ion-item v-if="d.zdjecie" lines="none">
        <ion-avatar slot="start"><img :src="d.zdjecie" :alt="T('Twoje zdjęcie', 'Your photo')"></ion-avatar>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="wybierz('photo')">{{ T('Wybierz zdjęcie', 'Choose a photo') }}</ion-button>
      <ion-button expand="block" fill="outline" @click="usun('photo')">{{ T('Usuń zdjęcie', 'Remove photo') }}</ion-button>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Podpis odręczny — opcjonalnie', 'Handwritten signature — optional') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Na przyszłość; nie jest automatycznie dodawany do formularzy. Przyjmujemy PNG z przezroczystym tłem.', 'For future use; not automatically added to forms. Use a PNG with a transparent background.') }}</ion-note>
      </ion-item>
      <ion-item v-if="d.podpis" lines="none">
        <ion-img :src="d.podpis" :alt="T('Podpis', 'Signature')"></ion-img>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="wybierz('signatureImage')">{{ T('Dodaj przezroczysty PNG', 'Import a transparent PNG') }}</ion-button>
      <ion-button expand="block" fill="outline" @click="usun('signatureImage')">{{ T('Usuń podpis', 'Remove signature') }}</ion-button>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Mój grafik', 'My shifts') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note v-if="g.zrodlo">{{ T(g.zrodlo.pl, g.zrodlo.en) }}</ion-note>
        <ion-note v-else>{{ T('Ustawiasz i zmieniasz sam. Kalendarz zaznacza dni pracy według najnowszej wersji.', 'You set and change it yourself. The calendar marks workdays from the latest version.') }}</ion-note>
      </ion-item>
      <template v-if="g.wersje.length">
        <ion-item v-for="(x, i) in g.wersje" :key="i" lines="full">
          <ion-label>
            <h2>{{ x.od }} · {{ x.uklad }}</h2>
            <p>{{ x.godziny }}</p>
            <p>{{ T('Początek cyklu: ', 'Cycle anchor: ') }}{{ x.cykl }}</p>
          </ion-label>
        </ion-item>
      </template>
      <template v-else>
      <ion-item lines="none">
        <ion-note>{{ T('Nie ustawiono grafiku.', 'No schedule yet.') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Każda zmiana dostaje własną datę obowiązywania.', 'Each change has its own effective date.') }}</ion-note>
      </ion-item>
      </template>
      <ion-list-header>{{ T('Dodaj nową wersję grafiku', 'Add a schedule version') }}</ion-list-header>
      <component :is="PoleDaty" :T="T" id="shiftEffective" :label="T('Obowiązuje od', 'Effective from')" :value="ng.od" @zmiana="ng.od = $event"></component>
      <component :is="PoleDaty" :T="T" id="shiftAnchor" :label="T('Początek cyklu', 'Cycle anchor')" :value="ng.cykl" @zmiana="ng.cykl = $event"></component>
      <ion-item>
        <ion-select fill="solid" id="shiftKind" :label="T('Układ pracy', 'Pattern')" label-placement="stacked" interface="popover" :value="ng.uklad" @ionChange="ng.uklad = $event.detail.value">
          <ion-select-option value="weekdays">{{ T('Poniedziałek–piątek', 'Monday–Friday') }}</ion-select-option>
          <ion-select-option value="weekends">{{ T('Weekendy', 'Weekends') }}</ion-select-option>
          <ion-select-option value="4on4">4 on / 4 off</ion-select-option>
        </ion-select>
      </ion-item>
      <component :is="PoleDaty" :T="T" id="shiftFrom" rodzaj="godzina" :label="T('Od godziny', 'Start time')" :value="ng.start" @zmiana="ng.start = $event"></component>
      <component :is="PoleDaty" :T="T" id="shiftTo" rodzaj="godzina" :label="T('Do godziny', 'End time')" :value="ng.koniec" @zmiana="ng.koniec = $event"></component>
      <ion-item>
        <ion-toggle id="shiftNextDay" :checked="ng.nastepny" @ionChange="ng.nastepny = $event.detail.checked">{{ T('Koniec następnego dnia', 'Ends on the following day') }}</ion-toggle>
      </ion-item>
      <ion-button id="shiftAdd" expand="block" fill="outline" @click="dodaj">{{ T('Dodaj wersję grafiku', 'Add schedule version') }}</ion-button>
    </ion-card>
    <ion-note>{{ T('Dane są wspólne dla modułów. Zakończone raporty zachowują historyczną osobę i podpis.', 'Shared across modules. Completed reports retain their original identity and signature.') }}</ion-note>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonInput, IonSelect, IonSelectOption, IonToggle, IonButton, IonAvatar, IonImg } from '@ionic/vue';
import PoleDaty from '../czesci/PoleDaty.vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const odswiez = ref(0);
// PL/EN: dane liczone na nowo, wpisane pola zostają (Vue podmienia tylko teksty)
const d = computed(() => (props.wersja, odswiez.value, S.profilDane()));
const g = computed(() => (props.wersja, odswiez.value, S.grafikDane()));
const f = reactive({ ...S.profilDane().pola });
const ng = reactive({ ...S.grafikDane().formularz }); // pola nowej wersji grafiku zapisuje „Dodaj wersję grafiku”, nie „Zapisz”
const wynik = ref(null);
function zmien(k, v) { if (f[k] === v) return; f[k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
function zapisz() {
  wynik.value = S.zapiszPola(Object.fromEntries(Object.keys(f).map(k => ['profile.' + k, String(f[k] == null ? '' : f[k]).trim()])));
  Object.assign(f, S.profilDane().pola); odswiez.value++;
}
async function wybierz(rodzaj) { const w = await S.obrazWybierz(rodzaj); odswiez.value++; if (w) wynik.value = w; }
async function usun(rodzaj) { const w = await S.obrazUsun(rodzaj); odswiez.value++; if (w) wynik.value = w.tekst || w.blad ? w : null; }
async function dodaj() {
  const w = await S.grafikDodaj(ng); odswiez.value++;
  if (w) { wynik.value = w; if (!w.blad) Object.assign(ng, S.grafikDane().formularz); }
}
onMounted(() => { S.zmiany(false); });
</script>
