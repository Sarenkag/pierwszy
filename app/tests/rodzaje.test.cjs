// K02 (21/11/2026): rodzaje inspekcji i gotowe usterki w inspekcje/rodzaje.js; strona ich nie powtarza.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '../..');
const w = {}; w.window = w;
vm.runInNewContext(fs.readFileSync(path.join(root, 'inspekcje/rodzaje.js'), 'utf8'), { window: w });
const R = w.OESTRodzaje, J = x => JSON.parse(JSON.stringify(x)); // tablice z innego kontekstu vm

test('rodzaje: ta sama lista co dotąd w formularzu (id, tytuł EN, liczba punktów)', () => {
  assert.deepEqual(J(R.lista.map(t => [t.id, t.title, (t.checks || []).length])), [
    ['db', 'Distribution Board - Visual Inspection', 16],
    ['ats', 'Automatic Transfer Switch - Visual Inspection', 12],
    ['iso', 'Local Isolators - Visual Inspection', 6]
  ]);
  for (const t of R.lista) for (const c of t.checks) assert.ok(c.key && (c.cp || c.q), t.id + ':' + c.key);
});

test('rodzaje: gotowe usterki, piętro i wieża z kodu urządzenia', () => {
  assert.deepEqual(J(R.usterki.map(f => f.id)), ['dirty', 'display', 'damage', 'label']);
  assert.equal(R.usterkiDla(R.lista[0]).length, 4);
  assert.equal(R.pietro('TB-DB-UG'), 'Upper Ground');
  assert.equal(R.pietro('TB-DB-LG'), 'Lower Ground');
  assert.equal(R.pietro('TB-DB-LL-06'), 'Level 6');
  assert.equal(R.pietro('TB-DB-01'), '');
  assert.equal(R.wieza('TA-DB-UG'), 'Tower A');
  assert.equal(R.wieza('db-tb-01'), 'Tower B');
  assert.equal(R.wieza('PAV-DB-01'), '');
  assert.equal(R.pytaniaMozliwe(R.lista[0]), true);
  assert.equal(R.pytaniaMozliwe({ checks: [{}], temp: true }), false);
  assert.equal(R.pytaniaMozliwe({ checks: [{}], folder: true }), false);
  assert.equal(R.pytaniaMozliwe({ checks: [] }), false);
  assert.equal(R.pytaniaMozliwe(null), false);
});

test('rodzaje: formularz inspekcji bierze dane z modułu i nie ma własnych kopii', () => {
  const html = require('../../quality/strona-inspekcji.cjs').strona(path.join(root, 'inspekcje')).tekst /* strona inspekcji w kolejności ładowania, z częściami (docs/podzial-modulow.md) */;
  assert.doesNotMatch(html, /var TYPES = \[\{/);
  assert.doesNotMatch(html, /var FAULTS = \[/);
  for (const f of ['faultsFor', 'floorOf', 'towerOf', 'qPossible']) assert.doesNotMatch(html, new RegExp('function\\s+' + f + '\\s*\\('), f);
  assert.ok(html.indexOf('<script src="rodzaje.js"></script>') >= 0 && html.indexOf('<script src="rodzaje.js"></script>') < html.indexOf('var RD = window.OESTRodzaje'), 'moduł ładuje się przed formularzem');
  assert.doesNotMatch(html, /serviceWorker\.register\(/, 'strona nie włącza pamięci offline (service worker usunięty 22/11/2026, Grzegorz: w przeglądarce bez pracy offline)');
});
