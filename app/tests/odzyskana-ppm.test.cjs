// Odzyskana inspekcja (etap 2c, Grzegorz 08/11/2026): edycja kopii wysłanego raportu nie zmienia listy PPM.
// OEST_PPM.sandbox(id): zapisy (etap, termin, ⚙ wysyłki, „Nie rozpoczęta”) tylko w pamięci strony, telefon bez zmian;
// karta odzyskanej inspekcji zaczyna bez etapu, inne karty czytane normalnie.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const src = fs.readFileSync(path.resolve(__dirname, '../www/ppm.js'), 'utf8');

function load(init) {
  const data = new Map(Object.entries(init || {})), writes = [];
  const win = { addEventListener() {}, dispatchEvent() {} };
  const ctx = { window: win, localStorage: { getItem: k => data.has(k) ? data.get(k) : null, setItem(k, v) { writes.push(k); data.set(k, v); } }, CustomEvent: function () {} };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  return { P: win.OEST_PPM, data, writes };
}

test('sandbox: Wyślij/Update odzyskanej nie zmienia etapu, terminu ani ⚙ karty w telefonie', () => {
  const a = load();
  const t = a.P.tasks.find(x => x.freq && x.freq.length), other = a.P.tasks.find(x => x !== t && x.freq && x.freq.length);
  a.P.setStage(other, { s: 'prog' }); // stan sprzed odzyskania (inna karta)
  a.P.setStage(t, { s: 'sent', period: '2026-11-06' });
  const before = new Map(a.data); a.writes.length = 0;
  a.P.sandbox(t.id);
  assert.equal(a.P.stage(t), null, 'odzyskana zaczyna bez etapu (pigułka Odzyskana)');
  assert.equal(a.P.closed(t), false, 'ponowne Wyślij nie jest „poprawką” zamkniętej karty');
  assert.equal(a.P.stage(other).s, 'prog', 'inne karty czytane normalnie');
  a.P.setStage(t, { s: 'queued', mail: 'queued', mailId: 'q1' });
  a.P.close(t, '2026-11-08'); a.P.setDue(t, '2026-12-01'); a.P.setNeeds(t, { sp: true }); a.P.setUnstarted(t, { photos: 1 });
  const mine = k => { const v = JSON.parse(a.data.get(k) || '{}'); return JSON.stringify(v[t.id]); };
  for (const k of ['oest.ppm.stage', 'oest.ppm.due', 'oest.ppm.needs', 'oest.ppm.unstarted', 'oest.ppm.done']) assert.equal(mine(k), (() => { const v = JSON.parse(before.get(k) || '{}'); return JSON.stringify(v[t.id]); })(), k + ': wpis karty w telefonie bez zmian');
  assert.equal(a.P.stage(t).s, 'queued', 'w pamięci strony działa jak zwykle'); assert.equal(a.P.needs(t).sp, true);
});

test('bez sandbox zapisy idą do telefonu jak dotąd', () => {
  const a = load();
  const t = a.P.tasks[0];
  a.P.setStage(t, { s: 'prog' });
  assert.ok(a.writes.includes('oest.ppm.stage'));
  assert.equal(a.P.sandboxed(), false);
});

test('sandbox: potwierdzenie wysłania INNEJ inspekcji (kolejka na tej stronie) zostaje w telefonie (uwaga Codex #101)', () => {
  const a = load();
  const t = a.P.tasks.find(x => x.freq && x.freq.length), other = a.P.tasks.find(x => x !== t && x.freq && x.freq.length);
  a.P.setStage(other, { s: 'queued', mail: 'queued', mailId: 'q9' });
  a.P.sandbox(t.id);
  a.P.setStage(t, { s: 'prog' });
  a.P.markSent(other.id, 'q9');
  const real = JSON.parse(a.data.get('oest.ppm.stage'));
  assert.equal(real[other.id].s, 'sent', 'inna karta: Wysłana zapisana w telefonie');
  assert.equal(real[t.id], undefined, 'odzyskana karta: nic w telefonie');
  assert.equal(a.P.stage(t).s, 'prog', 'odzyskana: etap tylko w pamięci strony');
});

test('sandbox: potwierdzenie wysłania zwykłego raportu TEJ SAMEJ karty zostaje w telefonie (uwaga Codex #101, runda 3)', () => {
  const a = load();
  const t = a.P.tasks.find(x => x.freq && x.freq.length);
  a.P.setStage(t, { s: 'queued', mail: 'queued', mailId: 'q7' }); // zwykły raport czeka w kolejce
  a.P.sandbox(t.id);
  a.P.setStage(t, { s: 'prog' }); // edycja odzyskanej
  a.P.markSent(t.id, 'q7'); // kolejka wysłała zwykły raport
  assert.equal(JSON.parse(a.data.get('oest.ppm.stage'))[t.id].s, 'sent', 'zwykła karta: Wysłana zapisana w telefonie');
  a.P.setStage(t, { s: 'hold' }); // kolejna edycja odzyskanej nie cofa potwierdzenia
  assert.equal(JSON.parse(a.data.get('oest.ppm.stage'))[t.id].s, 'sent', 'po dalszej edycji odzyskanej nadal Wysłana');
  assert.equal(a.P.stage(t).s, 'hold', 'odzyskana: etap tylko w pamięci strony');
});
