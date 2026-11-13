// Lista PPM One Eastside (78 zadań Vantify, 70 kart): 27 inspekcji EFA-INS + rozdzielnice i izolatory + 5 in-house + podwykonawcy (Sub).
// freq: "1W", "3M" itd.; kilka częstotliwości (np. 1M + 12M) — termin liczy się z najkrótszej.
// open: karta otwiera istniejący rodzaj inspekcji z listą urządzeń (db, iso).
window.OEST_PPM = {
  groups: [
    { id: "fire", name: "Fire", pl: "Pożarowe", color: "#e5534b" },
    { id: "water", name: "Water", pl: "Woda", color: "#3b8eea" },
    { id: "elec", name: "Electrical", pl: "Elektryka", color: "#e3b341" },
    { id: "mech", name: "Mechanical", pl: "Mechanika", color: "#3fb27f" },
    { id: "sub", name: "Sub", pl: "Podwykonawcy", color: "#a371f7" }
  ],
  // Formularze {SF} (ten sam układ co DB): pytania od Grzegorza 31/10/2026, zdania do raportu po angielsku.
  // ✓ / ✗ / – (pominięty punkt nie trafia do raportu); domyślnie OK.
  forms: {
    // „z folderu”: tylko zdjęcia wypełnionej kartki → jeden PDF (strona na zdjęcie), bez pytań (Grzegorz 01/11/2026)
    folder: { folder: true, title: "", checks: [] },
    aov: { title: "AOV - Operation Test", scope: "", checks: [
      { key: "access", cp: "Panel access clear", ok: "Access to the AOV control panel clear and unobstructed.", fail: "Access to the AOV control panel obstructed." },
      { key: "panel", cp: "Panel undamaged", ok: "AOV control panel free from visible damage.", fail: "AOV control panel damaged – remedial action required." },
      { key: "system", cp: "System operating", ok: "AOV system operating correctly.", fail: "AOV system not operating correctly – further investigation required." },
      { key: "alarm", cp: "Alarm activated", ok: "Alarm activated as intended on operation of the system.", fail: "Alarm not activated on operation of the system." },
      { key: "vents", cp: "Vents fully open", ok: "Vents/windows opened fully on activation.", fail: "Vents/windows failed to open fully on activation." },
      { key: "mcp", cp: "Call point works", ok: "Activating (test-triggering) the local manual call point operated the system correctly.", fail: "Activating (test-triggering) the local manual call point did not operate the system correctly." },
      { key: "reset", cp: "Reset successful", ok: "Control panel allowed a successful system reset.", fail: "System reset from the control panel unsuccessful." },
      { key: "seals", cp: "Frames and seals OK", ok: "Frames, profiles and seals of the windows/vents in good condition.", fail: "Frames, profiles or seals of the windows/vents damaged or deteriorated." } ] },
    ats: { title: "Automatic Transfer Switch - Visual Inspection", scope: "Scope: visual inspection only.", checks: [
      { key: "dust", cp: "No dust build-up", ok: "No dust build-up on or around the ATS.", fail: "Dust build-up found on or around the ATS – cleaning required." },
      { key: "moisture", cp: "No moisture", ok: "No signs of moisture or water ingress.", fail: "Signs of moisture or water ingress found." },
      { key: "heat", cp: "No overheating signs", ok: "No signs of overheating, burning or discolouration.", fail: "Signs of overheating, burning or discolouration observed." },
      { key: "terminations", cp: "Terminations tight", ok: "No loose cable terminations observed.", fail: "Loose cable termination(s) observed – remedial action required." },
      { key: "lights", cp: "Indicators normal", ok: "Controller indicator lights showing normal status.", fail: "Controller indicator lights showing abnormal or fault status." },
      { key: "access", cp: "Access clear", ok: "Access to the ATS clear and unobstructed.", fail: "Access to the ATS obstructed – area requires clearing." } ] },
    plant: { title: "Plant Room Inspection", scope: "", checks: [
      { key: "housekeeping", cp: "Clean and tidy", ok: "Housekeeping: room clean, tidy and free of clutter, rubbish and stored combustible materials.", fail: "Housekeeping: clutter, rubbish or combustible materials found – room requires clearing." },
      { key: "access", cp: "Access clear", ok: "Access & egress: escape routes and walkways to plant equipment clear and unobstructed.", fail: "Access & egress: escape routes or walkways to plant equipment obstructed." },
      { key: "lighting", cp: "Lighting working", ok: "Lighting & emergency lighting: all general lights and emergency lighting units fully functional.", fail: "Lighting & emergency lighting: one or more general or emergency lighting units not functional." },
      { key: "fire", cp: "Fire safety OK", ok: "Fire safety: fire extinguishers in place, unblocked, with valid service tags and pins intact; fire doors closed (no wedges).", fail: "Fire safety: extinguisher missing, blocked, out of date or pin/tag missing, or fire door wedged open." },
      { key: "signage", cp: "Signage in place", ok: "Signage: high voltage, danger and mandatory PPE warning signs clearly visible and secure.", fail: "Signage: warning signs missing, illegible or not secure." } ] },
    lighting: { title: "Monthly Lighting Checks", scope: "", checks: [
      { key: "external", cp: "External lights OK", ok: "External lighting: all external and façade lights operational.", fail: "External lighting: one or more external or façade lights not operational." },
      { key: "common", cp: "Common areas lit", ok: "Common areas: lobbies, corridors and stairwells fully lit, no failed lamps.", fail: "Common areas: failed lamps found in lobbies, corridors or stairwells." },
      { key: "plant", cp: "Plant rooms lit", ok: "Plant rooms & risers: lighting operational.", fail: "Plant rooms & risers: lighting not fully operational." },
      { key: "fittings", cp: "Fittings intact", ok: "Fittings: no damaged, loose or missing diffusers/covers.", fail: "Fittings: damaged, loose or missing diffusers/covers found." },
      { key: "controls", cp: "Controls working", ok: "Lighting controls: timers, PIR sensors and switches operating correctly.", fail: "Lighting controls: timer, PIR sensor or switch not operating correctly." },
      { key: "flicker", cp: "No flickering lamps", ok: "No flickering, buzzing or discoloured lamps observed.", fail: "Flickering, buzzing or discoloured lamp(s) observed – replacement required." } ] },
    // 024: wzór firmy (docx) z polami {temp} — kolejność pól jak w tabeli wzoru. Tylko temperatury, bez domyślnych wartości.
    // kind: hot / cold / tmv — progi z wzoru: Hot > 50°C, Cold < 20°C, TMV mixed 38–43°C.
    // plant roomy (01/11/2026, Grzegorz): 7 stałych pomieszczeń, w każdym siatka checkpointów, wzór firmy TPL_PLANT
    plantW: { rooms: true, title: "Weekly Plant Status Checks", tpl: "TPL_PLANT" },
    plantM: { rooms: true, monthly: true, title: "Monthly Plant Room Inspections", tpl: "TPL_PLANT" },
    plantRooms: [
      { key: "spa_pump", name: "Spa pump plant room", loc: "TB LG" },
      { key: "spa_filtration", name: "Spa filtration plant room", loc: "TB UG", extra: ["Chemicals stored safely"] },
      { key: "comms", name: "Comms room", loc: "TB External access" },
      { key: "primary_switch", name: "Primary Switch Room", loc: "TB External access" },
      { key: "secondary_switch", name: "Secondary Switch Room", loc: "TB External access" },
      { key: "sprinkler", name: "Sprinkler plant room", loc: "TB LG", extra: ["Fire extinguisher"] },
      { key: "mechanical", name: "Mechanical plant room", loc: "TB External access" } ],
    plantCps: ["Secure", "Clean", "Access", "Lighting", "No leaks", "Panel secure"],
    plantCpsMonthly: ["No active alarms", "Emergency lighting"],
    // Weekly Flushing (Grzegorz 02/11/2026): listy kranów z formularzy, wspólny wzór Word (inspekcje/tpl-flush.js)
    flush: {
      TA: { title: "Weekly Taps/Shower Flushing Record Tower A", building: "A", taps: ["Disable Toilet LG", "Toilet LG", "Kitchen next to Pantree", "Bin Store", "Kitchen UL",
        "Bar Area Level 49", "Private Dining", "Toilet Level 49", "Disable Toilet Level 49", "Meeting Area Level 49", "Disable Toilet/Shower UG", "Roof Level"] },
      TB: { title: "Weekly Taps/Shower Flushing Record Tower B", building: "B", taps: ["Roof", "Bin Stores", "SPA Chemical Room", "SPA Hall (Toilets)", "Massage Hall", "Massage Room",
        "Hairdresser Room", "Disable Toilet LG", "Studio", "Fitness 1", "Fitness 2 Learner", "SPA", "Cycle Store", "Office Sink",
        "Shower Disable Toilet", "Shower in SPA", "Apartment 101", "Apartment 103", "Apartment 104", "Apartment 107"] },
      P: { title: "Weekly Taps/Shower Flushing Record Pavilion", building: "Pavilion", taps: ["Unisex Toilet", "Disabled Toilet"] },
      // AOV Tower B (Grzegorz 03/11/2026): 3 przyciski pod 2 grupami klap. Lista punktów (bez tygodnia i bez wzoru Word): tak jak krany, Yes/No/N/A + 📷 + 📝, domyślnie Yes.
      // Weekly Spa Checks (Grzegorz 13/11/2026): bez zdjęcia ręcznego formularza – lista potwierdzeń (Yes/No/N/A + 📷 + 📝, domyślnie Yes)
      // i zdjęcia z plant roomów Spa. „Spa” = spa pool + plunge pool. Przycisk „Formularz” zostaje na zaś, ale nie jest wymagany (sheet: false).
      SPA: { points: true, ui: "checks", sheet: false, title: "Weekly Spa Checks", building: "B", col: "Confirmed",
        taps: ["Spa inspected (spa pool and plunge pool)", "Spa regularly supervised", "Water samples taken regularly", "Spa plant rooms clean and tidy",
          "Pumps operating correctly", "Filters operating correctly", "Readings within normal range", "Water clear", "No issues observed"] },
      "AOV-TB": { points: true, title: "AOV Operation Test – Tower B", building: "B", col: "Opened & reset",
        groups: [{ name: "Roof AOVs (R2)", n: 2 }, { name: "Upper Ground AOVs – by the lifts", n: 1 }],
        taps: ["Ground floor – main entrance doors (call point)", "Stairwell level 14 (call point)", "Upper Ground – by the lifts (call point)"] } },
    tempTB: { temp: true, title: "Monthly Tap Temperature Check TB", tpl: "TPL_TEMP_TB", slots: [
      ["Roof", "cold"], ["Spa Chemical Room", "hot"], ["Spa Chemical Room", "cold"], ["Bin Area", "cold"],
      ["Spa Hall Tap", "hot"], ["Spa Hall Tap", "cold"], ["Massage Hall", "cold"], ["Massage Room", "hot"], ["Massage Room", "cold"],
      ["Hairdresser Room", "hot"], ["Hairdresser Room", "cold"], ["Disabled Toilet LG", "tmv"], ["Fitness 1", "cold"],
      ["Cycle Store", "cold"], ["Office Sink", "hot"], ["Office Sink", "cold"], ["Apartment 101", "hot"], ["Apartment 101", "cold"],
      ["Apartment 103", "hot"], ["Apartment 103", "cold"], ["Apartment 107", "hot"], ["Apartment 107", "cold"] ] }
  },
  tasks: [
    // 28 inspekcji startowych (katalog EFA-INS-001..028, nazwy dokładnie jak w katalogu, 31/10/2026).
    // cfg: formularz do konfiguracji — do czasu ustalenia pytań szybki formularz: zdjęcie i jedno sprawdzenie.
    // Częstotliwości z listy PPM; Lift signage bez częstotliwości (termin tylko przez Update).
    { id: "EFA-INS-001", group: "fire", name: "Emergency Lighting Test (TA)", freq: ["1M",  "12M"], cfg: true },
    { id: "EFA-INS-002", group: "water", name: "Water Temperature Checks (TA)", freq: ["1M"], cfg: true },
    { id: "EFA-INS-003", form: "folder", group: "fire", name: "AOV Operation Test (TA)", freq: ["1W"] },
    { id: "EFA-INS-004", form: "folder", flush: "TA", group: "water", name: "Weekly Flushing (TA)", freq: ["1W"] },
    { id: "EFA-INS-005", group: "fire", name: "Weekly Sprinkler Testing", freq: ["1W"], cfg: true },
    { id: "EFA-INS-006", form: "folder", group: "fire", name: "Weekly Fire Alarm Test (TA)", freq: ["1W"] },
    { id: "EFA-INS-007", group: "water", name: "Water Feature Checks", freq: ["1W"], cfg: true },
    { id: "EFA-INS-008", form: "folder", flush: "SPA", group: "water", name: "Weekly Spa Checks", freq: ["1W"] },
    { id: "EFA-INS-009", form: "folder", group: "water", name: "Daily Spa Pool Sampling", freq: ["1W"] },
    { id: "EFA-INS-010", group: "water", name: "Monthly Tap Temperature Check (P)", freq: ["1M"], cfg: true },
    { id: "EFA-INS-011", group: "fire", name: "Monthly Emergency Lighting Test (P)", freq: ["1M",  "12M"], cfg: true },
    { id: "EFA-INS-012", form: "folder", flush: "P", group: "water", name: "Weekly Flushing of Seldom Used Outlets (P)", freq: ["1W"] },
    { id: "EFA-INS-013", form: "folder", group: "fire", name: "Weekly Fire Alarm Test (P)", freq: ["1W"] },
    { id: "EFA-INS-014", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, L13)", freq: ["1M"] },
    { id: "EFA-INS-015", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, L12)", freq: ["1M"] },
    { id: "EFA-INS-016", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, UG)", freq: ["1M"] },
    { id: "EFA-INS-017", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, R2)", freq: ["1M"] },
    { id: "EFA-INS-018", group: "elec", form: "ats", name: "Automatic Transfer Switches (TA, R1)", freq: ["1M"] },
    { id: "EFA-INS-019", form: "folder", flush: "AOV-TB", group: "fire", name: "AOV Operation Test (TB)", freq: ["1W"] },
    { id: "EFA-INS-020", group: "mech", form: "plantM", name: "Monthly Plant Room Inspections", freq: ["1M"] },
    { id: "EFA-INS-021", group: "mech", form: "plantW", name: "Weekly Plant Status Checks", freq: ["1W"] },
    { id: "EFA-INS-022", group: "elec", form: "lighting", name: "Monthly Lighting Checks", freq: ["1M"] },
    { id: "EFA-INS-023", group: "mech", name: "Monthly Meter Readings", freq: ["1M"], cfg: true },
    { id: "EFA-INS-024", group: "water", form: "tempTB", name: "Water Temperature Checks (TB)", freq: ["1M"] },
    { id: "EFA-INS-025", form: "folder", group: "fire", name: "Weekly Fire Alarm Test (TB)", freq: ["1W"] },
    { id: "EFA-INS-026", form: "folder", flush: "TB", group: "water", name: "Weekly Flushing (TB)", freq: ["1W"] },
    { id: "EFA-INS-027", group: "fire", name: "Emergency Lighting Test (TB)", freq: ["1M"], cfg: true },
    // EFA-INS-028 Lift signage TB usunięte z listy: w Vantify to zlecenie reactive, a reactive nie ma być na liście PPM (Grzegorz 02/11/2026)

    // istniejące rodzaje z listą urządzeń i pytaniami
    // 18 rozdzielnic: każda to osobna inspekcja (własny termin i raport), na liście zebrane pod kartą „Distribution Boards”
    { id: "db-DB-TB-EXT-1", group: "elec", fam: "Distribution Boards", name: "DB-TB-EXT-1", freq: ["3M", "6M", "12M"], open: "db", dev: "DB-TB-EXT-1" },
    { id: "db-DB-TB-PR-1", group: "elec", fam: "Distribution Boards", name: "DB-TB-PR-1", freq: ["3M", "6M", "12M"], open: "db", dev: "DB-TB-PR-1" },
    { id: "db-LL-LG", group: "elec", fam: "Distribution Boards", name: "LL-LG", freq: ["3M", "6M", "12M"], open: "db", dev: "LL-LG" },
    { id: "db-LL-UG", group: "elec", fam: "Distribution Boards", name: "LL-UG", freq: ["3M", "6M", "12M"], open: "db", dev: "LL-UG" },
    { id: "db-FFS-04", group: "elec", fam: "Distribution Boards", name: "FFS-04", freq: ["3M", "6M", "12M"], open: "db", dev: "FFS-04" },
    { id: "db-FFS-12", group: "elec", fam: "Distribution Boards", name: "FFS-12", freq: ["3M", "6M", "12M"], open: "db", dev: "FFS-12" },
    { id: "db-LL-02", group: "elec", fam: "Distribution Boards", name: "LL-02", freq: ["3M", "6M", "12M"], open: "db", dev: "LL-02" },
    { id: "db-LL-06", group: "elec", fam: "Distribution Boards", name: "LL-06", freq: ["3M", "6M", "12M"], open: "db", dev: "LL-06" },
    { id: "db-LL-10", group: "elec", fam: "Distribution Boards", name: "LL-10", freq: ["3M", "6M", "12M"], open: "db", dev: "LL-10" },
    { id: "db-LL-14", group: "elec", fam: "Distribution Boards", name: "LL-14", freq: ["3M", "6M", "12M"], open: "db", dev: "LL-14" },
    { id: "db-MSDB-TB-01", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-01", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-01" },
    { id: "db-MSDB-TB-03", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-03", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-03" },
    { id: "db-MSDB-TB-05", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-05", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-05" },
    { id: "db-MSDB-TB-06", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-06", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-06" },
    { id: "db-MSDB-TB-08", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-08", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-08" },
    { id: "db-MSDB-TB-10", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-10", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-10" },
    { id: "db-MSDB-TB-11", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-11", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-11" },
    { id: "db-MSDB-TB-13", group: "elec", fam: "Distribution Boards", name: "MSDB-TB-13", freq: ["3M", "6M", "12M"], open: "db", dev: "MSDB-TB-13" },
    { id: "iso", group: "elec", name: "Isolator Inspections", freq: ["3M", "12M"], open: "iso" },

    // 5 zadań in-house z listy 78 PPM (Vantify ppm.csv), które wypadły 31/10/2026 przy przejściu na katalog EFA-INS
    // (nie mają otwartych zleceń w eksporcie Job). Przywrócone za zgodą Grzegorza 09/11/2026 – te same id co przed 31/10.
    // Bez zleceń w vantify-plan.js: bez terminu, dopóki nie przyjdzie zlecenie z Vantify albo Grzegorz nie ustawi go w Update.
    { id: "shower", group: "water", name: "Showerhead Clean & De-scale", freq: ["3M"] },
    { id: "ahu", group: "mech", name: "Air Handling Units", freq: ["6M", "12M"] },
    { id: "efans", group: "mech", name: "Extract Fans", where: "Tower B", freq: ["6M"] },
    { id: "odh", group: "mech", name: "Overdoor Heaters", where: "Tower B", freq: ["6M"] },
    { id: "hru", group: "mech", name: "Heat Recovery Units", freq: ["12M"] },

    { id: "s-fa", group: "sub", name: "Fire Alarm System", where: "Tower A, Tower B", freq: ["3M"], by: "Thompson Group" },
    { id: "s-refuge", group: "sub", name: "Disabled Refuge System", where: "Tower B", freq: ["6M"], by: "Thompson Group" },
    { id: "s-intruder", group: "sub", name: "Intruder Alarms", where: "Tower B", freq: ["6M"], by: "Thompson Group" },
    { id: "s-cctv", group: "sub", name: "CCTV", where: "Tower B", freq: ["6M"], by: "Thompson Group" },
    { id: "s-access", group: "sub", name: "Door Access Control", where: "Tower B", freq: ["12M"], by: "Thompson Group" },
    { id: "s-icv", group: "sub", name: "Sprinkler ICVs, Sprinkler ZoneCheck", freq: ["3M"], by: "J&J Fire" },
    { id: "s-spumps", group: "sub", name: "Commercial Sprinkler Pumps", freq: ["6M", "12M"], by: "J&J Fire" },
    { id: "s-risers", group: "sub", name: "Dry Risers", where: "Tower B", freq: ["6M", "12M"], by: "J&J Fire" },
    { id: "s-smoke", group: "sub", name: "AOVs, Smoke Extraction, Smoke Control System", where: "Tower B", freq: ["6M"], by: "Smoke Control Solutions" },
    { id: "s-dampers", group: "sub", name: "Fire Dampers", where: "Tower B", freq: ["12M"], by: "Adexsi" },
    { id: "s-ahu", group: "sub", name: "Air Handling Units", freq: ["6M"], by: "Accent" },
    { id: "s-vrv", group: "sub", name: "VRVs", where: "Tower B, Pavilion", freq: ["6M", "12M"], by: "Accent" },
    { id: "s-lcs", group: "sub", name: "Lighting Control System", where: "Tower B", freq: ["6M"], by: "ZEN Controls" },
    { id: "s-doors", group: "sub", name: "Automatic Doors", where: "Tower, Pavilion", freq: ["6M"], by: "Geze" },
    { id: "s-lightning", group: "sub", name: "Lightning Protection", where: "Tower B", freq: ["11M"], by: "Cuttings / Omega Red" },
    { id: "s-hygiene", group: "sub", name: "Water Hygiene Sampling, CWST Inspections", freq: ["6M"], by: "Hydrocert" },
    { id: "s-cwst", group: "sub", name: "Cold Water Storage Tank", freq: ["6M", "12M"], by: "Hydrocert" },
    { id: "s-pat", group: "sub", name: "Portable Appliance Testing", freq: ["12M"] },
    { id: "s-spa", group: "sub", name: "Monthly Spa Maintenance & Sampling", freq: ["1M"] }
  ]
};

