<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template>
    <div class="top"><button class="back" type="button" data-go="home" aria-label="Wstecz" data-en-aria-label="Back">‹</button>
      <div class="t"><h1 id="listTitle">—</h1><div class="sub" id="listSub"></div></div></div>
    <div class="ppmbar" hidden></div>
    <input class="search" id="search" type="search" placeholder="Szukaj kodu, np. LL-UG" data-en-placeholder="Search code, e.g. LL-UG" autocomplete="off" spellcheck="false">
    <div class="panel" id="batchBar" hidden></div>
    <div id="groups"></div>
    <div class="panel">
      <label class="label" for="customCode" data-en="Other device">Inne urządzenie</label>
      <div class="addrow"><input id="customCode" type="text" placeholder="np. DB-TA-L3-01" data-en-placeholder="e.g. DB-TA-L3-01" autocapitalize="characters" spellcheck="false"><select id="customLoc" aria-label="Lokalizacja" data-en-aria-label="Location" style="width:auto"><option>Tower A</option><option>Tower B</option><option>Pavilion</option></select><button class="btn" type="button" id="customGo" data-en="Add">Dodaj</button></div>
      <p class="hint" data-en="The device stays on the list permanently, with this location.">Urządzenie zostanie na liście na stałe, z tą lokalizacją.</p>
    </div>
  </template>
