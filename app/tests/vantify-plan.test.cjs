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
test('termin karty = najbliższe zlecenie (raz na eksport), wysłanie → kolejne zlecenie', () => {
  const store = { 'oest.ppm.due': JSON.stringify({ 'EFA-INS-003': '2026-11-25' }) }, w = load(store), P = w.OEST_PPM, t = P.byId('EFA-INS-003');
  const jobs = P.jobs(t);
  assert.strictEqual(P.iso(P.due(t)), jobs[0].due);
  assert.strictEqual(store['oest.ppm.vantify'], w.OEST_VANTIFY.exported);
  P.close(t, jobs[0].due);
  assert.strictEqual(P.iso(P.due(t)), jobs[1].due);
  assert.strictEqual(P.jobFor(t, jobs[1].due).no, jobs[1].no);
  // drugi odczyt nie nadpisuje terminu ponownie
  assert.strictEqual(P.iso(P.due(t)), jobs[1].due);
  // za ostatnim zleceniem: z częstotliwości
  P.setDue(t, jobs[jobs.length - 1].due); P.close(t, jobs[jobs.length - 1].due);
  const last = new Date(jobs[jobs.length - 1].due + 'T00:00:00'); last.setDate(last.getDate() + 7);
  assert.strictEqual(P.iso(P.due(t)), P.iso(last));
});
test('już wysłana dziś w apce: termin = zlecenie po tym, które obejmuje dzień wysyłki', () => {
  const store = {}, w0 = load(store), P0 = w0.OEST_PPM, t0 = P0.byId('EFA-INS-004'), jobs = P0.jobs(t0);
  const day = jobs[0].due; // wysłana w dniu terminu pierwszego zlecenia
  const s2 = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-004': { s: 'sent', period: '2099-01-01', day } }) };
  const w = load(s2), P = w.OEST_PPM;
  assert.strictEqual(P.iso(P.due(P.byId('EFA-INS-004'))), jobs[1].due);
});
test('wysłana po terminie: kolejne zlecenie po okresie (period), nie po dniu wysyłki; wygasły etap też się liczy', () => {
  const w0 = load({}), jobs = w0.OEST_PPM.jobs(w0.OEST_PPM.byId('EFA-INS-004'));
  const late = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-004': { s: 'queued', period: jobs[0].due, day: '2026-11-07' } }) };
  let P = load(late).OEST_PPM;
  assert.strictEqual(P.iso(P.due(P.byId('EFA-INS-004'))), jobs[1].due);
  // termin już ustawiony na zlecenie Vantify zostaje
  const keep = { 'oest.ppm.due': JSON.stringify({ 'EFA-INS-004': jobs[1].due }) };
  P = load(keep).OEST_PPM;
  assert.strictEqual(P.iso(P.due(P.byId('EFA-INS-004'))), jobs[1].due);
  // stary wpis z poprzedniego okresu (wysłany miesiąc wcześniej) nie zamyka pierwszego zlecenia
  const old = { 'oest.ppm.stage': JSON.stringify({ 'EFA-INS-004': { s: 'sent', period: '2026-09-25', day: '2026-09-25' } }) };
  P = load(old).OEST_PPM;
  assert.strictEqual(P.iso(P.due(P.byId('EFA-INS-004'))), jobs[0].due);
});
test('occurrences: zlecenia, ręczny termin między zleceniami, dalej planowane; sync telefonu używa tego samego', () => {
  const w = load({}), P = w.OEST_PPM, t = P.byId('EFA-INS-003'), jobs = P.jobs(t);
  let o = P.occurrences(t, '2026-11-01', '2026-12-31');
  assert.deepStrictEqual(o.filter(x => x.job).map(x => x.d), jobs.map(j => j.due));
  assert.ok(!o.some(x => x.d === '2026-11-13'));   // w Vantify zrobione z wyprzedzeniem
  assert.ok(o.some(x => x.d === '2026-12-18' && x.plan));
  P.setDue(t, '2026-11-12');
  o = P.occurrences(t, '2026-11-01', '2026-12-31');
  assert.ok(o.some(x => x.d === '2026-11-12' && x.manual));
  ctxCore(w);
  const ev = w.OESTCalendarCore.generate({ tasks: [t], dues: {}, today: '2026-11-02', config: { weeks: 4, workdayMode: 'all', groups: ['fire', 'water', 'elec', 'mech', 'sub'], exportInspections: true, shiftMarkers: false }, scheduleOn: () => null, occurrences: (x, f, to) => P.occurrences(x, f, to) });
  assert.deepStrictEqual(ev.map(e => e.date), ['2026-11-12', '2026-11-20', '2026-11-27']);
});
function ctxCore(w) { const m = { exports: {} }; new Function('module', 'exports', 'window', 'globalThis', fs.readFileSync(path.join(__dirname, '..', 'www', 'calendar-core.js'), 'utf8'))(m, m.exports, w, w); if (!w.OESTCalendarCore) w.OESTCalendarCore = m.exports; }
