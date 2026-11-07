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
    'app/www/inspekcje/index.html': '',
    // lista jak w apce; EFA-INS-099 tylko w komentarzu – nie jest zadaniem i nie może być wymagane
    'app/www/ppm.js': "// EFA-INS-099 usunięte z listy\nwindow.OEST_PPM = { tasks: [ { id: 'EFA-INS-001' }, { id: 'EFA-INS-002' }, { id: 'EFA-INS-003' }, { id: 'db-X' }, { id: 's-y' } ] };",
    'app/tests/raport-ui-check.cjs': "console.log('raport-ui-check: 1 inspekcji, każda ma Word i PDF: EFA-INS-001 | pominięte (wymagają odpowiedzi): EFA-INS-002')"
  });
  const r = gate(d, 'browser'), row = r.json.results[0];
  assert.equal(row.status, 'SKIPPED'); assert.deepEqual(row.scenarios.missing, ['EFA-INS-002', 'EFA-INS-003']); assert.deepEqual(row.scenarios.silent, ['EFA-INS-003']); assert.equal(row.scenarios.expected, 3, 'tylko EFA-INS z listy zadań, bez komentarzy');
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

// ---------- analiza wpływu zmian (krok 2, tryb „tylko-raport”) ----------
const WPLYW = { tryb: 'tylko-raport', strony: ['index.html', 'inspekcje/index.html'], testy: { 'app/tests/ekran-ui-check.cjs': ['index.html'], 'app/tests/raport-ui-check.cjs': ['inspekcje/index.html'] }, zasobyDynamiczne: {}, pelnaRegresja: ['quality/**', '.github/**', 'app/package.json'], dokumentacja: ['docs/**', '**/*.md'], android: ['app/android/**'] };
const PPM = f => `window.OEST_PPM = { tasks: [ { id: 'EFA-INS-001', form: 'a' }, { id: 'EFA-INS-002', form: 'b' } ], forms: { a: { slots: [['Kran', 'hot']] }, b: { slots: [['${f}', 'cold']] } }, due() { return 1; } };`;
function appRepo() {
  const d = tmp(), g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'ignore' });
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  write(d, {
    'quality/wplyw.json': JSON.stringify(WPLYW), 'quality/required-tests.json': JSON.stringify({ node: [], browser: [{ file: 'app/tests/ekran-ui-check.cjs' }, { file: 'app/tests/raport-ui-check.cjs' }], allowedSkips: [] }),
    'app/www/index.html': '<link rel="stylesheet" href="theme.css"><script src="moduly/m/m.js"></script><script src="ppm.js"></script><script src="ekran.js"></script><a href="inspekcje/index.html">PPM</a><!-- <script src="stary.js"></script> -->',
    'app/www/inspekcje/index.html': '<script src="../moduly/m/m.js"></script><script src="../ppm.js"></script><script src="form.js"></script><a href="../index.html">Wstecz</a>',
    'app/www/theme.css': '', 'app/www/ekran.js': '', 'app/www/sierota.js': '', 'app/www/ppm.js': PPM('Zimny'),
    'moduly/m/m.js': '', 'app/www/moduly/m/m.js': '', 'inspekcje/form.js': '', 'app/www/inspekcje/form.js': '',
    'app/tests/ekran-ui-check.cjs': '', 'app/tests/raport-ui-check.cjs': "require('./pomoc.cjs')", 'app/tests/pomoc.cjs': '', 'app/tests/a.test.cjs': '',
    'docs/X.md': '', 'app/android/A.java': ''
  });
  g('add', '-A'); g('commit', '-qm', 'base'); g('checkout', '-qb', 'pr');
  return { d, g };
}
// zmienia pliki, robi commit i zwraca wynik analizy
function impact(files, event = 'pull_request', prep) {
  const { d, g } = appRepo(); if (prep) prep(d, g); write(d, files); g('add', '-A'); g('commit', '-qm', 'pr', '--allow-empty');
  const out = path.join(d, 'w.json'), r = run('wplyw.cjs', ['--root', d, '--base', 'main', '--event', event, '--json', out]);
  assert.equal(r.code, 0, r.out); return JSON.parse(fs.readFileSync(out, 'utf8'));
}
const sel = w => w.wybrane.map(x => path.basename(x.test)).sort(), skip = w => w.pominiete.map(x => path.basename(x.test)).sort();

