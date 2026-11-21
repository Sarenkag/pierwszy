<!-- Ustawienia (ekran wzorcowy Ionic + Vue). Dane i reguły: OESTSettingsUI.hubDane() (app/www/settings-ui.js) – tu tylko komponenty Ionic. -->
<template>
  <div class="ion-padding">
    <ion-card>
      <ion-item lines="none">
        <ion-avatar slot="start">
          <img v-if="d.photo" :src="d.photo" alt="">
          <span v-else class="oest-inicjaly">{{ d.initials }}</span>
        </ion-avatar>
        <ion-label>
          <p>OEST · {{ T('Twój warsztat', 'Your workspace') }}</p>
          <h2>{{ d.name }}</h2>
          <p>{{ T('Ustaw raz. Korzystaj w każdym module.', 'Set once. Reuse across modules.') }}</p>
        </ion-label>
      </ion-item>
    </ion-card>
    <template v-for="g in d.groups" :key="g.name">
      <ion-list-header>{{ g.name }}</ion-list-header>
      <ion-grid class="oest-rowne">
        <ion-row>
          <ion-col size="6" v-for="it in g.items" :key="it.id">
            <ion-card button :data-nav="it.trasa">
              <ion-card-header>
                <ion-icon :src="it.ikona" color="primary" size="large" aria-hidden="true"></ion-icon>
                <ion-card-title>{{ it.title }}</ion-card-title>
                <ion-card-subtitle>{{ it.sub }}</ion-card-subtitle>
              </ion-card-header>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </template>
    <ion-note>{{ T('Ustawienia zapisują się na telefonie. Brak internetu nie blokuje edycji.', 'Settings are stored on this phone. You can edit them offline.') }}</ion-note>
  </div>
</template>

<script setup>
import { IonCard, IonItem, IonAvatar, IonLabel, IonListHeader, IonGrid, IonRow, IonCol, IonCardHeader, IonCardTitle, IonCardSubtitle, IonIcon, IonNote } from '@ionic/vue';
defineProps({ T: Function });
const d = window.OESTSettingsUI.hubDane();
</script>
