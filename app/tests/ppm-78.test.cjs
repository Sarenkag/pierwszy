// PROD-011: lista 78 zadań PPM One Eastside (eksport Vantify ppm.csv, Task Name; lista Grzegorza z 30/10/2026) nie może być okrajana.
// Każde z 78 zadań musi mieć kartę w app/www/ppm.js. Część zadań Sub jest celowo zebrana w jedną kartę (np. FA Tower A + Tower B).
// 09/11/2026: przywrócone 5 zadań in-house, które wypadły 31/10/2026 (shower, ahu, efans, odh, hru) – bez zleceń Vantify, bez terminu.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const VANTIFY_78 = {
  'Weekly Flushing (Tower B)': 'EFA-INS-026', 'Weekly Fire Alarm Test (Tower B)': 'EFA-INS-025', 'Emergency Lighting Test (Tower B)': 'EFA-INS-027',
  'Water Temperature Checks (Tower B)': 'EFA-INS-024', 'Monthly Meter Readings': 'EFA-INS-023', 'Monthly Lighting Checks': 'EFA-INS-022',
  'Weekly Plant Status Checks': 'EFA-INS-021', 'Monthly Plant Room Inspections': 'EFA-INS-020', 'AOV Operation Test (Tower B)': 'EFA-INS-019',
  'Automatic Transfer Switches (Tower A, Roof 1)': 'EFA-INS-018', 'Automatic Transfer Switches (Tower B, Roof 2)': 'EFA-INS-017',
  'Automatic Transfer Switches (Tower B, UG)': 'EFA-INS-016', 'Automatic Transfer Switches (Tower B, L12)': 'EFA-INS-015',
  'Automatic Transfer Switches (Tower B, L13)': 'EFA-INS-014', 'Weekly Fire Alarm Test (Pavillion)': 'EFA-INS-013',
  'Weekly Flushing of Seldom Used Outlets (Pavillion)': 'EFA-INS-012', 'Monthly Emergency Lighting Test (Pavillion)': 'EFA-INS-011',
  'Monthly Tap Temperature Check (Pavillion)': 'EFA-INS-010', 'Daily Spa Pool Sampling': 'EFA-INS-009', 'Weekly Spa Checks': 'EFA-INS-008',
  'Water Feature Checks': 'EFA-INS-007', 'Weekly Fire Alarm Test (Tower A)': 'EFA-INS-006', 'Weekly Sprinkler Testing': 'EFA-INS-005',
  'Weekly Flushing (Tower A)': 'EFA-INS-004', 'AOV Operation Testing (Tower A)': 'EFA-INS-003', 'Water Temperature Checks (Tower A)': 'EFA-INS-002',
  'Emergency Lighting Test (Tower A)': 'EFA-INS-001',
  'Isolator Inspections': 'iso', 'Distribution Boards': 'db-DB-TB-EXT-1', 'Distribution Boards (DB-TB-PR-1)': 'db-DB-TB-PR-1',
  'Distribution Boards (DB-TB-LL-LG)': 'db-LL-LG', 'Distribution Boards (DB-TB-LL-UG)': 'db-LL-UG', 'Distribution Boards (DB-TB-FFS-04)': 'db-FFS-04',
  'Distribution Boards (DB-TB-FFS-12)': 'db-FFS-12', 'Distribution Boards (DB-TB-LL-02)': 'db-LL-02', 'Distribution Boards (DB-TB-LL-06)': 'db-LL-06',
  'Distribution Boards (DB-TB-LL-10)': 'db-LL-10', 'Distribution Boards (DB-TB-LL-14)': 'db-LL-14', 'Distribution Boards (MSDB-TB-01)': 'db-MSDB-TB-01',
  'Distribution Boards (MSDB-TB-03)': 'db-MSDB-TB-03', 'Distribution Boards (MSDB-TB-05)': 'db-MSDB-TB-05', 'Distribution Boards (MSDB-TB-06)': 'db-MSDB-TB-06',
  'Distribution Boards (MSDB-TB-08)': 'db-MSDB-TB-08', 'Distribution Boards (MSDB-TB-10)': 'db-MSDB-TB-10', 'Distribution Boards (MSDB-TB-11)': 'db-MSDB-TB-11',
  'Distribution Boards (MSDB-TB-13)': 'db-MSDB-TB-13',
  'Showerhead Clean and De-scale': 'shower', 'Air Handling Units': 'ahu', 'Extract Fans (Tower B)': 'efans', 'Overdoor Heaters - Tower B': 'odh',
  'Heat Recovery Units': 'hru',
  '(Sub) Dry Risers (Tower B)': 's-risers', '(Sub) Automatic Opening Vents (Tower B)': 's-smoke', '(Sub) Smoke Extraction System (Tower B)': 's-smoke',
  '(Sub) Smoke Control System': 's-smoke', '(Sub) Lightning Protection (Tower B)': 's-lightning', '(Sub) Portable Appliance Testing': 's-pat',
  '(Sub) Intruder Alarms (Tower B)': 's-intruder', '(Sub) CCTV System (Tower B)': 's-cctv', '(Sub) Disabled Refuge System (Tower B)': 's-refuge',
  '(Sub) Door Access Control (Tower B)': 's-access', '(Sub) Fire Alarm System (Tower B)': 's-fa', '(Sub) Fire Alarm System (Tower A)': 's-fa',
  '(Sub) Lighting Control System (Tower B)': 's-lcs', '(Sub) Cold Water Storage Tank': 's-cwst', '(Sub) Automatic Doors': 's-doors',
  '(Sub) Automatic Doors (Pavillion)': 's-doors', '(Sub) Air Handling Units': 's-ahu', "(Sub) VRV's (Tower B)": 's-vrv', '(Sub) VRV (Pavillion)': 's-vrv',
  '(Sub) Water Hygiene - Domestic Sampling': 's-hygiene', '(Sub) CWST Inspections': 's-hygiene', '(Sub) Commercial Sprinkler Pumps': 's-spumps',
  '(Sub) Sprinkler System Control Valves - ICV\'s': 's-icv', '(Sub) Sprinkler System ZoneCheck Testing': 's-icv', '(Sub) Monthly Spa Maintenance': 's-spa',
  '(Sub) Monthly Spa Sampling': 's-spa', '(Sub) Fire Dampers (Tower B)': 's-dampers'
};
function load() {
  const store = {}, ctx = { window: {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, CustomEvent: function () {} };
  ctx.window.dispatchEvent = () => {}; vm.createContext(ctx);
  for (const f of ['vantify-plan.js', 'ppm.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'www', f), 'utf8'), ctx);
  return ctx.window;
}
test('78 zadań PPM z Vantify: każde ma kartę w apce, żadna karta nie jest spoza listy', () => {
  const P = load().OEST_PPM, names = Object.keys(VANTIFY_78), ids = new Set(P.tasks.map(t => t.id));
  assert.strictEqual(names.length, 78);
  for (const n of names) assert.ok(ids.has(VANTIFY_78[n]), 'brak karty dla: ' + n + ' → ' + VANTIFY_78[n]);
  const used = new Set(Object.values(VANTIFY_78));
  for (const id of ids) assert.ok(used.has(id), 'karta spoza listy 78: ' + id);
  assert.strictEqual(P.tasks.length, 70); // 78 zadań − 8 zadań Sub zebranych w karty z innym zadaniem
  assert.strictEqual(ids.size, P.tasks.length); // bez powtórzonych id
});
test('przywrócone 5 in-house: grupa, częstotliwość jak w Vantify, bez zleceń i bez terminu na czystym telefonie', () => {
  const P = load().OEST_PPM;
  const want = { shower: ['water', ['3M']], ahu: ['mech', ['6M', '12M']], efans: ['mech', ['6M']], odh: ['mech', ['6M']], hru: ['mech', ['12M']] };
  for (const [id, [g, f]] of Object.entries(want)) {
    const t = P.byId(id); assert.ok(t, id);
    assert.strictEqual(t.group, g, id); assert.deepStrictEqual([...t.freq], f, id);
    assert.ok(!t.by, id + ': in-house, bez firmy podwykonawczej');
    assert.strictEqual(P.jobs(t).length, 0, id);
    assert.strictEqual(P.due(t), null, id); // apka nie wymyśla terminu
    assert.strictEqual(P.occurrences(t, '2026-11-01', '2027-12-31').length, 0, id);
  }
});
