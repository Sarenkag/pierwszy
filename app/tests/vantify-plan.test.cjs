const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
function fakeDate(day) { const D = Date; return class extends D { constructor(...a) { super(...(a.length ? a : [day + 'T12:00:00'])); } static now() { return new D(day + 'T12:00:00').getTime(); } }; }
// Scenariusze logiki terminów liczą na stałej kopii eksportu z 02/11/2026 (dane/vantify-plan-02112026.js),
// żeby wgranie nowego eksportu Vantify nie zmieniało testów logiki. Bieżący plik sprawdzają testy „plik z eksportu”.
const LIVE = path.join(__dirname, '..', 'www', 'vantify-plan.js'), FIX = path.join(__dirname, 'dane', 'vantify-plan-02112026.js');
function load(store, day, plan = FIX) {
  const ctx = { window: {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, CustomEvent: function () {} };
  if (day) ctx.Date = fakeDate(day); // zegar apki w teście = podany dzień
  else ctx.Date = fakeDate('2026-11-05');
  ctx.window.dispatchEvent = () => {}; vm.createContext(ctx);
  for (const f of [plan, path.join(__dirname, '..', 'www', 'ppm.js')]) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx);
  return ctx.window;
}
test('plik z eksportu: zlecenia Vantify tylko dla id kart z ppm.js, bez danych osobowych', () => {
  for (const plan of [LIVE, FIX]) {
  const w = load({}, null, plan), V = w.OEST_VANTIFY, P = w.OEST_PPM;
  for (const id of Object.keys(V.jobs)) { assert.ok(P.byId(id), id); for (const j of V.jobs[id]) assert.match(j.due, /^\d{4}-\d\d-\d\d$/); }
  assert.doesNotMatch(fs.readFileSync(plan, 'utf8'), /@|07\d{3} /);
  }
});
// Eksport Job z 09/11/2026 (Grzegorz 10/11: „aktualny stan Vantify”): zlecenia zamknięte w Vantify znikają z pliku.
test('plik z eksportu 09/11: dziś 10/11 termin karty = najbliższe otwarte zlecenie z pliku, bez przeliczania', () => {
  const w = load({}, '2026-11-10', LIVE), P = w.OEST_PPM, d = id => P.iso(P.due(P.byId(id)));
  assert.match(w.OEST_VANTIFY.exported, /^2026-11-09-/);
  assert.strictEqual(d('EFA-INS-003'), '2026-11-20'); // 06/11 i 13/11 zamknięte w Vantify
  assert.strictEqual(P.jobFor(P.byId('EFA-INS-003'), '2026-11-20').no, '3000623');
  assert.strictEqual(d('EFA-INS-005'), '2026-11-13');
  assert.strictEqual(d('EFA-INS-027'), '2026-12-10'); // 2991778 (10/11) zamknięte w Vantify
  for (const [id, jobs] of Object.entries(w.OEST_VANTIFY.jobs)) assert.strictEqual(d(id), jobs.find(j => j.due >= '2026-11-10').due, id);
});
// Grzegorz 05/11/2026: terminy DOKŁADNIE jak w pliku Vantify; apka niczego nie przesuwa; inspekcję kończy tylko on.
// Dziś w testach = 05/11/2026 (dzień zgłoszenia: Water Feature Checks 2985235 zniknęła z 06/11).
function at(day, fn) { return fn(); }
function loadAt(day, store) { const w = load(store, day); return { w, P: w.OEST_PPM, due: t => w.OEST_PPM.iso(w.OEST_PPM.due(t)) }; }
test('scenariusz Grzegorza 05/11: stare zapisy z testów nie przesuwają terminu – Water Feature 2985235 i AOV TA na 06/11', () => {
  const stage = { 'EFA-INS-007': { s: 'done', day: '2026-10-31', period: '' }, 'EFA-INS-003': { s: 'sent', day: '2026-11-01', period: '2026-10-31' } };
  const store = { 'oest.ppm.stage': JSON.stringify(stage), 'oest.ppm.due': JSON.stringify({ 'EFA-INS-007': '2026-11-13', 'EFA-INS-003': '2026-11-20' }), 'oest.ppm.vantify': '2026-11-02-24b2ce48' };
  const { P, due } = loadAt('2026-11-05', store);
  assert.strictEqual(due(P.byId('EFA-INS-007')), '2026-11-06');
  assert.strictEqual(P.jobFor(P.byId('EFA-INS-007'), '2026-11-06').no, '2985235');
  assert.strictEqual(due(P.byId('EFA-INS-003')), '2026-11-06');
});
test('każda karta z Vantify: termin = zlecenie z pliku (bez zapisów w telefonie)', () => {
  const { w, P, due } = loadAt('2026-11-05', {});
  for (const [id, jobs] of Object.entries(w.OEST_VANTIFY.jobs)) assert.strictEqual(due(P.byId(id)), jobs.find(j => j.due >= '2026-11-05').due, id);
});
test('zapisany/ręczny termin w telefonie nie zmienia terminu z pliku; P.close niczego nie przesuwa', () => {
  const store = { 'oest.ppm.due': JSON.stringify({ 'EFA-INS-004': '2026-11-25' }) };
  const { P, due } = loadAt('2026-11-05', store), t = P.byId('EFA-INS-004');
  assert.strictEqual(due(t), '2026-11-06');
  at('2026-11-05', () => P.close(t, '2026-11-05'));
  assert.strictEqual(due(t), '2026-11-06');
});
test('dopiero gdy Grzegorz zakończy inspekcję dla tego zlecenia, karta pokazuje następne zlecenie z pliku', () => {
  for (const s of ['done', 'queued', 'sent']) {
    const store = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-007': { s, day: '2026-11-06', period: '2026-11-06' } }) };
    { const r = loadAt('2026-11-06', store); assert.strictEqual(r.due(r.P.byId('EFA-INS-007')), '2026-11-13', s); }
  }
  // w trakcie / wstrzymana – nie jest zakończona
  const prog = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-007': { s: 'prog', day: '2026-11-06', period: '2026-11-06' } }) };
  { const r = loadAt('2026-11-06', prog); assert.strictEqual(r.due(r.P.byId('EFA-INS-007')), '2026-11-06'); }
});
test('niezrobione zlecenie po terminie zostaje (zaległe), jak w Vantify', () => {
  const r = loadAt('2026-11-08', {});
  assert.strictEqual(r.due(r.P.byId('EFA-INS-007')), '2026-11-06');
  const done = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-007': { s: 'sent', day: '2026-11-06', period: '2026-11-06' } }) };
  const r2 = loadAt('2026-11-08', done);
  assert.strictEqual(r2.due(r2.P.byId('EFA-INS-007')), '2026-11-13');
});
test('occurrences: tylko zlecenia z pliku, za ostatnim nic nie planuje (PROD-010); sync telefonu używa tego samego', () => at('2026-11-02', () => {
  const w = load({}, '2026-11-02'), P = w.OEST_PPM, t = P.byId('EFA-INS-003'), jobs = P.jobs(t);
  const o = P.occurrences(t, '2026-11-01', '2026-12-31');
  assert.deepStrictEqual(o.filter(x => x.job).map(x => x.d), jobs.map(j => j.due));
  assert.ok(!o.some(x => x.d === '2026-11-13'));   // w pliku Vantify nie ma zlecenia na 13/11
  assert.ok(!o.some(x => x.plan || x.d > jobs[jobs.length - 1].due)); // brak dat za ostatnim zleceniem z importu
  ctxCore(w);
  const ev = w.OESTCalendarCore.generate({ tasks: [t], dues: {}, today: '2026-11-02', config: { weeks: 4, workdayMode: 'all', groups: ['fire', 'water', 'elec', 'mech', 'sub'], exportInspections: true, shiftMarkers: false }, scheduleOn: () => null, occurrences: (x, f, to) => P.occurrences(x, f, to) });
  assert.deepStrictEqual(ev.map(e => e.date), ['2026-11-06', '2026-11-20', '2026-11-27']);
}));
function ctxCore(w) { const m = { exports: {} }; new Function('module', 'exports', 'window', 'globalThis', fs.readFileSync(path.join(__dirname, '..', 'www', 'calendar-core.js'), 'utf8'))(m, m.exports, w, w); if (!w.OESTCalendarCore) w.OESTCalendarCore = m.exports; }

