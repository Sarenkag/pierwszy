<!-- Konto: zalogowane konto, rozłączenie usług Google, wylogowanie, aktualizacja apki. Dane: OESTSettingsUI.kontoDane()/kontoRozlacz()/kontoWyloguj() (app/www/settings-ui.js) i OESTUpdate.dane()/check()/install() (app/www/update.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-item lines="none">
        <ion-label>
          <h2><strong>{{ d.email }}</strong></h2>
        </ion-label>
      </ion-item>
      <ion-item lines="none">
        <ion-note>{{ T('Połączenia Google są osobne od logowania. Zapisany podpis i kontakty pozostają na telefonie; używaj blokady ekranu systemu.', 'Google service connections are separate from sign-in. Signature and contacts remain on this phone; use the system screen lock.') }}</ion-note>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="rozlacz">{{ T('Rozłącz sesje usług Google', 'Disconnect Google service sessions') }}</ion-button>
      <ion-button expand="block" fill="outline" @click="S.kontoWyloguj()">{{ T('Wyloguj z aplikacji', 'Sign out') }}</ion-button>
    </ion-card>
    <ion-note>{{ T('Biometria / PIN aplikacji nie są jeszcze podłączone. Nie pokazujemy pozornej ochrony.', 'App biometrics / PIN are not integrated yet. No simulated protection.') }}</ion-note>
    <ion-card v-if="U">
      <ion-list-header>{{ T('Aktualizacja aplikacji', 'App update') }}</ion-list-header>
      <ion-item lines="none">
        <ion-note>{{ T('Wersja w telefonie: ', 'Version on the phone: ') }}<strong>{{ u.wersja }}</strong></ion-note>
      </ion-item>
      <ion-button expand="block" fill="outline" @click="U.check(true)">{{ T('Sprawdź aktualizację', 'Check for update') }}</ion-button>
      <ion-button v-if="u.nowa" expand="block" fill="outline" @click="U.install()">{{ T('Pobierz i zainstaluj wersję ', 'Download and install version ') + u.nowa }}</ion-button>
      <ion-item v-if="u.status" lines="none">
        <ion-note role="status" aria-live="polite">{{ u.status }}</ion-note>
      </ion-item>
    </ion-card>
    <ion-note v-if="wynik" role="status" aria-live="polite" :color="wynik.blad ? 'danger' : 'success'">{{ wynik.tekst }}</ion-note>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { IonCard, IonListHeader, IonItem, IonLabel, IonNote, IonButton } from '@ionic/vue';
const props = defineProps({ T: Function, wersja: Number });
const S = window.OESTSettingsUI;
const U = window.OESTUpdate;
const odswiez = ref(0);
const d = computed(() => (props.wersja, S.kontoDane()));
// stan aktualizacji zmienia się w tle (sprawdzanie, postęp pobierania) – moduł ogłasza to zdarzeniem „oest:update-stan”
const u = computed(() => (props.wersja, odswiez.value, U ? U.dane() : {}));
const wynik = ref(null);
function rozlacz() { wynik.value = S.kontoRozlacz(); }
function stan() { odswiez.value++; }
onMounted(() => { window.addEventListener('oest:update-stan', stan); });
onUnmounted(() => { window.removeEventListener('oest:update-stan', stan); });
</script>
