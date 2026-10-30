// Lista PPM One Eastside (od Grzegorza, 30/10/2026). Karty jak w systemie: część zbiorcza, część rozdzielona.
// freq: "1W", "3M" itd.; kilka częstotliwości (np. 1M + 12M) — termin liczy się z najkrótszej.
// open: karta otwiera istniejący rodzaj inspekcji z listą urządzeń (db, ats, iso).
window.OEST_PPM = {
  groups: [
    { id: "fire", name: "Fire", color: "#e5534b" },
    { id: "water", name: "Water", color: "#3b8eea" },
    { id: "elec", name: "Electrical", color: "#e3b341" },
    { id: "mech", name: "Mechanical", color: "#3fb27f" },
    { id: "sub", name: "Sub", color: "#a371f7" }
  ],
  tasks: [
    { id: "fa-weekly", group: "fire", name: "Weekly Fire Alarm Test", where: "Tower A, Tower B, Pavilion", freq: ["1W"] },
    { id: "spr-weekly", group: "fire", name: "Weekly Sprinkler Testing", freq: ["1W"] },
    { id: "aov-weekly", group: "fire", name: "AOV Operation Test", where: "Tower A, Tower B", freq: ["1W"] },
    { id: "el-ta-pv", group: "fire", name: "Emergency Lighting Test", where: "Tower A, Pavilion", freq: ["1M", "12M"] },
    { id: "el-tb", group: "fire", name: "Emergency Lighting Test", where: "Tower B", freq: ["1M"] },
    { id: "ats", group: "fire", name: "ATS Inspections (5)", freq: ["1M"], open: "ats" },

    { id: "flush", group: "water", name: "Weekly Flushing / Seldom Used Outlets", where: "Tower A, Tower B, Pavilion", freq: ["1W"] },
    { id: "wtemp", group: "water", name: "Water Temperature Checks / Tap Temperature", where: "Tower A, Tower B, Pavilion", freq: ["1M"] },
    { id: "shower", group: "water", name: "Showerhead Clean & De-scale", freq: ["3M"] },
    { id: "spa-daily", group: "water", name: "Daily Spa Pool Sampling", freq: ["1W"] },
    { id: "spa-weekly", group: "water", name: "Weekly Spa Checks", freq: ["1W"] },
    { id: "wfeature", group: "water", name: "Water Feature Checks", freq: ["1W"] },

    { id: "db", group: "elec", name: "Distribution Boards (18)", freq: ["3M", "6M", "12M"], open: "db" },
    { id: "iso", group: "elec", name: "Isolator Inspections", freq: ["3M", "12M"], open: "iso" },
    { id: "lighting", group: "elec", name: "Monthly Lighting Checks", freq: ["1M"] },

    { id: "plant-weekly", group: "mech", name: "Weekly Plant Status Checks", freq: ["1W"] },
    { id: "plant-room", group: "mech", name: "Monthly Plant Room Inspections", freq: ["1M"] },
    { id: "meters", group: "mech", name: "Monthly Meter Readings", freq: ["1M"] },
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
  function all() { try { return JSON.parse(localStorage.getItem("oest.ppm.due") || "{}") || {}; } catch (e) { return {}; } }
  function put(id, day) { var a = all(); if (day) a[id] = day; else delete a[id]; try { localStorage.setItem("oest.ppm.due", JSON.stringify(a)); } catch (e) {} }
  P.iso = iso;
  P.byId = function (id) { return P.tasks.filter(function (t) { return t.id === id; })[0] || null; };
  P.due = function (t) { var s = all()[t.id]; return s ? parse(s) : null; };
  P.setDue = function (t, day) { put(t.id, day); };
  // Raport wysłany (dzień raportu „day”): bez terminu liczy od dnia raportu, z terminem przesuwa go o jeden okres
  P.close = function (t, day) { var d = P.due(t); put(t.id, iso(next(t, d || parse(day)))); };
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
