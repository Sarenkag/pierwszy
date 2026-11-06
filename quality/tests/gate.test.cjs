// Testy samej bramki: dowód, że każda kontrola naprawdę łapie problem (a nie tylko przechodzi na obecnym kodzie).
// Działają na sztucznych mini-projektach w katalogu tymczasowym; nie dotykają apki.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawnSync, execFileSync } = require('node:child_process');
const Q = path.resolve(__dirname, '..');
const run = (script, args, cwd) => { const p = spawnSync(process.execPath, [path.join(Q, script), ...args], { cwd: cwd || Q, encoding: 'utf8' }); return { code: p.status, out: (p.stdout || '') + (p.stderr || '') }; };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'oest-qg-'));
const write = (root, files) => { for (const [f, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), c); } };

// ---------- G1: architektura ----------
function www(extraIndex = '', extraFiles = {}) {
  const d = tmp();
  write(d, {
    'index.html': `<script src="moduly/a/a.js"></script><script src="app.js"></script>${extraIndex}`,
    'inspekcje/index.html': `<script src="../moduly/a/a.js"></script>`,
    'moduly/a/a.js': `(function(w){ w.OESTA = { x: 1 }; })(window);`,
    'app.js': `(function(w){ w.OESTApp = { go(){ return w.OESTA.x; } }; })(window); // tekst "OESTNic" w napisie to nie użycie`,
    ...extraFiles
  });
  return d;
}
const g1 = (d, baseline) => { const b = path.join(d, 'baseline.json'); fs.writeFileSync(b, JSON.stringify({ entries: (baseline || []).map(id => ({ id })) })); return run('check-architecture.cjs', ['--www', d, '--baseline', b, '--json', path.join(d, 'out.json')]); };

test('G1: czysty układ = PASS, napisy i komentarze nie liczą się jako użycie', () => {
  const r = g1(www()); assert.equal(r.code, 0, r.out); assert.match(r.out, /G1 PASS/);
});
test('G1: skrypt używający API ładowanego później = nowe naruszenie LOAD_ORDER → FAIL', () => {
  const d = www('<script src="late.js"></script>', { 'app.js': '(function(w){ w.OESTApp = { go(){ return w.OESTLate.y; } }; })(window);', 'late.js': '(function(w){ w.OESTLate = { y: 2 }; })(window);' });
  const r = g1(d); assert.equal(r.code, 1); assert.match(r.out, /LOAD_ORDER/);
});
test('G1: brakujący plik skryptu → MISSING_SCRIPT → FAIL', () => {
  const r = g1(www('<script src="nie-ma.js"></script>')); assert.equal(r.code, 1); assert.match(r.out, /MISSING_SCRIPT/);
});
test('G1: moduł zależny od kodu apki → MODULE_DEPENDS_ON_APP → FAIL', () => {
  const d = www('', { 'moduly/a/a.js': '(function(w){ w.OESTA = { x: () => w.OESTApp }; })(window);' });
  const r = g1(d); assert.equal(r.code, 1); assert.match(r.out, /MODULE_DEPENDS_ON_APP/);
});
test('G1: to samo API w dwóch plikach → DUPLICATE_DEFINITION → FAIL', () => {
  const d = www('<script src="b.js"></script>', { 'b.js': '(function(w){ w.OESTA = {}; })(window);' });
  const r = g1(d); assert.equal(r.code, 1); assert.match(r.out, /DUPLICATE_DEFINITION/);
});
test('G1: naruszenie z baseline przechodzi, a wpis baseline, który już nie występuje, daje FAIL (baseline tylko maleje)', () => {
  const d = www('<script src="nie-ma.js"></script>');
  assert.equal(g1(d, ['MISSING_SCRIPT|index.html|nie-ma.js']).code, 0);
  const clean = www(); const r = g1(clean, ['MISSING_SCRIPT|index.html|nie-ma.js']);
  assert.equal(r.code, 1); assert.match(r.out, /baseline nieaktualny/);
});

// ---------- G0/G2: runner PASS / FAIL / SKIPPED / NOT RUN ----------
function project(manifest, files) {
  const d = tmp(); write(d, { 'quality/required-tests.json': JSON.stringify(manifest), ...files }); fs.mkdirSync(path.join(d, 'app/tests'), { recursive: true }); return d;
}
const gate = (d, part) => { const out = path.join(d, 'r.json'); const r = run('run-gate.cjs', ['--root', d, '--part', part, '--out', out]); return { ...r, json: JSON.parse(fs.readFileSync(out, 'utf8')) }; };
const statusOf = (j, f) => j.results.find(r => r.id === f).status;

