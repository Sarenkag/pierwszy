// Rejestr aktywów z Vantify (aktywa.js): każda przypięta karta istnieje w ppm.js, ATS-y przypięte do właściwych miejsc.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
function load() {
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} } };
  vm.createContext(ctx);
  for (const f of ['ppm.js', 'aktywa.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'www', f), 'utf8'), ctx);
  return ctx.window;
}
test('25 aktywów, unikalne numery Vantify, karty istnieją', () => {
  const w = load(), ids = new Set(w.OEST_PPM.tasks.map(t => t.id));
  assert.strictEqual(w.OEST_ASSETS.length, 25);
  assert.strictEqual(new Set(w.OEST_ASSETS.map(a => a.id)).size, 25);
  for (const a of w.OEST_ASSETS) for (const id of a.app) assert.ok(ids.has(id), a.name + ' → ' + id);
});
test('ATS: aktywo ↔ miejsce jak w Vantify', () => {
  const w = load(), by = Object.fromEntries(w.OEST_ASSETS.map(a => [a.id, a.app[0]]));
  assert.deepStrictEqual([by[127337], by[127336], by[127335], by[127339], by[127338]], ['EFA-INS-014', 'EFA-INS-015', 'EFA-INS-016', 'EFA-INS-017', 'EFA-INS-018']);
});
test('każda z 18 tablic DB ma swoje aktywo', () => {
  const w = load(), linked = new Set(w.OEST_ASSETS.flatMap(a => a.app));
  for (const t of w.OEST_PPM.tasks.filter(t => t.open === 'db')) assert.ok(linked.has(t.id), t.id);
});
test('etap klocka: wysłana zamyka okres do terminu, poprawka nie przesuwa terminu', () => {
  const store = {}, ctx = { window: {}, localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }, CustomEvent: function () {} };
  ctx.window.dispatchEvent = () => {}; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'www', 'ppm.js'), 'utf8'), ctx);
  const P = ctx.window.OEST_PPM, t = P.byId('EFA-INS-003'), d = new Date(), iso = x => x.toISOString().slice(0, 10);
  const later = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 4, 12);
  P.setDue(t, iso(later));
  assert.strictEqual(P.stage(t), null);
  P.setStage(t, { s: 'queued' });
  assert.ok(P.closed(t));
  P.markSent('EFA-INS-003');
  assert.strictEqual(P.stage(t).s, 'sent');
  // stary okres: wpis sprzed terminu, który już minął → klocek wraca do „Nie rozpoczęta”
  store['oest.ppm.stage'] = JSON.stringify({ 'EFA-INS-003': { s: 'sent', period: '2020-01-01', day: '2020-01-01' } });
  assert.strictEqual(P.stage(t), null);
  // w kolejce (bez sieci) zostaje aktywne po terminie, aż raport wyjdzie – drugie wysłanie to poprawka
  store['oest.ppm.stage'] = JSON.stringify({ 'EFA-INS-003': { s: 'queued', period: '2020-01-01', day: '2020-01-01' } });
  assert.ok(P.closed(t));
  // wysłany dopiero po terminie i dniu dodania do kolejki: „Wysłana” zostaje do końca dnia wysyłki
  const keep = store['oest.ppm.stage'];
  P.markSent('EFA-INS-003');
  assert.strictEqual(P.stage(t).s, 'sent');
  assert.ok(P.closed(t));
  store['oest.ppm.stage'] = keep;
  // raport usunięty z kolejki: etap znika, termin wraca
  P.unqueue('EFA-INS-003');
  assert.strictEqual(P.stage(t), null);
  assert.strictEqual(P.iso(P.due(t)), '2020-01-01');
  assert.strictEqual(P.short(P.byId('EFA-INS-014')).name, 'ATS L13');
});
