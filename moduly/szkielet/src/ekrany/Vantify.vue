<!-- Terminy PPM z Vantify. Dane i akcje: OESTVantifyImport (app/www/vantify-import.js); stan odświeża zdarzenie oest:vantify-stan. Tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding oest-ekran">
    <ion-card>
      <ion-list-header>{{ T('Terminy PPM z Vantify', 'PPM due dates from Vantify') }}</ion-list-header>
      <ion-item lines="none" class="oest-ramka">
        <ion-label id="vtNow">{{ d.teraz.api ? T('Vantify, stan na ', 'Vantify as of ') : T('Eksport z ', 'Export from ') }}{{ d.teraz.data }} · {{ d.teraz.zlecen }}{{ T(' zleceń', ' jobs') }} · {{ d.teraz.telefon ? (d.teraz.api ? T('pobrane ', 'fetched ') : T('wczytany w telefonie ', 'loaded on this phone ')) + d.teraz.wczytano : T('wbudowany w apkę', 'built into the app') }}</ion-label>
      </ion-item>
      <template v-if="d.zmiany">
        <ion-item v-if="d.zmiany.starszy" lines="none">
          <ion-note color="warning">{{ T('Uwaga: najnowsze zlecenie w pliku jest z ', 'Note: the newest job in the file is from ') }}{{ d.teraz.data }}{{ T(', a w poprzednim planie z ', ', the previous plan had ') }}{{ d.zmiany.dataObecna }}{{ T('. Plik może być starszy – pobierz z Vantify jeszcze raz.', '. The file may be older – get from Vantify again.') }}</ion-note>
        </ion-item>
        <ion-item lines="none">
          <ion-label>{{ T('Nowe zlecenia: ', 'New jobs: ') }}{{ d.zmiany.nowe.n }}</ion-label>
        </ion-item>
        <ion-item v-for="(w, i) in d.zmiany.nowe.lista.wiersze" :key="'n' + i" lines="none">
          <ion-note>{{ w }}</ion-note>
        </ion-item>
        <ion-item v-if="d.zmiany.nowe.lista.wiecej" lines="none">
          <ion-note>+{{ d.zmiany.nowe.lista.wiecej }}</ion-note>
        </ion-item>
        <ion-item lines="none">
          <ion-label>{{ T('Zamknięte w Vantify (usunięte z apki): ', 'Closed in Vantify (removed from the app): ') }}{{ d.zmiany.zamkniete.n }}</ion-label>
        </ion-item>
        <ion-item v-for="(w, i) in d.zmiany.zamkniete.lista.wiersze" :key="'z' + i" lines="none">
          <ion-note>{{ w }}</ion-note>
        </ion-item>
        <ion-item v-if="d.zmiany.zamkniete.lista.wiecej" lines="none">
          <ion-note>+{{ d.zmiany.zamkniete.lista.wiecej }}</ion-note>
        </ion-item>
        <ion-item v-if="d.zmiany.pominiete" lines="none">
          <ion-note>{{ T('Bez karty w apce (pominięte): ', 'No card in the app (skipped): ') }}{{ d.zmiany.pominiete }}</ion-note>
        </ion-item>
      </template>
      <ion-item lines="none">
        <ion-note>{{ T('„Pobierz z Vantify”: apka sama bierze listę zleceń z Vantify (lista Jobs z Twoim filtrem; logowanie w Vantify w apce trwa 24 h) i od razu zapisuje terminy. Apka sprawdza też sama przy starcie, najwyżej co 4 h. Terminy dokładnie z Vantify.', '“Get from Vantify”: the app takes the job list from Vantify itself (Jobs list with your filter; Vantify sign-in in the app lasts 24 h) and saves the due dates straight away. The app also checks on start, at most every 4 h. Due dates exactly from Vantify.') }}</ion-note>
      </ion-item>
      <ion-button id="vtPull" expand="block" :disabled="d.trwaPobierz" @click="V.pobierz()">{{ T('Pobierz z Vantify', 'Get from Vantify') }}</ion-button>
      <ion-item v-if="d.pobierz" lines="none">
        <ion-note id="vtPullMsg" role="status" aria-live="polite">{{ P(d.pobierz) }}</ion-note>
      </ion-item>
    </ion-card>

    <ion-card v-if="d.wynik">
      <ion-item lines="none">
        <ion-note id="vtResult" role="status" aria-live="polite" :color="d.wynik.ok ? 'success' : 'danger'">{{ P(d.wynik.tekst) }}</ion-note>
      </ion-item>
    </ion-card>

    <ion-card>
      <ion-list-header>{{ T('Vantify w apce', 'Vantify in the app') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Login i hasło do Vantify zapisane w telefonie (zaszyfrowane). Gdy logowanie wygaśnie (po 24 h), apka zaloguje się sama. Zmiana hasła albo loginu – wpisz nowe i zapisz.', 'Vantify sign-in saved on this phone (encrypted). When the sign-in expires (after 24 h) the app signs in by itself. Password or login changed – type the new one and save.') }}</ion-note>
      </ion-item>
      <ion-item>
        <ion-input id="vtUser" type="text" autocomplete="username" autocapitalize="off" :spellcheck="false" :label="T('Login', 'Login')" label-placement="stacked" :value="login.user" @ionInput="login.user = $event.detail.value"></ion-input>
      </ion-item>
      <ion-item>
        <ion-input id="vtPass" ref="poleHasla" :type="login.pokaz ? 'text' : 'password'" autocomplete="current-password" :placeholder="login.zapisane ? '••••••••' : ''" :label="T('Hasło', 'Password')" label-placement="stacked" :value="login.haslo" @ionInput="login.haslo = $event.detail.value"></ion-input>
      </ion-item>
      <div class="oest-rzad">
          <ion-button expand="block" id="vtLoginSave" @click="zapiszLogin">{{ T('Zapisz login i hasło', 'Save login and password') }}</ion-button>
          <ion-button expand="block" id="vtLoginShow" fill="outline" @click="pokazHaslo">{{ login.pokaz ? T('Ukryj', 'Hide') : T('Pokaż', 'Show') }}</ion-button>
          <ion-button class="oest-pelny" expand="block" id="vtLoginClear" fill="outline" @click="usunLogin">{{ T('Usuń', 'Remove') }}</ion-button>
        </div>
      <ion-item v-if="d.login" lines="none">
        <ion-note id="vtLoginMsg" role="status" aria-live="polite">{{ P(d.login) }}</ion-note>
      </ion-item>
      <div class="oest-rzad">
          <ion-button expand="block" id="vtOpen" @click="V.otworz()">{{ T('Otwórz Vantify w apce', 'Open Vantify in the app') }}</ion-button>
          <ion-button expand="block" id="vtExplore" fill="outline" :disabled="d.trwaZbadaj" @click="V.zbadaj()">{{ T('Zbadaj automatycznie', 'Explore automatically') }}</ion-button>
        </div>
      <ion-button v-if="d.zapis" id="vtShare" expand="block" fill="outline" @click="V.udostepnij()">{{ T('Udostępnij zapis „Zbadaj” (', 'Share the “Explore” log (') }}{{ d.zapis }})</ion-button>
      <ion-item v-if="d.vantify" lines="none">
        <ion-note id="vtMsg" role="status" aria-live="polite">{{ P(d.vantify) }}</ion-note>
      </ion-item>
    </ion-card>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonInput, IonButton  } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
