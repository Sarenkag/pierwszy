// Moduł Wzory (Grzegorz 21/11/2026): JEDNO miejsce na wszystkie wzory Word raportów. Inspekcje i Reactive biorą wzór tylko stąd;
// zmiana wyglądu raportu = podmiana pliku .docx w tym folderze (te same nawiasy {…}), przepięcie inspekcji = zmiana nazwy wzoru
// w jej opisie (app/www/ppm.js, pole „wzor”). Kopii wzoru (plik .docx, base64) nigdzie indziej nie ma – pilnuje bramka (R25, rzecz „wzor-word”).
// Interfejs: OESTWzory.lista() → [{id, plik, nazwa, pola}], OESTWzory.wczytaj() → Promise (raz, przy starcie strony),
// OESTWzory.bajty(id) → Uint8Array (kopia; po wczytaj()), OESTWzory.pola(id) → nawiasy, które apka umie wypełnić,
// OESTWzory.slownik() → wspólny słownik nawiasów {nazwa: {opis: [pl, en], stare}}.
(function (g) {
  "use strict";
  // SŁOWNIK (Grzegorz 21/11/2026): jeden zestaw nawiasów dla wszystkich wzorów – ta sama nazwa = ta sama dana w każdym wzorze.
  // Wzór może użyć dowolnych pól ze słownika. „stare: true” = nazwa sprzed słownika, do zamiany na wspólną w osobnym kroku (po zgodzie Grzegorza).
  var SLOWNIK = {
    "site": ["obiekt", "site"], "date": ["data inspekcji dd/mm/rrrr", "inspection date dd/mm/yyyy"], "job number": ["nr zlecenia Vantify", "Vantify job number"],
    "engineer": ["inżynier", "engineer"], "building": ["budynek", "building"], "level": ["piętro", "level"], "title": ["rodzaj inspekcji", "inspection type"],
    "condition": ["stan ogólny", "overall condition"], "details": ["opis i ustalenia", "details and findings"], "quote": ["wycena tak/nie", "quote yes/no"],
    "%photos": ["zdjęcia (siatka)", "photos (grid)"],
    "a": ["Plant: kolumna a", "Plant: column a"], "b": ["Plant: kolumna b", "Plant: column b"], "c": ["Plant: kolumna c", "Plant: column c"],
    "d": ["Plant: kolumna d", "Plant: column d"], ".": ["Plant: wiersz uwag", "Plant: notes row"],
    "temp": ["QHS-031: kolejny pomiar temperatury", "QHS-031: next temperature reading"],
    "data": { opis: ["QHS-031: data (stara nazwa, wspólna = date)", "QHS-031: date (old name, common = date)"], stare: true },
    "name": { opis: ["QHS-031: inżynier (stara nazwa, wspólna = engineer)", "QHS-031: engineer (old name, common = engineer)"], stare: true },
    "o": { opis: ["Flushing: nazwa kranu (kod skryptu)", "Flushing: outlet name (script code)"], stare: true },
    "bld": { opis: ["Flushing: budynek w nagłówku (kod skryptu, wspólna = building)", "Flushing: header building (script code, common = building)"], stare: true },
    "twr": { opis: ["Flushing: wieża w tytule (kod skryptu)", "Flushing: tower in title (script code)"], stare: true }
  };
  ["comms", "mechanical", "primary_switch", "secondary_switch", "spa_filtration", "spa_pump", "sprinkler"].forEach(function (k) {
    SLOWNIK[k] = ["Plant: pomieszczenie " + k, "Plant: room " + k]; SLOWNIK[k + "_notes"] = ["Plant: uwagi " + k, "Plant: notes " + k];
  });
  ["y0", "y1", "y2", "y3", "y4", "y5"].forEach(function (k, i) { SLOWNIK[k] = { opis: ["Flushing: rok " + (i + 1) + " (kod skryptu)", "Flushing: year " + (i + 1) + " (script code)"], stare: true }; });
  // basic form Weekly Flushing (Grzegorz 21/11/2026): kran nr i z listy kranów (ppm.js) i strefa nr k
  for (var i = 1; i <= 20; i++) {
    SLOWNIK["ok" + i] = ["Flushing basic: ☑ kran " + i + " przepłukany", "Flushing basic: ☑ outlet " + i + " flushed"];
    SLOWNIK["no" + i] = ["Flushing basic: ☒ kran " + i + " nie przepłukany", "Flushing basic: ☒ outlet " + i + " not flushed"];
    SLOWNIK["na" + i] = ["Flushing basic: N/A kran " + i, "Flushing basic: N/A outlet " + i];
    SLOWNIK["note" + i] = ["Flushing basic: notatka kranu " + i, "Flushing basic: outlet " + i + " note"];
  }
  for (var z = 1; z <= 6; z++) SLOWNIK["zone" + z] = ["Flushing basic: przepłukane w strefie " + z + " (np. 7/7)", "Flushing basic: flushed in zone " + z + " (e.g. 7/7)"];
  SLOWNIK.statement = ["Flushing basic: stałe zdanie pod strefami", "Flushing basic: fixed statement below zones"];
  for (var n = 1; n <= 12; n++) SLOWNIK["c" + n] = { opis: ["Flushing: kolumna " + n + " (kod skryptu)", "Flushing: column " + n + " (script code)"], stare: true };
  // basic form Flushing: ramka basic (bez condition i details) + nawiasy kranów i stref (generator app/scripts/flush-basic-wzory.py)
  function flushPola(krany, strefy) {
    var p = ["site", "date", "job number", "engineer", "building", "level", "title", "quote", "%photos", "statement"];
    for (var i = 1; i <= krany; i++) p.push("ok" + i, "no" + i, "na" + i, "note" + i);
    for (var k = 1; k <= strefy; k++) p.push("zone" + k);
    return p;
  }
  // pola = nawiasy, które apka wypełnia w danym wzorze (test app/tests/wzory.test.cjs: plik ma dokładnie te nawiasy, każdy jest w SŁOWNIKU)
  var WZORY = {
    basic: { plik: "basic.docx", nazwa: "OEST basic Engineers Report", pola: ["site", "date", "job number", "engineer", "building", "level", "title", "condition", "details", "quote", "%photos"] },
    plant: { plik: "plant.docx", nazwa: "Plant Rooms Weekly / Monthly", pola: ["site", "date", "job number", "engineer", "building", "level", "title", "condition", "quote", "%photos", "a", "b", "c", "d", ".",
      "comms", "mechanical", "primary_switch", "secondary_switch", "spa_filtration", "spa_pump", "sprinkler",
      "comms_notes", "mechanical_notes", "primary_switch_notes", "secondary_switch_notes", "spa_filtration_notes", "spa_pump_notes", "sprinkler_notes"] },
    flush: { plik: "flush.docx", nazwa: "Weekly Taps/Shower Flushing Record (TA / TB / P)", pola: ["o", "bld", "twr", "y0", "y1", "y2", "y3", "y4", "y5", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12"] },
    "flush-basic-ta": { plik: "flush-basic-ta.docx", nazwa: "Weekly Flushing Tower A – basic form", pola: flushPola(12, 3) },
    "flush-basic-tb": { plik: "flush-basic-tb.docx", nazwa: "Weekly Flushing Tower B – basic form", pola: flushPola(16, 4) },
    "flush-basic-p": { plik: "flush-basic-p.docx", nazwa: "Weekly Flushing Pavilion – basic form", pola: flushPola(2, 1) },
    // Weekly Generator Check (Grzegorz 21/11/2026): ramka basic + grupy w stylu Flushing (kartka TP-025: jeden generator, 14 punktów w 2 grupach)
    "gen-basic": { plik: "gen-basic.docx", nazwa: "Generator Checks – Weekly (TP-025) – basic form", pola: flushPola(12, 2) },
    "temp-tb": { plik: "temp-tb.docx", nazwa: "Monthly Tap Temperature Check TB (QHS-031)", pola: ["temp", "name", "data"] }
  };
  var baza = (function () { try { var s = g.document && g.document.currentScript && g.document.currentScript.src; return s ? new URL(".", s).href : ""; } catch (e) { return ""; } })();
  var pliki = {}, obietnica = null;

  function opis(id) { var w = WZORY[id]; if (!w) throw Error("REPORT_TEMPLATE_MISSING"); return w; }
  function lista() { return Object.keys(WZORY).map(function (id) { var w = WZORY[id]; return { id: id, plik: w.plik, nazwa: w.nazwa, pola: w.pola.slice() }; }); }
  function wczytaj() {
    if (!obietnica) obietnica = Promise.all(Object.keys(WZORY).map(function (id) {
      return g.fetch(baza + WZORY[id].plik).then(function (r) { if (!r.ok) throw Error("REPORT_TEMPLATE_MISSING"); return r.arrayBuffer(); })
        .then(function (b) { pliki[id] = new Uint8Array(b); });
    })).catch(function (e) { obietnica = null; throw e; });
    return obietnica;
  }
  function bajty(id) { opis(id); var b = pliki[id]; if (!b) throw Error("REPORT_TEMPLATE_MISSING"); return new Uint8Array(b); }
  // test w node: wzór podany z zewnątrz (plik z dysku), bez fetch
  function ustaw(id, b) { opis(id); pliki[id] = new Uint8Array(b); }

  function slownik() { var o = {}; Object.keys(SLOWNIK).forEach(function (k) { var v = SLOWNIK[k]; o[k] = Array.isArray(v) ? { opis: v.slice(), stare: false } : { opis: v.opis.slice(), stare: !!v.stare }; }); return o; }

  g.OESTWzory = { lista: lista, slownik: slownik, wczytaj: wczytaj, bajty: bajty, pola: function (id) { return opis(id).pola.slice(); }, ustaw: ustaw };
})(typeof window !== "undefined" ? window : globalThis);
