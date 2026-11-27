<!-- Reactive (reactive, reactive/new|draft|job|complete/:id, reactive/tree/:id, reactive/history): lista zadań (filtr + klocki),
     drzewko „Nowe zadanie”, zlecenie (4 zakładki, wariant B 26/11/2026), kreator „Co”, podgląd raportu (kartka jak PDF, po angielsku), historia i ustawienia.
     Dane i reguły (zapis szkicu, wysyłka, Vantify, notatki): OESTReactiveUI (app/www/reactive.js) – tu tylko wspólne części i układ jak na main.
     Akcje na końcu przewijanej treści; komunikaty przez wspólny toast Ionic. -->
<template>
  <div :data-ekran="d.ekran">
    <!-- lista, historia, drzewko i grupy kreatora: klocki i kafelki bez oest-ekran (własny wygląd części, jak w Inspekcjach i na ekranie głównym) -->
    <div v-if="['lista', 'historia', 'drzewo', 'kreator'].includes(d.ekran)">
      <template v-if="d.ekran === 'lista'">
        <div class="ion-padding-horizontal ion-padding-top"><ion-button expand="block" data-rx="new" @click="A.akcja('new')">{{ d.nowe }}</ion-button></div><!-- na całą szerokość, u góry – jak na main (Grzegorz 25.11.2026) -->
        <Filtr :T="T" :opcje="d.filtry" :wybrane="d.filtr" @zmiana="id => A.akcja('filter', { id })"></Filtr>
        <div>
          <Klocek v-for="k in d.klocki" :key="k.rx + '|' + k.id" :T="T" :k="k" :data-rx="k.rx" @wybierz="x => A.akcja(x.rx, { id: x.id })" @przytrzymaj="info"></Klocek>
        </div>
        <!-- zlecenia Reactive założone w Vantify poza apką (Grzegorz 27/11/2026): osobna grupa pod własnymi; „Nie interesuje mnie” na końcu, szara ramka -->
        <template v-if="d.zVantify">
          <h2 class="ion-padding-horizontal">{{ d.zVantify.tytul }}</h2>
          <Klocek v-for="k in d.zVantify.klocki" :key="k.rx + '|' + k.id" :T="T" :k="k" :data-rx="k.rx" @wybierz="x => A.akcja(x.rx, { id: x.id })" @przytrzymaj="info"></Klocek>
        </template>
      </template>

      <template v-else-if="d.ekran === 'historia'">
        <div>
          <Klocek v-for="k in d.klocki" :key="k.id" :T="T" :k="k" :data-rx="k.rx" @wybierz="x => A.akcja(x.rx, { id: x.id })" @przytrzymaj="info"></Klocek>
        </div>
        <p v-if="!d.klocki.length">{{ d.pusto }}</p>
      </template>

      <template v-else-if="d.ekran === 'drzewo'">
        <template v-if="d.gotowce">
          <h2>{{ d.gotowce.tytul }}</h2>
          <Kafelki :lista="kafle(d.gotowce.kafelki)" @wybierz="kafel"></Kafelki>
          <h2>{{ d.gotowce.wszystkie }}</h2>
        </template>
        <p>{{ d.sciezka }}</p>
        <Kafelki :lista="kafle(d.kafelki)" @wybierz="kafel"></Kafelki>
      </template>

      <ion-card v-else-if="d.ekran === 'kreator'">
        <div>{{ d.podpis }}</div>
        <Kafelki :lista="kafle(d.kafelki)" @wybierz="kafel"></Kafelki>
      </ion-card>
    </div>

    <div v-else>
      <ion-card v-if="d.ekran === 'kreator-grupa'">
        <ion-item v-for="e in d.pozycje" :key="e.id"><ion-checkbox label-placement="end" justify="start" data-rx="kr-item" :data-id="e.id" :checked="e.on" @ionChange="A.akcja('kr-item', { id: e.id })">{{ e.nazwa }}</ion-checkbox></ion-item>
        <ion-item button :detail="false" lines="none" data-rx="kr-add" data-dodaj @click="dodaj">{{ d.dodaj }}</ion-item>
      </ion-card>

      <template v-else-if="d.ekran === 'podglad'">
        <p v-if="d.podpowiedz">{{ d.podpowiedz }}</p>
        <ion-button v-if="d.pdf" expand="block" :data-rx="d.pdf.rx" @click="A.akcja(d.pdf.rx)">{{ d.pdf.tekst }}</ion-button>
        <p>{{ d.plik }}</p>
      </template>

      <!-- zlecenie, wariant B (Grzegorz 26/11/2026): zakładki i klocek zlecenia stoją pod paskiem, w zakładce jej pola -->
      <template v-else-if="d.ekran === 'karta'">
        <Teleport defer to="#oest-pod-paskiem">
          <ZakladkiReactive :T="T" :z="d.zakladki" @wybierz="id => A.akcja('tab', { id })"></ZakladkiReactive>
          <Klocek :T="T" :k="d.klocek" @wybierz="A.akcja('row', { id: 'more' })"></Klocek>
        </Teleport>
        <Wiecej v-if="d.wiecej" :T="T" :w="d.wiecej"></Wiecej>
        <ZakladkaZlecenie v-if="d.zakladki.aktywna === 'zlecenie'" :T="T" :d="d"></ZakladkaZlecenie>
        <ZakladkaZdjecia v-else-if="d.zakladki.aktywna === 'zdjecia'" :T="T" :d="d"></ZakladkaZdjecia>
        <ZakladkaNotatki v-else-if="d.zakladki.aktywna === 'notatki'" :T="T" :d="d"></ZakladkaNotatki>
        <ZakladkaZamkniecie v-else :T="T" :d="d"></ZakladkaZamkniecie>
      </template>

      <template v-else-if="d.ekran === 'zamkniete'">
        <p>{{ d.podpis }}</p>
        <ion-card><p>{{ d.tekst }}</p></ion-card>
        <ion-card>
          <Zdjecia :T="T" :z="d.zdjecia" faza="before" :etykieta="d.zdjecia.etPrzed"></Zdjecia>
          <Zdjecia :T="T" :z="d.zdjecia" faza="after" :etykieta="d.zdjecia.etPo"></Zdjecia>
          <Nagrania :T="T" :lista="d.nagrania" :edycja="false"></Nagrania>
          <ion-button v-if="d.notatki.start" fill="outline" data-rx="notes-closed" data-id="start" @click="A.akcja('notes-closed', { id: 'start' })">{{ d.notatki.etStart }}&nbsp;<span>{{ d.notatki.start }}</span></ion-button>
          <ion-button v-if="d.notatki.end" fill="outline" data-rx="notes-closed" data-id="end" @click="A.akcja('notes-closed', { id: 'end' })">{{ d.notatki.etEnd }}&nbsp;<span>{{ d.notatki.end }}</span></ion-button>
        </ion-card>
      </template>

      <ion-card v-else-if="d.ekran === 'blad'"><p>{{ d.tekst }}</p></ion-card>
    </div>

    <div>
      <template v-if="d.ekran === 'zamkniete'">
        <!-- zadanie zakończone w apce, a zlecenie w Vantify nadal otwarte: przyciski Vantify zostają (przegląd Codex #146) -->
        <template v-if="d.vantify"><ion-button v-for="b in [d.vantify.open, d.vantify.close]" :key="b.rx + b.tekst" expand="block" :fill="b.ton === 'go' ? 'solid' : 'outline'" :color="b.ton === 'done' ? 'success' : undefined" data-akcja="vantify" @click="A.akcja(b.rx)">{{ b.tekst }}</ion-button></template>
        <ion-button data-rx="send" @click="A.akcja('send')">{{ d.wyslij }}</ion-button>
        <ion-button fill="outline" data-rx="home" @click="A.akcja('home')">{{ d.powrot }}</ion-button>
      </template>
      <div v-else-if="d.ekran === 'kreator'"><ion-button data-rx="kr-done" @click="A.akcja('kr-done')">{{ d.gotowe }}</ion-button></div>
      <div v-else-if="d.ekran === 'kreator-grupa'">
        <ion-button fill="outline" data-rx="kr-groups" @click="A.akcja('kr-groups')">{{ d.grupy }}</ion-button>
        <ion-button data-rx="kr-done" @click="A.akcja('kr-done')">{{ d.gotowe }}</ion-button>
      </div>
      <div v-else-if="d.ekran === 'podglad'">
        <template v-for="b in d.przyciski" :key="b.rx">
          <Akcja v-if="b.rx === 'send-now'" :T="T" :fn="A.wyslijTeraz" :busy="T('Wysyłam', 'Sending')" data-rx="send-now" @blad="() => {}">{{ b.tekst }}</Akcja>
          <ion-button v-else :fill="b.go ? 'solid' : 'outline'" :data-rx="b.rx" @click="A.akcja(b.rx)">{{ b.tekst }}</ion-button>
        </template>
      </div>
      <ion-button v-else-if="d.powrot && d.ekran !== 'karta'" data-rx="home" @click="A.akcja('home')">{{ d.powrot }}</ion-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { IonButton, IonCard, IonItem, IonCheckbox, IonTextarea } from '@ionic/vue';
import Filtr from '../czesci/Filtr.vue';
import Klocek from '../czesci/Klocek.vue';
import Kafelki from '../czesci/Kafelki.vue';
import Akcja from '../czesci/Akcja.vue';
import InfoInspekcji from '../czesci/InfoInspekcji.vue';
import ZakladkiReactive from '../czesci/ZakladkiReactive.vue';
import Wiecej from './reactive/Wiecej.vue';
import ZakladkaZlecenie from './reactive/ZakladkaZlecenie.vue';
import ZakladkaZdjecia from './reactive/ZakladkaZdjecia.vue';
import ZakladkaNotatki from './reactive/ZakladkaNotatki.vue';
import ZakladkaZamkniecie from './reactive/ZakladkaZamkniecie.vue';
import Zdjecia from './reactive/Zdjecia.vue';
import Nagrania from './reactive/Nagrania.vue';
import DodajPozycje from './reactive/DodajPozycje.vue';
import { KLUCZ } from './reactive/ikony.js';
const props = defineProps({ T: Function, wersja: Number });
const A = window.OESTReactiveUI;
const n = ref(0), odswiez = () => { n.value++; };
const d = computed(() => (props.wersja, n.value, A.dane()));
const kafle = l => l.map(x => ({ id: x.id, ikona: KLUCZ, tytul: x.tytul, rx: x.rx }));
function kafel(it) { A.akcja(it.rx, { id: it.id }); }
// przytrzymanie klocka: to samo okno informacji co w Inspekcjach (czesci/InfoInspekcji.vue)
function info(k) { const x = A.info(k); if (x) window.OESTOkna.okno({ tytul: window.OESTT('Informacje', 'Details'), komponent: InfoInspekcji, wlasciwosci: { nazwa: x.tytul, wiersze: x.wiersze }, bezPrzyciskow: true }); }
async function dodaj() {
  const r = await window.OESTOkna.okno({ tytul: props.T('＋ Dodaj', '＋ Add'), komponent: DodajPozycje, ok: props.T('Dodaj', 'Add'), anuluj: props.T('Wróć', 'Back'), wyglad: 'DodajPozycje' }).catch(() => null);
  if (r && r.ok && r.dane) A.akcja('kr-add', r.dane);
}
// przyciski ekranu (rząd na górze treści, nie header): ⋮ na karcie (stan, części, kosztorys). Zębatki „Ustawienia Reactive” nie ma (Grzegorz 25.11.2026: nic nie robiła).
// tytuł w górnym pasku ramy = nazwa bieżącego widoku Reactive
function naglowek() { window.OESTRama.ustaw({ tytul: d.value.tytul || '' }); }
watch(() => [props.wersja, d.value.tytul], naglowek);
onMounted(() => { window.addEventListener('oest:reactive-ui', odswiez); naglowek(); A.wejdz(window.OESTEkrany.trasa ? window.OESTEkrany.trasa() : location.hash.slice(1)); });
onUnmounted(() => { window.removeEventListener('oest:reactive-ui', odswiez); });
</script>
