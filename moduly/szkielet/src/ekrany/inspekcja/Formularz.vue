<!-- Tylko widok. Identyfikatory, klasy i kolejność zachowują kontrakt istniejących i-*.js i form-ui.css. -->
<template>
    <div class="top"><button class="back" type="button" data-go="list" aria-label="Wstecz" data-en-aria-label="Back"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
      <div class="t"><h1 id="formTitle">—</h1><div class="sub" id="formSub"></div></div><button type="button" class="kebab" aria-label="Menu"><svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></button>
      <div class="kmenu" hidden><div class="kupd"><div class="ppmbar" hidden></div></div>
        <button type="button" data-k="def" data-en="Restore defaults (all OK)">Przywróć domyślne (wszystko OK)</button>
        <button type="button" data-k="more" data-en="Overall / Quote">Ocena ogólna / wycena</button>
        <button type="button" data-k="prev" data-en="Report preview">Podgląd raportu</button>
        <button type="button" data-k="clear" class="kclear" data-en="Clear inspection">Wyczyść inspekcję</button>
      </div></div>


    <div class="ihead"><div class="ileft">
      <label class="icb"><input type="checkbox" id="nameOn" checked><span id="nameTx">{{ T('Imię', 'Name') }}</span></label>
      <label class="icb"><input type="checkbox" id="dateOn" checked><span data-en="Date">Data</span><PoleDaty zastany id="dzien" /></label>
      <label class="icb" id="updBox" hidden><input type="checkbox" id="updOn"><span>Updated</span></label>
    </div><div class="iright"><select id="ppmStage" class="ppmpill" aria-label="Etap inspekcji" hidden></select><div id="iEnds"></div><div id="iCntBox" title="OK / pytania"><b id="iCnt"></b> OK</div><span id="recPill" hidden></span></div></div>
    <div class="panel iphotos">
      <div class="photo-head"><div class="label"><span data-en="Photos">Zdjęcia</span> <span id="photoCount"></span></div><span id="photoSize"></span></div>
      <div class="photo-btns">
        
        <label class="pbtn"><input id="galIn" type="file" accept="image/*" multiple aria-label="Dodaj z galerii" data-en-aria-label="Add from gallery">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg><span data-en="From gallery">Z galerii</span></label>
        <label class="pbtn"><input id="camIn" type="file" accept="image/*" capture="environment" aria-label="Zrób zdjęcie" data-en-aria-label="Take photo">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="4"/></svg><span data-en="Take photo">Zrób zdjęcie</span></label>
        <label class="pbtn"><input id="shCamIn" type="file" accept="image/*" capture="environment" aria-label="Zrób zdjęcie formularza" data-en-aria-label="Take a photo of the form">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 10l1.5 1.5 2.5-3M8.5 16l1.5 1.5 2.5-3M14.5 10h1.5M14.5 16h1.5"/></svg><span data-en="Form" data-pl="Formularz">{{ T('Formularz', 'Form') }}</span><span class="fbadge"></span></label>
        <button type="button" class="pbtn" data-form-note><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/></svg><span data-en="Note">Notatka</span></button>
      </div>
      <div class="photos" id="photos"></div>
      <div id="sugBox" hidden></div>
      <p class="hint" id="photoInfo" data-en="Photos are reduced straight after adding. Each goes on a separate page of the report.">Zdjęcia są zmniejszane od razu po dodaniu. Każde idzie na osobną stronę raportu.</p>
    </div>

    <div class="panel isheet" data-m="one" id="sheetBox">
      <div class="label"><span data-en="Form photo">Zdjęcie formularza</span> <span id="sheetState"></span></div>
      <div class="photo-btns">
        
        <label class="pbtn"><input id="shGalIn" type="file" accept="image/*" multiple aria-label="Dodaj zdjęcie formularza z galerii" data-en-aria-label="Add a form photo from the gallery">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/></svg><span data-en="From gallery">Z galerii</span></label>
      </div>
      <div class="photos" id="sheetPhotos"></div>
      <p class="hint" id="sheetInfo"></p>
    </div>


    <div class="panel" data-m="sum" id="sumBox"></div>

    <div class="panel" data-m="one item">
      <div class="label" data-en="Faults — one tap">Usterki — jedno dotknięcie</div>
      <div class="faults" id="faults"></div>
      <p class="hint" data-en="Each fault adds a ready English sentence and sets “Requires attention”.">Każda usterka dopisuje gotowe zdanie po angielsku i ustawia „Requires attention”.</p>
    </div>

    <div class="panel" data-m="one" id="tempBox" hidden>
      <div class="label" data-en="Temperatures (°C)">Temperatury (°C)</div>
      <div id="tempList"></div>
      <p class="hint" data-en="Enter only the readings — other fields of the form stay empty. Nothing is pre-filled or copied from the previous inspection.">Wpisz tylko pomiary — pozostałe rubryki wzoru zostają puste. Nic nie jest wpisane z góry ani przepisane z poprzedniej inspekcji.</p>
    </div>

    <div class="panel" data-m="one" id="flushBox" hidden>
      <div class="label" id="flWeekL" data-en="Week of the month (as on the form)">Tydzień miesiąca (jak na formularzu)</div>
      <div class="fl-week" id="flWeek"><button type="button" data-w="1">1</button><button type="button" data-w="2">2</button><button type="button" data-w="3">3</button><button type="button" data-w="4">4</button><button type="button" data-w="5">5</button></div>
      <label class="fl-on" hidden><input type="checkbox" id="flOn"> <span id="flOnL" data-en="Electronic form">Formularz elektroniczny</span></label>
      <div class="fl-list off" id="flList"></div>
      <p class="hint" id="flHint" data-en="“Our report” in ⚙ next to Send off: only photos of the filled paper forms go to the report. On: the filled Word form goes, photos of the forms are an extra.">Wyłączony: do raportu idą tylko zdjęcia wypełnionych kartek. Włączony: idzie wypełniony formularz Word, zdjęcia kartek są dodatkiem.</p>
      <input id="flCam" type="file" accept="image/*" capture="environment" hidden>
    </div>

    <div class="panel isec" data-m="one item">
      <div class="label" id="ckTitle" data-en="Checklist">Checklista</div>
      <div class="legend" id="legend"><span><b class="o">✓</b> OK</span><span><b class="x">✗</b> <i data-en="not OK" style="font-style:normal">nie OK</i></span><span><b>–</b> <i data-en="skip (not in the report)" style="font-style:normal">pomiń (nie trafi do raportu)</i></span></div>
      <div class="ck" id="ck"></div>
      <div class="row"><button class="btn" type="button" id="allOk" data-en="All marked → OK">Wszystkie zaznaczone → OK</button></div>
    </div>

    <div class="panel gone" data-m="one sum">
      <div class="grid">
        <div class="f"><label for="dzien" data-en="Date done">Data wykonania</label></div>
        <div class="f"><label for="podpis" data-en="Signature">Podpis</label><input id="podpis" type="text"></div>
      </div>
      <div class="datesug" id="dateSug" hidden></div>
    </div>

    <div class="panel fold" data-m="one sum">
      <div class="f"><span id="l-ov">Overall Condition</span>
        <div class="chips" role="radiogroup" aria-labelledby="l-ov">
          <label class="chip ok"><input type="radio" name="ov" id="ov-1" value="Satisfactory" checked><span>Satisfactory</span></label>
          <label class="chip uw"><input type="radio" name="ov" id="ov-2" value="Requires attention"><span>Requires attention</span></label>
          <label class="chip us"><input type="radio" name="ov" id="ov-3" value="Unsatisfactory"><span>Unsatisfactory</span></label>
        </div></div>
      <div class="f"><span id="l-q">Quote Required</span>
        <div class="chips" role="radiogroup" aria-labelledby="l-q">
          <label class="chip nn"><input type="radio" name="quote" id="q-0" value="" checked><span data-en="blank">puste</span></label>
          <label class="chip ok"><input type="radio" name="quote" id="q-1" value="No"><span>No</span></label>
          <label class="chip us"><input type="radio" name="quote" id="q-2" value="Yes"><span>Yes</span></label>
        </div></div>
    </div>

    <div class="panel fold" data-m="one sum">
      <div class="f"><label for="komentarz" data-en="Comment (goes to the report in English)">Komentarz (trafi do raportu po angielsku)</label>
        <textarea id="komentarz" placeholder="Wpisz albo podyktuj po polsku — mikrofon na klawiaturze telefonu" data-en-placeholder="Type or dictate — microphone on the phone keyboard"></textarea></div>
      <div class="row nt-btns"><button class="btn nt-rec" type="button" id="ntRec" data-en="🎤 Record note">🎤 Nagraj notatkę</button><button class="btn" type="button" id="ntOpen"><span data-en="📝 Notes">📝 Notatki</span> <span class="nt-n" id="ntN">0</span></button></div>
      <button class="btn wide" type="button" id="ntJoin" hidden data-en="✨ Combine notes into comment">✨ Połącz notatki w komentarz</button>
      <div class="row"><button class="btn" type="button" id="translate" hidden data-en="Translate to English">Przetłumacz na angielski</button><button class="btn" type="button" id="undoTr" hidden data-en="Undo translation">Cofnij tłumaczenie</button><button class="btn" type="button" id="mdRun" hidden data-en="✨ Write in English">✨ Ułóż po angielsku</button></div>
      <p class="hint" id="trHint"></p>
      <div id="mdBox" hidden><div class="f"><label for="mdOut" data-en="Model suggestion — check and correct">Propozycja modelu — sprawdź i popraw</label><textarea id="mdOut"></textarea></div><p class="hint" id="mdWarn"></p>
        <div class="row"><button class="btn" type="button" id="mdUse" data-en="✓ Insert into comment">✓ Wstaw do komentarza</button><button class="btn" type="button" id="mdDrop" data-en="Discard">Odrzuć</button></div></div>
    </div>

    <div class="sendrow" data-m="one sum"><button class="go" type="button" id="toQueue" data-en="Send">Wyślij</button><button class="go" type="button" id="recUpdate" hidden>Update</button><button class="btn sendcfg" type="button" id="sendCfg" data-m="one" aria-label="Ustawienia wysyłki" data-en-aria-label="Sending settings"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></button></div>
    <p class="hint" id="sendHint" data-m="one"></p>
    <button class="btn wide" type="button" id="vtBtn" data-akcja="vantify" hidden></button><!-- „Open Vantify” z klocka (vantify: true w ppm.js) -->
    <p class="hint" id="vtHint" hidden></p>
    <button class="btn wide" type="button" id="finishIns" data-m="one sum" data-en="✓ Finish inspection">✓ Zakończ inspekcję</button>
    <button class="go" type="button" id="restoreIns" hidden data-en="↺ Restore inspection">↺ Przywróć inspekcję</button>
    <button class="btn wide" type="button" id="toPreview" data-m="one sum" data-en="Report preview">Podgląd raportu</button>
    <button class="go" type="button" id="saveItem" data-m="item" data-en="Save">Zapisz</button>
    <p class="hint" id="formHint"></p>
</template>

<script setup>
import PoleDaty from '../../czesci/PoleDaty.vue';
defineProps({ T: Function });
</script>
