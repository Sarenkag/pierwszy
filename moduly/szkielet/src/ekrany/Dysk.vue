<!-- Google Drive i kopia ustawień. Dane i reguły: OESTSettingsUI.dyskDane()/dysk*/kopia* (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <component :is="Polaczenie" :T="T" :wersja="wersja" rodzaj="drive" :licznik="odswiez" @wynik="wynik = $event"></component>
    <ion-card>
      <ion-list-header>{{ T('Co trafia na Dysk', 'What is stored on Drive') }}</ion-list-header>
      <ion-item><ion-label class="ion-text-wrap">{{ T('Raporty: Word + PDF + dane inspekcji w OEST Raporty / budynek / rodzaj. Ponowna wysyłka nadpisuje wszystkie trzy pliki. Przywracanie: Moje raporty.', 'Reports: Word + PDF + inspection data in OEST Raporty / building / type. Sending again overwrites all three files. Restore in My reports.') }}</ion-label></ion-item>
      <ion-item><ion-label class="ion-text-wrap">{{ T('Zdjęcia: folder OEST Zdjęcia. Niewysłane i używane w inspekcjach pozostają chronione na telefonie. Po przekroczeniu limitu Dysku usuwane są najstarsze zdjęcia.', 'Photos: OEST Zdjęcia folder. Photos not yet uploaded or used in inspections remain protected on the phone. Over the Drive limit, the oldest photos are removed.') }}</ion-label></ion-item>
      <ion-item><ion-label class="ion-text-wrap">{{ T('Kopia ustawień: profil, kontakty, grafik i preferencje w wybranym poniżej folderze kopii.', 'Settings backup: profile, contacts, shifts and preferences in the backup folder selected below.') }}</ion-label></ion-item>
      <ion-button fill="clear" href="#settings/my-reports">{{ T('Moje raporty', 'My reports') }}</ion-button>
    </ion-card>
    <ion-card v-if="zd">
      <ion-list-header>{{ T('Zdjęcia na Dysku', 'Photos on Drive') }}</ion-list-header>
      <ion-item><ion-input id="zdDrive" type="number" min="100" step="100" :label="T('Limit na Dysku (MB)', 'Drive limit (MB)')" label-placement="stacked" :value="zd.driveLimitMB" @ionInput="zd.driveLimitMB = $event.detail.value"></ion-input></ion-item>
      <ion-item><ion-checkbox id="zdWifi" label-placement="end" :checked="zd.wifiOnly" @ionChange="zd.wifiOnly = $event.detail.checked">{{ T('Wysyłaj automatycznie tylko przez Wi-Fi', 'Upload automatically only over Wi-Fi') }}</ion-checkbox></ion-item>
      <ion-button expand="block" @click="wynik = S.zdjeciaDyskZapisz(zd)">{{ T('Zapisz ustawienia zdjęć na Dysku', 'Save Drive photo settings') }}</ion-button>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Folder backupu', 'Backup folder') }}</ion-list-header>
      <ion-item>
        <ion-input :label="T('Identyfikator folderu Drive', 'Drive folder ID')" label-placement="stacked" :value="f.folderId" @ionInput="zmien('folderId', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('ID to fragment adresu po /folders/. Dostęp ograniczony do plików/folderów udostępnionych tej aplikacji.', 'ID is the part after /folders/. Access is limited to files/folders available to this app.') }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-input :label="T('Nazwa do wyświetlania', 'Display name')" label-placement="stacked" :value="f.folderName" @ionInput="zmien('folderName', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="sprawdz">{{ T('Sprawdź dostęp do folderu', 'Check folder access') }}</ion-button>
      <ion-button expand="block" fill="outline" @click="foldery">{{ T('Pokaż dostępne foldery', 'List accessible folders') }}</ion-button>
      <ion-item v-if="lista.length">
        <ion-select :label="T('Dostępne foldery', 'Accessible folders')" label-placement="stacked" interface="popover" :value="f.folderId" @ionChange="wybierz($event.detail.value)">
          <ion-select-option v-for="o in lista" :key="o.id" :value="o.id">{{ o.name }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-input :label="T('Nazwa nowego folderu', 'New folder name')" label-placement="stacked" :value="nowy" @ionInput="nowy = $event.detail.value"></ion-input>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="utworz">{{ T('Utwórz folder na Drive', 'Create a Drive folder') }}</ion-button>
    </ion-card>
    <ion-note>{{ T('Zapisanie folderu ustawia cel. Nie przenosi plików ani nie uruchamia wysyłania starych raportów.', 'Saving selects the destination. It does not move files or send old reports.') }}</ion-note>
    <ion-card>
      <ion-list-header>{{ T('Kopia ustawień', 'Settings backup') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Profil, kontakty, grafik i preferencje. Bez tokenów Google i sekretów inspekcji. Plik zawiera dane osobowe i podpis — przechowuj go prywatnie.', 'Profile, contacts, shifts and preferences. No Google tokens or inspection secrets. The file contains personal data and signature — keep it private.') }}</ion-note>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="pokaz(S.kopiaPobierz())">{{ T('Pobierz kopię ustawień JSON', 'Download settings JSON') }}</ion-button>
      <ion-button expand="block" fill="outline" @click="pokaz(S.kopiaDysk())">{{ T('Zapisz ustawienia na Google Drive', 'Back up settings to Google Drive') }}</ion-button>
      <ion-button expand="block" fill="outline" @click="otworz">{{ T('Otwórz kopię do sprawdzenia', 'Open a backup for preview') }}</ion-button>
      <ion-item v-if="podglad" lines="none">
        <ion-label>{{ podglad }}</ion-label>
      </ion-item>
      <ion-button v-if="podglad" expand="block" @click="odtworz">{{ T('Zastąp moje ustawienia tą kopią', 'Replace my settings with this backup') }}</ion-button>
    </ion-card>
    <ion-note>{{ T('Pełna historia i raporty inspekcji należą do modułu inspekcji. Ten ekran odtwarza tylko ustawienia, nie udaje pełnego odzyskania aplikacji.', 'Inspection history and reports belong to the inspection module. This screen restores settings only, not the entire application.') }}</ion-note>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonInput, IonSelect, IonSelectOption, IonButton, IonCheckbox } from '@ionic/vue';
import Polaczenie from '../czesci/Polaczenie.vue';
defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const odswiez = ref(0);
const f = reactive(S.dyskDane());
const zd = ref(S.zdjeciaDyskDane());
const nowy = ref('OEST Backup');
const lista = ref([]);
const podglad = ref('');
const wynik = ref(null);
function zmien(k, v) { if (f[k] === v) return; f[k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
function wczytaj() { Object.assign(f, S.dyskDane()); S.zmiany(false); } // po akcji, która zapisała folder w ustawieniach
async function pokaz(p) { const w = await p; odswiez.value++; if (w) wynik.value = w; return w; } // akcja mogła połączyć Drive albo unieważnić sesję – karta połączenia pokazuje stan na nowo
async function sprawdz() { const w = await pokaz(S.dyskSprawdz(f.folderId)); if (w && !w.blad) { f.folderName = w.nazwa; S.zmiany(true); } }
async function foldery() { const w = await pokaz(S.dyskFoldery()); if (w && !w.blad) lista.value = w.foldery; if (w && !w.tekst && !w.blad) wynik.value = null; }
function wybierz(id) { const o = lista.value.find((x) => x.id === id); if (!o || f.folderId === o.id) return; f.folderId = o.id; f.folderName = o.name; S.zmiany(true); }
async function utworz() { const w = await pokaz(S.dyskUtworz(nowy.value)); if (w && !w.blad) wczytaj(); }
async function otworz() { const w = await S.kopiaWybierz(); if (!w) return; podglad.value = w.blad ? '' : w.podglad; wynik.value = w.blad ? w : null; }
async function odtworz() { const w = await pokaz(S.kopiaOdtworz()); if (w && w.odtworzono) { podglad.value = ''; wczytaj(); } }
function zapisz() { wynik.value = S.zapiszPola({ 'drive.folderId': String(f.folderId || '').trim(), 'drive.folderName': String(f.folderName || '').trim() }); }
onMounted(() => { S.zmiany(false); });
</script>
