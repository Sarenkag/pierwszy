#!/usr/bin/env node
// Quality Gate OEST – uruchamia obowiązkowe testy i raportuje każdy jako PASS / FAIL / SKIPPED / NOT RUN.
// Zasada (QUALITY.md QG-011): tylko PASS jest sukcesem. SKIPPED i NOT RUN blokują, chyba że są w allowedSkips
// w quality/required-tests.json (dziś pusta lista; dodanie wyjątku wymaga zgody właściciela).
// Nic tu nie zmienia testów ani ich kryteriów – runner tylko je uruchamia i czyta wynik.
// Użycie: node quality/run-gate.cjs --part node|browser [--out quality-results/<part>.json] [--only plik]
'use strict';
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('--root', path.resolve(__dirname, '..'))), APP = path.join(ROOT, 'app'); // --root: tylko do testów samej bramki
const PART = arg('--part', ''), OUT = arg('--out', ''), ONLY = arg('--only', '');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'quality', 'required-tests.json'), 'utf8'));
const allowed = new Set((manifest.allowedSkips || []).map(s => s.id));
if (!['node', 'browser', 'lang'].includes(PART)) { console.error('Podaj --part node, browser albo lang'); process.exit(2); }

const results = [];
const tail = (s, n = 25) => String(s || '').replace(/\x1b\[[0-9;]*m/g, '').trim().split('\n').slice(-n).join('\n');
const record = r => { results.push(r); console.log(`[${r.status}] ${r.id}${r.counts ? ' ' + JSON.stringify(r.counts) : ''} (${r.seconds}s)${r.detail ? ' – ' + r.detail.split('\n')[0] : ''}`); };

// wszystkie pliki testów na dysku: niezarejestrowane też są uruchamiane (żaden test nie może zostać cicho pominięty)
function discover(suffix, listed) {
  const onDisk = fs.readdirSync(path.join(APP, 'tests')).filter(f => f.endsWith(suffix)).map(f => 'app/tests/' + f);
  const known = new Set(listed.map(t => t.file));
  return [...listed, ...onDisk.filter(f => !known.has(f)).map(f => ({ file: f, unregistered: true }))];
}

function runNode() {
  const tests = discover('.test.cjs', manifest.node).filter(t => !ONLY || t.file.endsWith(ONLY));
  for (const t of tests) {
    const abs = path.join(ROOT, t.file), t0 = Date.now();
    if (!fs.existsSync(abs)) { record({ id: t.file, kind: 'node', status: 'NOT RUN', seconds: 0, detail: 'Plik testu nie istnieje (usunięty lub przeniesiony).' }); continue; }
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT; // inaczej zagnieżdżony node --test nie wypisuje podsumowania TAP
    const p = spawnSync(process.execPath, ['--test', '--test-reporter=tap', abs], { cwd: APP, env, encoding: 'utf8', timeout: 600000, maxBuffer: 64 << 20 });
    const out = (p.stdout || '') + (p.stderr || ''), num = k => { const m = out.match(new RegExp('^# ' + k + ' (\\d+)$', 'm')); return m ? +m[1] : null; };
    const counts = { tests: num('tests'), pass: num('pass'), fail: num('fail'), skipped: num('skipped'), todo: num('todo'), cancelled: num('cancelled') };
    const seconds = +((Date.now() - t0) / 1000).toFixed(1);
    let status, detail = '';
    if (p.error || counts.tests === null) { status = 'NOT RUN'; detail = 'Brak podsumowania node --test' + (p.error ? ': ' + p.error.message : '') + '\n' + tail(out); }
    else if (counts.fail || counts.cancelled || p.status !== 0) { status = 'FAIL'; detail = tail(out.split('\n').filter(l => /^not ok|^\s+(error|expected|actual|message):|AssertionError|Error:/.test(l)).join('\n') || out); }
    else if (counts.tests === 0) { status = 'NOT RUN'; detail = 'Plik nie zawiera żadnego wykonanego testu.'; }
    else if (counts.skipped || counts.todo) { const id = t.file + '#skip'; status = allowed.has(id) ? 'PASS' : 'SKIPPED'; detail = `${counts.skipped} skip / ${counts.todo} todo` + (allowed.has(id) ? ' (dozwolone w allowedSkips)' : ' – nieoczekiwane pominięcie'); }
    else status = 'PASS';
    if (t.unregistered) detail = (detail ? detail + ' | ' : '') + 'Test spoza listy quality/required-tests.json – dopisz go do listy.';
    record({ id: t.file, kind: 'node', status, counts, seconds, detail });
  }
}

function browserEnv() {
  const env = { ...process.env };
  if (!env.OEST_BROWSER_PATH) for (const c of ['google-chrome', 'chromium-browser', 'chromium']) { const w = spawnSync('sh', ['-c', 'command -v ' + c], { encoding: 'utf8' }); if (w.status === 0 && w.stdout.trim()) { env.OEST_BROWSER_PATH = w.stdout.trim(); break; } }
  return env;
}

// raport-ui-check: każda inspekcja z FAKTYCZNEJ listy PPM (window.OEST_PPM.tasks w app/www/ppm.js, ten sam odczyt co w teście:
// app/tests/ppm-lista.cjs) musi być sprawdzona. Komentarze w kodzie się nie liczą. Pominięta = SKIPPED (QG-002).
function ppmScenarioCheck(out) {
  let ids;
  try { ids = require(path.join(__dirname, '..', 'app', 'tests', 'ppm-lista.cjs')).inspections(path.join(APP, 'www')); }
  catch (e) { return { expected: 0, checked: 0, missing: ['(lista PPM nieczytelna: ' + e.message + ')'], reportedSkip: [], silent: [] }; }
  const line = (out.match(/^raport-ui-check: .*$/m) || [''])[0];
  const head = line.split(' | ')[0], tailTxt = line.slice(head.length);
  const checked = new Set((head.split('PDF: ')[1] || '').match(/EFA-INS-\d{3}/g) || []);
  const reportedSkip = ((tailTxt.match(/pominięte[^|]*/) || [''])[0].match(/EFA-INS-\d{3}/g)) || [];
  const missing = ids.filter(id => !checked.has(id) && !allowed.has('app/tests/raport-ui-check.cjs#' + id));
  return { expected: ids.length, checked: ids.filter(id => checked.has(id)).length, missing, reportedSkip, silent: missing.filter(id => !reportedSkip.includes(id)) };
}

function runBrowser() {
  const env = browserEnv();
  const tests = discover('-ui-check.cjs', manifest.browser).filter(t => !ONLY || t.file.endsWith(ONLY));
  if (!fs.existsSync(path.join(APP, 'www', 'inspekcje', 'index.html'))) {
    for (const t of tests) record({ id: t.file, kind: 'browser', status: 'NOT RUN', seconds: 0, detail: 'Brak zbudowanej strony app/www/inspekcje (npm run copy-web nie został wykonany).' });
    return;
  }
  for (const t of tests) {
    const abs = path.join(ROOT, t.file), t0 = Date.now();
    if (!fs.existsSync(abs)) { record({ id: t.file, kind: 'browser', status: 'NOT RUN', seconds: 0, detail: 'Plik testu nie istnieje (usunięty lub przeniesiony).' }); continue; }
    const p = spawnSync(process.execPath, [abs], { cwd: APP, env, encoding: 'utf8', timeout: (t.timeoutSec || 900) * 1000, maxBuffer: 64 << 20 });
    const out = (p.stdout || '') + (p.stderr || ''), seconds = +((Date.now() - t0) / 1000).toFixed(1);
    let status, detail = '', scenarios;
    if (p.error && p.error.code === 'ETIMEDOUT') { status = 'FAIL'; detail = `Przekroczony czas ${t.timeoutSec || 900}s.\n` + tail(out); }
    else if (p.error) { status = 'NOT RUN'; detail = p.error.message; }
    else if (/Cannot find module '(playwright|playwright-core)'/.test(out)) { status = 'NOT RUN'; detail = 'Brak Playwright w środowisku.\n' + tail(out, 5); }
    else if (p.status !== 0) { status = 'FAIL'; detail = tail(out.split('\n').filter(l => !/^\s+at /.test(l)).join('\n'), 20); }
    else if (t.passMarker && !out.includes(t.passMarker)) { status = 'NOT RUN'; detail = `Kod wyjścia 0, ale brak potwierdzenia „${t.passMarker}” – test mógł nie dojść do końca.\n` + tail(out); }
    else {
      status = 'PASS'; detail = tail(out, 2);
      if (t.scenarios === 'ppm-inspections') {
        scenarios = ppmScenarioCheck(out);
        if (scenarios.missing.length) { status = 'SKIPPED'; detail = `Sprawdzono ${scenarios.checked} z ${scenarios.expected} inspekcji. Pominięte: ${scenarios.missing.join(', ')}` + (scenarios.silent.length ? ` (bez zgłoszenia w wyniku testu: ${scenarios.silent.join(', ')})` : '') + '. Test sam w sobie przeszedł, ale pominięcie scenariusza nie jest sukcesem (QG-002).'; }
      }
    }
    if (t.unregistered) detail = (detail ? detail + ' | ' : '') + 'Test spoza listy quality/required-tests.json – dopisz go do listy.';
    record({ id: t.file, kind: 'browser', status, seconds, detail, ...(scenarios ? { scenarios } : {}) });
  }
}

function runLang() {
  const t0 = Date.now(), p = spawnSync(process.execPath, ['scripts/check-lang.js'], { cwd: APP, encoding: 'utf8', timeout: 300000 });
  const out = (p.stdout || '') + (p.stderr || '');
  record({ id: 'app/scripts/check-lang.js', kind: 'lang', status: p.error ? 'NOT RUN' : p.status === 0 ? 'PASS' : 'FAIL', seconds: +((Date.now() - t0) / 1000).toFixed(1), detail: tail(out, 15) });
}

const started = new Date().toISOString();
if (PART === 'node') runNode(); else if (PART === 'lang') runLang(); else runBrowser();
for (const t of PART === 'lang' ? [] : manifest[PART]) if (ONLY && !t.file.endsWith(ONLY)) continue; else if (!results.some(r => r.id === t.file)) record({ id: t.file, kind: PART, status: 'NOT RUN', seconds: 0, detail: 'Test z listy obowiązkowej nie został uruchomiony.' });
const tally = s => results.filter(r => r.status === s).length;
const summary = { part: PART, started, finished: new Date().toISOString(), node: process.version, sha: process.env.GITHUB_SHA || '', counts: { PASS: tally('PASS'), FAIL: tally('FAIL'), SKIPPED: tally('SKIPPED'), 'NOT RUN': tally('NOT RUN') }, status: results.every(r => r.status === 'PASS') && results.length ? 'PASS' : 'FAIL', results };
if (PART === 'lang') summary.detail = results[0].detail;
if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(summary, null, 2)); }
console.log(`\n${PART}: ${JSON.stringify(summary.counts)} → ${summary.status}`);
for (const r of results) if (r.status !== 'PASS') console.log(`::error title=${r.status}: ${path.basename(r.id)}::${(r.detail || '').replace(/\r?\n/g, '%0A')}`);
process.exitCode = summary.status === 'PASS' ? 0 : 1;
