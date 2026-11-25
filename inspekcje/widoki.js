"use strict";
// widoki.js – adaptery widoków Vue strony inspekcji (dane z i-*.js → część Vue).
// Plik modułowy obok strony (R27): nazwane funkcje nie liczą się do limitu <script> strony.
// Ładować po i-rdzen.js (korzysta z cur/temps/KIND/LIMIT/tempBad/faultsOn/RD/states/...) i przed konsumentami (i-ekrany.js).
  var polaWidoki = {};
  function pokazPola(id, rodzaj, dane) {
    var widok = polaWidoki[id];
    if (!widok) {
      var sluchacze = OESTCzesci.sluchacze(dane);
      polaWidoki[id] = sluchacze;
      OESTCzesci.montuj($(id), "inspekcja/pola", { rodzaj: rodzaj, kontroler: { dane: dane, na: sluchacze.na } });
    } else widok.emit();
  }
  function tempsDane() {
    return { wiersze: !cur.type || !cur.type.temp ? [] : cur.type.slots.map(function (s, i) {
      return { i: i, blad: tempBad(s[1], temps[i]), nazwa: s[0], opis: KIND[s[1]] + " · " + LIMIT[s[1]], wartosc: temps[i], etykieta: s[0] + ", " + KIND[s[1]] };
    }) };
  }
  // Widok Vue dostaje tylko gotowe wiersze. Reguły odpowiedzi, raportu i zapisu zostają w i-checklista.js.
  var widokChecks = null, checksSluchacze = [];
  function checksDane() {
    var pytania = !!cur.type.ask, cks = cur.type.checks;
    var idx = cks.map(function (c, i) { return i; });
    if (pytania) idx.sort(function (a, b) { return (states[b] === "sus") - (states[a] === "sus"); });
    var last = pytania && histOf(cur.code);
    return { pytania: pytania, wiersze: idx.map(function (i) {
      var c = cks[i], st = states[i];
      var was = !!(last && (last.q.indexOf(c.key) >= 0 || (c.reasons || []).some(function (r) { return last.r.indexOf(r.id) >= 0; })));
      var rs = pytania && c.reasons && c.reasons.length && (st !== "ok" || was) ? c.reasons : [];
      return {
        i: i, stan: st, tekst: pytania ? window.OESTT(c.q, c.qen || c.q) : c.room ? c.cp : st === "fail" ? (override[i] || c.fail) : c.ok,
        poprzednio: pytania && was, data: was ? last.d : "", sugestia: pytania ? susN[i] : null,
        etykieta: pytania ? window.OESTT(c.q, c.qen || c.q) : "Punkt " + (i + 1),
        przyciski: pytania ? [
          { stan: "ok", klasa: "ok", tekst: "TAK" }, { stan: "fail", klasa: "fail", tekst: "NIE" }
        ] : [
          { stan: "ok", klasa: "ok", tekst: "✓", etykieta: "OK" },
          { stan: "fail", klasa: "fail", tekst: "✗", etykieta: window.OESTT("Nie OK", "Not OK") },
          { stan: "na", klasa: "na", tekst: "–", etykieta: window.OESTT("Pomiń", "Skip") }
        ],
        powody: rs.map(function (r) { return { id: r.id, tekst: window.OESTT(r.pl, r.en ? r.en.charAt(0).toUpperCase() + r.en.slice(1) : r.pl), poprzednio: !!(last && last.r.indexOf(r.id) >= 0), wybrany: (rsel[i] || []).indexOf(r.id) >= 0 }; }),
        pokoj: !pytania && c.room && (!i || cks[i - 1].room !== c.room) ? { nazwa: c.roomName, miejsce: c.roomLoc } : null,
        uwaga: !pytania && c.room && (i === cks.length - 1 || cks[i + 1].room !== c.room) && roomFails(c.room).length ? {
          id: c.room, tekst: roomNotes[c.room] || "", podpowiedz: window.OESTT("Co jest nie tak? (trafi do raportu)", "What is wrong? (goes to the report)"), etykieta: window.OESTT("Uwagi: ", "Remarks: ") + c.roomName
        } : null
      };
    }) };
  }
  function faultsDane() {
    return { wiersze: RD.usterkiDla(cur.type).map(function (f) {
      return { id: f.id, wybrany: !!faultsOn[f.id], tekst: window.OESTT(f.pl, f.enl) };
    }) };
  }