test('Runner Node: PASS, FAIL, SKIPPED (test.skip/todo) i NOT RUN (brak pliku) są rozróżniane; tylko same PASS = sukces', () => {
  const d = project({ node: [{ file: 'app/tests/ok.test.cjs' }, { file: 'app/tests/zly.test.cjs' }, { file: 'app/tests/skip.test.cjs' }, { file: 'app/tests/brak.test.cjs' }], browser: [], allowedSkips: [] }, {
    'app/tests/ok.test.cjs': "require('node:test')('a',()=>{});",
    'app/tests/zly.test.cjs': "require('node:test')('a',()=>{require('node:assert').equal(1,2)});",
    'app/tests/skip.test.cjs': "const t=require('node:test');t('a',()=>{});t.skip('b',()=>{});",
    'app/tests/nowy.test.cjs': "require('node:test')('a',()=>{});"
  });
  const r = gate(d, 'node');
  assert.equal(r.code, 1);
  assert.equal(statusOf(r.json, 'app/tests/ok.test.cjs'), 'PASS');
  assert.equal(statusOf(r.json, 'app/tests/zly.test.cjs'), 'FAIL');
  assert.equal(statusOf(r.json, 'app/tests/skip.test.cjs'), 'SKIPPED');
  assert.equal(statusOf(r.json, 'app/tests/brak.test.cjs'), 'NOT RUN');
  assert.equal(statusOf(r.json, 'app/tests/nowy.test.cjs'), 'PASS', 'test spoza listy też jest uruchamiany');
});
test('Runner Node: wszystkie PASS = kod 0', () => {
  const d = project({ node: [{ file: 'app/tests/ok.test.cjs' }], browser: [], allowedSkips: [] }, { 'app/tests/ok.test.cjs': "require('node:test')('a',()=>{});" });
  assert.equal(gate(d, 'node').code, 0);
});
test('Runner przeglądarkowy: kod 0 bez potwierdzenia PASS = NOT RUN; brak zbudowanej strony = NOT RUN', () => {
  const m = { node: [], browser: [{ file: 'app/tests/a-ui-check.cjs', passMarker: 'A PASS' }, { file: 'app/tests/b-ui-check.cjs', passMarker: 'B PASS' }], allowedSkips: [] };
  const d = project(m, { 'app/tests/a-ui-check.cjs': "console.log('A PASS')", 'app/tests/b-ui-check.cjs': "/* wyszedł wcześnie */" });
  let r = gate(d, 'browser'); assert.equal(statusOf(r.json, 'app/tests/a-ui-check.cjs'), 'NOT RUN'); // brak app/www
  write(d, { 'app/www/inspekcje/index.html': '', 'app/www/ppm.js': '' });
  r = gate(d, 'browser');
  assert.equal(statusOf(r.json, 'app/tests/a-ui-check.cjs'), 'PASS');
  assert.equal(statusOf(r.json, 'app/tests/b-ui-check.cjs'), 'NOT RUN');
  assert.equal(r.code, 1);
});
test('Runner: pominięta inspekcja w raport-ui-check = SKIPPED, także gdy test jej nie zgłosił', () => {
  const m = { node: [], browser: [{ file: 'app/tests/raport-ui-check.cjs', passMarker: 'raport-ui-check: ', scenarios: 'ppm-inspections' }], allowedSkips: [] };
  const d = project(m, {
    'app/www/inspekcje/index.html': '', 'app/www/ppm.js': "['EFA-INS-001','EFA-INS-002','EFA-INS-003']",
    'app/tests/raport-ui-check.cjs': "console.log('raport-ui-check: 1 inspekcji, każda ma Word i PDF: EFA-INS-001 | pominięte (wymagają odpowiedzi): EFA-INS-002')"
  });
  const r = gate(d, 'browser'), row = r.json.results[0];
  assert.equal(row.status, 'SKIPPED'); assert.deepEqual(row.scenarios.missing, ['EFA-INS-002', 'EFA-INS-003']); assert.deepEqual(row.scenarios.silent, ['EFA-INS-003']);
  assert.equal(r.code, 1);
});

// ---------- ochrona kryteriów (ratchet) ----------
function repo(manifest, baseline) {
  const d = tmp(), g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'ignore' });
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  write(d, { 'quality/required-tests.json': JSON.stringify(manifest), 'quality/baselines/architecture.json': JSON.stringify({ entries: baseline.map(id => ({ id })) }), 'app/tests/a.test.cjs': '' });
  g('add', '-A'); g('commit', '-qm', 'base'); g('checkout', '-qb', 'pr');
  return { d, g };
}
const M = { node: [{ file: 'app/tests/a.test.cjs' }], browser: [{ file: 'app/tests/x-ui-check.cjs', passMarker: 'X PASS', timeoutSec: 900 }], allowedSkips: [] };
const ratchet = d => run('check-ratchet.cjs', ['--root', d, '--base', 'main']);

test('Ratchet: bez zmian = PASS', () => { const { d } = repo(M, ['X']); assert.equal(ratchet(d).code, 0); });
test('Ratchet: usunięcie testu z listy, zmiana passMarker, dłuższy limit, nowy wyjątek → FAIL', () => {
  for (const mod of [m => { m.node = []; }, m => { m.browser[0].passMarker = 'X'; }, m => { m.browser[0].timeoutSec = 5000; }, m => { m.allowedSkips = [{ id: 'app/tests/a.test.cjs#skip' }]; }]) {
    const { d, g } = repo(M, []); const m = JSON.parse(JSON.stringify(M)); mod(m);
    write(d, { 'quality/required-tests.json': JSON.stringify(m) }); g('commit', '-qam', 'pr');
    const r = ratchet(d); assert.equal(r.code, 1, r.out);
  }
});
test('Ratchet: nowy wpis w baseline → FAIL; usunięcie wpisu → PASS', () => {
  let { d, g } = repo(M, ['X']);
  write(d, { 'quality/baselines/architecture.json': JSON.stringify({ entries: [{ id: 'X' }, { id: 'Y' }] }) }); g('commit', '-qam', 'pr');
  assert.equal(ratchet(d).code, 1);
  ({ d, g } = repo(M, ['X', 'Y']));
  write(d, { 'quality/baselines/architecture.json': JSON.stringify({ entries: [{ id: 'X' }] }) }); g('commit', '-qam', 'pr');
  assert.equal(ratchet(d).code, 0);
});
test('Ratchet: usunięcie pliku testu z app/tests → FAIL', () => {
  const { d, g } = repo(M, []); g('rm', '-q', 'app/tests/a.test.cjs'); g('commit', '-qm', 'pr');
  const r = ratchet(d); assert.equal(r.code, 1); assert.match(r.out, /Usunięto\/przeniesiono plik testu/);
});