test('Wpływ: sama dokumentacja i kod Android = żaden test G2 nie jest potrzebny, każdy z powodem', () => {
  const w = impact({ 'docs/X.md': 'nowe', 'app/android/A.java': '//' });
  assert.equal(w.pelna, false); assert.deepEqual(sel(w), []); assert.deepEqual(skip(w), ['ekran-ui-check.cjs', 'raport-ui-check.cjs']);
  assert.ok(w.pominiete.every(p => /dokumentacja/.test(p.powod) && /android/.test(p.powod)), JSON.stringify(w.pominiete));
});
test('Wpływ: plik jednego ekranu = tylko testy tej strony; link <a href> i komentarz HTML nie są wczytaniem', () => {
  const w = impact({ 'app/www/ekran.js': '//zmiana' });
  assert.deepEqual(sel(w), ['ekran-ui-check.cjs']); assert.deepEqual(skip(w), ['raport-ui-check.cjs']);
  assert.match(w.pominiete[0].powod, /ekran\.js.*nie są wczytywane przez inspekcje\/index\.html/);
  assert.ok(!w.strony['index.html'].includes('inspekcje/index.html') && !w.strony['index.html'].includes('stary.js'));
});
test('Wpływ: moduł wspólny (moduly/) wczytywany przez obie strony = testy obu stron', () => {
  const w = impact({ 'moduly/m/m.js': '//zmiana' });
  assert.deepEqual(sel(w), ['ekran-ui-check.cjs', 'raport-ui-check.cjs']); assert.equal(w.zmiany[0].klasa, 'wspólne');
});
test('Wpływ: dane formularza (ppm.js) = lista dotkniętych inspekcji; zmiana funkcji w ppm.js = wszystkie', () => {
  let w = impact({ 'app/www/ppm.js': PPM('Zimny 2') });
  assert.equal(w.zmiany[0].klasa, 'dane formularza'); assert.deepEqual(w.inspekcje, ['EFA-INS-002']); assert.ok(sel(w).includes('raport-ui-check.cjs'));
  w = impact({ 'app/www/ppm.js': PPM('Zimny').replace('return 1', 'return 2') });
  assert.equal(w.inspekcje, null, 'kod (nie dane) w ppm.js = wszystkie inspekcje');
  const priv = f => `(function(w){ function alive(r){ return ${f}; }\n w.OEST_PPM = {\n  tasks: [ { id: 'EFA-INS-001', form: 'a' } ],\n  forms: { a: { slots: [] } },\n  stage(r){ return alive(r); } }; })(window);`;
  w = impact({ 'app/www/ppm.js': priv('false') }, 'pull_request', (d, g) => { write(d, { 'app/www/ppm.js': priv('true') }); g('commit', '-qam', 'prywatna'); g('branch', '-f', 'main'); });
  assert.equal(w.inspekcje, null, 'zmiana prywatnej funkcji (niewidoczna w eksporcie) = wszystkie inspekcje');
  w = impact({ 'app/www/ppm.js': PPM('Zimny').replace("forms: {", "forms: { wspolne: { rooms: ['B2'] },") });
  assert.equal(w.inspekcje, null, 'zmiana formularza bez zadania o tej nazwie (dane wspólne, np. plantRooms) = wszystkie inspekcje');
});
test('Wpływ: zmieniony test lub jego pomocnik = ten test', () => {
  assert.deepEqual(sel(impact({ 'app/tests/ekran-ui-check.cjs': '//' })), ['ekran-ui-check.cjs']);
  assert.deepEqual(sel(impact({ 'app/tests/pomoc.cjs': '//' })), ['raport-ui-check.cjs']);
  assert.deepEqual(sel(impact({ 'app/tests/a.test.cjs': '//' })), [], 'test Node: G0 i tak zawsze w całości');
});
test('Wpływ: pełna regresja – plik bramki, plik nieznany, plik apki bez wczytania, usunięty plik, nowy test bez mapy', () => {
  const cases = [
    [{ 'quality/x.cjs': '' }, /plik bramki/], [{ 'app/package.json': '{}' }, /plik bramki/], [{ 'Inne/plik.txt': 'x' }, /spoza mapy/],
    [{ 'app/www/sierota.js': '//' }, /żadna strona go nie wczytuje/], [{ 'app/tests/nowy-ui-check.cjs': '' }, /nie ma strony w quality\/wplyw\.json/],
    [{ 'app/tests/dane/zdjecie-1.jpg': 'x' }, /dane testów/], [{ 'app/tests/nikt.cjs': '' }, /nieznani użytkownicy/]
  ];
  for (const [files, why] of cases) { const w = impact(files); assert.equal(w.pelna, true, JSON.stringify(files)); assert.match(w.powodyPelnej.join(' '), why); assert.deepEqual(skip(w), []); }
  const w = impact({}, 'pull_request', (d, g) => g('rm', '-q', 'app/www/ekran.js'));
  assert.equal(w.pelna, true); assert.match(w.powodyPelnej.join(' '), /usunięty/);
});
test('Wpływ: push na main, merge_group i wywołanie z Android APK = zawsze pełna bramka, nawet dla samej dokumentacji', () => {
  for (const ev of ['push', 'merge_group', 'workflow_dispatch']) { const w = impact({ 'docs/X.md': 'x' }, ev); assert.equal(w.pelna, true); assert.deepEqual(skip(w), []); }
});
test('Wpływ: nie ma przełącznika „bezpieczne” – argumenty i zmienne spoza analizy nie zmieniają wyboru', () => {
  const { d, g } = appRepo(); write(d, { 'moduly/m/m.js': '//' }); g('commit', '-qam', 'pr');
  const out = path.join(d, 'w.json');
  const p = spawnSync(process.execPath, [path.join(Q, 'wplyw.cjs'), '--root', d, '--base', 'main', '--event', 'pull_request', '--json', out, '--bezpieczne', '--skip', 'all'], { encoding: 'utf8', env: { ...process.env, OEST_BEZPIECZNE: '1', OEST_SKIP: '1' } });
  assert.equal(p.status, 0); assert.deepEqual(sel(JSON.parse(fs.readFileSync(out, 'utf8'))), ['ekran-ui-check.cjs', 'raport-ui-check.cjs']);
});
test('Ratchet: mapa wpływu może tylko poszerzać testy – zawężenie strony testu, nowy wzorzec dokumentacji, zmiana trybu → FAIL', () => {
  const W = { tryb: 'tylko-raport', strony: ['index.html'], testy: { 'app/tests/x-ui-check.cjs': ['index.html'] }, zasobyDynamiczne: {}, pelnaRegresja: ['quality/**'], dokumentacja: ['docs/**'], android: [] };
  const mods = [m => { m.testy['app/tests/x-ui-check.cjs'] = []; }, m => { m.dokumentacja.push('app/www/**'); }, m => { m.tryb = 'wybor'; }, m => { m.pelnaRegresja = []; }];
  for (const mod of mods) {
    const { d, g } = repo(M, []); write(d, { 'quality/wplyw.json': JSON.stringify(W) }); g('add', '-A'); g('commit', '-qm', 'mapa'); g('branch', '-f', 'main');
    const m = JSON.parse(JSON.stringify(W)); mod(m); write(d, { 'quality/wplyw.json': JSON.stringify(m) }); g('commit', '-qam', 'pr');
    const r = ratchet(d); assert.equal(r.code, 1, r.out); assert.match(r.out, /Mapa wpływu|tryb/);
  }
  const { d, g } = repo(M, []); write(d, { 'quality/wplyw.json': JSON.stringify(W) }); g('add', '-A'); g('commit', '-qm', 'mapa'); g('branch', '-f', 'main');
  const m = JSON.parse(JSON.stringify(W)); m.testy['app/tests/x-ui-check.cjs'].push('inspekcje/index.html'); write(d, { 'quality/wplyw.json': JSON.stringify(m) }); g('commit', '-qam', 'pr');
  assert.equal(ratchet(d).code, 0, 'poszerzenie zakresu jest dozwolone');
});
test('Podsumowanie: analiza wpływu to tylko informacja – „POMINIĘTY (wpływ)” i rozbieżność mapy nie zmieniają wyniku bramki', () => {
  const d = tmp(), ok = { status: 'PASS' };
  const res = (extra) => { write(d, {
    'lang.json': JSON.stringify({ ...ok, detail: '' }), 'node.json': JSON.stringify({ results: [] }), 'architecture.json': JSON.stringify({ ...ok, total: 0, baseline: 0, fresh: [], stale: [] }),
    'ratchet.json': JSON.stringify({ ...ok, errors: [], warnings: [], notes: [] }),
    'browser.json': JSON.stringify({ results: [{ id: 'app/tests/x-ui-check.cjs', status: 'PASS', seconds: 40, wczytane: ['index.html', 'nowy.js'] }, ...extra] }),
    'wplyw.json': JSON.stringify({ tryb: 'tylko-raport', status: 'OK', base: 'abc', pelna: false, powodyPelnej: [], zmiany: [{ plik: 'docs/a.md', klasa: 'dokumentacja', powod: 'nie trafia do apki' }], wybrane: [], pominiete: [{ test: 'app/tests/x-ui-check.cjs', powod: 'zmiana nie dotyczy stron apki' }], zaleznosci: { 'app/tests/x-ui-check.cjs': ['index.html'] } })
  }); return run('summarize.cjs', [d]); };
  let r = res([]);
  assert.equal(r.code, 0, r.out); assert.match(r.out, /POMINIĘTY \(wpływ\)/); assert.match(r.out, /Rozbieżność mapy.*nowy\.js/s); assert.match(r.out, /byłyby pominięte: 40 s/);
  r = res([{ id: 'app/tests/y-ui-check.cjs', status: 'FAIL', seconds: 1 }]);
  assert.equal(r.code, 1, 'FAIL testu nadal blokuje, niezależnie od analizy wpływu');
});
