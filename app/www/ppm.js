// Lista PPM One Eastside: 28 inspekcji startowych + rozdzielnice i izolatory + podwykonawcy (Sub).
// freq: "1W", "3M" itd.; kilka częstotliwości (np. 1M + 12M) — termin liczy się z najkrótszej.
// open: karta otwiera istniejący rodzaj inspekcji z listą urządzeń (db, iso).
window.OEST_PPM = {
  groups: [
    { id: "fire", name: "Fire", color: "#e5534b" },
    { id: "water", name: "Water", color: "#3b8eea" },
    { id: "elec", name: "Electrical", color: "#e3b341" },
    { id: "mech", name: "Mechanical", color: "#3fb27f" },
    { id: "sub", name: "Sub", color: "#a371f7" }
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
      { key: "lights", cp: "Indicators normal", ok: "Controller indicator lights showing normal status.", fail: "Controller indicator lights showing abnormal or fault status." } ] },
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
      { key: "fittings", cp: "Fittings intact", ok: "Fittings: no damaged, loose or missing diffusers/covers.", fail: "Fittings: damaged, loose or missing diffusers/covers found." } ] },
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
    { id: "EFA-INS-004", form: "folder", group: "water", name: "Weekly Flushing (TA)", freq: ["1W"] },
    { id: "EFA-INS-005", group: "fire", name: "Weekly Sprinkler Testing", freq: ["1W"], cfg: true },
    { id: "EFA-INS-006", form: "folder", group: "fire", name: "Weekly Fire Alarm Test (TA)", freq: ["1W"] },
    { id: "EFA-INS-007", group: "water", name: "Water Feature Checks", freq: ["1W"], cfg: true },
    { id: "EFA-INS-008", form: "folder", group: "water", name: "Weekly Spa Checks", freq: ["1W"] },
    { id: "EFA-INS-009", form: "folder", group: "water", name: "Daily Spa Pool Sampling", freq: ["1W"] },
    { id: "EFA-INS-010", group: "water", name: "Monthly Tap Temperature Check (P)", freq: ["1M"], cfg: true },
    { id: "EFA-INS-011", group: "fire", name: "Monthly Emergency Lighting Test (P)", freq: ["1M",  "12M"], cfg: true },
    { id: "EFA-INS-012", form: "folder", group: "water", name: "Weekly Flushing of Seldom Used Outlets (P)", freq: ["1W"] },
    { id: "EFA-INS-013", form: "folder", group: "fire", name: "Weekly Fire Alarm Test (P)", freq: ["1W"] },
    { id: "EFA-INS-014", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, L13)", freq: ["1M"] },
    { id: "EFA-INS-015", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, L12)", freq: ["1M"] },
    { id: "EFA-INS-016", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, UG)", freq: ["1M"] },
    { id: "EFA-INS-017", group: "elec", form: "ats", name: "Automatic Transfer Switches (TB, R2)", freq: ["1M"] },
    { id: "EFA-INS-018", group: "elec", form: "ats", name: "Automatic Transfer Switches (TA, R1)", freq: ["1M"] },
    { id: "EFA-INS-019", form: "folder", group: "fire", name: "AOV Operation Test (TB)", freq: ["1W"] },
    { id: "EFA-INS-020", group: "mech", form: "plantM", name: "Monthly Plant Room Inspections", freq: ["1M"] },
    { id: "EFA-INS-021", group: "mech", form: "plantW", name: "Weekly Plant Status Checks", freq: ["1W"] },
    { id: "EFA-INS-022", group: "elec", form: "lighting", name: "Monthly Lighting Checks", freq: ["1M"] },
    { id: "EFA-INS-023", group: "mech", name: "Monthly Meter Readings", freq: ["1M"], cfg: true },
    { id: "EFA-INS-024", group: "water", form: "tempTB", name: "Water Temperature Checks (TB)", freq: ["1M"] },
    { id: "EFA-INS-025", form: "folder", group: "fire", name: "Weekly Fire Alarm Test (TB)", freq: ["1W"] },
    { id: "EFA-INS-026", form: "folder", group: "water", name: "Weekly Flushing (TB)", freq: ["1W"] },
    { id: "EFA-INS-027", group: "fire", name: "Emergency Lighting Test (TB)", freq: ["1M"], cfg: true },
    { id: "EFA-INS-028", group: "fire", name: "Lift signage TB", freq: [], cfg: true },

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
    return a;
  }
  function put(id, day) { var a = all(); if (day) a[id] = day; else delete a[id]; try { localStorage.setItem("oest.ppm.due", JSON.stringify(a)); } catch (e) {} }
  P.iso = iso;
  P.byId = function (id) { return P.tasks.filter(function (t) { return t.id === id; })[0] || null; };
  P.due = function (t) { var s = all()[t.id]; return s ? parse(s) : null; };
  P.setDue = function (t, day) { put(t.id, day); };
  // Raport wysłany (dzień raportu „day”): bez terminu liczy od dnia raportu, z terminem przesuwa go o jeden okres
  P.close = function (t, day) { if (!t.freq.length) return; var d = P.due(t); put(t.id, iso(next(t, d || parse(day)))); };
  P.daysLeft = function (due) {
    if (!due) return null;
    var n = new Date(), today = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((due - today) / 864e5);
  };
  P.endsText = function (left) {
    if (left === null) return "No date – set Update";
    if (left === 0) return "Today";
    if (left < 0) return "Overdue " + -left + "d";
    return "Ends in " + left + "d";
  };
})(window.OEST_PPM);
