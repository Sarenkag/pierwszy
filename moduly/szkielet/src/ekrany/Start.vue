<!-- Start: logowanie przez Google (pierwsze uruchomienie). Dane i akcje: OESTStart (app/www/start-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding ion-text-center">
    <h1>OEST</h1>
    <p>One East Side Tower</p>
    <ion-button id="googleBtn" expand="block" :disabled="zajety" @click="google">
      <ion-icon slot="start" :icon="logoGoogle"></ion-icon>
      {{ T('Zaloguj przez Google', 'Sign in with Google') }}
    </ion-button>
    <ion-note>{{ T('Rejestracja i odzyskiwanie hasła odbywają się przez konto Google. Po pierwszym logowaniu apka otwiera się także bez internetu.', 'Registration and password recovery go through your Google account. After the first sign-in the app also opens without internet.') }}</ion-note>
    <ion-note v-if="d.blad" id="authErr" color="danger" role="alert">{{ d.blad }}</ion-note>
    <ion-button v-if="d.pomin" id="skipBtn" expand="block" fill="clear" @click="S.pomin()">{{ T('Wejdź bez logowania (do czasu ustawienia Google)', 'Enter without signing in (until Google is set up)') }}</ion-button>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { IonButton, IonIcon, IonNote } from '@ionic/vue';
import { logoGoogle } from 'ionicons/icons';
defineProps({ T: Function, wersja: Number });
const S = window.OESTStart;
const odswiez = ref(0);
const zajety = ref(false);
const d = computed(() => (odswiez.value, S.dane()));
const nasluch = () => { odswiez.value++; };
async function google() { zajety.value = true; try { await S.google(); } finally { zajety.value = false; } }
onMounted(() => window.addEventListener('oest:start-stan', nasluch));
onBeforeUnmount(() => window.removeEventListener('oest:start-stan', nasluch));
</script>
