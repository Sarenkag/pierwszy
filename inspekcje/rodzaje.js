// Rodzaje inspekcji (inspekcje/rodzaje.js) – dane i czyste funkcje formularzy inspekcji, bez stanu strony (karta K02, 21/11/2026).
// Przeniesione 1:1 z sekcji „rodzaje inspekcji” w inspekcje/index.html.
//
//   OESTRodzaje.lista                 → TYPES (ta sama tablica: strona dopisuje do niej urządzenia i pytania z ustawień)
//   OESTRodzaje.usterki               → FAULTS (gotowe usterki)
//   OESTRodzaje.usterkiDla(typ)       → usterki dla rodzaju
//   OESTRodzaje.pietro(kod)           → "Upper Ground" / "Lower Ground" / "Level 6" / ""
//   OESTRodzaje.wieza(kod)            → "Tower A" / "Tower B" / ""
//   OESTRodzaje.pytaniaMozliwe(typ)   → czy rodzaj ma checklistę (nie folder i nie pomiary temperatur)
(function (w) {
  "use strict";
  // key: łączy punkt checklisty z gotową usterką (FAULTS)
  var TYPES = [{
    id: "db", name: "Distribution Boards", title: "Distribution Board - Visual Inspection",
    scope: "Scope: visual inspection only – no covers removed and no electrical testing carried out.",
    devices: [], // lista z Code.gs (getSetup)
    checks: [
      { key: "enclosure", short: "Enclosure free from damage or corrosion", cp: "Enclosure undamaged", ok: "Enclosure inspected – no physical damage, distortion or corrosion.", fail: "Enclosure shows physical damage, distortion or corrosion – remedial action required.", def: "ok" },
      { key: "door", short: "Door closes fully, hinges OK", cp: "Door closes properly", ok: "Door/cover closes fully and sits secure; hinges operating correctly.", fail: "Door/cover does not close fully or hinge defective.", def: "ok" },
      { key: "lock", short: "Lock present and working", cp: "Lock working", ok: "Lock present and operating correctly.", fail: "Lock missing, damaged or not operating.", def: "ok" },
      { key: "integrity", short: "No missing blanks or open knockouts", cp: "No open knockouts", ok: "Enclosure integrity maintained – no missing blanks, open knockouts or gaps.", fail: "Enclosure integrity compromised – missing blanks, open knockouts or gaps present.", def: "na" },
      { key: "label", short: "ID label present and legible", cp: "ID label present", ok: "Board identification label present and legible.", fail: "Board identification label missing or illegible.", def: "na" },
      { key: "chart", short: "Circuit chart present and up to date", cp: "Circuit chart present", ok: "Circuit chart/schedule present, legible and appears up to date.", fail: "Circuit chart/schedule missing, illegible or out of date.", def: "ok" },
      { key: "notices", short: "Warning notices present", cp: "Warning labels present", ok: "Required warning notices present and legible (e.g. RCD test, periodic inspection, voltage warning).", fail: "Required warning notices missing or illegible.", def: "ok" },
      { key: "heat", short: "No signs of overheating or arcing", cp: "No overheating signs", ok: "No visible signs of overheating, burning, discolouration or arcing.", fail: "Signs of overheating, burning, discolouration or arcing observed.", def: "ok" },
      { key: "noise", short: "No abnormal noise or odour", cp: "No noise or odour", ok: "No abnormal noise (buzzing/humming) or burning odour detected.", fail: "Abnormal noise or burning odour detected.", def: "na" },
      { key: "devices", short: "No tripped or damaged devices", cp: "Devices not tripped", ok: "Protective devices visually intact; no tripped or damaged devices observed.", fail: "Tripped or visibly damaged protective device(s) observed.", def: "na" },
      { key: "glands", short: "Cable entries and glands secure", cp: "Cables secure", ok: "Cable entries and glands secure; cables adequately supported.", fail: "Cable entries/glands not secure, or cables inadequately supported.", def: "ok" },
      { key: "fixings", short: "Board fixings secure", cp: "Fixings tight", ok: "Board fixings secure – no loose mounting.", fail: "Board fixings loose – re-securing required.", def: "ok" },
      { key: "earth", short: "Earthing and bonding secure", cp: "Earthing secure", ok: "Visible earthing and bonding conductors present and secure.", fail: "Earthing/bonding conductor loose, damaged or missing.", def: "na" },
      { key: "clean", short: "Board clean and dry", cp: "Clean and dry", ok: "Board clean and free from dust, debris and moisture ingress.", fail: "Dust, debris or moisture ingress found in or around the board.", def: "na" },
      { key: "damp", short: "No leaks or damp nearby", cp: "No damp nearby", ok: "No evidence of water leaks or damp in the vicinity of the board.", fail: "Evidence of water leaks or damp in the vicinity of the board.", def: "na" },
      { key: "access", short: "Access clear, no storage", cp: "Access clear", ok: "Access to the board clear and unobstructed; area not used for storage.", fail: "Access to the board obstructed, or area used for storage.", def: "ok" }
    ]
  }, {
    id: "ats", name: "ATS", title: "Automatic Transfer Switch - Visual Inspection", jednaKolumna: true, // raport: punkty jeden pod drugim (Grzegorz 27/11/2026 21:46)
    scope: "Scope: visual inspection only – no covers removed, no transfer test and no electrical testing carried out.",
    devices: [],
    checks: [
      { key: "enclosure", short: "Enclosure free from damage or corrosion", cp: "Enclosure undamaged", ok: "ATS enclosure inspected – no physical damage, distortion or corrosion.", fail: "ATS enclosure shows physical damage, distortion or corrosion – remedial action required.", def: "ok" },
      { key: "door", short: "Door, lock and hinges OK", cp: "Door and lock OK", ok: "Door/cover secure; locks and hinges operating correctly.", fail: "Door/cover not secure, or lock/hinge defective.", def: "ok" },
      { key: "display", short: "No alarms on the display", cp: "No alarms on display", ok: "Controller display operating normally; no alarms or fault codes shown.", fail: "Alarm or fault code shown on the controller display.", def: "ok" },
      { key: "position", short: "Indicators show normal supply", cp: "Normal supply shown", ok: "Switch position indicators and status lamps showing normal supply.", fail: "Switch position indicators/status lamps not showing normal supply.", def: "ok" },
      { key: "auto", short: "Mode selector in AUTO", cp: "Selector in AUTO", ok: "Mode selector in AUTO position.", fail: "Mode selector not in AUTO position.", def: "ok" },
      { key: "label", short: "ID label present and legible", cp: "ID label present", ok: "ATS identification label present and legible.", fail: "ATS identification label missing or illegible.", def: "ok" },
      { key: "notices", short: "Warning notices present", cp: "Warning labels present", ok: "Required warning notices present and legible.", fail: "Required warning notices missing or illegible.", def: "ok" },
      { key: "heat", short: "No signs of overheating or arcing", cp: "No overheating signs", ok: "No visible signs of overheating, burning, discolouration or arcing.", fail: "Signs of overheating, burning, discolouration or arcing observed.", def: "ok" },
      { key: "noise", short: "No abnormal noise or odour", cp: "No noise or odour", ok: "No abnormal noise (buzzing/humming) or burning odour detected.", fail: "Abnormal noise or burning odour detected.", def: "ok" },
      { key: "glands", short: "Cable entries and glands secure", cp: "Cables secure", ok: "Cable entries and glands secure; cables adequately supported.", fail: "Cable entries/glands not secure, or cables inadequately supported.", def: "na" },
      { key: "clean", short: "ATS clean and dry", cp: "Clean and dry", ok: "ATS clean and free from dust, debris and moisture ingress.", fail: "Dust, debris or moisture ingress found in or around the ATS.", def: "ok" },
      { key: "access", short: "Access clear, no storage", cp: "Access clear", ok: "Access to the ATS clear and unobstructed; area not used for storage.", fail: "Access to the ATS obstructed, or area used for storage.", def: "ok" }
    ]
  }, {
    id: "iso", name: "Local Isolators", title: "Local Isolators - Visual Inspection", batch: "Isolators Inspection",
    scope: "Scope: visual inspection only – no covers removed and no electrical testing carried out.",
    devices: [],
    // ask: dwa poziomy. Ogólne pytanie (TAK = w porządku, domyślnie), pod nim konkretne powody z gotowym tekstem EN —
    // kliknięcie powodu od razu daje NIE.
    // Do raportu: „Isolator KOD: <powody albo en pytania>.” Pytania robocze — docelowo z SFG20;
    // można je podmienić bez zmiany apki: CFG.questions.iso w Code.gs (ten sam układ).
    ask: true,
    checks: [
      { key: "access", q: "Dostępny?", qen: "Accessible?", en: "access obstructed", def: "ok", reasons: [
        { id: "blocked", pl: "Zastawiony", en: "access obstructed" },
        { id: "locked", pl: "Brak dostępu (zamknięte)", en: "no access at time of inspection" } ] },
      { key: "label", q: "Oznaczony?", qen: "Labelled?", en: "label missing or illegible", def: "ok", reasons: [
        { id: "nolabel", pl: "Brak oznaczenia", en: "no identification label" },
        { id: "illegible", pl: "Nieczytelna naklejka", en: "identification label illegible" },
        { id: "desc", pl: "Nieczytelny opis", en: "circuit description illegible" },
        { id: "wrong", pl: "Niezgodna z urządzeniem", en: "label does not match equipment served" } ] },
      { key: "damage", q: "Bez uszkodzeń?", qen: "Free from damage?", en: "damage found", def: "ok", reasons: [
        { id: "crack", pl: "Pęknięta obudowa", en: "enclosure cracked" },
        { id: "knob", pl: "Brak pokrętła", en: "operating handle missing" },
        { id: "knobdmg", pl: "Uszkodzone pokrętło", en: "operating handle damaged" },
        { id: "scratch", pl: "Porysowana", en: "enclosure scratched" },
        { id: "gland", pl: "Kabel / dławik", en: "cable or gland damaged" },
        { id: "heat", pl: "Ślady przegrzania", en: "signs of overheating" } ] },
      { key: "secure", q: "Pokrywa i mocowanie w porządku?", qen: "Cover and fixings OK?", en: "cover or fixings defective", def: "ok", reasons: [
        { id: "nocover", pl: "Brak pokrywy", en: "cover missing" },
        { id: "looseenc", pl: "Luźna obudowa", en: "enclosure loose – not securely fixed" },
        { id: "notfixed", pl: "Nieprzykręcony", en: "not secured to the wall/mounting" },
        { id: "loose", pl: "Luźne mocowanie", en: "loose fixings" },
        { id: "screws", pl: "Brak śrub", en: "missing screws" } ] },
      { key: "clean", q: "Czysty i suchy?", qen: "Clean and dry?", en: "dirt or moisture present", def: "ok", reasons: [
        { id: "rust", pl: "Rdza", en: "corrosion" },
        { id: "water", pl: "Woda / wilgoć", en: "signs of water ingress" },
        { id: "flood", pl: "Zalany", en: "flooded – water damage" },
        { id: "dirt", pl: "Brud", en: "dirt build-up" } ] },
      { key: "state", q: "W normalnym stanie pracy?", qen: "In normal operating state?", en: "not in normal operating state", def: "ok", reasons: [
        { id: "off", pl: "Wyłączony (OFF)", en: "switch found in OFF position" },
        { id: "padlock", pl: "Kłódka / LOTO", en: "padlock / LOTO fitted", note: true } ] }
    ]
  }];
  // Gotowe usterki: jedno dotknięcie = zdanie EN w raporcie + „Requires attention”.
  // Jeśli typ ma punkt o tym samym key, ten punkt dostaje ✗ i to zdanie; jeśli nie, zdanie dochodzi jako osobny punkt.
  var FAULTS = [
    { id: "dirty", pl: "Obudowa brudna", enl: "Enclosure dirty", key: "clean", en: "Enclosure dirty – cleaning required." },
    { id: "display", pl: "Błąd na wyświetlaczu", enl: "Display error", key: "display", en: "Error/fault message shown on the display – further investigation required." },
    { id: "damage", pl: "Uszkodzenie", enl: "Damage", key: "enclosure", en: "Visible damage to the enclosure – remedial action required." },
    { id: "label", pl: "Brak oznaczenia", enl: "No label", key: "label", en: "Identification label missing or illegible – new label required." }
  ];
  function faultsFor(t) { return FAULTS.filter(function (f) { return !f.types || f.types.indexOf(t.id) >= 0; }); }
  // Piętra potwierdzone przez użytkownika: UG = Upper Ground, LG = Lower Ground, LL-06 = Level 6
  function floorOf(code) {
    var c = String(code || "").toUpperCase(), m;
    if (/-UG$/.test(c)) return "Upper Ground";
    if (/-LG$/.test(c)) return "Lower Ground";
    if ((m = /-LL-(\d+)$/.exec(c))) return "Level " + parseInt(m[1], 10);
    return "";
  }
  function towerOf(code) {
    var m = /(?:^|-)T([AB])(?:-|$)/i.exec(code || "");
    return m ? "Tower " + m[1].toUpperCase() : "";
  }
  function pytaniaMozliwe(t) { return !!(t && t.checks && t.checks.length && !t.folder && !t.temp); }
  w.OESTRodzaje = { lista: TYPES, usterki: FAULTS, usterkiDla: faultsFor, pietro: floorOf, wieza: towerOf, pytaniaMozliwe: pytaniaMozliwe };
})(typeof window !== "undefined" ? window : globalThis);
