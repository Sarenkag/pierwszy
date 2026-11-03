// Lista PPM One Eastside: 28 inspekcji startowych + rozdzielnice i izolatory + podwykonawcy (Sub).
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
    { id: "EFA-INS-008", form: "folder", group: "water", name: "Weekly Spa Checks", freq: ["1W"] },
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
    var a; try { a = JSON.parse(localStorage.getItem("oest.ppm.due") || "{}") || {}; } catch (e) { return {}; }
    var moved = false;
    Object.keys(OLD).forEach(function (k) {
      if (!a[k]) return;
      OLD[k].forEach(function (n) { var id = "EFA-INS-" + n; if (!a[id]) a[id] = a[k]; });
      delete a[k]; moved = true;
    });
    if (moved) try { localStorage.setItem("oest.ppm.due", JSON.stringify(a)); } catch (e) {}
    return fromVantify(a);
  }
  // Zlecenia z Vantify (vantify-plan.js): raz na eksport termin karty = najbliższe otwarte zlecenie
  // (jeśli inspekcja z tego zlecenia jest już wysłana/zakończona w apce → kolejne zlecenie).
  function jobsOf(id) { var V = window.OEST_VANTIFY; return (V && V.jobs && V.jobs[id]) || []; }
  function fromVantify(a) {
    var V = window.OEST_VANTIFY, mk = "oest.ppm.vantify";
    if (!V || !V.jobs) return a;
    try { if (localStorage.getItem(mk) === V.exported) return a; } catch (e) { return a; }
    var st = stages();
    function span(f) { var n = parseInt(f, 10) || 1; return /W$/.test(f) ? 7 * n : 31 * n; }
    function gap(x, y) { return Math.round((parse(x) - parse(y)) / 864e5); }
    Object.keys(V.jobs).forEach(function (id) {
      var j = V.jobs[id], t = P.byId(id);
      if (a[id] && j.some(function (x) { return x.due === a[id]; })) return; // termin już jest zleceniem Vantify (np. po wysłaniu) – nie cofać
      // wysłana / zakończona w apce (także gdy etap na klocku już wygasł): które zlecenie objęła?
      var r = st[id], c = null;
      if (r && r.day && (r.s === "queued" || r.s === "sent" || r.s === "done")) {
        c = j.filter(function (x) { return x.due === r.period; })[0] || j.filter(function (x) { return x.due >= r.day; })[0] || null;
        if (c && c.due !== r.period && gap(c.due, r.day) > span(c.f)) c = null; // wpis z wcześniejszego okresu
      }
      var nx = c ? j[j.indexOf(c) + 1] : j[0];
      if (nx) a[id] = nx.due; else if (c && t && t.freq.length) a[id] = iso(next(t, parse(c.due)));
    });
    try { localStorage.setItem("oest.ppm.due", JSON.stringify(a)); localStorage.setItem(mk, V.exported); } catch (e) {}
    return a;
  }
  function put(id, day) { var a = all(); if (day) a[id] = day; else delete a[id]; try { localStorage.setItem("oest.ppm.due", JSON.stringify(a)); } catch (e) {} }
  P.iso = iso;
  P.byId = function (id) { return P.tasks.filter(function (t) { return t.id === id; })[0] || null; };
  P.due = function (t) { var s = all()[t.id]; return s ? parse(s) : null; };
  P.setDue = function (t, day) { put(t.id, day); };
  // Raport wysłany (dzień raportu „day”): bez terminu liczy od dnia raportu, z terminem przesuwa go o jeden okres
  // Z zleceniem w Vantify: następny termin = kolejne zlecenie po obecnym terminie (jak w Vantify), dalej z częstotliwości.
  P.close = function (t, day) {
    if (!t.freq.length) return;
    var d = P.due(t), cur = d ? iso(d) : day, nj = jobsOf(t.id).filter(function (j) { return j.due > cur; })[0];
    put(t.id, nj ? nj.due : iso(next(t, d || parse(day))));
  };
  P.jobs = function (t) { return jobsOf(t.id); };
  // Terminy karty w zakresie [from, to] (RRRR-MM-DD): zlecenia Vantify od bieżącego terminu, bieżący termin (także
  // ręcznie zmieniony, gdy nie jest datą zlecenia), za ostatnim zleceniem z częstotliwości (plan: jeszcze nie w Vantify).
  // Wspólne dla widoku miesiąca i synchronizacji z kalendarzem telefonu.
  P.occurrences = function (t, from, to) {
    var jobs = jobsOf(t.id), d0 = P.due(t), a = d0 ? iso(d0) : (jobs[0] ? jobs[0].due : ""), out = [];
    if (!a) return out;
    function put(d, e) { if (d >= from && d <= to) { e.d = d; out.push(e); } }
    var real = jobs.filter(function (j) { return j.due >= a; });
    if (!real.some(function (j) { return j.due === a; })) put(a, { plan: !!jobs.length && !real.length, manual: !!jobs.length });
    real.forEach(function (j) { put(j.due, { job: j.no }); });
    var base = real.length ? real[real.length - 1].due : a, f = t.freq[0], m = f && /^(\d+)([WM])$/.exec(f);
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
  P.endsText = function (left) {
    var T = function (pl, en) { return window.OESTT ? window.OESTT(pl, en) : en; };
    if (left === null) return T("Brak terminu – ustaw w Update", "No date – set Update");
    if (left === 0) return T("Dziś", "Today");
    if (left < 0) return T("Po terminie " + -left + " dni", "Overdue " + -left + "d");
    return T("Zostało " + left + " dni", "Ends in " + left + "d");
  };

  // ---------- etap inspekcji na klocku (02/11/2026) ----------
  // localStorage "oest.ppm.stage" = { id: { s, at, period, photos, thumb, issues, total, manual } }
  // s: prog = W trakcie, hold = Wstrzymana, done = Zakończona (bez wysyłki), queued = W kolejce, sent = Wysłana.
  // period = termin (RRRR-MM-DD), którego dotyczy wpis. Wpis „zamyka” okres, dopóki nie minie ten termin (albo dzień wysłania, jeśli po terminie).
  var SK = "oest.ppm.stage";
  function stages() { try { return JSON.parse(localStorage.getItem(SK) || "{}") || {}; } catch (e) { return {}; } }
  function today0() { var n = new Date(); return iso(new Date(n.getFullYear(), n.getMonth(), n.getDate())); }
  function alive(r) { if (!r || !r.s) return false; if (r.s === "prog" || r.s === "hold" || r.s === "queued") return true; /* w kolejce: aż raport faktycznie wyjdzie */ var end = r.period && r.period > r.day ? r.period : r.day; return !!end && today0() <= end; }
  P.stage = function (t) { var r = stages()[t.id]; return alive(r) ? r : null; };
  P.setStage = function (t, patch) {
    var a = stages(), r = alive(a[t.id]) ? a[t.id] : {};
    if (patch === null) delete a[t.id];
    else { r = Object.assign({}, r, patch); if (!r.period) { var d = P.due(t); r.period = d ? iso(d) : ""; } r.day = r.day || today0(); r.at = Date.now(); a[t.id] = r; }
    try { localStorage.setItem(SK, JSON.stringify(a)); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent("oest:ppm-stage")); } catch (e) {}
  };
  // już wysłane / zakończone w tym okresie → ponowne wysłanie to poprawka (termin się nie przesuwa)
  P.closed = function (t) { var r = P.stage(t); return !!r && (r.s === "queued" || r.s === "sent" || r.s === "done"); };
  // raport faktycznie wyszedł (moduł wysyłki / Apps Script): W kolejce → Wysłana
  P.markSent = function (id) { var t = P.byId(id); if (!t) return; var r = stages()[id]; if (r && (r.s === "queued" || r.s === "sent")) { r.s = "sent"; r.sentAt = Date.now(); r.day = today0(); /* klocek „Wysłana” żyje co najmniej do końca dnia wysyłki */ var a = stages(); a[id] = r; try { localStorage.setItem(SK, JSON.stringify(a)); } catch (e) {} try { window.dispatchEvent(new CustomEvent("oest:ppm-stage")); } catch (e) {} } };
  // raport usunięty z kolejki przed wysłaniem: okres znów otwarty
  P.unqueue = function (id) { var t = P.byId(id), r = stages()[id]; if (t && r && r.s === "queued") { if (r.period) P.setDue(t, r.period); P.setStage(t, null); } }; // termin wraca na ten sprzed wysłania
  // krótka nazwa na klocek (pełna zostaje w raporcie) + budynek ze znaczka w nawiasie
  var BLD = { TA: "Tower A", TB: "Tower B", P: "Pavilion" };
  P.short = function (t) {
    var m = /\s*\((TA|TB|P)(?:,\s*([^)]+))?\)\s*$/.exec(t.name), n = m ? t.name.slice(0, m.index) : t.name;
    n = n.replace(/^Weekly /, "").replace(/^Monthly /, "").replace(/ Operation Test(ing)?$/, " Test").replace(/^Automatic Transfer Switches$/, "ATS").replace(/ of Seldom Used Outlets$/, " (seldom used)");
    if (n === "ATS" && m && m[2]) { n = "ATS " + m[2]; m[2] = ""; }
    return { name: n, bld: m ? m[1] : "", where: [m ? BLD[m[1]] : "", m && m[2] || "", t.where || ""].filter(Boolean).join(" · ") };
  };
})(window.OEST_PPM);
