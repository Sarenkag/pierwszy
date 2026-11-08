// Folder raportu na Dysku: OEST Raporty / budynek / rodzaj inspekcji (Grzegorz 08/11/2026).
// Funkcja reportFolder z inspekcje/index.html na prawdziwej liście PPM (app/www/ppm.js) – np. rozdzielnica DB-TB-EXT-1 → Tower B / Distribution Boards.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.resolve(__dirname, '../..');
const win = { addEventListener() {}, dispatchEvent() {} };
const ctx = { window: win, localStorage: { getItem: () => null, setItem() {} }, CustomEvent: function () {} };
vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, 'app/www/ppm.js'), 'utf8'), ctx);
const PPM = win.OEST_PPM, html = fs.readFileSync(path.join(root, 'inspekcje/index.html'), 'utf8');
const BUILDING = JSON.parse(/var BUILDING = (\{[^}]+\})/.exec(html)[1].replace(/(\w+):/g, '"$1":'));
const src = html.slice(html.indexOf('function reportFolder'), html.indexOf('function enqueue(r, from)'));
const reportFolder = new Function('PPM', 'BUILDING', src + ';return reportFolder')(PPM, BUILDING);
const task = re => PPM.tasks.find(t => re.test(t.name));

test('rozdzielnica: budynek z raportu, rodzaj = Distribution Boards (nie osobny folder na każdą rozdzielnicę)', () => {
  const t = PPM.tasks.find(x => x.id === 'db-DB-TB-EXT-1');
  assert.ok(t, 'zadanie DB-TB-EXT-1 w liście PPM');
  assert.deepEqual(reportFolder({ ppm: t, type: { name: 'Distribution Boards' } }, { building: 'Tower B' }), ['Tower B', 'Distribution Boards']);
});
test('Flushing TB i ATS TB L13: Tower B / Weekly Flushing, Tower B / ATS', () => {
  const fl = task(/^Weekly Flushing \(TB\)$/), ats = task(/^Automatic Transfer Switches \(TB, L13\)$/);
  assert.deepEqual(reportFolder({ ppm: fl, type: { name: fl.name } }, { wieza: 'TB' }), ['Tower B', 'Weekly Flushing']);
  assert.deepEqual(reportFolder({ ppm: ats, type: { name: 'ATS' } }, {}), ['Tower B', 'ATS']);
});
test('bez budynku: General', () => {
  assert.deepEqual(reportFolder({ type: { name: 'Local Isolators' } }, { wieza: 'One Eastside' }), ['General', 'Local Isolators']);
});
