// moduly/eksport-vantify (Grzegorz 10/11/2026): eksport Job z Vantify → plan zleceń. Jedno źródło dla telefonu i skryptu.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), cp = require('child_process'), os = require('os');
const E = require('../../moduly/eksport-vantify/eksport-vantify.js');
const HEAD = ['id', 'siteName', 'jobType', 'summary', 'reporterName', 'reporterEmail', 'createdAt', 'completeBy', 'frequency', 'task'];
function csv(rows) { return '﻿' + HEAD.join(',') + '\r\n' + rows.map(r => HEAD.map(h => { const v = String(r[h] ?? ''); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(',')).join('\r\n') + '\r\n'; }
const job = (id, task, due, extra = {}) => ({ id, siteName: 'One Eastside', jobType: 'Planned', summary: 'Opis, z "cudzysłowem"\ni nową linią', reporterName: 'Jan Kowalski', reporterEmail: 'jan@example.com', createdAt: '2026-11-08 10:00:00', completeBy: due + ' 23:59:59', frequency: '1W', task, ...extra });
const match = E.matcher([['EFA-INS-003', 'Weekly AOV Test (TA)'], ['EFA-INS-001', 'Emergency Lighting Test (TA)']]);
test('parseCsv: BOM, cudzysłowy, przecinki i nowe linie w polu', () => {
  const rows = E.parseCsv(csv([job('1', 'Weekly AOV Test (Tower A)', '2026-11-20')]));
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].id, '1');
  assert.strictEqual(rows[0].summary, 'Opis, z "cudzysłowem"\ni nową linią');
  assert.strictEqual(rows[0].task, 'Weekly AOV Test (Tower A)');
});
test('plan: terminy dokładnie z pliku, posortowane, tylko Planned, bez danych osobowych; nazwy Tower A = TA', () => {
  const rows = E.parseCsv(csv([job('3', 'Weekly AOV Test (Tower A)', '2026-11-27'), job('2', 'Weekly AOV Test (Tower A)', '2026-11-20'), job('9', 'Weekly AOV Test (Tower A)', '2026-11-10', { jobType: 'Reactive' }), job('5', '(Sub) Monthly Spa Sampling', '2026-11-30', { createdAt: '2026-11-09 08:00:00' })]));
  const p = E.plan(rows, { match, prevCards: ['EFA-INS-001'] });
  assert.deepStrictEqual(p.jobs, { 'EFA-INS-003': [{ no: '2', due: '2026-11-20', f: '1W' }, { no: '3', due: '2026-11-27', f: '1W' }] });
  assert.strictEqual(p.date, '2026-11-09');
  assert.match(p.exported, /^2026-11-09-[0-9a-f]{8}$/);
  assert.deepStrictEqual(p.cards, ['EFA-INS-001', 'EFA-INS-003']); // karta bez otwartych zleceń zostaje kartą Vantify (PROD-010)
  assert.deepStrictEqual(p.missing, ['(Sub) Monthly Spa Sampling']);
  assert.strictEqual(p.planned, 3);
  assert.doesNotMatch(JSON.stringify(p), /Kowalski|example\.com|cudzysłowem/);
});
test('plan: ten sam plik = ta sama wersja, inna treść = inna wersja', () => {
  const a = E.plan(E.parseCsv(csv([job('2', 'Weekly AOV Test (TA)', '2026-11-20')])), { match });
  const b = E.plan(E.parseCsv(csv([job('2', 'Weekly AOV Test (TA)', '2026-11-20')])), { match });
  const c = E.plan(E.parseCsv(csv([job('2', 'Weekly AOV Test (TA)', '2026-11-21')])), { match });
  assert.strictEqual(a.exported, b.exported); assert.notStrictEqual(a.exported, c.exported);
});
test('plan: zły plik = VANTIFY_FORMAT, brak zleceń planowych = VANTIFY_EMPTY', () => {
  assert.throws(() => E.plan(E.parseCsv('a,b\n1,2\n'), { match }), /VANTIFY_FORMAT/);
  assert.throws(() => E.plan([], { match }), /VANTIFY_FORMAT/);
  assert.throws(() => E.plan(E.parseCsv(csv([job('9', 'Weekly AOV Test (TA)', '2026-11-10', { jobType: 'Reactive' })])), { match }), /VANTIFY_EMPTY/);
});
test('changes: nowe zlecenia i zamknięte w Vantify, po numerze zlecenia', () => {
  const ch = E.changes({ A: [{ no: '1', due: '2026-11-06' }, { no: '2', due: '2026-11-13' }] }, { A: [{ no: '2', due: '2026-11-13' }, { no: '3', due: '2026-12-18' }] });
  assert.deepStrictEqual(ch.added.map(x => x.no), ['3']); assert.deepStrictEqual(ch.closed.map(x => x.no), ['1']); assert.strictEqual(ch.total, 2);
});
test('skrypt vantify-plan.cjs liczy tym samym modułem: plik wbudowany = plan modułu', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-')), out = path.join(dir, 'plan.js'), inp = path.join(dir, 'job.csv');
  fs.writeFileSync(inp, csv([job('2', 'AOV Operation Testing (Tower A)', '2026-11-20'), job('7', 'Emergency Lighting Test (Tower A)', '2026-11-30', { frequency: '1M' })]));
  cp.execFileSync(process.execPath, [path.join(__dirname, '..', 'scripts', 'vantify-plan.cjs'), inp, out], { cwd: path.join(__dirname, '..', '..'), stdio: 'pipe' });
  const w = {}; new Function('window', fs.readFileSync(out, 'utf8'))(w);
  assert.deepStrictEqual(w.OEST_VANTIFY.jobs['EFA-INS-003'], [{ no: '2', due: '2026-11-20', f: '1W' }]);
  assert.deepStrictEqual(w.OEST_VANTIFY.jobs['EFA-INS-001'], [{ no: '7', due: '2026-11-30', f: '1M' }]);
  assert.ok(w.OEST_VANTIFY.cards.includes('EFA-INS-003'));
  assert.doesNotMatch(fs.readFileSync(out, 'utf8'), /Kowalski|example\.com/);
});
// Lista z API Vantify (zapis „Zbadaj” 10/11/2026: GET /users/{id}/jobs) daje ten sam plan co eksport CSV z tymi samymi zleceniami.
test('fromApi: lista zleceń z API → ten sam plan co eksport; termin = dzień UK (zima i lato), bez danych osób', () => {
  const api = [
    { id: 3051375, type: 'planned', summary: 'Weekly AOV Test (Tower A)', status: 'acknowledged', attendanceDueAt: '2026-11-20T18:00:00+00:00', completionDueAt: '2026-11-20T23:59:59+00:00', frequency: '1W', serviceProviderName: 'Jan Kowalski' },
    { id: 3051376, type: 'planned', summary: 'Weekly AOV Test (Tower A)', status: 'acknowledged', completionDueAt: '2027-06-11T22:59:59+00:00', frequency: '1W' }, // 23:59:59 BST
    { id: 3003949, type: 'reactive', summary: 'Leak', status: 'extension_pending', completionDueAt: '2026-10-30T18:00:00+00:00' },
    { id: 3051377, type: 'planned', summary: '(Sub) Monthly Spa Sampling', completionDueAt: '2026-11-30T23:59:59+00:00', frequency: '1M' }
  ];
  const rows = E.fromApi(api, '2026-11-10');
  assert.deepStrictEqual(rows[1], { id: '3051376', jobType: 'Planned', task: 'Weekly AOV Test (Tower A)', completeBy: '2027-06-11', frequency: '1W', createdAt: '2026-11-10' });
  assert.strictEqual(rows[2].jobType, 'reactive');
  const fromApi = E.plan(rows, { match });
  const fromCsv = E.plan(E.parseCsv(csv([job('3051375', 'Weekly AOV Test (Tower A)', '2026-11-20', { createdAt: '2026-11-10 08:00:00' }), job('3051376', 'Weekly AOV Test (Tower A)', '2027-06-11', { createdAt: '2026-11-10 08:00:00' }), job('3051377', '(Sub) Monthly Spa Sampling', '2026-11-30', { createdAt: '2026-11-10 08:00:00', frequency: '1M' })])), { match });
  assert.deepStrictEqual(fromApi.jobs, fromCsv.jobs);
  assert.strictEqual(fromApi.exported, fromCsv.exported, 'ta sama treść = ta sama wersja, niezależnie od drogi');
  assert.strictEqual(fromApi.date, '2026-11-10');
  assert.doesNotMatch(JSON.stringify(fromApi), /Kowalski|acknowledged/);
  assert.deepStrictEqual(E.fromApi(null, '2026-11-10'), []);
});
