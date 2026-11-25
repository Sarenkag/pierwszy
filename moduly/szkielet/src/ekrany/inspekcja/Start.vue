<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template><!-- ekran wybiera skrypt – przy wejściu z listy PPM nie miga lista inspekcji (09/11/2026) -->
    <AkcjeEkranu :akcje="[]"><ion-note id="homeSub">—</ion-note></AkcjeEkranu>
    <ion-grid data-ui="notice" id="tplNotice" hidden></ion-grid>
    <ion-grid data-ui="netbar" id="netbar"><ion-text data-ui="dot2" aria-hidden="true"></ion-text><ion-text data-ui="t" id="netTxt">—</ion-text><ion-button data-ui="btn" type="button" data-go="queue" data-en="Queue">Kolejka</ion-button></ion-grid>
    <ion-grid data-ui="types tiles kf-grid" id="types"></ion-grid>
    <ion-accordion-group><ion-accordion id="settings" value="settings">
      <ion-item slot="header"><ion-label data-en="Settings">Ustawienia</ion-label></ion-item>
      <ion-grid slot="content" data-ui="set">
        <ion-grid data-ui="f" id="apiBox"><ion-label for="s-api" data-en="Google script address (…/exec)">Adres skryptu Google (…/exec)</ion-label>
          <ion-item><ion-input id="s-api" type="text" inputmode="url" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec"></ion-input></ion-item>
          <ion-label for="s-key" data-en="Key (KEY from Apps Script)">Klucz (KEY z Apps Script)</ion-label>
          <ion-item><ion-input id="s-key" type="text" spellcheck="false" autocomplete="off"></ion-input></ion-item>
          <ion-note data-ui="hint" data-en="Only needed in the version from the phone home screen (works without signal). Entered once.">Potrzebne tylko w wersji z ekranu głównego telefonu (działa bez zasięgu). Wpisuje się raz.</ion-note></ion-grid>
        <ion-grid data-ui="f" id="tplBox"><ion-text data-ui="label" data-en="Report template (Word)">Szablon raportu (Word)</ion-text>
          <ion-note data-ui="hint" id="tplName" data-en="Loading from Google Drive…">Ładuję z Google Drive…</ion-note>
          <ion-grid data-ui="row"><ion-button data-ui="btn" type="button" id="tplReload" data-en="Reload from Drive">Wczytaj ponownie z Drive</ion-button></ion-grid>
          <ion-note data-ui="hint" data-en="The template is on your Google Drive in the reports folder. Replace the file there and the app will use the new one.">Szablon leży na Twoim Google Drive w folderze z raportami. Podmień tam plik, a apka weźmie nowy.</ion-note></ion-grid>
        <ion-grid data-ui="f"><ion-label for="s-email" data-en="Email the report goes to">E-mail, na który idzie raport</ion-label>
          <ion-item><ion-input id="s-email" type="email" autocomplete="email"></ion-input></ion-item></ion-grid>
        <ion-grid data-ui="f"><ion-label for="s-folder" data-en="Google Drive folder">Folder na Google Drive</ion-label>
          <ion-item><ion-input id="s-folder" type="text"></ion-input></ion-item></ion-grid>
        <ion-grid data-ui="f"><ion-label for="s-pattern" data-en="File name pattern">Wzór nazwy plików</ion-label>
          <ion-item><ion-input id="s-pattern" type="text" spellcheck="false"></ion-input></ion-item>
          <ion-note data-ui="hint"><ion-text data-en="Available:">Dostępne:</ion-text> <ion-text>{urzadzenie} {kod} {lokalizacja} {DD} {MM} {RRRR}</ion-text>. <ion-text data-en="{kod} is the code in lower case.">{kod} to kod małymi literami.</ion-text></ion-note></ion-grid>
        <ion-grid data-ui="f"><ion-label for="s-site">Site</ion-label>
          <ion-item><ion-input id="s-site" type="text"></ion-input></ion-item></ion-grid>
        <ion-grid data-ui="f"><ion-label for="s-insp" data-en="Default signature (Engineer / Signed)">Domyślny podpis (Engineer / Signed)</ion-label>
          <ion-item><ion-input id="s-insp" type="text"></ion-input></ion-item></ion-grid>
        <ion-item data-ui="toggle"><ion-checkbox  id="s-scope"> <ion-text data-en="Add scope: “visual inspection only”">Dopisz zakres: „visual inspection only”</ion-text></ion-checkbox></ion-item>
        <ion-item data-ui="toggle"><ion-checkbox  id="s-dphotos"> <ion-text data-en="Also save separate photo files to Drive (slower)">Zapisuj też osobne pliki zdjęć na Drive (wolniej)</ion-text></ion-checkbox></ion-item>
        <ion-item data-ui="toggle"><ion-checkbox  id="s-auto"> <ion-text data-en="Send the queue automatically when online">Wysyłaj kolejkę sama, gdy jest sieć</ion-text></ion-checkbox></ion-item>
        <ion-item data-ui="toggle"><ion-checkbox  id="s-wifi"> <ion-text data-en="Wait for Wi‑Fi to send (the bar at the bottom lets you send now)">Czekaj z wysyłką na Wi‑Fi (pasek na dole pozwala wysłać od razu)</ion-text></ion-checkbox></ion-item>
        <ion-grid data-ui="tags"><ion-text data-en="Template tags:">Znaczniki w szablonie:</ion-text> {data} {inspektor} {urzadzenie} {lokalizacja} {tytul} {stan_ogolny} {quote}<ion-text> · </ion-text>{#punkty} / {.} / {/punkty} — <ion-text data-en="list of points">lista punktów</ion-text><ion-text> · </ion-text>{#komentarz} / Comments: {komentarz} / {/komentarz} — <ion-text data-en="comment">komentarz</ion-text><ion-text> · </ion-text>{#zakres} / {zakres} / {/zakres} — <ion-text data-en="scope">zakres</ion-text><ion-text> · </ion-text>{%zdjecia} — <ion-text data-en="each photo on a new page">każde zdjęcie na nowej stronie</ion-text></ion-grid>
        <ion-note data-ui="toast" id="setToast"></ion-note>
      </ion-grid>
    </ion-accordion></ion-accordion-group>
  </template>

<script setup>
import { IonCard } from '@ionic/vue';
import AkcjeEkranu from '../../czesci/AkcjeEkranu.vue';
import { IonGrid, IonButton, IonTitle, IonText, IonAccordionGroup, IonAccordion, IonItem, IonLabel, IonInput, IonNote, IonCheckbox } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';
</script>
