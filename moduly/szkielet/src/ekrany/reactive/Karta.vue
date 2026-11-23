<!-- Karta zlecenia Reactive (reactive/new|draft|job|complete): układ wg szkicu Grzegorza (18/11/2026) – nazwa · DATA+TYP · KTO+GDZIE · CO ·
     PRZED|PO · info na start/koniec · zakończenie i raport; Stan, części, kosztorys pod ⋮. Dane i reguły: OESTReactiveUI (app/www/reactive.js). -->
<template>
  <div>
    <ion-card v-if="d.wiecej" class="oest-rx-panel">
      <div class="oest-rx-label">{{ d.wiecej.etykieta }}</div>
      <Chipy :opcje="d.wiecej.statusy" rx="status" klucz="status"></Chipy>
      <template v-if="d.wiecej.czesci">
        <ion-item><ion-input label-placement="stacked" :label="d.wiecej.czesci.etCzesci" data-rx-field="partsNote" :maxlength="300" :value="d.wiecej.czesci.partsNote" @ionInput="e => A.pole('partsNote', e.detail.value)"></ion-input></ion-item>
        <PoleDaty :T="T" id="rxExpected" :label="d.wiecej.czesci.etData" :value="d.wiecej.czesci.expectedDate" data-rx-field="expectedDate" @zmiana="v => A.pole('expectedDate', v)"></PoleDaty>
      </template>
      <ion-item><ion-checkbox label-placement="end" justify="start" data-rx-field="quote" :checked="d.wiecej.quote.on" @ionChange="e => A.pole('quote', e.detail.checked)">{{ d.wiecej.quote.etykieta }}</ion-checkbox></ion-item>
      <div class="oest-rx-row"><ion-button fill="outline" data-rx="park" @click="A.akcja('park')">{{ d.wiecej.odloz }}</ion-button></div>
    </ion-card>

    <ion-card class="oest-rx-panel">
      <ion-item class="oest-rx-name"><ion-input label-placement="stacked" :label="d.nazwa.etykieta" data-rx-field="title" :maxlength="300" :placeholder="d.nazwa.podpowiedz" :value="d.nazwa.wartosc" @ionInput="e => A.pole('title', e.detail.value)"></ion-input></ion-item>
      <div class="oest-rx-f oest-rx-2">
        <PoleDaty :T="T" id="rxOrderDate" class="oest-rx-data" :label="d.data.etykieta" :value="d.data.wartosc" data-rx-field="orderDate" @zmiana="v => A.pole('orderDate', v)"></PoleDaty>
        <Pole id="type" :etykieta="d.typ.etykieta" :tekst="d.typ.tekst" :wybierz="d.wybierz" :otwarty="d.otwarty === 'type'"></Pole>
      </div>
      <div v-if="d.otwarty === 'type'" class="oest-rx-fx"><Chipy :opcje="d.typ.opcje" rx="type" klucz="value"></Chipy></div>
      <div class="oest-rx-f oest-rx-2">
        <Pole id="who" :etykieta="d.kto.etykieta" :tekst="d.kto.tekst" :wybierz="d.wybierz" :otwarty="d.otwarty === 'who'"></Pole>
        <Pole id="where" :etykieta="d.gdzie.etykieta" :tekst="d.gdzie.tekst" :wybierz="d.wybierz" :otwarty="d.otwarty === 'where'"></Pole>
      </div>
      <div v-if="d.otwarty === 'who'" class="oest-rx-fx">
        <template v-for="(g, gi) in d.kto.grupy" :key="gi">
          <div v-if="g.nazwa" class="oest-rx-g">{{ g.nazwa }}</div>
          <ion-item v-for="o in g.opcje" :key="o.id" button :detail="false" lines="none" class="oest-rx-opt" data-rx="who" :data-value="o.id" :data-on="o.on || undefined" @click="A.akcja('who', { value: o.id })">{{ (o.on ? '✓ ' : '') + o.nazwa }}</ion-item>
        </template>
        <ion-item button :detail="false" lines="none" class="oest-rx-opt" data-rx="people" data-dodaj @click="A.akcja('people')">{{ d.kto.dodaj }}</ion-item>
      </div>
      <div v-if="d.otwarty === 'where'" class="oest-rx-fx">
        <Chipy :opcje="d.gdzie.budynki" rx="building" klucz="value"></Chipy>
        <div v-if="d.gdzie.pietra" class="oest-rx-row">
          <ion-item><ion-select label-placement="stacked" :label="d.gdzie.etPietro" interface="popover" :placeholder="d.wybierz" data-rx-field="level" :value="d.gdzie.level" @ionChange="e => A.pole('level', e.detail.value)"><ion-select-option v-for="l in d.gdzie.pietra" :key="l" :value="l">{{ l }}</ion-select-option></ion-select></ion-item>
          <ion-item><ion-input label-placement="stacked" :label="d.gdzie.etRoom" data-rx-field="room" :maxlength="300" :value="d.gdzie.room" @ionInput="e => A.pole('room', e.detail.value)"></ion-input></ion-item>
        </div>
        <ion-item v-else><ion-input label-placement="stacked" :label="d.gdzie.etRoom" data-rx-field="room" :maxlength="300" :value="d.gdzie.room" @ionInput="e => A.pole('room', e.detail.value)"></ion-input></ion-item>
        <ion-item><ion-input label-placement="stacked" :label="d.gdzie.etFlat" data-rx-field="flat" :maxlength="300" :value="d.gdzie.flat" @ionInput="e => A.pole('flat', e.detail.value)"></ion-input></ion-item>
      </div>
      <template v-if="d.drzewo">
        <div class="oest-rx-f"><Pole id="tree" :etykieta="d.drzewo.etykieta" :tekst="d.drzewo.tekst" :podpowiedz="d.drzewo.podpowiedz" :wybierz="d.wybierz" :otwarty="d.otwarty === 'tree'"></Pole></div>
        <div v-if="d.otwarty === 'tree'" class="oest-rx-fx">
          <template v-if="d.drzewo.wybrany">
            <div class="oest-rx-label">{{ d.drzewo.wybrany.etykieta }}</div>
            <Chipy :opcje="[{ id: 'x', nazwa: d.drzewo.wybrany.tekst, on: true }]" rx="pick-reset"></Chipy>
            <ion-item><ion-textarea label-placement="stacked" :label="d.drzewo.wybrany.opisEtykieta" data-rx-field="problem" :rows="2" :maxlength="4000" :value="d.drzewo.wybrany.opis" @ionInput="e => A.pole('problem', e.detail.value)"></ion-textarea></ion-item>
          </template>
          <template v-else>
            <div class="oest-rx-label">{{ d.drzewo.etykieta }}</div>
            <template v-if="d.drzewo.gotowce">
              <div class="oest-rx-sub">{{ d.drzewo.gotowce.tytul }}</div>
              <Chipy :opcje="d.drzewo.gotowce.opcje" rx="pick-leaf"></Chipy>
              <div class="oest-rx-sub">{{ d.drzewo.gotowce.wszystkie }}</div>
            </template>
            <Chipy v-else :opcje="[{ id: d.drzewo.gora.id, nazwa: d.drzewo.gora.nazwa, on: true }]" rx="pick-up"></Chipy>
            <Chipy :opcje="d.drzewo.dzieci.map(c => ({ id: c.id, nazwa: c.nazwa, rx: c.wezel ? 'pick-node' : 'pick-leaf' }))" rx="pick-leaf"></Chipy>
          </template>
        </div>
      </template>
      <template v-if="d.co">
        <div class="oest-rx-f"><Pole id="co" :etykieta="d.co.etykieta" :tekst="d.co.tekst" :podpowiedz="d.co.podpowiedz" :wybierz="d.wybierz" :otwarty="d.otwarty === 'co'"></Pole></div>
        <div v-if="d.otwarty === 'co'" class="oest-rx-fx">
          <ion-button v-if="d.co.pusto" data-rx="kr-open" @click="A.akcja('kr-open')">{{ d.co.pusto }}</ion-button>
          <template v-else>
            <Chipy :opcje="d.co.pozycje.map((p, i) => ({ id: String(i), nazwa: p, on: true }))" rx="kr-open"></Chipy>
            <ion-button fill="outline" data-rx="kr-open" @click="A.akcja('kr-open')">{{ d.co.zmien }}</ion-button>
            <div class="oest-rx-sub">{{ d.co.naCzym }}</div>
            <Chipy :opcje="d.co.powierzchnie" rx="kr-on" klucz="value"></Chipy>
            <template v-if="d.co.waga"><div class="oest-rx-sub">{{ d.co.waga.etykieta }}</div><Chipy :opcje="d.co.waga.opcje" rx="kr-weight" klucz="value"></Chipy></template>
            <ion-item><ion-checkbox label-placement="end" justify="start" data-rx="kr-closing" :checked="d.co.bhp.on" @ionChange="A.akcja('kr-closing')">{{ d.co.bhp.etykieta }}</ion-checkbox></ion-item>
            <div class="oest-rx-sub">{{ d.co.opis }}</div>
          </template>
        </div>
      </template>
    </ion-card>

    <ion-card class="oest-rx-panel">
      <div class="oest-rx-pics">
        <Zdjecia :T="T" :z="d.zdjecia" faza="before" :etykieta="d.zdjecia.etPrzed"></Zdjecia>
        <Zdjecia :T="T" :z="d.zdjecia" faza="after" :etykieta="d.zdjecia.etPo"></Zdjecia>
      </div>
    </ion-card>

    <ion-card class="oest-rx-panel">
      <template v-for="x in d.info" :key="x.id">
        <div class="oest-rx-f oest-rx-info"><Pole :id="x.id" :etykieta="x.etykieta" :tekst="x.pusty ? '' : x.tekst" :podpowiedz="x.tekst" :wybierz="d.wybierz" :otwarty="x.otwarte" :licznik="x.licznik"></Pole></div>
        <div v-if="x.otwarte" class="oest-rx-fx">
          <div class="oest-rx-sub">{{ x.glosTekst }}</div>
          <Notatki :key="x.id + d.jezyk" :T="T" :opcje="A.notatki(x.id)"></Notatki>
          <ion-item class="oest-rx-info-t"><ion-textarea :aria-label="x.etykieta" :data-rx-field="x.pole" :maxlength="20000" :rows="3" :placeholder="x.podpowiedz" :value="x.wartosc" @ionInput="e => A.pole(x.pole, e.detail.value)"></ion-textarea></ion-item>
          <template v-if="x.id === 'start' && d.nagrania.length">
            <p id="rxRecord" class="oest-rx-sub">{{ d.wczesniej }}</p>
            <Nagrania :T="T" :lista="d.nagrania" :edycja="true"></Nagrania>
          </template>
        </div>
      </template>
    </ion-card>

    <ion-card class="oest-rx-panel">
      <div class="oest-rx-f"><Pole id="finish" :etykieta="d.koniec.etykieta" :tekst="d.koniec.tekst" :podpowiedz="d.koniec.podpowiedz" :wybierz="d.wybierz" :otwarty="d.otwarty === 'finish'"></Pole></div>
      <div v-if="d.otwarty === 'finish'" class="oest-rx-fx">
        <Chipy :opcje="d.koniec.akcje" rx="action"></Chipy>
        <ion-item><ion-textarea label-placement="stacked" :label="d.koniec.etRaport" data-rx-field="reportText" :rows="6" :maxlength="30000" :value="d.koniec.raport" @ionInput="e => A.pole('reportText', e.detail.value)"></ion-textarea></ion-item>
        <div class="oest-rx-row">
          <ion-button fill="outline" data-rx="sum-view" @click="A.akcja('sum-view')">{{ d.koniec.podglad }}</ion-button>
          <ion-button v-if="d.koniec.przywroc" fill="outline" data-rx="report-reset" @click="A.akcja('report-reset')">{{ d.koniec.przywroc }}</ion-button>
        </div>
      </div>
    </ion-card>
    <p v-if="d.usunSzkic" class="oest-rx-sub"><ion-button fill="outline" data-rx="drop-draft" @click="A.akcja('drop-draft')">{{ d.usunSzkic }}</ion-button></p>
  </div>
</template>

<script setup>
import { IonCard, IonItem, IonInput, IonTextarea, IonCheckbox, IonSelect, IonSelectOption, IonButton } from '@ionic/vue';
import PoleDaty from '../../czesci/PoleDaty.vue';
import Notatki from '../../czesci/Notatki.vue';
import Pole from './Pole.vue';
import Chipy from './Chipy.vue';
import Zdjecia from './Zdjecia.vue';
import Nagrania from './Nagrania.vue';
defineProps({ T: Function, d: Object });
const A = window.OESTReactiveUI;
</script>
