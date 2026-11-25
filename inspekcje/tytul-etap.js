"use strict";
// tytul-etap.js – strona inspekcji: tytuł w górnym pasku ramy i etap inspekcji w klocku StatusInspekcji.
// Plik obok strony (R27: logika poza <script> strony). Korzysta ze wspólnych nazw całej strony (i-rdzen.js, i-ekrany.js, i-szkic.js,
// i-formularz.js, i-kolejka.js, i-zapis-zdjec.js, i-start.js) dopiero w chwili wywołania. Ładować przed i-ekrany.js (rejestruje tytul na „oest:lang”).

// tytuł widocznego ekranu w górnym pasku ramy (Grzegorz 25.11.2026: ten sam pasek co w całej apce, tytuł = nazwa ekranu / inspekcji)
function tytul() {
  var t = { home: window.OESTT("Inspekcje", "Inspections"), list: cur.type ? cur.type.name : "", form: tytulFormularza, preview: window.OESTT("Podgląd", "Preview"), queue: window.OESTT("Kolejka", "Queue") }[widok];
  OESTRama.ustaw({ tytul: t || "" });
}

// etap w nagłówku inspekcji: wybór w klocku StatusInspekcji (czesci/StatusInspekcji.vue, przez Fragment „etap”, i-start.js)
function zmienEtap(wybor) {
  var tt = cur.ppm; if (!tt || wybor === "queued" || wybor === "sent") return;
  var was = PPM.stage(tt), closed = was && (was.s === "done" || was.s === "queued" || was.s === "sent");
  if (wybor === "done") { if (!closed) $("finishIns").click(); return; } // „Zakończona” z listy = to samo co ✓ Zakończ inspekcję (Gotowa, zielony klocek); ustawia tylko Grzegorz
  // cofnięcie „Gotowa” (Grzegorz 04/11: Zakończ → Nie rozpoczęta → inspekcja zniknęła): termin wraca na ten sprzed Zakończ,
  // a szkic traci znacznik Gotowa, żeby nic go nie wyczyściło. Odpowiedzi i zdjęcia zostają zawsze.
  if (closed && wybor === "prog") { unready(tt); return; }
  if (closed && wybor !== "done") {
    if (was.period) PPM.setDue(tt, was.period);
    var dk = draftKey(); kvGet(dk).then(function (d) { if (d && d.fin) { delete d.fin; delete d.finPeriod; return kvSet(dk, d); } }).catch(function () {});
  }
  if (!wybor) { PPM.setStage(tt, null); if (PPM.setUnstarted) PPM.setUnstarted(tt, ppmCounts()); } else PPM.setStage(tt, { s: wybor, manual: true, day: NZ.dzienIso(new Date()) });
  renderPpmBar(); updateFormHint(); $("formHint").textContent = finHint();
}
