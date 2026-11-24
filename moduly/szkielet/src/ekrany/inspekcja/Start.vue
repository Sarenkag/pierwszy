<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template><!-- ekran wybiera skrypt – przy wejściu z listy PPM nie miga lista inspekcji (09/11/2026) -->
    <div class="top"><a class="back" id="appMenu" href="../index.html#home" aria-label="Menu aplikacji" data-en-aria-label="App menu" hidden style="display:grid;place-items:center;text-decoration:none">‹</a><div class="t"><h1><span data-en="Inspections">Inspekcje</span><span class="dot">.</span></h1><div class="sub" id="homeSub">—</div></div></div>
    <div class="notice" id="tplNotice" hidden></div>
    <div class="netbar" id="netbar"><span class="dot2" aria-hidden="true"></span><span class="t" id="netTxt">—</span><button class="btn" type="button" data-go="queue" data-en="Queue">Kolejka</button></div>
    <div class="types tiles kf-grid" id="types"></div>
    <details class="panel" id="settings">
      <summary data-en="Settings">Ustawienia</summary>
      <div class="set">
        <div class="f" id="apiBox"><label for="s-api" data-en="Google script address (…/exec)">Adres skryptu Google (…/exec)</label>
          <input id="s-api" type="text" inputmode="url" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec">
          <label for="s-key" data-en="Key (KEY from Apps Script)">Klucz (KEY z Apps Script)</label>
          <input id="s-key" type="text" spellcheck="false" autocomplete="off">
          <p class="hint" data-en="Only needed in the version from the phone home screen (works without signal). Entered once.">Potrzebne tylko w wersji z ekranu głównego telefonu (działa bez zasięgu). Wpisuje się raz.</p></div>
        <div class="f" id="tplBox"><span class="label" data-en="Report template (Word)">Szablon raportu (Word)</span>
          <p class="hint" id="tplName" data-en="Loading from Google Drive…">Ładuję z Google Drive…</p>
          <div class="row"><button class="btn" type="button" id="tplReload" data-en="Reload from Drive">Wczytaj ponownie z Drive</button></div>
          <p class="hint" data-en="The template is on your Google Drive in the reports folder. Replace the file there and the app will use the new one.">Szablon leży na Twoim Google Drive w folderze z raportami. Podmień tam plik, a apka weźmie nowy.</p></div>
        <div class="f"><label for="s-email" data-en="Email the report goes to">E-mail, na który idzie raport</label>
          <input id="s-email" type="email" autocomplete="email"></div>
        <div class="f"><label for="s-folder" data-en="Google Drive folder">Folder na Google Drive</label>
          <input id="s-folder" type="text"></div>
        <div class="f"><label for="s-pattern" data-en="File name pattern">Wzór nazwy plików</label>
          <input id="s-pattern" type="text" spellcheck="false">
          <p class="hint"><span data-en="Available:">Dostępne:</span> <code>{urzadzenie} {kod} {lokalizacja} {DD} {MM} {RRRR}</code>. <span data-en="{kod} is the code in lower case.">{kod} to kod małymi literami.</span></p></div>
        <div class="f"><label for="s-site">Site</label>
          <input id="s-site" type="text"></div>
        <div class="f"><label for="s-insp" data-en="Default signature (Engineer / Signed)">Domyślny podpis (Engineer / Signed)</label>
          <input id="s-insp" type="text"></div>
        <label class="toggle"><input type="checkbox" id="s-scope"> <span data-en="Add scope: “visual inspection only”">Dopisz zakres: „visual inspection only”</span></label>
        <label class="toggle"><input type="checkbox" id="s-stamp"> <span data-en="Stamp date, code and location on photos">Wpisz datę, kod i lokalizację na zdjęciach</span></label>
        <label class="toggle"><input type="checkbox" id="s-dphotos"> <span data-en="Also save separate photo files to Drive (slower)">Zapisuj też osobne pliki zdjęć na Drive (wolniej)</span></label>
        <label class="toggle"><input type="checkbox" id="s-auto"> <span data-en="Send the queue automatically when online">Wysyłaj kolejkę sama, gdy jest sieć</span></label>
        <label class="toggle"><input type="checkbox" id="s-wifi"> <span data-en="Wait for Wi‑Fi to send (the bar at the bottom lets you send now)">Czekaj z wysyłką na Wi‑Fi (pasek na dole pozwala wysłać od razu)</span></label>
        <div class="tags"><span data-en="Template tags:">Znaczniki w szablonie:</span> {data} {inspektor} {urzadzenie} {lokalizacja} {tytul} {stan_ogolny} {quote}<br>{#punkty} / {.} / {/punkty} — <span data-en="list of points">lista punktów</span><br>{#komentarz} / Comments: {komentarz} / {/komentarz} — <span data-en="comment">komentarz</span><br>{#zakres} / {zakres} / {/zakres} — <span data-en="scope">zakres</span><br>{%zdjecia} — <span data-en="each photo on a new page">każde zdjęcie na nowej stronie</span></div>
        <p class="toast" id="setToast"></p>
      </div>
    </details>
  </template>
