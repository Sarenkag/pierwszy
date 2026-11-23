<!-- Zdjęcia: miejsce na telefonie i na Dysku, jakość, limity, synchronizacja, przeglądanie. Dane i akcje: OESTZdjeciaUI (app/www/zdjecia-ui.js),
     logika folderu, limitów i synchronizacji: moduly/zdjecia. Tu tylko komponenty Ionic; podgląd zdjęcia w OESTOkna.okno (ZdjeciePodglad.vue). -->
<template>
  <div class="ion-padding oest-panele" v-if="d">
    <ion-card class="oest-panel">
      <ion-list-header class="oest-tytul">{{ d.telefon.tytul }}</ion-list-header>
      <ion-progress-bar id="zdPhoneBar" class="oest-licznik" :class="{ 'oest-pelny': d.telefon.pelny }" :value="d.telefon.procent / 100"></ion-progress-bar>
      <ion-note class="oest-opis">{{ d.telefon.tekst }}</ion-note>
      <ion-list-header class="oest-tytul">{{ d.dysk.tytul }}</ion-list-header>
      <ion-progress-bar id="zdDriveBar" class="oest-licznik" :class="{ 'oest-pelny': d.dysk.pelny }" :value="d.dysk.procent / 100"></ion-progress-bar>
      <ion-note class="oest-opis">{{ d.dysk.tekst }}</ion-note>
      <Akcja id="zdSync" class="oest-duzy" :T="T" expand="block" :fn="Z.wyslij" :busy="T('Sprawdzam połączenie', 'Checking connection')" :wylaczony="d.zajety" :gotowe-tekst="gotowe" @wynik="v => (gotowe = v)">{{ d.zajety ? T('Wysyłam…', 'Uploading…') : T('Wyślij teraz na Dysk', 'Upload to Drive now') }}</Akcja>
      <ion-note id="zdMsg" class="oest-opis" role="status" aria-live="polite">{{ d.komunikat }}</ion-note>
    </ion-card>
    <ion-card class="oest-panel">
      <ion-list-header class="oest-tytul">{{ T('Ustawienia', 'Settings') }}</ion-list-header>
      <div class="oest-pole-blok">
        <ion-note class="oest-etykieta">{{ T('Jakość zdjęć w folderze', 'Photo quality in the folder') }}</ion-note>
        <ion-item class="oest-ramka-pola" lines="none">
          <ion-select id="zdPreset" :aria-label="T('Jakość zdjęć w folderze', 'Photo quality in the folder')" interface="popover" :value="u.preset" @ionChange="u.preset = $event.detail.value">
            <ion-select-option v-for="o in d.presety" :key="o.v" :value="o.v">{{ o.t }}</ion-select-option>
          </ion-select>
        </ion-item>
      </div>
      <div class="oest-pole-blok">
        <ion-note class="oest-etykieta">{{ T('Maksymalny rozmiar folderu OEST na telefonie (MB)', 'Maximum OEST folder size on the phone (MB)') }}</ion-note>
        <ion-item class="oest-ramka-pola" lines="none">
          <ion-input id="zdPhone" type="number" min="100" step="50" :aria-label="T('Maksymalny rozmiar folderu OEST na telefonie (MB)', 'Maximum OEST folder size on the phone (MB)')" :value="u.phoneLimitMB" @ionInput="u.phoneLimitMB = $event.detail.value"></ion-input>
        </ion-item>
      </div>
      <div class="oest-pole-blok">
        <ion-note class="oest-etykieta">{{ T('Ostrzeżenia licznika od (MB)', 'Counter warnings from (MB)') }}</ion-note>
        <ion-item class="oest-ramka-pola" lines="none">
          <ion-input id="zdWarn" type="number" min="10" step="10" :aria-label="T('Ostrzeżenia licznika od (MB)', 'Counter warnings from (MB)')" :value="u.warnMB" @ionInput="u.warnMB = $event.detail.value"></ion-input>
        </ion-item>
      </div>
      <ion-note class="oest-opis">{{ T('Licznik na ekranie głównym: do połowy tej wartości zielony, od połowy pomarańczowy, od 75% czerwony, od 90% czerwony z ⚠. To tylko ostrzeżenie – nic nie blokuje i nic nie kasuje.', 'Home screen counter: green up to half of this value, orange from half, red from 75%, red with ⚠ from 90%. It is only a warning – nothing is blocked or deleted.') }}</ion-note>
      <div class="oest-pole-blok">
        <ion-note class="oest-etykieta">{{ T('Limit na Dysku (MB)', 'Drive limit (MB)') }}</ion-note>
        <ion-item class="oest-ramka-pola" lines="none">
          <ion-input id="zdDrive" type="number" min="100" step="100" :aria-label="T('Limit na Dysku (MB)', 'Drive limit (MB)')" :value="u.driveLimitMB" @ionInput="u.driveLimitMB = $event.detail.value"></ion-input>
        </ion-item>
      </div>
      <ion-item class="oest-check" lines="none">
        <ion-checkbox id="zdWifi" label-placement="end" justify="start" :checked="u.wifiOnly" @ionChange="u.wifiOnly = $event.detail.checked">{{ T('Wysyłaj automatycznie tylko przez Wi-Fi', 'Upload automatically only over Wi-Fi') }}</ion-checkbox>
      </ion-item>
      <ion-note class="oest-opis">{{ T('Po przekroczeniu limitu telefonu znikają najstarsze zdjęcia, które są już na Dysku. Niewysłanych i tych w inspekcjach apka nie kasuje. Po przekroczeniu limitu Dysku znikają z niego najstarsze.', 'Over the phone limit, the oldest photos already on Drive are removed. Photos not yet uploaded or in inspections are never deleted. Over the Drive limit, the oldest are removed from Drive.') }}</ion-note>
      <ion-button id="zdSave" class="oest-duzy" expand="block" @click="Z.zapisz(u)">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    </ion-card>
    <ion-card class="oest-panel">
      <div class="oest-pole-blok">
        <ion-note class="oest-etykieta">{{ T('Szukaj: dzień (2026-11-01), kod, miejsce, rodzaj', 'Search: day (2026-11-01), code, place, type') }}</ion-note>
        <ion-item class="oest-ramka-pola" lines="none">
          <ion-input id="zdSearch" type="search" inputmode="search" :debounce="300" :aria-label="T('Szukaj: dzień (2026-11-01), kod, miejsce, rodzaj', 'Search: day (2026-11-01), code, place, type')" :placeholder="T('np. ISO-027 albo 2026-11-01', 'e.g. ISO-027 or 2026-11-01')" :value="d.szukaj" @ionInput="Z.szukaj($event.detail.value)"></ion-input>
        </ion-item>
      </div>
      <div v-for="g in d.dni" :key="g.dzien" class="oest-dzien-zdjec">
        <b>{{ g.dzien }}</b> <span class="oest-podpis">{{ g.n }}</span>
        <div class="oest-siatka">
          <ion-card v-for="z in g.zdjecia" :key="z.id" button class="oest-zdjecie" :data-ph="z.id" :title="z.nazwa" @click="pokaz(z.id)">
            <ion-img v-if="mini[z.id]" :src="mini[z.id]" alt=""></ion-img>
            <span v-if="z.tylkoDysk" class="oest-chmura">{{ T('Dysk', 'Drive') }}</span>
            <small>{{ z.opis }}</small>
          </ion-card>
        </div>
      </div>
      <ion-note v-if="d.pusto" class="oest-opis oest-rezerwa"><span>{{ d.pusto }}</span><span aria-hidden="true">{{ d.pustoRezerwa }}</span></ion-note>
    </ion-card>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from 'vue';
