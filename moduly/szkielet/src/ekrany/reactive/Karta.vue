<!-- Karta zlecenia Reactive (reactive/new|draft|job|complete): układ wg szkicu Grzegorza (18/11/2026) – nazwa · DATA+TYP · KTO+GDZIE · CO ·
     PRZED|PO · info na start/koniec · zakończenie i raport; Stan, części, kosztorys pod ⋮. Dane i reguły: OESTReactiveUI (app/www/reactive.js). -->
<template>
  <div>
    <ion-card v-if="d.wiecej">
      <div>{{ d.wiecej.etykieta }}</div>
      <Chipy :opcje="d.wiecej.statusy" rx="status" klucz="status"></Chipy>
      <template v-if="d.wiecej.czesci">
        <ion-item><ion-input label-placement="stacked" :label="d.wiecej.czesci.etCzesci" data-rx-field="partsNote" :maxlength="300" :value="d.wiecej.czesci.partsNote" @ionInput="e => A.pole('partsNote', e.detail.value)"></ion-input></ion-item>
        <PoleDaty :T="T" id="rxExpected" :label="d.wiecej.czesci.etData" :value="d.wiecej.czesci.expectedDate" data-rx-field="expectedDate" @zmiana="v => A.pole('expectedDate', v)"></PoleDaty>
      </template>
      <ion-item><ion-checkbox label-placement="end" justify="start" data-rx-field="quote" :checked="d.wiecej.quote.on" @ionChange="e => A.pole('quote', e.detail.checked)">{{ d.wiecej.quote.etykieta }}</ion-checkbox></ion-item>
      <div><ion-button fill="outline" data-rx="park" @click="A.akcja('park')">{{ d.wiecej.odloz }}</ion-button></div>
    </ion-card>

    <ion-card>
      <ion-item><ion-input :label="d.nazwa.etykieta" label-placement="stacked" data-rx-field="title" :maxlength="300" :placeholder="d.nazwa.podpowiedz" :value="d.nazwa.wartosc" @ionInput="e => A.pole('title', e.detail.value)"></ion-input></ion-item>
      <!-- pary jak na main (Grzegorz 25.11.2026): Data | Typ, Kto | Gdzie – etykieta nad wartością -->
      <ion-grid class="ion-no-padding"><ion-row>
        <ion-col size="6"><PoleDaty :T="T" id="rxOrderDate" :value="d.data.wartosc" data-rx-field="orderDate" @zmiana="v => A.pole('orderDate', v)"><ion-label position="stacked">{{ d.data.etykieta }}</ion-label></PoleDaty></ion-col>
        <ion-col size="6"><ion-item><ion-select :label="d.typ.etykieta" label-placement="stacked" interface="popover" :placeholder="d.wybierz" data-rx-field="jobType" :value="d.typ.wartosc" @ionChange="e => A.akcja('type', { value: e.detail.value })"><ion-select-option v-for="o in d.typ.opcje" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option></ion-select></ion-item></ion-col>
      </ion-row><ion-row>
        <ion-col size="6"><ion-item><ion-select :label="d.kto.etykieta" label-placement="stacked" interface="popover" :placeholder="d.wybierz" data-rx-field="requestedBy" :value="d.kto.wartosc" @ionChange="e => e.detail.value === '__people' ? A.akcja('people') : A.akcja('who', { value: e.detail.value })"><ion-select-option v-for="o in d.kto.grupy.flatMap(g => g.opcje)" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option><ion-select-option value="__people">{{ d.kto.dodaj }}</ion-select-option></ion-select></ion-item></ion-col>
        <ion-col size="6"><Pole pod id="where" :etykieta="d.gdzie.etykieta" :tekst="d.gdzie.tekst" :wybierz="d.wybierz" :otwarty="d.otwarty === 'where'"></Pole></ion-col>
      </ion-row></ion-grid>
      <div v-if="d.otwarty === 'where'">
        <Chipy :opcje="d.gdzie.budynki" rx="building" klucz="value"></Chipy>
        <div v-if="d.gdzie.pietra">
          <ion-item><ion-select label-placement="stacked" :label="d.gdzie.etPietro" interface="popover" :placeholder="d.wybierz" data-rx-field="level" :value="d.gdzie.level" @ionChange="e => A.pole('level', e.detail.value)"><ion-select-option v-for="l in d.gdzie.pietra" :key="l" :value="l">{{ l }}</ion-select-option></ion-select></ion-item>
          <ion-item><ion-input label-placement="stacked" :label="d.gdzie.etRoom" data-rx-field="room" :maxlength="300" :value="d.gdzie.room" @ionInput="e => A.pole('room', e.detail.value)"></ion-input></ion-item>
        </div>
        <ion-item v-else><ion-input label-placement="stacked" :label="d.gdzie.etRoom" data-rx-field="room" :maxlength="300" :value="d.gdzie.room" @ionInput="e => A.pole('room', e.detail.value)"></ion-input></ion-item>
        <ion-item><ion-input label-placement="stacked" :label="d.gdzie.etFlat" data-rx-field="flat" :maxlength="300" :value="d.gdzie.flat" @ionInput="e => A.pole('flat', e.detail.value)"></ion-input></ion-item>
      </div>
      <template v-if="d.drzewo">
        <ion-item><ion-select :label="d.drzewo.etykieta" interface="popover" :placeholder="d.wybierz" :selected-text="d.drzewo.tekst || d.wybierz" @ionChange="e => wybierzProblem(e.detail.value)"><ion-select-option v-for="c in d.drzewo.dzieci || []" :key="c.id" :value="c.id">{{ c.nazwa }}</ion-select-option><ion-select-option v-if="d.drzewo.gora" value="__up">{{ d.drzewo.gora.nazwa }}</ion-select-option><ion-select-option v-for="c in d.drzewo.gotowce?.opcje || []" :key="c.id" :value="c.id">{{ c.nazwa }}</ion-select-option><ion-select-option v-if="d.drzewo.wybrany" value="__reset">{{ T('Zmień', 'Change') }}</ion-select-option></ion-select></ion-item>
        <ion-item v-if="d.drzewo.wybrany"><ion-textarea label-placement="stacked" :label="d.drzewo.wybrany.opisEtykieta" data-rx-field="problem" :rows="2" :maxlength="4000" :value="d.drzewo.wybrany.opis" @ionInput="e => A.pole('problem', e.detail.value)"></ion-textarea></ion-item>
      </template>
      <template v-if="d.co">
        <ion-item><ion-select :label="d.co.etykieta" interface="popover" :placeholder="d.wybierz" :selected-text="d.co.tekst || d.wybierz" data-rx-field="co" @ionChange="e => A.akcja('kr-group', { id: e.detail.value })"><ion-select-option v-for="g in d.co.grupy" :key="g.id" :value="g.id">{{ g.nazwa }}</ion-select-option></ion-select></ion-item>
        <div v-if="!d.co.pusto">
          <template>
            <div>{{ d.co.naCzym }}</div>
            <Chipy :opcje="d.co.powierzchnie" rx="kr-on" klucz="value"></Chipy>
            <template v-if="d.co.waga"><div>{{ d.co.waga.etykieta }}</div><Chipy :opcje="d.co.waga.opcje" rx="kr-weight" klucz="value"></Chipy></template>
            <ion-item><ion-checkbox label-placement="end" justify="start" data-rx="kr-closing" :checked="d.co.bhp.on" @ionChange="A.akcja('kr-closing')">{{ d.co.bhp.etykieta }}</ion-checkbox></ion-item>
            <div>{{ d.co.opis }}</div>
          </template>
        </div>
      </template>
    </ion-card>

    <ion-card>
      <ion-grid><ion-row>
        <ion-col size="6"><Zdjecia :T="T" :z="d.zdjecia" faza="before" :etykieta="d.zdjecia.etPrzed"></Zdjecia></ion-col>
        <ion-col size="6"><Zdjecia :T="T" :z="d.zdjecia" faza="after" :etykieta="d.zdjecia.etPo"></Zdjecia></ion-col>
      </ion-row></ion-grid>
    </ion-card>

    <ion-card>
      <template v-for="x in d.info" :key="x.id">
        <div><Pole :id="x.id" :etykieta="x.etykieta" :tekst="x.pusty ? '' : x.tekst" :podpowiedz="x.tekst" :wybierz="d.wybierz" :otwarty="x.otwarte" :licznik="x.licznik"></Pole></div>
        <div v-if="x.otwarte" class="ion-padding-horizontal">
          <div>{{ x.glosTekst }}</div>
          <Notatki :key="x.id + d.jezyk" :T="T" :opcje="A.notatki(x.id)"></Notatki>
          <ion-item><ion-textarea :aria-label="x.etykieta" :data-rx-field="x.pole" :maxlength="20000" :rows="3" :placeholder="x.podpowiedz" :value="x.wartosc" @ionInput="e => A.pole(x.pole, e.detail.value)"></ion-textarea></ion-item>
          <template v-if="x.id === 'start' && d.nagrania.length">
            <p id="rxRecord">{{ d.wczesniej }}</p>
            <Nagrania :T="T" :lista="d.nagrania" :edycja="true"></Nagrania>
          </template>
        </div>
      </template>
    </ion-card>

    <ion-card>
      <div><Pole id="finish" :etykieta="d.koniec.etykieta" :tekst="d.koniec.tekst" :podpowiedz="d.koniec.podpowiedz" :wybierz="d.wybierz" :otwarty="d.otwarty === 'finish'"></Pole></div>
      <div v-if="d.otwarty === 'finish'">
        <Chipy :opcje="d.koniec.akcje" rx="action"></Chipy>
        <ion-item><ion-textarea label-placement="stacked" :label="d.koniec.etRaport" data-rx-field="reportText" :rows="6" :maxlength="30000" :value="d.koniec.raport" @ionInput="e => A.pole('reportText', e.detail.value)"></ion-textarea></ion-item>
        <div>
          <ion-button fill="outline" data-rx="sum-view" @click="A.akcja('sum-view')">{{ d.koniec.podglad }}</ion-button>
          <ion-button v-if="d.koniec.przywroc" fill="outline" data-rx="report-reset" @click="A.akcja('report-reset')">{{ d.koniec.przywroc }}</ion-button>
        </div>
      </div>
    </ion-card>
    <p v-if="d.usunSzkic"><ion-button fill="outline" data-rx="drop-draft" @click="A.akcja('drop-draft')">{{ d.usunSzkic }}</ion-button></p>
  </div>
</template>

<script setup>
import { IonCard, IonItem, IonLabel, IonInput, IonTextarea, IonCheckbox, IonSelect, IonSelectOption, IonButton, IonGrid, IonRow, IonCol } from '@ionic/vue';
import PoleDaty from '../../czesci/PoleDaty.vue';
import Notatki from '../../czesci/Notatki.vue';
import Pole from './Pole.vue';
import Chipy from './Chipy.vue';
import Zdjecia from './Zdjecia.vue';
import Nagrania from './Nagrania.vue';
const props = defineProps({ T: Function, d: Object });
const A = window.OESTReactiveUI;
function wybierzProblem(id) { if (id === '__up') return A.akcja('pick-up', { id: props.d.drzewo.gora.id }); if (id === '__reset') return A.akcja('pick-reset'); const c = [...(props.d.drzewo.dzieci || []), ...(props.d.drzewo.gotowce?.opcje || [])].find(c => c.id === id); if (c) A.akcja(c.wezel ? 'pick-node' : 'pick-leaf', { id }); }
</script>
