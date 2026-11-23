<!-- Raporty i zdjęcia. Licznik i opcja zdjęć: OESTSettingsUI.raportyLicznik()/zdjeciaStempel()/zapiszStempel() (app/www/settings-ui.js). Przeglądarkę raportów rysuje jej moduł (moduly/raporty/przegladarka.js, zdarzenie oest:raporty-ui) – tu tylko komponenty Ionic i miejsce na nią. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-list-header>{{ T('Moje raporty', 'My reports') }}</ion-list-header>
      <div ref="przegladarka" id="rptBrowser"></div>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Raporty w telefonie', 'Reports on this phone') }}</ion-list-header>
      <ion-item lines="none">
        <ion-label id="rptStats" :color="licznik.ostrzezenie ? 'danger' : undefined">{{ licznik.tekst || T('Liczę…', 'Counting…') }}</ion-label>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Mail: Word + PDF. Dysk Google: tylko Word, w folderze OEST Raporty / budynek / rodzaj; ponowne wysłanie nadpisuje ten sam plik. Telefon: do 200 MB, potem znikają najstarsze, tylko te już na Dysku.', 'Email: Word + PDF. Google Drive: Word only, in OEST Raporty / building / type; sending again overwrites the same file. Phone: up to 200 MB, then the oldest go, only those already on Drive.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-card v-if="z.jest">
      <ion-list-header>{{ T('Zdjęcia', 'Photos') }}</ion-list-header>
      <ion-item>
        <ion-toggle id="photoStamp" :checked="stempel" @ionChange="zmienStempel($event.detail.checked)">{{ T('Data i godzina na zdjęciach', 'Date and time on photos') }}</ion-toggle>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Każde nowe zdjęcie dostaje w prawym dolnym rogu datę i godzinę zrobienia (dd/mm/rrrr GG:MM). Zdjęć już zrobionych nie zmienia.', 'Each new photo gets the date and time it was taken in the bottom right corner (dd/mm/yyyy HH:MM). Photos already taken are not changed.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-card>
      <ion-list-header>Word + PDF · English</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Najmniejszy praktyczny plik przy zachowaniu czytelności. Zdjęcia w automatycznej siatce do 10 na stronę galerii.', 'Smallest practical file while retaining readability. Automatic photo grids up to 10 per gallery page.') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('To wspólne wymagania raportów. Generator i układ dokumentów są rozwijane w module inspekcji.', 'These are shared report requirements. Rendering and document layouts belong to the inspection module.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonToggle, IonButton } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const przegladarka = ref(null);
const licznik = ref({ tekst: '', ostrzezenie: false });
const z = S.zdjeciaStempel();
const stempel = ref(z.stempel);
const wynik = ref(null);
// przeglądarka raportów rysuje się sama w podanym miejscu – także po zmianie języka; licznik liczy moduł raportów
function rysuj() { try { window.dispatchEvent(new CustomEvent('oest:raporty-ui', { detail: przegladarka.value })); } catch (e) {} S.raportyLicznik().then((d) => { licznik.value = d; }); }
function zmienStempel(v) { if (stempel.value === v) return; stempel.value = v; S.zmiany(true); } // dopiero „Zapisz ustawienia” zapisuje w module zdjęć
function zapisz() { const w = S.zapiszStempel(stempel.value); if (w) wynik.value = w; else { S.zmiany(false); wynik.value = S.zapiszPola({}); } }
watch(() => props.wersja, rysuj);
onMounted(() => { S.zmiany(false); rysuj(); });
</script>
