<!-- Kolejka raportów inspekcji (ekran „Kolejka”): lista raportów z ich stanem wysyłki, „Wyślij wszystko”, „Następne urządzenie”.
     Dane i akcje: kontroler OESTKolejkaWidok (inspekcje/kolejka-widok.js) – tu tylko wyświetlanie. Nic nie udaje wysyłania: stan pochodzi z kolejki w telefonie. -->
<template>
  <ion-list>
    <ion-note id="qSub">{{ d.podtytul }}</ion-note>
    <ion-card>
      <ion-list id="qList" lines="full">
        <ion-item v-for="q in d.pozycje" :key="q.id" :data-stan="q.ton || undefined">
          <ion-label class="ion-text-wrap">
            <ion-label>{{ q.kod }}</ion-label>
            <ion-note>{{ q.nazwa }} · {{ q.rozmiar }}<template v-if="q.blad"> · {{ q.blad }}</template></ion-note>
            <ion-list v-if="q.pdf || q.potwierdz || q.usun">
              <ion-button v-if="q.pdf" size="small" fill="outline" :href="q.pdf" target="_blank" rel="noopener" data-akcja="pdf">PDF</ion-button>
              <ion-button v-if="q.potwierdz" size="small" fill="outline" :data-ok="q.id" data-akcja="potwierdz-wyslane" @click="k.akcja('potwierdz', q.id)">{{ T('Potwierdzam, wysłane', 'Confirm sent') }}</ion-button>
              <ion-button v-if="q.potwierdz" size="small" fill="outline" :data-again="q.id" data-akcja="wyslij-ponownie" @click="k.akcja('ponow', q.id)">{{ T('Wyślij ponownie', 'Send again') }}</ion-button>
              <ion-button v-if="q.usun" size="small" fill="outline" :data-del="q.id" data-akcja="usun-z-kolejki" @click="k.akcja('usun', q.id)">{{ T('Usuń', 'Delete') }}</ion-button>
            </ion-list>
          </ion-label>
          <ion-note slot="end" :data-ton="q.ton || undefined">{{ q.stan }}</ion-note>
        </ion-item>
        <ion-item v-if="!d.pozycje.length" lines="none"><ion-note>{{ d.pusto }}</ion-note></ion-item>
      </ion-list>
      <ion-button id="qSend" expand="block" :disabled="d.wyslijWylaczone" data-akcja="wyslij-wszystko" @click="k.akcja('wyslij')">{{ d.wysylka ? T('Wysyłam…', 'Sending…') : T('Wyślij wszystko', 'Send all') }}</ion-button>
      <ion-note id="qHint">{{ d.podpowiedz }}</ion-note>
    </ion-card>
    <ion-button id="qNext" expand="block" fill="outline" data-akcja="nastepne-urzadzenie" @click="k.akcja('nastepne')">{{ T('Następne urządzenie', 'Next device') }}</ion-button>
  </ion-list>
</template>

<script setup>
import { IonCard, IonList, IonItem, IonLabel, IonNote, IonButton } from '@ionic/vue';
import { onMounted, onUnmounted } from 'vue';
import { uzyjKontrolera } from './kontroler.js';
const props = defineProps({ T: Function, kontroler: Object });
const k = props.kontroler, d = uzyjKontrolera(k);
// teksty z modułu (OESTT) mają nowy język po przełączniku PL/EN, a podpowiedź zależy od sieci – dane() liczy się od nowa
const od_nowa = () => { d.value = k.dane(); };
const ZDARZENIA = ['oest:lang', 'online', 'offline'];
onMounted(() => { ZDARZENIA.forEach(z => window.addEventListener(z, od_nowa)); });
onUnmounted(() => { ZDARZENIA.forEach(z => window.removeEventListener(z, od_nowa)); });
</script>
