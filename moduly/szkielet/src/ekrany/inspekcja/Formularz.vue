<!-- Tylko widok. Identyfikatory, klasy i kolejność zachowują kontrakt istniejących i-*.js i form-ui.css. -->
<template>
    <ion-note id="formSub"></ion-note>
      <ion-grid data-ui="kmenu" hidden><ion-grid data-ui="kupd"><ion-grid data-ui="ppmbar" hidden></ion-grid></ion-grid>
        <ion-button type="button" data-k="def" data-en="Restore defaults (all OK)">Przywróć domyślne (wszystko OK)</ion-button>
        <ion-button type="button" data-k="more" data-en="Overall / Quote">Ocena ogólna / wycena</ion-button>
        <ion-button type="button" data-k="prev" data-en="Report preview">Podgląd raportu</ion-button>
        <ion-button type="button" data-k="clear" data-ui="kclear" data-en="Clear inspection">Wyczyść inspekcję</ion-button>
      </ion-grid>


    <!-- Imię i Data (Grzegorz 25.11.2026: jak na main – znaczniki na całą szerokość, data jako przycisk obok „Data”; pole daty = klocek PoleDaty) -->
    <div data-ui="ihead"><ion-grid data-ui="iright"><ion-row class="ion-align-items-center"><ion-col size="3"><ion-button data-ui="kebab" fill="clear" color="medium" :aria-label="T('Opcje inspekcji', 'Inspection options')"><ion-icon slot="icon-only" :icon="ellipsisVertical"></ion-icon></ion-button></ion-col><ion-col size="5"><div id="ppmStage" aria-label="Etap inspekcji" hidden></div><ion-text id="recPill" hidden></ion-text></ion-col><ion-col size="3" class="ion-text-end"><ion-text color="tertiary" data-termin><strong id="iEnds"></strong></ion-text> <ion-text id="iCntBox" title="OK / pytania"><ion-text id="iCnt"></ion-text> OK</ion-text></ion-col></ion-row></ion-grid>
    <ion-grid class="ion-no-padding"><ion-row class="ion-align-items-center"><ion-col>
    <ion-list lines="none" data-ui="ileft">
        <ion-item><ion-checkbox id="nameOn" justify="start" label-placement="end" :checked="true"><ion-text id="nameTx">{{ T('Imię', 'Name') }}</ion-text></ion-checkbox></ion-item>
        <PoleDaty :T="T" id="dzien"><ion-checkbox slot="start" id="dateOn" justify="start" label-placement="end" :checked="true"><ion-text data-en="Date">Data</ion-text></ion-checkbox></PoleDaty>
        <ion-item id="updBox" hidden><ion-checkbox id="updOn" justify="start" label-placement="end"><ion-text>Updated</ion-text></ion-checkbox></ion-item>
      </ion-list>
    </ion-col><ion-col size="auto"><KafelZdjecia type="button" id="sendCfg" data-m="one" aria-label="Ustawienia wysyłki" data-en-aria-label="Sending settings" :ikona="'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20aria-hidden%3D%22true%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Ccircle%20class%3D%22ionicon-fill-none%20ionicon-stroke-width%22%20cx%3D%2212%22%20cy%3D%2212%22%20r%3D%223%22%2F%3E%3Cpath%20class%3D%22ionicon-fill-none%20ionicon-stroke-width%22%20d%3D%22M19.4%2015a1.7%201.7%200%200%200%20.3%201.8l.1.1a2%202%200%201%201-2.8%202.8l-.1-.1a1.7%201.7%200%200%200-1.8-.3%201.7%201.7%200%200%200-1%201.5V21a2%202%200%201%201-4%200v-.1a1.7%201.7%200%200%200-1.1-1.5%201.7%201.7%200%200%200-1.8.3l-.1.1a2%202%200%201%201-2.8-2.8l.1-.1a1.7%201.7%200%200%200%20.3-1.8%201.7%201.7%200%200%200-1.5-1H3a2%202%200%201%201%200-4h.1a1.7%201.7%200%200%200%201.5-1.1%201.7%201.7%200%200%200-.3-1.8l-.1-.1a2%202%200%201%201%202.8-2.8l.1.1a1.7%201.7%200%200%200%201.8.3H9a1.7%201.7%200%200%200%201-1.5V3a2%202%200%201%201%204%200v.1a1.7%201.7%200%200%200%201%201.5%201.7%201.7%200%200%200%201.8-.3l.1-.1a2%202%200%201%201%202.8%202.8l-.1.1a1.7%201.7%200%200%200-.3%201.8V9a1.7%201.7%200%200%200%201.5%201H21a2%202%200%201%201%200%204h-.1a1.7%201.7%200%200%200-1.5%201z%22%2F%3E%3C%2Fsvg%3E'"></KafelZdjecia></ion-col></ion-row></ion-grid></div>
    <ion-card data-ui="panel iphotos">
      <!-- 4 kafelki jak na main, bez napisu „Zdjęcia” (Grzegorz 25.11.2026); licznik i rozmiar zdjęć zostają dla i-zdjecia.js -->
      <ion-grid data-ui="photo-head"><ion-text id="photoCount"></ion-text><ion-text id="photoSize"></ion-text></ion-grid>
      <ion-grid><ion-row>
        <ion-col size="3"><DodajZdjecie id="galIn" tryb="galeria" :T="T">{{ T('Z galerii', 'From gallery') }}</DodajZdjecie></ion-col>
        <ion-col size="3"><DodajZdjecie id="camIn" tryb="aparat" :T="T">{{ T('Zrób zdjęcie', 'Take photo') }}</DodajZdjecie></ion-col>
        <ion-col size="3"><DodajZdjecie formularz id="shCamIn" tryb="aparat" :T="T">{{ T('Formularz', 'Form') }}</DodajZdjecie></ion-col>
        <ion-col size="3"><KafelZdjecia type="button" data-form-note :ikona="'data:image/svg+xml,%3Csvg%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%221.8%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20aria-hidden%3D%22true%22%3E%3Cpath%20class%3D%22ionicon-fill-none%20ionicon-stroke-width%22%20d%3D%22M6%203h9l4%204v14H6z%22%2F%3E%3Cpath%20class%3D%22ionicon-fill-none%20ionicon-stroke-width%22%20d%3D%22M9%2011h7M9%2015h7%22%2F%3E%3C%2Fsvg%3E'"><ion-text data-en="Note">Notatka</ion-text></KafelZdjecia></ion-col>
      </ion-row></ion-grid>
      <ion-grid data-ui="photos" id="photos"></ion-grid>
      <ion-grid id="sugBox" hidden></ion-grid>
      <ion-note data-ui="hint" id="photoInfo" data-en="Photos are reduced straight after adding. Each goes on a separate page of the report.">Zdjęcia są zmniejszane od razu po dodaniu. Każde idzie na osobną stronę raportu.</ion-note>
    </ion-card>

    <ion-card data-ui="panel isheet fold" data-m="one" id="sheetBox">
      <ion-grid data-ui="label"><ion-text data-en="Form photo">Zdjęcie formularza</ion-text> <ion-text id="sheetState"></ion-text></ion-grid>
      <ion-grid data-ui="photos" id="sheetPhotos"></ion-grid>
      <ion-note data-ui="hint" id="sheetInfo"></ion-note>
    </ion-card>


    <ion-card data-ui="panel" data-m="sum" id="sumBox"></ion-card>

    <ion-card data-ui="panel" data-m="one item">
      <ion-grid data-ui="label" data-en="Faults — one tap">Usterki — jedno dotknięcie</ion-grid>
      <ion-grid data-ui="faults" id="faults"></ion-grid>
      <ion-note data-ui="hint" data-en="Each fault adds a ready English sentence and sets “Requires attention”.">Każda usterka dopisuje gotowe zdanie po angielsku i ustawia „Requires attention”.</ion-note>
    </ion-card>

    <ion-card data-ui="panel" data-m="one" id="tempBox" hidden>
      <ion-grid data-ui="label" data-en="Temperatures (°C)">Temperatury (°C)</ion-grid>
      <ion-grid id="tempList"></ion-grid>
      <ion-note data-ui="hint" data-en="Enter only the readings — other fields of the form stay empty. Nothing is pre-filled or copied from the previous inspection.">Wpisz tylko pomiary — pozostałe rubryki wzoru zostają puste. Nic nie jest wpisane z góry ani przepisane z poprzedniej inspekcji.</ion-note>
    </ion-card>

    <ion-card data-ui="panel" data-m="one" id="flushBox" hidden>
      <ion-grid data-ui="label" id="flWeekL" data-en="Week of the month (as on the form)">Tydzień miesiąca (jak na formularzu)</ion-grid>
      <WyborInspekcji id="flWeek" :label="T('Tydzień', 'Week')" :value="0"><ion-select-option :value="0">—</ion-select-option><ion-select-option v-for="w in 5" :key="w" :value="w">{{ w }}</ion-select-option></WyborInspekcji>
      <ion-item data-ui="fl-on" hidden><ion-checkbox  id="flOn"> <ion-text id="flOnL" data-en="Electronic form">Formularz elektroniczny</ion-text></ion-checkbox></ion-item>
      <ion-grid data-ui="fl-list off" id="flList"></ion-grid>
      <ion-note data-ui="hint" id="flHint" data-en="“Our report” in ⚙ next to Send off: only photos of the filled paper forms go to the report. On: the filled Word form goes, photos of the forms are an extra.">Wyłączony: do raportu idą tylko zdjęcia wypełnionych kartek. Włączony: idzie wypełniony formularz Word, zdjęcia kartek są dodatkiem.</ion-note>
      <DodajZdjecie id="flCam" tryb="aparat" :T="T" hidden />
    </ion-card>

    <ion-card data-ui="panel isec" data-m="one item">
      <ion-grid data-ui="label" id="ckTitle" data-en="Checklist">Checklista</ion-grid>
      <ion-grid data-ui="legend" id="legend"><ion-text><ion-text data-ui="o">✓</ion-text> OK</ion-text><ion-text><ion-text data-ui="x">✗</ion-text> <ion-text data-en="not OK">nie OK</ion-text></ion-text><ion-text><ion-text>–</ion-text> <ion-text data-en="skip (not in the report)">pomiń (nie trafi do raportu)</ion-text></ion-text></ion-grid>
      <ion-grid data-ui="ck" id="ck"></ion-grid>
      <ion-grid data-ui="row"><ion-button data-ui="btn" type="button" id="allOk" data-en="All marked → OK">Wszystkie zaznaczone → OK</ion-button></ion-grid>
    </ion-card>

    <ion-card data-ui="panel gone" hidden>
      <ion-grid data-ui="grid">
        <ion-grid data-ui="f"><ion-label for="dzien" data-en="Date done">Data wykonania</ion-label></ion-grid>
        <ion-grid data-ui="f"><ion-label for="podpis" data-en="Signature">Podpis</ion-label><ion-item><ion-input id="podpis" type="text"></ion-input></ion-item></ion-grid>
      </ion-grid>
      <ion-grid data-ui="datesug" id="dateSug" hidden></ion-grid>
    </ion-card>

    <ion-card data-ui="panel fold" data-m="one sum">
      <ion-grid data-ui="f"><ion-text id="l-ov">Overall Condition</ion-text>
        <WyborInspekcji id="ov" name="ov" value="Satisfactory" aria-labelledby="l-ov"><ion-select-option value="Satisfactory">Satisfactory</ion-select-option><ion-select-option value="Requires attention">Requires attention</ion-select-option><ion-select-option value="Unsatisfactory">Unsatisfactory</ion-select-option></WyborInspekcji></ion-grid>
      <ion-grid data-ui="f"><ion-text id="l-q">Quote Required</ion-text>
        <WyborInspekcji id="quote" name="quote" value="" aria-labelledby="l-q"><ion-select-option value="">{{ T("puste", "blank") }}</ion-select-option><ion-select-option value="No">No</ion-select-option><ion-select-option value="Yes">Yes</ion-select-option></WyborInspekcji></ion-grid>
    </ion-card>

    <ion-card data-ui="panel fold" data-m="one sum">
      <ion-grid data-ui="f"><ion-label for="komentarz" data-en="Comment (goes to the report in English)">Komentarz (trafi do raportu po angielsku)</ion-label>
        <ion-item><ion-textarea id="komentarz" placeholder="Wpisz albo podyktuj po polsku — mikrofon na klawiaturze telefonu" data-en-placeholder="Type or dictate — microphone on the phone keyboard"></ion-textarea></ion-item></ion-grid>
      <ion-grid data-ui="row nt-btns"><ion-button data-ui="btn nt-rec" type="button" id="ntRec" data-en="🎤 Record note">🎤 Nagraj notatkę</ion-button><ion-button data-ui="btn" type="button" id="ntOpen"><ion-text data-en="📝 Notes">📝 Notatki</ion-text> <ion-text data-ui="nt-n" id="ntN">0</ion-text></ion-button></ion-grid>
      <ion-button data-ui="btn wide" type="button" id="ntJoin" hidden data-en="✨ Combine notes into comment">✨ Połącz notatki w komentarz</ion-button>
      <ion-grid data-ui="row"><ion-button data-ui="btn" type="button" id="translate" hidden data-en="Translate to English">Przetłumacz na angielski</ion-button><ion-button data-ui="btn" type="button" id="undoTr" hidden data-en="Undo translation">Cofnij tłumaczenie</ion-button><ion-button data-ui="btn" type="button" id="mdRun" hidden data-en="✨ Write in English">✨ Ułóż po angielsku</ion-button></ion-grid>
      <ion-note data-ui="hint" id="trHint"></ion-note>
      <ion-grid id="mdBox" hidden><ion-grid data-ui="f"><ion-label for="mdOut" data-en="Model suggestion — check and correct">Propozycja modelu — sprawdź i popraw</ion-label><ion-item><ion-textarea id="mdOut"></ion-textarea></ion-item></ion-grid><ion-note data-ui="hint" id="mdWarn"></ion-note>
        <ion-grid data-ui="row"><ion-button data-ui="btn" type="button" id="mdUse" data-en="✓ Insert into comment">✓ Wstaw do komentarza</ion-button><ion-button data-ui="btn" type="button" id="mdDrop" data-en="Discard">Odrzuć</ion-button></ion-grid></ion-grid>
    </ion-card>

    <ion-grid data-ui="sendrow" data-m="one sum"><ion-button data-ui="go" type="button" id="toQueue" data-en="Send">Wyślij</ion-button><ion-button data-ui="go" type="button" id="recUpdate" hidden>Update</ion-button></ion-grid>
    <ion-note data-ui="hint" id="sendHint" data-m="one"></ion-note>
    <ion-button data-ui="btn wide" type="button" id="vtBtn" data-akcja="vantify" hidden></ion-button><!-- „Open Vantify” z klocka (vantify: true w ppm.js) -->
    <ion-note data-ui="hint" id="vtHint" hidden></ion-note>
    <ion-button data-ui="btn wide" type="button" id="finishIns" data-m="one sum" data-en="✓ Finish inspection">✓ Zakończ inspekcję</ion-button>
    <ion-button data-ui="btn wide" type="button" id="toPreview" data-m="one sum" data-en="Report preview">Podgląd raportu</ion-button>
    <ion-button data-ui="go" type="button" id="saveItem" data-m="item" data-en="Save">Zapisz</ion-button>
    <ion-note data-ui="hint" id="formHint"></ion-note>
</template>

<script setup>
import { IonCard } from '@ionic/vue';
import { ellipsisVertical } from 'ionicons/icons';
import { IonGrid, IonRow, IonCol, IonButton, IonIcon, IonTitle, IonLabel, IonList, IonItem, IonCheckbox, IonText, IonNote, IonSelectOption, IonInput, IonTextarea } from '@ionic/vue';
import WyborInspekcji from '../../czesci/WyborInspekcji.vue';
import KafelZdjecia from '../../czesci/KafelZdjecia.vue';
import DodajZdjecie from '../../czesci/DodajZdjecie.vue';

import PoleDaty from '../../czesci/PoleDaty.vue';
defineProps({ T: Function });
</script>
