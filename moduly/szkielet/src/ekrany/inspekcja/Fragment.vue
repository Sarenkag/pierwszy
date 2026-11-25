<!-- Fragmenty zastanej strony: te same elementy, klasy i delegowane zdarzenia. -->
<template>
  <template v-if="d.rodzaj === 'zdjecia'">
    <MiniaturaInspekcji v-for="p in d.lista" :key="p.i" :alt="p.alt" :src="p.url"><ion-text data-ui="n">{{ p.i + 1 }}</ion-text><ion-button type="button" :aria-label="p.usun" @click="kontroler.akcja('usun', p.i)">×</ion-button>
      <template v-for="sg in p.sugestie" :key="sg.n"><ion-text v-if="sg.x != null" data-ui="mk">{{ sg.n }}</ion-text></template>
      <ion-button v-if="d.edycja" type="button" data-ui="ed" :aria-label="p.edytuj" @click="kontroler.akcja('edytuj', p.i)">✏️</ion-button>
    </MiniaturaInspekcji>
  </template>
  <template v-else-if="d.rodzaj === 'sugestie'">
    <ion-grid v-for="sg in d.lista" :key="sg.n" data-ui="sug"><ion-grid><ion-text data-ui="n">{{ sg.n }}</ion-text>{{ sg.tekst }}?</ion-grid><ion-grid data-ui="row"><ion-button data-ui="btn" type="button" :data-sg="sg.n" data-ok="1">{{ T('Tak', 'Yes') }}</ion-button><ion-button data-ui="btn" type="button" :data-sg="sg.n" data-ok="0">{{ T('Nie', 'No') }}</ion-button></ion-grid></ion-grid>
  </template>
  <template v-else-if="d.rodzaj === 'data'">
    <ion-text>{{ d.tekst }}</ion-text><ion-button v-for="b in d.przyciski" :key="b.dzien" data-ui="btn" type="button" :data-day="b.dzien">{{ b.tekst }}</ion-button>
  </template>
  <template v-else-if="d.rodzaj === 'flush'">
    <template v-for="r in d.lista" :key="r.i">
      <ion-grid v-if="r.grupa" data-ui="fl-grp">{{ r.grupa }}</ion-grid>
      <ion-grid><ion-grid data-ui="fl-line"><ion-grid data-ui="txt">{{ r.tekst }}</ion-grid><WyborInspekcji :data-fl="r.i" :value="r.stan"><ion-select-option v-for="o in d.opcje" :key="o[0]" :value="o[0]">{{ o[1] }}</ion-select-option></WyborInspekcji><ion-button type="button" data-ui="fl-ic" :data-flcam="r.i" :aria-label="r.aparat">📷<ion-text v-if="r.zdjecia.length">{{ r.zdjecia.length }}</ion-text></ion-button><ion-button type="button" data-ui="fl-ic" :data-flnote="r.i" :aria-label="r.notatka">📝</ion-button></ion-grid>
        <ion-item v-if="r.otwarty"><ion-input data-ui="fl-note" type="text" :data-fln="r.i" :value="r.uwaga" :placeholder="r.placeholder" :inputmode="r.odczyt ? 'decimal' : undefined"></ion-input></ion-item>
        <ion-grid v-if="r.zdjecia.length" data-ui="fl-pics"><ion-text v-for="p in r.zdjecia" :key="p.i"><ion-img alt="" :src="p.url" /><ion-button type="button" :data-fldel="p.i" :aria-label="T('Usuń zdjęcie', 'Delete photo')">×</ion-button></ion-text></ion-grid>
      </ion-grid>
    </template>
  </template>
  <template v-else-if="d.rodzaj === 'sum'">
    <ion-grid data-ui="label">{{ T('Podsumowanie (trafi do raportu)', 'Summary (goes into the report)') }}</ion-grid><ion-list data-ui="sumlist"><ion-item v-for="(p, i) in d.punkty" :key="i">{{ p }}</ion-item></ion-list><ion-note data-ui="hint">{{ T('Zdjęcia z zapisanych urządzeń dochodzą same. Możesz dodać ogólne.', 'Photos from saved devices are added automatically. You can add general ones.') }}</ion-note>
  </template>
  <template v-else-if="d.rodzaj === 'batch'">
    <ion-grid data-ui="label">Zlecenie: {{ d.nazwa }}</ion-grid><ion-grid>{{ d.opis }}</ion-grid><ion-grid v-if="d.wznow" data-ui="row"><ion-button data-ui="btn wide" type="button" id="batchResume" @click="kontroler.akcja('wznow')">{{ T('Wznów od', 'Resume from') }} {{ d.wznow }}</ion-button></ion-grid><ion-note data-ui="hint">{{ T('Każde urządzenie zapisuje się od razu w telefonie. Możesz przerwać, zamknąć apkę i wrócić jutro.', 'Each device is saved on the phone straight away. You can stop, close the app and come back tomorrow.') }}</ion-note><ion-grid data-ui="row"><ion-button data-ui="go" type="button" id="batchEnd" @click="kontroler.akcja('koniec')">{{ T('Zakończ zlecenie', 'Finish job') }}</ion-button></ion-grid><ion-grid v-if="d.zapisane" data-ui="row"><ion-button data-ui="btn" type="button" id="batchClear" @click="kontroler.akcja('wyczysc')">{{ T('Zacznij od nowa', 'Start again') }}</ion-button></ion-grid>
  </template>
  <template v-else-if="d.rodzaj === 'grupy'">
    <template v-if="d.lista.length"><ion-grid v-for="g in d.lista" :key="g.nazwa" data-ui="group"><ion-title>{{ g.nazwa }}<ion-note>{{ g.zrobione }}/{{ g.lista.length }}</ion-note></ion-title><ion-button v-for="r in g.lista" :key="r.kod" data-ui="item" type="button" :data-code="r.kod" @click="kontroler.akcja(r.kod)"><ion-grid><ion-grid data-ui="code">{{ r.kod }}</ion-grid><ion-grid data-ui="where">{{ r.miejsce }}</ion-grid><ion-grid v-if="r.ostatnio" data-ui="last">{{ r.ostatnio }}</ion-grid></ion-grid><ion-text v-if="r.badge">{{ r.badge }}</ion-text><ion-text v-else data-ui="arrow" aria-hidden="true">›</ion-text></ion-button></ion-grid></template><ion-note v-else data-ui="hint">{{ T('Brak wyników. Wpisz kod niżej, żeby otworzyć inne urządzenie.', 'No results. Type a code below to open another device.') }}</ion-note>
  </template>
  <template v-else-if="d.rodzaj === 'typy'">
    <Kafelki zastane klasa="type" :lista="d.lista" @wybierz="r => kontroler.akcja(r.id)"><template #ikona><ion-icon :src="'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2048%2048%22%20aria-hidden%3D%22true%22%3E%3Crect%20x%3D%229%22%20y%3D%225%22%20width%3D%2230%22%20height%3D%2238%22%20rx%3D%222%22%2F%3E%3Cpath%20d%3D%22M15%2013h18M15%2019h18M15%2025h18%22%2F%3E%3Cpath%20d%3D%22M26%2030l-5%207h5l-3%206%22%2F%3E%3C%2Fsvg%3E'" aria-hidden="true" /></template></Kafelki>
  </template>
  <template v-else-if="d.rodzaj === 'termin'"><PoleDaty :T="T" :id="terminId" label="Update" :value="d.data" :disabled="d.blokada" @zmiana="kontroler.akcja($event)" /><ion-text data-termin :data-alt="d.alt">{{ d.tekst }}</ion-text><ion-text>{{ d.czestosc }}</ion-text></template>
  <template v-else-if="d.rodzaj === 'etap'"><StatusInspekcji :T="T" :stan="d.stan" :opcje="d.opcje" @zmien="kontroler.akcja($event)" /></template>
  <template v-else-if="d.rodzaj === 'komunikat'"><ion-text>{{ d.tytul }}</ion-text>{{ d.tekst }}</template>
  <template v-else-if="d.rodzaj === 'znacznik'"><ion-text v-html="d.html"></ion-text></template>
</template>
<script setup>
import MiniaturaInspekcji from '../../czesci/MiniaturaInspekcji.vue';
import { useId } from 'vue';
const terminId = useId();
import { IonGrid, IonImg, IonText, IonButton, IonSelectOption, IonItem, IonInput, IonList, IonNote, IonTitle, IonIcon } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';
import PoleDaty from '../../czesci/PoleDaty.vue';
import StatusInspekcji from '../../czesci/StatusInspekcji.vue';

import { uzyjKontrolera } from '../../czesci/kontroler.js';
import Kafelki from '../../czesci/Kafelki.vue';
const props = defineProps({ kontroler: Object, T: Function });
const d = uzyjKontrolera(props.kontroler);
</script>