import { IonCard, IonItem, IonNote, IonProgressBar, IonListHeader, IonSelect, IonSelectOption, IonInput, IonCheckbox, IonButton, IonImg } from '@ionic/vue';
import Akcja from '../czesci/Akcja.vue';
import ZdjeciePodglad from './ZdjeciePodglad.vue';
const props = defineProps({ T: Function, wersja: Number });
const Z = window.OESTZdjeciaUI;
const d = ref(null), u = reactive({}), mini = reactive({}), gotowe = ref('');
let seq = 0, pierwszy = true;
async function odswiez() {
  const my = ++seq, x = await Z.dane();
  if (my !== seq) return;
  if (pierwszy) { Object.assign(u, x.ustawienia); pierwszy = false; } // pola ustawień: wartości z modułu raz; „Zapisz ustawienia” je zapisuje
  d.value = x;
  for (const g of x.dni) for (const z of g.zdjecia) if (!z.tylkoDysk && !mini[z.id]) { const a = await Z.miniatura(z.id); if (my !== seq) return; if (a) mini[z.id] = a; }
}
async function pokaz(id) {
  const p = await Z.podglad(id); if (!p) return;
  await window.OESTOkna.okno({ tytul: p.nazwa, komponent: ZdjeciePodglad, wlasciwosci: { p, usun: Z.usun }, bezPrzyciskow: true, pelny: true });
}
let odpisz = null;
watch(() => props.wersja, odswiez);
onMounted(() => { odpisz = Z.zmiany(odswiez); Z.open(); odswiez(); });
onUnmounted(() => { if (odpisz) odpisz(); Z.zwolnij(); });
</script>
