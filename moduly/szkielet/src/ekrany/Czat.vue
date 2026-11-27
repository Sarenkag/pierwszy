<!-- Czat z Gemmą (Grzegorz 27/11/2026): rozmowa z modelem na telefonie jako inżynierem – pytania techniczne i handover.
     Logika i rozmowa: OESTModel.czat()/rozmowa()/nowaRozmowa() (moduly/model); schowek i „Udostępnij”: OESTNarzedzia – tu tylko komponenty Ionic.
     Głosem: mikrofon klawiatury telefonu (np. Gboard) wpisuje mowę do pola. -->
<template>
  <div class="ion-padding">
    <ion-card v-if="!gotowy">
      <ion-item lines="none">
        <ion-note>{{ T('Model nie jest gotowy. Ustawienia → OCR i modele AI: plik w folderze Modele i zgoda „Zezwól”.', 'The model is not ready. Settings → OCR & AI models: file in the Modele folder and “Allow”.') }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-card v-for="(m, i) in lista" :key="i">
      <ion-item lines="none">
        <ion-label class="ion-text-wrap">
          <p>{{ m.kto === 'ja' ? T('Ty', 'You') : 'Gemma' }}</p>
          <h3 class="oest-tekst-wiersze">{{ m.tekst }}</h3>
        </ion-label>
      </ion-item>
      <ion-item v-if="m.kto !== 'ja'" lines="none">
        <ion-button fill="clear" size="small" @click="kopiuj(m.tekst)">{{ T('Kopiuj', 'Copy') }}</ion-button>
        <ion-button fill="clear" size="small" @click="udostepnij(m.tekst)">{{ T('Udostępnij', 'Share') }}</ion-button>
      </ion-item>
    </ion-card>
    <ion-item v-if="pisze" lines="none">
      <ion-note>{{ T('Gemma pisze… (pierwszy raz do ~20 s)', 'Gemma is writing… (first time up to ~20 s)') }}</ion-note>
    </ion-item>
    <ion-item v-if="komunikat" lines="none">
      <ion-note>{{ komunikat }}</ion-note>
    </ion-item>
    <ion-card>
      <ion-item lines="none">
        <ion-textarea :label="T('Wiadomość', 'Message')" label-placement="stacked" :auto-grow="true" :rows="3" :value="tekst" :disabled="pisze"
          :placeholder="T('Zapytaj albo podyktuj handover (mikrofon na klawiaturze)', 'Ask, or dictate a handover (keyboard microphone)')" @ionInput="tekst = $event.detail.value"></ion-textarea>
      </ion-item>
      <ion-button expand="block" :disabled="pisze || !String(tekst || '').trim()" @click="wyslij">{{ T('Wyślij', 'Send') }}</ion-button>
      <ion-button v-if="lista.length" expand="block" fill="outline" :disabled="pisze" @click="nowa">{{ T('Nowa rozmowa', 'New chat') }}</ion-button>
    </ion-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { IonCard, IonItem, IonLabel, IonNote, IonTextarea, IonButton } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
const M = window.OESTModel, N = window.OESTNarzedzia;
const lista = ref(M ? M.rozmowa() : []);
const tekst = ref(''), pisze = ref(false), komunikat = ref(''), gotowy = ref(true);
let zywy = true;
const blad = e => (window.OESTBledy ? window.OESTBledy.text(e) : e.message);
async function wyslij() {
  const t = String(tekst.value || '').trim(); if (!t || pisze.value) return;
  komunikat.value = ''; pisze.value = true; lista.value = lista.value.concat([{ kto: 'ja', tekst: t }]); tekst.value = '';
  try { await M.czat(t); } catch (e) { if (zywy) komunikat.value = blad(e); }
  if (!zywy) return; pisze.value = false; lista.value = M.rozmowa();
}
async function nowa() { if (!await window.OESTPytaj(props.T('Zacząć nową rozmowę? Obecna zniknie z telefonu.', 'Start a new chat? The current one will be removed from the phone.'))) return; lista.value = M.nowaRozmowa(); komunikat.value = ''; }
async function kopiuj(t) { try { await N.kopiuj(t); komunikat.value = props.T('Skopiowano.', 'Copied.'); } catch (e) { komunikat.value = blad(e); } }
async function udostepnij(t) { try { await N.udostepnij(t, 'OEST'); komunikat.value = ''; } catch (e) { komunikat.value = blad(e); } }
onMounted(() => { if (M) M.ready().then(r => { if (zywy) gotowy.value = r; }); });
onUnmounted(() => { zywy = false; });
</script>

