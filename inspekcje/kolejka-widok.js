"use strict";
// kolejka-widok.js – dane i akcje ekranu „Kolejka” (raporty czekające na wysyłkę) dla części Vue
// moduly/szkielet/src/czesci/KolejkaInsp.vue. Część tylko pokazuje dane(); wszystko, co ekran liczy i robi (stan wysyłki, usuwanie,
// potwierdzanie, „Wyślij wszystko”), zostaje w stronie (i-kolejka.js: queue, pending, sendQueue, markSent) – bez zmian zachowania.
// Ładować po i-kolejka.js. Interfejs kontrolera (moduly/szkielet/src/czesci/kontroler.js): dane(), na(fn), akcja(nazwa, id).
(function () {
  var sluchacze = [], blad = ""; // blad: błąd zapisu kolejki w telefonie (pokazany zamiast podpowiedzi do następnej wysyłki)
  // stan pozycji: tekst do pokazania i ton (ok / err / "")
  function stan(q) {
    if (q.status === "sent") return { tekst: window.OESTT("✓ wysłane", "✓ sent") + " " + NZ.godzina(new Date(q.sentAt)), ton: "ok" };
    if (q.status === "sending") return { tekst: window.OESTT("wysyłam…", "sending…"), ton: "" };
    if (q.status === "err") return { tekst: window.OESTT("błąd", "error"), ton: "err" };
    if (q.status === "shared") return { tekst: window.OESTT("przekazano · niepotwierdzone", "handed over · not confirmed"), ton: "" };
    return { tekst: window.OESTT("czeka", "waiting"), ton: "" };
  }
  function podpowiedz() {
    if (gm()) return window.OESTT("Idzie prosto z Twojego Gmaila na ", "Goes straight from your Gmail to ") + (myEmail() || window.OESTT("adres z Ustawień", "the address in Settings")) + window.OESTT(". Stan wysyłki widać na pasku na dole.", ". Sending status shows on the bar at the bottom.");
    if (shareApi()) return window.OESTT("Appka nie jest zalogowana do Google, więc Wyślij otwiera wybór apki. Żeby raporty szły same: Ustawienia → Konto → Wyloguj i zaloguj przez Google.", "The app is not signed in to Google, so Send opens the app chooser. To send reports automatically: Settings → Account → Sign out and sign in with Google.");
    if (!cfg.email) return window.OESTT("Ustaw e-mail w Ustawieniach.", "Set the email in Settings.");
    if (!online()) return window.OESTT("Bez sieci — wyślę, gdy wróci zasięg (apka musi być otwarta).", "No network — I will send when the signal returns (the app must be open).");
    return window.OESTT("Idzie z Twojego Gmaila na ", "Goes from your Gmail to ") + cfg.email + window.OESTT(" i do folderu „", " and to the folder “") + cfg.folder + window.OESTT("” na Drive.", "” on Drive.");
  }
  function dane() {
    var n = pending().length, nu = unconfirmed().length, zajeta = qBusy();
    var lista = queue.slice().sort(function (a, b) { return b.created - a.created; });
    return {
      podtytul: n ? window.OESTT("Do wysłania: ", "To send: ") + n + (nu ? window.OESTT(" · do potwierdzenia: ", " · to confirm: ") + nu : "") : nu ? window.OESTT("Do potwierdzenia: ", "To confirm: ") + nu : window.OESTT("Wszystko wysłane", "All sent"),
      pozycje: lista.map(function (q) {
        var s = stan(q);
        return { id: q.id, kod: q.code, nazwa: q.name, rozmiar: NZ.kb(q.docx.length + q.pdf.length), blad: q.err || "", pdf: q.pdfUrl || "",
          stan: s.tekst, ton: s.ton, potwierdz: q.status === "shared" && !zajeta, usun: q.status !== "sent" && !zajeta };
      }),
      pusto: window.OESTT("Pusto. Raporty dodane „Do kolejki” czekają tu na wysłanie.", "Empty. Reports added “To queue” wait here to be sent."),
      wysylka: zajeta, wyslijWylaczone: zajeta || !n,
      podpowiedz: blad || podpowiedz()
    };
  }
  function powiadom() { var x = dane(); sluchacze.slice().forEach(function (f) { try { f(x); } catch (e) { console.error(e); } }); }
  function akcja(nazwa, id) {
    if (nazwa === "wyslij") { blad = ""; sendQueue(true); return; }
    if (nazwa === "nastepne") { show("list"); return; }
    if (qBusy()) return;
    if (nazwa === "potwierdz" || nazwa === "ponow") {
      var sit = queue.filter(function (q) { return q.id === id && q.status === "shared"; })[0];
      if (!sit) return;
      if (nazwa === "potwierdz") markSent(sit, null); else { sit.status = "wait"; sit.err = ""; } // ponownie = znów w kolejce, wychodzi przez „Wyślij”
      return qPut(sit).then(refresh);
    }
    if (nazwa !== "usun") return;
    return ask(window.OESTT("Usunąć ten raport z kolejki? Nie zostanie wysłany.", "Remove this report from the queue? It will not be sent.")).then(function (tak) {
      if (!tak) return;
      // w czasie pytania mogła ruszyć wysyłka w tle (sieć wróciła, minutnik): wtedy nie usuwamy raportu, który już wychodzi
      if (qBusy()) { say(window.OESTT("Wysyłka właśnie ruszyła — spróbuj usunąć raport, gdy się skończy.", "Sending has just started — try removing the report when it finishes.")); return; }
      var gone = queue.filter(function (q) { return q.id === id; })[0];
      return qDel(id).then(function () {
        queue = queue.filter(function (q) { return q.id !== id; }); refresh();
        // usunięty niewysłany raport: klocek PPM wraca z „W kolejce” (okres znów otwarty)
        if (gone && gone.ppm && gone.status !== "sent" && PPM && PPM.unqueue) PPM.unqueue(gone.ppm, gone.id);
      });
    });
  }
  window.OESTKolejkaWidok = {
    dane: dane, powiadom: powiadom, akcja: akcja, blad: function (t) { blad = t; },
    na: function (fn) { sluchacze.push(fn); return function () { sluchacze = sluchacze.filter(function (f) { return f !== fn; }); }; },
    // część Vue w polu #queueBox ekranu (stary ekran strony do czasu przeniesienia ramy)
    montuj: function (el) { return window.OESTCzesci ? OESTCzesci.montuj(el, "KolejkaInsp", { kontroler: window.OESTKolejkaWidok }) : null; }
  };
})();
