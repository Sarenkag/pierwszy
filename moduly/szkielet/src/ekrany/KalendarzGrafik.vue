<!-- Kalendarz i grafik (Ustawienia): kalendarz grafiku (SMART WORK), odczyt grafiku, kalendarz inspekcji PPM, synchronizacja.
     Dane i akcje: OESTCalendarUI.* (app/www/calendar-ui.js), zapis pól: OESTSettingsUI.zapiszPola() – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-note>{{ T('Grafik zmian ustawiasz w Mój profil → Mój grafik.', 'Set your shifts in My profile → My shifts.') }}</ion-note>
    <ion-card>
      <ion-list-header>{{ T('Grafik zmian · SMART WORK', 'Shifts · SMART WORK') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Dni pracy apka bierze z wpisów „SMART WORK” w tym kalendarzu, np. „Smart Managed Solutions”. Zmiana grafiku w apce zmienia też ten kalendarz (po potwierdzeniu).', 'The app takes workdays from “SMART WORK” entries in this calendar, e.g. “Smart Managed Solutions”. Changing shifts in the app also changes this calendar (after you confirm).') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label>{{ T('Kalendarz grafiku:', 'Shift calendar:') }} {{ d.grafik.kalendarz || T('nie wybrano', 'not chosen') }}</ion-label>
      </ion-item>
      <ion-button id="calShiftList" expand="block" fill="outline" :disabled="zajety" @click="listaGrafiku">{{ T('Wybierz kalendarz grafiku', 'Choose shift calendar') }}</ion-button>
      <template v-if="grafik">
        <ion-item v-if="grafik.length">
          <ion-select fill="solid" id="shiftChoice" :label="T('Konto / kalendarz', 'Account / calendar')" label-placement="stacked" interface="popover" :value="grafikWybor" @ionChange="grafikWybor = $event.detail.value">
            <ion-select-option v-for="o in grafik" :key="o.id" :value="o.id">{{ o.tekst }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item v-else lines="none">
          <ion-note>{{ T('Brak własnego kalendarza Google w telefonie.', 'No owned Google calendar on this phone.') }}</ion-note>
        </ion-item>
        <ion-button v-if="grafik.length" id="shiftUse" expand="block" fill="outline" :disabled="zajety" @click="grafikUzywaj">{{ T('Używaj tego kalendarza do grafiku', 'Use this calendar for shifts') }}</ion-button>
      </template>
      <ion-button id="calShiftRead" expand="block" fill="outline" :disabled="zajety" @click="grafikOdczytaj">{{ T('Odczytaj grafik teraz', 'Read shifts now') }}</ion-button>
      <ion-item v-if="grafikTekst" lines="none">
        <ion-note id="shiftStatus" role="status" aria-live="polite" :color="grafikBlad ? 'danger' : undefined">{{ grafikTekst }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-card>
      <ion-list-header>{{ T('Inspekcje PPM · Google Calendar', 'PPM inspections · Google Calendar') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Wybierz kalendarz na terminy inspekcji, np. „OEST Inspekcje”. Apka dodaje tam tylko swoje wpisy i nigdy nie zmienia Twoich. Przy zmianie kalendarza wpisy apki znikają ze starego.', 'Choose a calendar for inspection dates, e.g. “OEST Inspekcje”. The app adds only its own entries and never changes yours. When you switch calendars, the app’s entries are removed from the old one.') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-label>{{ T('Synchronizacja:', 'Sync:') }} {{ d.inspekcje.wlaczona ? T('włączona', 'enabled') : T('wyłączona', 'disabled') }} · {{ d.inspekcje.konto }}<template v-if="d.inspekcje.nazwa"> · {{ d.inspekcje.nazwa }}</template></ion-label>
      </ion-item>
      <ion-button id="calList" expand="block" fill="outline" :disabled="zajety" @click="listaInspekcji">{{ T('Włącz / wybierz kalendarz', 'Enable / select calendar') }}</ion-button>
      <template v-if="insp">
        <template v-if="insp.length">
          <ion-item>
            <ion-select fill="solid" id="calendarChoice" :label="T('Konto / kalendarz', 'Account / calendar')" label-placement="stacked" interface="popover" :value="inspWybor" @ionChange="inspWybor = $event.detail.value">
              <ion-select-option v-for="o in insp" :key="o.id" :value="o.id">{{ o.tekst }}</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-toggle id="calendarPrivate" :checked="inspPotwierdzam" @ionChange="inspPotwierdzam = $event.detail.checked">{{ T('Potwierdzam wybór. Jeśli udostępniam ten kalendarz, inni zobaczą też terminy PPM.', 'I confirm. If I share this calendar, others will also see PPM dates.') }}</ion-toggle>
          </ion-item>
          <ion-button id="calendarEnable" expand="block" fill="outline" :disabled="zajety" @click="wlacz">{{ T('Włącz i synchronizuj', 'Enable and sync') }}</ion-button>
        </template>
        <ion-item v-else lines="none">
          <ion-note>{{ T('Brak własnego kalendarza Google w telefonie. Włącz synchronizację kalendarza konta Google w telefonie i spróbuj ponownie.', 'No owned Google calendar on this phone. Turn on calendar sync for your Google account and try again.') }}</ion-note>
        </ion-item>
      </template>
      <ion-item>
        <ion-toggle :checked="f.exportInspections" @ionChange="zmien('exportInspections', $event.detail.checked)">{{ T('Inspekcje PPM', 'PPM inspections') }}</ion-toggle>
      </ion-item>
      <ion-item>
        <ion-toggle :checked="f.shiftMarkers" @ionChange="zmien('shiftMarkers', $event.detail.checked)">{{ T('Znaczniki zmian z profilu (w wybranym kalendarzu)', 'Profile shift markers (in the selected calendar)') }}</ion-toggle>
      </ion-item>
      <ion-item>
        <ion-input fill="solid" id="calWeeks" type="number" min="1" max="52" :label="T('Zakres tygodni', 'Weeks ahead')" label-placement="stacked" :value="f.weeks" @ionInput="zmien('weeks', $event.detail.value)"></ion-input>
      </ion-item>
      <ion-item>
        <ion-select fill="solid" id="calWorkdayMode" :label="T('Dni wolne według profilu', 'Profile days off')" label-placement="stacked" interface="popover" :value="f.workdayMode" @ionChange="zmien('workdayMode', $event.detail.value)">
          <ion-select-option value="all">{{ T('Wszystkie dni', 'All days') }}</ion-select-option>
          <ion-select-option value="skip">{{ T('Pomiń dni wolne', 'Skip days off') }}</ion-select-option>
          <ion-select-option value="next">{{ T('Przenieś na następny dzień pracy', 'Move to next workday') }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item>
        <ion-select fill="solid" id="calGroups" :multiple="true" :label="T('Grupy inspekcji', 'Inspection groups')" label-placement="stacked" interface="popover" :value="f.groups" @ionChange="zmien('groups', $event.detail.value)">
          <ion-select-option value="fire">{{ T('Pożarowe', 'Fire') }}</ion-select-option>
          <ion-select-option value="water">{{ T('Woda', 'Water') }}</ion-select-option>
          <ion-select-option value="elec">{{ T('Elektryka', 'Electrical') }}</ion-select-option>
          <ion-select-option value="mech">{{ T('Mechanika', 'Mechanical') }}</ion-select-option>
          <ion-select-option value="sub">{{ T('Podwykonawcy', 'Subcontractors') }}</ion-select-option>
        </ion-select>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Zapisz ustawienia przed synchronizacją.', 'Save settings before syncing.') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Grafik powyżej służy tylko jako źródło dni pracy.', 'The profile above supplies workdays only.') }}</ion-note>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Rodzinny kalendarz zmian pozostaje osobny.', 'Your family shift calendar is separate.') }}</ion-note>
      </ion-item>
      <ion-button id="calSync" expand="block" fill="outline" :disabled="zajety" @click="synchronizuj">{{ T('Synchronizuj teraz', 'Sync now') }}</ion-button>
      <ion-button id="calOpen" expand="block" fill="outline" :disabled="zajety" @click="otworz">{{ T('Otwórz kalendarz telefonu', 'Open phone calendar') }}</ion-button>
      <ion-button id="calDisable" expand="block" fill="outline" :disabled="zajety" @click="wylacz">{{ T('Wyłącz synchronizację', 'Disable sync') }}</ion-button>
      <ion-item v-if="syncTekst" lines="none">
        <ion-note id="calendarStatus" role="status" aria-live="polite" :color="syncBlad ? 'danger' : undefined">{{ syncTekst }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-button expand="block" @click="zapisz">{{ T('Zapisz ustawienia', 'Save settings') }}</ion-button>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { computed, reactive, ref, onMounted, onUnmounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonInput, IonSelect, IonSelectOption, IonToggle, IonButton } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const K = window.OESTCalendarUI;
const odswiez = ref(0);
// PL/EN i zmiana stanu synchronizacji (zdarzenie oest:calendar-status): dane liczone na nowo, wybrane pola zostają
const d = computed(() => (props.wersja, odswiez.value, K.dane()));
const f = reactive({ ...K.dane().pola });
const zajety = ref(false);
const grafik = ref(null), grafikWybor = ref('');
const insp = ref(null), inspWybor = ref(''), inspPotwierdzam = ref(false);
const grafikKom = ref(null), syncKom = ref(null), wynik = ref(null);
const grafikTekst = computed(() => (grafikKom.value ? grafikKom.value.tekst : '') || d.value.grafik.status);
const grafikBlad = computed(() => !!(grafikKom.value && grafikKom.value.tekst && grafikKom.value.blad));
const syncTekst = computed(() => (syncKom.value ? syncKom.value.tekst : '') || d.value.inspekcje.status);
const syncBlad = computed(() => !!(syncKom.value && syncKom.value.tekst && syncKom.value.blad));
function zmien(k, v) { if (JSON.stringify(f[k]) === JSON.stringify(v)) return; f[k] = v; S.zmiany(true); } // niezapisane zmiany: pytanie przy Wstecz (straż ekranu settings)
async function ruch(fn) { zajety.value = true; try { return await fn(); } finally { zajety.value = false; } }
async function listaGrafiku() {
  const w = await ruch(() => K.listaGrafiku());
  if (w.lista) { grafik.value = w.lista; grafikWybor.value = (w.lista.find(o => o.wybrany) || {}).id || ''; grafikKom.value = null; } else grafikKom.value = w;
}
async function grafikUzywaj() { grafikKom.value = await ruch(() => K.grafikUzywaj(grafikWybor.value)); odswiez.value++; }
async function grafikOdczytaj() { grafikKom.value = await ruch(() => K.grafikOdczytaj()); odswiez.value++; }
async function listaInspekcji() {
  const w = await ruch(() => K.listaInspekcji());
  if (w.lista) { insp.value = w.lista; inspWybor.value = (w.lista.find(o => o.wybrany) || {}).id || ''; inspPotwierdzam.value = false; syncKom.value = null; } else syncKom.value = w;
}
async function wlacz() { syncKom.value = await ruch(() => K.wlacz(inspWybor.value, inspPotwierdzam.value)); odswiez.value++; }
async function synchronizuj() { syncKom.value = await ruch(() => K.synchronizuj()); odswiez.value++; }
async function otworz() { const w = await ruch(() => K.otworz()); if (w) syncKom.value = w; }
async function wylacz() { syncKom.value = await ruch(() => K.wylacz()); odswiez.value++; }
function zapisz() {
  const w = String(f.weeks == null ? '' : f.weeks).trim();
  wynik.value = S.zapiszPola({ 'calendar.exportInspections': !!f.exportInspections, 'calendar.shiftMarkers': !!f.shiftMarkers, 'calendar.weeks': w === '' ? null : Number(w), 'calendar.workdayMode': f.workdayMode, 'calendar.groups': [...f.groups] });
  Object.assign(f, K.dane().pola); odswiez.value++;
}
function stan() { grafikKom.value = null; syncKom.value = null; odswiez.value++; }
onMounted(() => { S.zmiany(false); window.addEventListener('oest:calendar-status', stan); });
onUnmounted(() => { window.removeEventListener('oest:calendar-status', stan); });
</script>