const V = window.OESTVantifyImport;
const odswiez = ref(0);
const d = computed(() => (props.wersja, odswiez.value, V.dane()));
const P = (x) => x || ''; // komunikaty moduł oddaje gotowe, w języku z chwili zdarzenia
// wpisane, a jeszcze niezapisane pola żyją tu (zmiana PL/EN nie przerysowuje ekranu)
const login = reactive({ user: '', haslo: '', pokaz: false, zapisane: false });
const poleHasla = ref(null);
function stan(s) { if (!s) return; login.user = s.user || login.user; login.haslo = ''; login.pokaz = false; login.zapisane = s.zapisane; }
const nasluch = () => { odswiez.value++; };
function zapiszLogin() { V.loginZapisz(login.user, login.haslo).then(stan); }
function usunLogin() { V.loginUsun().then((s) => { if (s) { stan(s); login.user = ''; } }); }
// „Pokaż”: wpisane hasło odsłania się w polu; zapisane pokazuje okienko Androida (ustalenie #39)
function pokazHaslo() { if (login.pokaz) { login.pokaz = false; return; } if (login.haslo) { login.pokaz = true; return; } V.loginPokaz(); }
// odrzucone hasło: stan zapisu odczytany na nowo (komunikat przy polach), wpisane pola zostają
function odswiezStan() { V.loginOdswiez().then((s) => { if (s) { login.zapisane = s.zapisane; if (!login.user) login.user = s.user; } }); }
watch(() => d.value.fokus, () => { odswiezStan(); setTimeout(() => { const el = poleHasla.value && poleHasla.value.$el; if (el) { el.scrollIntoView({ block: 'center' }); if (el.setFocus) el.setFocus(); } }, 400); }); // po animacji przejścia ekranu

onMounted(() => { window.addEventListener('oest:vantify-stan', nasluch); V.loginOdswiez().then(stan); V.ekran(true); });
onBeforeUnmount(() => { window.removeEventListener('oest:vantify-stan', nasluch); V.ekran(false); });
</script>
