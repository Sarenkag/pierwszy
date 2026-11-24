<!-- Zastany układ strony inspekcji, bez zmiany klas i kolejności. -->
<template>
    <div class="top"><button class="back" type="button" data-go="form" aria-label="Wróć do edycji" data-en-aria-label="Back to editing">‹</button>
      <div class="t"><h1><span data-en="Preview">Podgląd</span><span class="dot">.</span></h1><div class="sub" id="prevSub"></div></div></div>
    <div class="wrapscroll"><div class="paper" id="paper"></div></div>
    <div class="panel">
      <div class="label" data-en="Files">Pliki</div>
      <div class="fname" id="fname">—</div>
      <button class="go" id="prevQueue" type="button" data-en="To queue">Do kolejki</button>
      <button class="btn wide" type="button" id="editBtn" data-en="Back to editing">Wróć do edycji</button>
    </div>
  </template>
