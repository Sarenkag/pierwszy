const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
function load(store) {
  const ctx = { window: {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, CustomEvent: function () {} };
  ctx.window.dispatchEvent = () => {}; vm.createContext(ctx);
  for (const f of ['vantify-plan.js', 'ppm.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'www', f), 'utf8'), ctx);
  return ctx.window;
}
test('zlecenia Vantify: tylko id kart z ppm.js, bez danych osobowych', () => {
  const w = load({}), V = w.OEST_VANTIFY, P = w.OEST_PPM;
  for (const id of Object.keys(V.jobs)) { assert.ok(P.byId(id), id); for (const j of V.jobs[id]) assert.match(j.due, /^\d{4}-\d\d-\d\d$/); }
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'www', 'vantify-plan.js'), 'utf8'), /@|07\d{3} /);
});
// Grzegorz 05/11/2026: terminy DOKŁADNIE jak w pliku Vantify; apka niczego nie przesuwa; inspekcję kończy tylko on.
// Dziś w testach = 05/11/2026 (dzień zgłoszenia: Water Feature Checks 2985235 zniknęła z 06/11).
const D = global.Date;
function at(day, fn) { global.Date = class extends D { constructor(...a) { super(...(a.length ? a : [day + 'T12:00:00'])); } static now() { return new D(day + 'T12:00:00').getTime(); } }; try { return fn(); } finally { global.Date = D; } }
function loadAt(day, store) { return at(day, () => { const w = load(store); return { w, P: w.OEST_PPM, due: t => at(day, () => w.OEST_PPM.iso(w.OEST_PPM.due(t))) }; }); }
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
    assert.strictEqual(loadAt('2026-11-06', store).due(load(store).OEST_PPM.byId('EFA-INS-007')), '2026-11-13', s);
  }
  // w trakcie / wstrzymana – nie jest zakończona
  const prog = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-007': { s: 'prog', day: '2026-11-06', period: '2026-11-06' } }) };
  assert.strictEqual(loadAt('2026-11-06', prog).due(load(prog).OEST_PPM.byId('EFA-INS-007')), '2026-11-06');
});
test('niezrobione zlecenie po terminie zostaje (zaległe), jak w Vantify', () => {
  const r = loadAt('2026-11-08', {});
  assert.strictEqual(r.due(r.P.byId('EFA-INS-007')), '2026-11-06');
  const done = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-007': { s: 'sent', day: '2026-11-06', period: '2026-11-06' } }) };
  const r2 = loadAt('2026-11-08', done);
  assert.strictEqual(r2.due(r2.P.byId('EFA-INS-007')), '2026-11-13');
});
test('occurrences: tylko zlecenia z pliku, dalej planowane; sync telefonu używa tego samego', () => at('2026-11-02', () => {
  const w = load({}), P = w.OEST_PPM, t = P.byId('EFA-INS-003'), jobs = P.jobs(t);
  const o = P.occurrences(t, '2026-11-01', '2026-12-31');
  assert.deepStrictEqual(o.filter(x => x.job).map(x => x.d), jobs.map(j => j.due));
  assert.ok(!o.some(x => x.d === '2026-11-13'));   // w pliku Vantify nie ma zlecenia na 13/11
  assert.ok(o.some(x => x.d === '2026-12-18' && x.plan));
  ctxCore(w);
  const ev = w.OESTCalendarCore.generate({ tasks: [t], dues: {}, today: '2026-11-02', config: { weeks: 4, workdayMode: 'all', groups: ['fire', 'water', 'elec', 'mech', 'sub'], exportInspections: true, shiftMarkers: false }, scheduleOn: () => null, occurrences: (x, f, to) => P.occurrences(x, f, to) });
  assert.deepStrictEqual(ev.map(e => e.date), ['2026-11-06', '2026-11-20', '2026-11-27']);
}));
function ctxCore(w) { const m = { exports: {} }; new Function('module', 'exports', 'window', 'globalThis', fs.readFileSync(path.join(__dirname, '..', 'www', 'calendar-core.js'), 'utf8'))(m, m.exports, w, w); if (!w.OESTCalendarCore) w.OESTCalendarCore = m.exports; }