// Terminy jak w systemie (Ventify): stały harmonogram, nie „ostatnie wykonanie + częstotliwość”.
// localStorage "oest.ppm.due" = { id: "RRRR-MM-DD" } — najbliższy termin. Update ustawia go ręcznie,
// wysłanie raportu zamyka bieżący okres: termin przesuwa się o najkrótszą częstotliwość.
(function (P) {
  // Odzyskana inspekcja (etap 2c, Grzegorz 08/11/2026): edycja kopii wysłanego raportu nie zmienia listy PPM –
  // terminu, etapu klocka ani ⚙ wysyłki tej karty. P.sandbox(id): od tej chwili zapisy PPM na tej stronie idą tylko
  // do pamięci (telefon bez zmian), a karta id zaczyna bez etapu (pigułkę pokazuje strona: „Odzyskana”).
  // Tylko wpis karty id idzie do pamięci; zapisy innych kart (np. potwierdzenie wysłania zaległego raportu przez kolejkę) trafiają do telefonu jak zwykle (uwaga Codex #101).
  var box = null, boxId = "";
  function obj(raw) { var a = null; try { a = JSON.parse(raw || "null"); } catch (e) {} return a && typeof a === "object" && !Array.isArray(a) ? a : null; }
  var LS = {
    getItem: function (k) {
      var raw = localStorage.getItem(k);
      if (!box || !Object.prototype.hasOwnProperty.call(box, k)) return raw;
      var a = obj(raw) || {};
      if (box[k] === undefined) delete a[boxId]; else a[boxId] = box[k];
      return JSON.stringify(a);
    },
    setItem: function (k, v) {
      if (!box) { localStorage.setItem(k, v); return; }
      var a = obj(v); if (!a) return; // mapy PPM to zawsze obiekty { id: … }
      box[k] = a[boxId];
      var real = obj(localStorage.getItem(k)) || {};
      if (Object.prototype.hasOwnProperty.call(real, boxId)) a[boxId] = real[boxId]; else delete a[boxId];
      localStorage.setItem(k, JSON.stringify(a));
    }
  };
  P.sandbox = function (id, needs) {
    box = {}; boxId = id;
    // odzyskana zaczyna bez etapu i bez ręcznego „Nie rozpoczęta”; termin, zakończone okresy i ⚙ – kopia z telefonu
    box["oest.ppm.stage"] = undefined; box["oest.ppm.unstarted"] = undefined;
    ["oest.ppm.due", "oest.ppm.done", "oest.ppm.needs"].forEach(function (k) { var a = obj(localStorage.getItem(k)); if (a && Object.prototype.hasOwnProperty.call(a, id)) box[k] = a[id]; });
    // ustawienia pytań/zdjęć zapisane z odzyskaną inspekcją wygrywają z bieżącymi ustawieniami karty (uwaga Codex #101)
    if (needs && typeof needs === "object" && !Array.isArray(needs)) box["oest.ppm.needs"] = Object.assign({}, needs);
  };
  P.sandboxed = function () { return !!box; };
  function pad(n) { return String(n).padStart(2, "0"); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parse(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function add(d, f) {
    var n = parseInt(f, 10), r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (/W$/.test(f)) r.setDate(r.getDate() + 7 * n);
    else { var day = r.getDate(); r.setDate(1); r.setMonth(r.getMonth() + n); r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate())); }
    return r;
  }
  function next(t, d) { return t.freq.map(function (f) { return add(d, f); }).sort(function (a, b) { return a - b; })[0]; }
  // Terminy zapisane pod kartami sprzed katalogu 28 inspekcji przechodzą na nowe karty (wspólny termin → każda karta)
  var OLD = { "fa-weekly": ["006", "013", "025"], "spr-weekly": ["005"], "aov-weekly": ["003", "019"], "el-ta-pv": ["001", "011"], "el-tb": ["027"],
    "ats": ["014", "015", "016", "017", "018"], "flush": ["004", "012", "026"], "wtemp": ["002", "010", "024"], "spa-daily": ["009"], "spa-weekly": ["008"],
    "wfeature": ["007"], "lighting": ["022"], "plant-weekly": ["021"], "plant-room": ["020"], "meters": ["023"] };
  function all() {
    var a; try { a = JSON.parse(LS.getItem("oest.ppm.due") || "{}") || {}; } catch (e) { return {}; }
    var moved = false;
    Object.keys(OLD).forEach(function (k) {
      if (!a[k]) return;
      OLD[k].forEach(function (n) { var id = "EFA-INS-" + n; if (!a[id]) a[id] = a[k]; });
      delete a[k]; moved = true;
    });
    if (moved) try { LS.setItem("oest.ppm.due", JSON.stringify(a)); } catch (e) {}
    return a;
  }
  // Zlecenia z Vantify (vantify-plan.js) – Grzegorz 05/11/2026: terminy DOKŁADNIE jak w pliku Vantify.
  // Apka niczego nie przelicza ani nie przesuwa. Termin karty = zlecenie z pliku:
  // - ostatnie zlecenie, którego termin minął, jeśli nie jest zrobione w apce (zaległe, jak w Vantify),
  // - inaczej najbliższe zlecenie od dziś, które nie jest zrobione w apce.
  // „Zrobione w apce” = inspekcja zakończona/wysłana DLA TEGO terminu (period ≥ termin zlecenia).
  // Stare zapisy z testów (period sprzed zlecenia) niczego nie przesuwają.
  function jobsOf(id) { var V = window.OEST_VANTIFY; return (V && V.jobs && V.jobs[id]) || []; }
  // Karta prowadzona zleceniami Vantify (lista „cards” w vantify-plan.js, sumowana przez kolejne eksporty).
  // Gdy Vantify zamknie wszystkie jej zlecenia, karta dalej jest kartą Vantify: bez terminu, bez prognozy (PROD-010).
  function isVantify(id) { var V = window.OEST_VANTIFY; return jobsOf(id).length > 0 || !!(V && V.cards && V.cards.indexOf(id) >= 0); }
  function today0() { var n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth(), n.getDate())); }
  // Zakończone terminy trzymane osobno od bieżącego etapu (localStorage "oest.ppm.done" = { id: ["RRRR-MM-DD", ...] }),
  // żeby rozpoczęcie następnej inspekcji nie otwierało z powrotem poprzedniego zlecenia. Zapis/cofnięcie: P.setStage.
  var DK = "oest.ppm.done";
  function doneAll() {
    var a = null; try { a = JSON.parse(LS.getItem(DK) || "null"); } catch (e) {}
    if (a && typeof a === "object") return a;
    a = {}; // pierwsze uruchomienie: zakończone etapy zapisane wcześniej w telefonie
    var st = {}; try { st = JSON.parse(LS.getItem("oest.ppm.stage") || "{}") || {}; } catch (e) {}
    Object.keys(st).forEach(function (id) { var r = st[id]; if (r && r.period && (r.s === "queued" || r.s === "sent" || r.s === "done")) a[id] = [r.period]; });
    try { LS.setItem(DK, JSON.stringify(a)); } catch (e) {}
    return a;
  }
  P._done = function (id, period, on) {
    if (!period) return; var a = doneAll(), l = (a[id] || []).filter(function (x) { return x !== period; });
    if (on) l.push(period); l.sort(); if (l.length > 60) l = l.slice(-60); if (l.length) a[id] = l; else delete a[id];
    try { LS.setItem(DK, JSON.stringify(a)); } catch (e) {}
  };
  function doneFor(id, due) { return (doneAll()[id] || []).some(function (p) { return p >= due; }); }
  function vantifyDue(id) {
    var j = jobsOf(id); if (!j.length) return null;
    var td = today0(), i = 0;
    while (i < j.length && j[i].due < td) i++;
    if (i > 0 && !doneFor(id, j[i - 1].due)) return j[i - 1].due;
    for (; i < j.length; i++) if (!doneFor(id, j[i].due)) return j[i].due;
    return ""; // wszystkie zlecenia z pliku zrobione – dalej termin z apki (częstotliwość)
  }
  function put(id, day) { var a = all(); if (day) a[id] = day; else delete a[id]; try { LS.setItem("oest.ppm.due", JSON.stringify(a)); } catch (e) {} }
  P.iso = iso;
  P.byId = function (id) { return P.tasks.filter(function (t) { return t.id === id; })[0] || null; };
  // Karta ze zleceniami Vantify: termin TYLKO z pliku. Po ostatnim zleceniu z importu nie ma terminu (null) –
  // apka nie tworzy kolejnej daty ani nie bierze starej daty z telefonu (PROD-010, audyt 06/11/2026).
  P.due = function (t) {
    if (isVantify(t.id)) { var v = vantifyDue(t.id); return v ? parse(v) : null; }
    var s = all()[t.id];
    return s ? parse(s) : null;
  };
  P.setDue = function (t, day) { put(t.id, day); };
  // Raport wysłany (dzień raportu „day”), tylko karty BEZ zleceń Vantify: bez terminu liczy od dnia raportu,
  // z terminem przesuwa go o jeden okres. Karta ze zleceniami Vantify: nic nie zapisuje – następne zlecenie wynika
  // z pliku, a po ostatnim zleceniu z importu nie powstaje żaden termin (PROD-010).
  P.close = function (t, day) {
    if (!t.freq.length || isVantify(t.id)) return;
    var d = P.due(t);
    put(t.id, iso(next(t, d || parse(day))));
  };
  P.jobs = function (t) { return jobsOf(t.id); };
  // Terminy karty w zakresie [from, to] (RRRR-MM-DD). Karta ze zleceniami Vantify: TYLKO zlecenia z pliku od bieżącego
  // terminu, bez planowania za ostatnim zleceniem (PROD-010). Karta bez zleceń: termin z telefonu + częstotliwość.
  // Wspólne dla widoku miesiąca i synchronizacji z kalendarzem telefonu.
  P.occurrences = function (t, from, to) {
    var jobs = jobsOf(t.id), d0 = P.due(t), a = d0 ? iso(d0) : "", out = [];
    if (!a) return out;
    function put(d, e) { if (d >= from && d <= to) { e.d = d; out.push(e); } }
    if (isVantify(t.id)) {
      jobs.forEach(function (j) { if (j.due >= a) put(j.due, { job: j.no }); });
      return out;
    }
    put(a, {});
    var base = a, f = t.freq[0], m = f && /^(\d+)([WM])$/.exec(f);
    for (var i = 1; m && i < 600; i++) {
      var d = iso(add(parse(base), (+m[1] * i) + m[2]));
      if (d > to) break;
      put(d, { plan: true });
    }
    return out.sort(function (x, y) { return x.d < y.d ? -1 : x.d > y.d ? 1 : 0; });
  };
  // numer zlecenia Vantify dla terminu (RRRR-MM-DD) albo null
  P.jobFor = function (t, day) { return jobsOf(t.id).filter(function (j) { return j.due === day; })[0] || null; };
  P.daysLeft = function (due) {
    if (!due) return null;
    var n = new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((due - today) / 864e5);
  };
  P.endsText = function (left, t) {
    var T = function (pl, en) { return window.OESTT ? window.OESTT(pl, en) : en; };
    if (left === null && t && isVantify(t.id)) return T("Brak kolejnego zlecenia w Vantify", "No next Vantify job"); // po ostatnim zleceniu z importu
    if (left === null) return T("Brak terminu – ustaw w Update", "No date – set Update");
    if (left === 0) return T("Dziś", "Today");
    if (left < 0) return T("Po terminie " + -left + " " + P.dni(-left)[0], "Overdue " + -left + "d");
    return T((left === 1 ? "Został " : "Zostało ") + left + " " + P.dni(left)[0], "Ends in " + left + "d");
  };
  // B7 (07/11/2026): odmiana „dzień/dni”, „day/days” – [pl, en]
  P.dni = function (n) { return Math.abs(n) === 1 ? ["dzień", "day"] : ["dni", "days"]; };

  // ---------- etap inspekcji na klocku (02/11/2026) ----------
  // localStorage "oest.ppm.stage" = { id: { s, at, period, photos, thumb, issues, total, manual } }
  // s: prog = W trakcie, hold = Wstrzymana, done = Zakończona (bez wysyłki), queued = W kolejce, sent = Wysłana.
  // mail (04/11): stan ostatniego raportu z „Wyślij” przy otwartej inspekcji: queued / sent (+ mailId, mailAt, mailSig, mailDate).
  // „Wyślij” nie zamyka inspekcji; queued/sent w s ustawia dopiero „Zakończ inspekcję”.
  // period = termin (RRRR-MM-DD), którego dotyczy wpis. Wpis „zamyka” okres, dopóki nie minie ten termin (albo dzień wysłania, jeśli po terminie).
  var SK = "oest.ppm.stage";
  function stages() { try { return JSON.parse(LS.getItem(SK) || "{}") || {}; } catch (e) { return {}; } }
  function today0() { var n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth(), n.getDate())); }
  function alive(r) { if (!r || !r.s) return false; if (r.s === "prog" || r.s === "hold" || r.s === "queued") return true; /* w kolejce: aż raport faktycznie wyjdzie */ var end = r.period && r.period > r.day ? r.period : r.day; return !!end && today0() <= end; }
  P.stage = function (t) { var r = stages()[t.id]; return alive(r) ? r : null; };
  P.setStage = function (t, patch) {
    var a = stages(), r = alive(a[t.id]) ? a[t.id] : {};
    var CL = function (x) { return !!x && (x.s === "queued" || x.s === "sent" || x.s === "done"); };
    if (patch === null) { if (CL(r)) P._done(t.id, r.period, false); delete a[t.id]; } // cofnięcie zakończenia: zlecenie znów otwarte
    else { var was = r; r = Object.assign({}, r, patch); if (!r.period) { var d = P.due(t); r.period = d ? iso(d) : ""; } r.day = r.day || today0(); r.at = patch.at || (was.s === "done" && r.s === "done" && was.at ? was.at : Date.now()); /* Gotowa: odświeżone liczniki nie zmieniają daty zakończenia */ a[t.id] = r;
      if (CL(r)) P._done(t.id, r.period, true); else if (CL(was)) P._done(t.id, was.period, false); }
    try { LS.setItem(SK, JSON.stringify(a)); } catch (e) {}
    if (patch !== null) P.setUnstarted(t, null); // każdy ustawiony etap kończy ręczne „Nie rozpoczęta”
    try { window.dispatchEvent(new CustomEvent("oest:ppm-stage")); } catch (e) {}
  };
  // ręczne „Nie rozpoczęta” (Grzegorz 07/11/2026: „co update wracają, że są w trakcie”): samo otwarcie inspekcji
  // i wczytanie zapisanych zdjęć/odpowiedzi nie zmienia go na „W trakcie”; dopiero zmiana zrobiona w inspekcji (inspekcje/index.html: ppmTrack)
  // albo nowe zdjęcie ponad liczbę z chwili ustawienia. Szkic i zdjęcia zostają bez zmian.
  // localStorage "oest.ppm.unstarted" = { id: { photos, sheet, used, ok } }
  var UK = "oest.ppm.unstarted";
  function unstartedAll() { try { return JSON.parse(LS.getItem(UK) || "{}") || {}; } catch (e) { return {}; } }
  P.unstarted = function (t) { return unstartedAll()[t.id] || null; };
  P.setUnstarted = function (t, counts) {
    var a = unstartedAll(); if (!counts && !a[t.id]) return;
    if (counts) a[t.id] = { photos: counts.photos || 0, sheet: counts.sheet || 0, used: counts.used || 0, ok: counts.ok || 0 }; else delete a[t.id];
    try { LS.setItem(UK, JSON.stringify(a)); } catch (e) {}
  };
  // już wysłane / zakończone w tym okresie → ponowne wysłanie to poprawka (termin się nie przesuwa)
  P.closed = function (t) { var r = P.stage(t); return !!r && (r.s === "queued" || r.s === "sent" || r.s === "done"); };
  // raport faktycznie wyszedł (moduł wysyłki / Apps Script): W kolejce → Wysłana
  // qid = id raportu w kolejce: inspekcja otwarta po „Wyślij” (s = prog/hold, mail = queued) dostaje ✉ wysłany tylko za swój ostatni raport
  // Potwierdzenie z kolejki dotyczy zwykłego raportu: zapis prosto do telefonu, z pominięciem kopii odzyskanej inspekcji (uwaga Codex #101)
  P.markSent = function (id, qid) {
    var t = P.byId(id); if (!t) return; var a; try { a = JSON.parse(localStorage.getItem(SK) || "{}") || {}; } catch (e) { a = {}; } var r = a[id]; if (!r) return;
    if ((r.s === "queued" || r.s === "sent") && (!qid || !r.mailId || r.mailId === qid)) { r.s = "sent"; r.sentAt = Date.now(); r.day = today0(); /* klocek „Wysłana” żyje co najmniej do końca dnia wysyłki */ }
    else if (!(r.mail && (!qid || !r.mailId || r.mailId === qid))) return;
    if (r.mail && (!qid || !r.mailId || r.mailId === qid)) { r.mail = "sent"; r.mailSentAt = Date.now(); }
    try { localStorage.setItem(SK, JSON.stringify(a)); } catch (e) {} try { window.dispatchEvent(new CustomEvent("oest:ppm-stage")); } catch (e) {}
  };
  // raport usunięty z kolejki przed wysłaniem: okres znów otwarty
  // raport usunięty z kolejki przed wysłaniem: okres znów otwarty, termin wraca na ten sprzed wysłania.
  // Inspekcja wraca do „W trakcie” (nie do „Nie rozpoczęta”), żeby formularz i zdjęcia zostały w telefonie (04/11).
  P.unqueue = function (id, qid) {
    var t = P.byId(id), r = stages()[id]; if (!t || !r) return;
    if (qid && r.mailId && r.mailId !== qid) return; // to nie ostatni raport tej inspekcji
    if (r.s === "queued") { if (r.period) P.setDue(t, r.period); P.setStage(t, { s: "prog", mail: "", mailId: "", mailSig: "", manual: false }); return; }
    if (r.mail === "queued") P.setStage(t, { mail: "", mailId: "", mailSig: "" }); // otwarta inspekcja: znika tylko znaczek ✉
  };
  // ---------- co ta inspekcja wymaga (Grzegorz 04/11/2026) ----------
  // localStorage "oest.ppm.needs" = { id: { q: pytania aktywne, p: zdjęcia wymagane, f: zdjęcie formularza wymagane } }
  // Każda inspekcja ma pytania, ale nie w każdej są aktywne; włącza się je w inspekcji. Nieaktywne → szara ikonka na klocku.
  var NK = "oest.ppm.needs";
  function needsAll() { try { return JSON.parse(LS.getItem(NK) || "{}") || {}; } catch (e) { return {}; } }
  // Ustawienia wysyłki (⚙ obok Wyślij, Grzegorz 04/11 11:33–11:37): f zdjęcie formularza, q pytania (w Flushing/AOV = formularz elektroniczny),
  // p zdjęcia ogólne, t zdjęcia do pytań (przy kranie / punkcie). Wysyłka (11:34): do sp mój prywatny (05/11) / sm mój firmowy / se inżyniera / sg managera,
  // format xp PDF / xw Word, one = jeden dokument (false = osobne pliki). Jedno miejsce dla wszystkich inspekcji, pamiętane dla każdej.
  P.needsDefault = function (t) {
    var folder = t.form === "folder", pts = !!t.flush, F = pts && P.forms && P.forms.flush ? P.forms.flush[t.flush] : null, noSheet = !!(F && F.sheet === false);
    // noSheet (Spa): lista z apki włączona od razu, zdjęcie formularza niewymagane
    return { q: (!folder && !t.cfg) || noSheet, p: true, t: pts, f: folder && !noSheet, sp: false, sm: true, se: false, sg: false, xp: true, xw: true, one: true };
  };
  P.needs = function (t) { return Object.assign(P.needsDefault(t), needsAll()[t.id] || {}); };
  P.setNeeds = function (t, patch) {
    var a = needsAll(); a[t.id] = Object.assign(P.needs(t), patch);
    try { LS.setItem(NK, JSON.stringify(a)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("oest:ppm-stage")); } catch (e) {}
  };
  // krótka nazwa na klocek (pełna zostaje w raporcie) + budynek ze znaczka w nawiasie
  var BLD = { TA: "Tower A", TB: "Tower B", P: "Pavilion" };
  P.short = function (t) {
    var m = /\s*\((TA|TB|P)(?:,\s*([^)]+))?\)\s*$/.exec(t.name), n = m ? t.name.slice(0, m.index) : t.name;
    n = n.replace(/^Weekly /, "").replace(/^Monthly /, "").replace(/ Operation Test(ing)?$/, " Test").replace(/^Automatic Transfer Switches$/, "ATS").replace(/ of Seldom Used Outlets$/, " (seldom used)");
    if (n === "ATS" && m && m[2]) { n = "ATS " + m[2]; m[2] = ""; }
    return { name: n, bld: m ? m[1] : "", where: [m ? BLD[m[1]] : "", m && m[2] || "", t.where || ""].filter(Boolean).join(" · ") };
  };
  // lokalizacja na klocek (Grzegorz 07/11/2026): skrót „TB/L13”, „TA/R1”, „TB” – z nawiasu w nazwie albo z „where”, gdy to jeden budynek.
  // Kilka budynków albo brak = "" (pusty kwadrat na klocku). full = do okna informacji: „TB – Tower B, L13”.
  P.loc = function (t) {
    var m = /\((TA|TB|P)(?:,\s*([^)]+))?\)\s*$/.exec(t.name), b = m ? m[1] : "", lv = m && m[2] ? m[2].trim() : "";
    if (!b && t.where) { var k = Object.keys(BLD).filter(function (x) { return BLD[x] === String(t.where).trim(); })[0]; if (k) b = k; }
    if (lv === "Roof 1") lv = "R1"; if (lv === "Roof 2") lv = "R2";
    return { code: b ? b + (lv ? "/" + lv : "") : "", full: b ? b + " – " + BLD[b] + (lv ? ", " + lv : "") : (t.where || "") };
  };
  // częstotliwość bieżącego zlecenia: z zlecenia Vantify na ten termin, inaczej pierwsza z karty
  P.freqNow = function (t, due) { var j = due ? P.jobFor(t, iso(due)) : null; return j && j.f ? j.f : (t.freq[0] || ""); };
  // zadanie Vantify dla częstotliwości: { no: numer zadania (Task Frequency ID), name: pełna nazwa jak w eksporcie } albo null
  P.vantifyTask = function (t, f) { var V = window.OEST_VANTIFY, l = (V && V.tasks && V.tasks[t.id]) || []; return l.filter(function (x) { return x.f === f; })[0] || l[0] || null; };
})(window.OEST_PPM);
