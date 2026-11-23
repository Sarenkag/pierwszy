<!-- Ustawienia (ekran wzorcowy Ionic + Vue). Dane i reguły: OESTSettingsUI.hubDane() (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-item lines="none">
        <ion-avatar slot="start">
          <img v-if="d.photo" :src="d.photo" alt="">
          <span v-else class="oest-inicjaly">{{ d.initials }}</span>
        </ion-avatar>
        <ion-label class="ion-text-nowrap">
          <p>OEST · {{ T('Twój warsztat', 'Your workspace') }}</p>
          <h2>{{ d.name }}</h2>
          <p>{{ T('Ustaw raz. Korzystaj w każdym module.', 'Set once. Reuse across modules.') }}</p>
        </ion-label>
      </ion-item>
    </ion-card>
    <template v-for="(g, i) in d.groups" :key="i">
      <ion-list-header>{{ g.name }}</ion-list-header>
      <Kafelki :lista="g.kafelki"></Kafelki>
    </template>
    <ion-note>{{ T('Ustawienia zapisują się na telefonie. Brak internetu nie blokuje edycji.', 'Settings are stored on this phone. You can edit them offline.') }}</ion-note>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { IonCard, IonItem, IonAvatar, IonLabel, IonListHeader, IonNote } from '@ionic/vue';
import { personOutline, peopleOutline, calendarOutline, mailOutline, logoGoogle, imagesOutline, clipboardOutline, documentTextOutline, cloudDownloadOutline, sparklesOutline,
  syncOutline, keyOutline, informationCircleOutline } from 'ionicons/icons';
import Kafelki from '../czesci/Kafelki.vue';
// ikony kafelków: tylko Ionicons (jedno źródło ikon w apce, 23/11/2026)
const IK = { profile: personOutline, contacts: peopleOutline, calendar: calendarOutline, mail: mailOutline, drive: logoGoogle, zdjecia: imagesOutline, questions: clipboardOutline,
  reports: documentTextOutline, vantify: cloudDownloadOutline, ai: sparklesOutline, sync: syncOutline, account: keyOutline, about: informationCircleOutline };
const props = defineProps({ T: Function, wersja: Number });
// PL/EN: dane liczone na nowo, ekran się nie przerysowuje (Vue podmienia tylko teksty)
const d = computed(() => (props.wersja, (h => ({ ...h, groups: h.groups.map(g => ({ name: g.name, kafelki: g.items.map(it => ({ id: it.id, trasa: it.trasa, ikona: IK[it.id] || informationCircleOutline, tytul: it.title, podpis: it.sub })) })) }))(window.OESTSettingsUI.hubDane())));
</script>
