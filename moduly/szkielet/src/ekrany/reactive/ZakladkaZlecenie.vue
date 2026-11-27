<!-- Zakładka 1 „Zlecenie” (Grzegorz 26/11/2026): nazwa · Data | Typ · Kto | Gdzie · Co · „Załóż w Vantify”. Po założeniu wszystko szare (zablokowane).
     Pola i reguły jak na dawnej karcie: OESTReactiveUI (app/www/reactive.js); priorytet i Job Group – w okienku zakładania. -->
<template>
  <ion-card>
    <Zablokowane :z="d.zablokowane"></Zablokowane>
    <ion-item><ion-input :label="d.nazwa.etykieta" label-placement="stacked" :disabled="zab" data-rx-field="title" :maxlength="300" :placeholder="d.nazwa.podpowiedz" :helper-text="d.nazwa.en" :value="d.nazwa.wartosc" @ionInput="e => A.pole('title', e.detail.value)"></ion-input><ion-button v-if="!zab" slot="end" fill="clear" data-rx-mik="title" :aria-label="T('Podyktuj nazwę', 'Dictate the name')" :ref="el => el && A.mikNazwy(el.$el)"><ion-icon slot="icon-only" :icon="mic" aria-hidden="true"></ion-icon></ion-button></ion-item>
    <ion-grid class="ion-no-padding"><ion-row>
      <ion-col size="6"><PoleDaty :T="T" id="rxOrderDate" :disabled="zab" :value="d.data.wartosc" data-rx-field="orderDate" @zmiana="v => A.pole('orderDate', v)"><ion-label position="stacked">{{ d.data.etykieta }}</ion-label></PoleDaty></ion-col>
      <ion-col size="6"><ion-item><ion-select :label="d.typ.etykieta" label-placement="stacked" interface="popover" :disabled="zab" :placeholder="d.wybierz" data-rx-field="jobType" :value="d.typ.wartosc" @ionChange="e => A.akcja('type', { value: e.detail.value })"><ion-select-option v-for="o in d.typ.opcje" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option></ion-select></ion-item></ion-col>
    </ion-row><ion-row>
      <ion-col size="6"><ion-item><ion-select :label="d.kto.etykieta" label-placement="stacked" interface="popover" :disabled="zab" :placeholder="d.wybierz" data-rx-field="requestedBy" :value="d.kto.wartosc" @ionChange="e => e.detail.value === '__people' ? A.akcja('people') : A.akcja('who', { value: e.detail.value })"><ion-select-option v-for="o in d.kto.grupy.flatMap(g => g.opcje)" :key="o.id" :value="o.id">{{ o.nazwa }}</ion-select-option><ion-select-option value="__people">{{ d.kto.dodaj }}</ion-select-option></ion-select></ion-item></ion-col>
      <ion-col size="6"><Pole pod id="where" :disabled="zab" :etykieta="d.gdzie.etykieta" :tekst="d.gdzie.tekst" :wybierz="d.wybierz" :otwarty="d.otwarty === 'where'"></Pole></ion-col>
    </ion-row></ion-grid>
    <div v-if="d.otwarty === 'where' && !zab">
      <Chipy :opcje="d.gdzie.budynki" rx="building" klucz="value"></Chipy>
      <div v-if="d.gdzie.pietra">
        <ion-item><ion-select label-placement="stacked" :label="d.gdzie.etPietro" interface="popover" :placeholder="d.wybierz" data-rx-field="level" :value="d.gdzie.level" @ionChange="e => A.pole('level', e.detail.value)"><ion-select-option v-for="l in d.gdzie.pietra" :key="l" :value="l">{{ l }}</ion-select-option></ion-select></ion-item>
        <ion-item><ion-input label-placement="stacked" :label="d.gdzie.etRoom" data-rx-field="room" :maxlength="300" :value="d.gdzie.room" @ionInput="e => A.pole('room', e.detail.value)"></ion-input></ion-item>
      </div>
      <ion-item v-else><ion-input label-placement="stacked" :label="d.gdzie.etRoom" data-rx-field="room" :maxlength="300" :value="d.gdzie.room" @ionInput="e => A.pole('room', e.detail.value)"></ion-input></ion-item>
      <ion-item><ion-input label-placement="stacked" :label="d.gdzie.etFlat" data-rx-field="flat" :maxlength="300" :value="d.gdzie.flat" @ionInput="e => A.pole('flat', e.detail.value)"></ion-input></ion-item>
    </div>
    <template v-if="d.drzewo">
      <ion-item><ion-select :label="d.drzewo.etykieta" interface="popover" :disabled="zab" :placeholder="d.wybierz" :selected-text="d.drzewo.tekst || d.wybierz" @ionChange="e => wybierzProblem(e.detail.value)"><ion-select-option v-for="c in d.drzewo.dzieci || []" :key="c.id" :value="c.id">{{ c.nazwa }}</ion-select-option><ion-select-option v-if="d.drzewo.gora" value="__up">{{ d.drzewo.gora.nazwa }}</ion-select-option><ion-select-option v-for="c in d.drzewo.gotowce?.opcje || []" :key="c.id" :value="c.id">{{ c.nazwa }}</ion-select-option><ion-select-option v-if="d.drzewo.wybrany" value="__reset">{{ T('Zmień', 'Change') }}</ion-select-option></ion-select></ion-item>
      <ion-item v-if="d.drzewo.wybrany"><ion-textarea label-placement="stacked" :label="d.drzewo.wybrany.opisEtykieta" :disabled="zab" data-rx-field="problem" :rows="2" :maxlength="4000" :value="d.drzewo.wybrany.opis" @ionInput="e => A.pole('problem', e.detail.value)"></ion-textarea></ion-item>
    </template>
    <template v-if="d.co">
      <!-- „Co” (Grzegorz 27/11/2026: zamiast małego okienka w rogu – okno na większość ekranu): kafelki grup kreatora na całym ekranie, jak w PROD-039 -->
      <ion-item button :disabled="zab" data-rx-field="co" data-rx="kr-groups" @click="A.akcja('kr-groups')"><ion-label position="stacked">{{ d.co.etykieta }}</ion-label><ion-text>{{ d.co.tekst || d.wybierz }}</ion-text></ion-item>
      <div v-if="!d.co.pusto && !zab">
        <div>{{ d.co.naCzym }}</div>
        <Chipy :opcje="d.co.powierzchnie" rx="kr-on" klucz="value"></Chipy>
        <template v-if="d.co.waga"><div>{{ d.co.waga.etykieta }}</div><Chipy :opcje="d.co.waga.opcje" rx="kr-weight" klucz="value"></Chipy></template>
        <ion-item><ion-checkbox label-placement="end" justify="start" data-akcja="kr-closing" :checked="d.co.bhp.on" @ionChange="A.akcja('kr-closing')">{{ d.co.bhp.etykieta }}</ion-checkbox></ion-item>
        <div>{{ d.co.opis }}</div>
      </div>
    </template>
    <!-- bot na tym zleceniu (Grzegorz 27/11/2026): wyłączony = bot nie zamyka; czynny także po założeniu (pozostałe pola szare) -->
    <ion-item v-if="d.bot"><ion-toggle justify="space-between" data-akcja="vantify-bot" :checked="d.bot.on" :disabled="d.bot.off" @ionChange="e => A.akcja('vt-bot', { value: e.detail.checked })">{{ d.bot.etykieta }}</ion-toggle></ion-item>
    <!-- zlecenie z grupy „Z Vantify” (Grzegorz 27/11/2026): zostaje na liście, ale na końcu grupy, w szarej ramce -->
    <ion-item v-if="d.pomin"><ion-toggle justify="space-between" data-akcja="vantify-pomin" :checked="d.pomin.on" @ionChange="e => A.akcja('vt-pomin', { value: e.detail.checked })">{{ d.pomin.etykieta }}</ion-toggle></ion-item>
    <ion-item v-if="d.zaloz" lines="none"><ion-button expand="block" :fill="d.zaloz.ton === 'go' ? 'solid' : 'outline'" :color="d.zaloz.ton === 'done' ? 'success' : undefined" data-akcja="vantify-zaloz" @click="A.akcja(d.zaloz.rx)">{{ d.zaloz.tekst }}</ion-button></ion-item>
  </ion-card>
</template>

<script setup>
import { computed } from 'vue';
import { IonCard, IonItem, IonLabel, IonText, IonIcon, IonInput, IonTextarea, IonCheckbox, IonToggle, IonSelect, IonSelectOption, IonButton, IonGrid, IonRow, IonCol } from '@ionic/vue';
import { mic } from 'ionicons/icons';
import PoleDaty from '../../czesci/PoleDaty.vue';
import Zablokowane from '../../czesci/Zablokowane.vue';
import Pole from './Pole.vue';
import Chipy from './Chipy.vue';
const props = defineProps({ T: Function, d: Object });
const A = window.OESTReactiveUI;
const zab = computed(() => !!props.d.zablokowane);
function wybierzProblem(id) { if (id === '__up') return A.akcja('pick-up', { id: props.d.drzewo.gora.id }); if (id === '__reset') return A.akcja('pick-reset'); const c = [...(props.d.drzewo.dzieci || []), ...(props.d.drzewo.gotowce?.opcje || [])].find(c => c.id === id); if (c) A.akcja(c.wezel ? 'pick-node' : 'pick-leaf', { id }); }
</script>