test('zakończenie zostaje, gdy rozpoczynam następną inspekcję (06/11 zrobione, 07/11 start kolejnej)', () => {
  const store = {}, r = loadAt('2026-11-06', store), t = r.P.byId('EFA-INS-007');
  r.P.setStage(t, { s: 'done' });
  assert.strictEqual(r.due(t), '2026-11-13');
  const r2 = loadAt('2026-11-07', store), t2 = r2.P.byId('EFA-INS-007');
  r2.P.setStage(t2, { s: 'prog' });
  assert.strictEqual(r2.due(t2), '2026-11-13');
  assert.strictEqual(r2.P.stage(t2).period, '2026-11-13');
});
test('cofnięcie Gotowa/Zakończona otwiera to samo zlecenie, termin z pliku bez zmian', () => {
  const store = {}, r = loadAt('2026-11-06', store), t = r.P.byId('EFA-INS-007');
  r.P.setStage(t, { s: 'done' });
  assert.strictEqual(r.due(t), '2026-11-13');
  r.P.setStage(t, { s: 'prog', manual: true });
  assert.strictEqual(r.due(t), '2026-11-06');
  r.P.setStage(t, { s: 'sent' }); r.P.setStage(t, null);
  assert.strictEqual(r.due(t), '2026-11-06');
});
// PROD-010 / audyt 06/11/2026: po ostatnim zleceniu z importu apka NIE tworzy kolejnego terminu (bez dat „ostatnie + okres”).
function lastJob(id) { const w0 = load({}), jobs = w0.OEST_PPM.jobs(w0.OEST_PPM.byId(id)); return { jobs, last: jobs[jobs.length - 1].due }; }
test('za ostatnim zleceniem z pliku: brak terminu, stara data z telefonu też nie wraca', () => {
  const { last } = lastJob('EFA-INS-007');
  const store = { 'oest.ppm.due': JSON.stringify({ 'EFA-INS-007': '2026-11-13' }), 'oest.ppm.done': JSON.stringify({ 'EFA-INS-007': [last] }) };
  const r = loadAt(last, store), t = r.P.byId('EFA-INS-007');
  assert.strictEqual(r.P.due(t), null);
  assert.strictEqual(r.P.endsText(r.P.daysLeft(r.P.due(t)), t), 'No next Vantify job');
  assert.strictEqual(r.P.occurrences(t, '2026-11-01', '2027-12-31').length, 0);
});
test('zakończenie ostatniego zlecenia z pliku nie tworzy nowego terminu i nic nie zapisuje', () => {
  const { jobs, last } = lastJob('EFA-INS-007');
  const store = { 'oest.ppm.done': JSON.stringify({ 'EFA-INS-007': [jobs[jobs.length - 2].due] }) };
  const r = loadAt(last, store), t = r.P.byId('EFA-INS-007');
  assert.strictEqual(r.due(t), last);
  r.P.setStage(t, { s: 'done' }); r.P.close(t, last);
  assert.strictEqual(r.P.due(t), null);
  assert.strictEqual(store['oest.ppm.due'], undefined); // P.close nic nie zapisał w telefonie
});
test('ostatnie zlecenie: zakończ → zdejmij Gotowa → to samo zlecenie; zakończ znów = znów brak terminu', () => {
  const { jobs, last } = lastJob('EFA-INS-007');
  const store = { 'oest.ppm.done': JSON.stringify({ 'EFA-INS-007': [jobs[jobs.length - 2].due] }) };
  const r = loadAt(last, store), t = r.P.byId('EFA-INS-007');
  r.P.setStage(t, { s: 'done' }); r.P.close(t, last);
  assert.strictEqual(r.P.due(t), null);
  const was = r.P.stage(t); r.P.setDue(t, was.period); r.P.setStage(t, { s: 'prog', manual: true }); // jak unready() w inspekcje/index.html
  assert.strictEqual(r.due(t), last);
  r.P.setStage(t, { s: 'done' }); r.P.close(t, last);
  assert.strictEqual(r.P.due(t), null);
});
test('każda karta z Vantify: po zakończeniu wszystkich zleceń brak terminu i brak dat w kalendarzu', () => {
  const w0 = load({});
  for (const [id, jobs] of Object.entries(w0.OEST_VANTIFY.jobs)) {
    const last = jobs[jobs.length - 1].due, store = { 'oest.ppm.done': JSON.stringify({ [id]: [last] }), 'oest.ppm.due': JSON.stringify({ [id]: '2027-01-15' }) };
    const r = loadAt(last, store), t = r.P.byId(id);
    r.P.close(t, last);
    assert.strictEqual(r.P.due(t), null, id);
    assert.strictEqual(r.P.occurrences(t, '2026-01-01', '2027-12-31').length, 0, id);
  }
});
test('karta bez zleceń Vantify: Update i częstotliwość działają jak dotąd', () => {
  const store = {}, r = loadAt('2026-11-05', store), t = r.P.byId('s-fa');
  assert.strictEqual(r.P.jobs(t).length, 0);
  assert.strictEqual(r.P.due(t), null);
  assert.strictEqual(r.P.endsText(null, t), 'No date – set Update');
  r.P.setDue(t, '2026-11-20');
  assert.strictEqual(r.due(t), '2026-11-20');
  r.P.close(t, '2026-11-20');
  assert.strictEqual(r.due(t), '2027-02-20');
});
// Codex #130: eksport ma tylko otwarte zlecenia. EFA-INS-001 (wszystkie zlecenia zamknięte w Vantify) zostaje kartą Vantify
// (lista „cards”): bez terminu, P.close nic nie zapisuje, kalendarz nic nie planuje, stara data z telefonu się nie liczy.
test('plik z eksportu 09/11: karta Vantify bez otwartych zleceń nie wraca do terminów liczonych w apce (PROD-010)', () => {
  const store = { 'oest.ppm.due': JSON.stringify({ 'EFA-INS-001': '2026-11-01' }) };
  const w = load(store, '2026-11-10', LIVE), P = w.OEST_PPM;
  for (const id of ['EFA-INS-001', 'EFA-INS-011']) {
    const t = P.byId(id);
    assert.strictEqual(P.jobs(t).length, 0, id);
    assert.ok(w.OEST_VANTIFY.cards.includes(id), id);
    assert.strictEqual(P.due(t), null, id);
    P.close(t, '2026-11-10');
    assert.strictEqual(P.due(t), null, id);
    assert.strictEqual(P.occurrences(t, '2026-11-01', '2027-03-31').length, 0, id);
  }
  assert.strictEqual(JSON.parse(store['oest.ppm.due'])['EFA-INS-001'], '2026-11-01'); // nic nowego nie zapisano
  for (const id of Object.keys(w.OEST_VANTIFY.jobs)) assert.ok(w.OEST_VANTIFY.cards.includes(id), id);
});
