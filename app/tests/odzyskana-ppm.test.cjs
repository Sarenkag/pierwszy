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
  assert.equal(a.writes.length, 0, 'nic nie zapisane w telefonie');
  assert.deepEqual(a.data, before);
  assert.equal(a.P.stage(t).s, 'queued', 'w pamięci strony działa jak zwykle'); assert.equal(a.P.needs(t).sp, true);
});

test('bez sandbox zapisy idą do telefonu jak dotąd', () => {
  const a = load();
  const t = a.P.tasks[0];
  a.P.setStage(t, { s: 'prog' });
  assert.ok(a.writes.includes('oest.ppm.stage'));
  assert.equal(a.P.sandboxed(), false);
});
