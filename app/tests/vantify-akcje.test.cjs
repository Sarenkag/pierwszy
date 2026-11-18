// vantify-akcje.js (Grzegorz 18/11/2026 „Tak”, PROD-038): wzory zapytań i wykonanie w ukrytym oknie Vantify.
// Kształty z zapisu „Zbadaj” 18/11/2026 (vantify-zbadaj-18112026.json): założenie Reactive (POST /sites/6324/jobs/reactive),
// Commence {onSiteDate, files.links}, Complete {completionDate, files[{_links.file, _links.documentType…}]}, plik: POST /files
// → {policy, _links.remote, _links.file} → POST na storage; statusy approval_pending → acknowledged → commenced → completed.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '../www/vantify-akcje.js'), 'utf8');
const A = require('../www/vantify-akcje.js');
const API = 'https://savillsuk-api.cafm.vantify.com';
// treści zapytań jak w zapisie 18/11 (wartości wymyślone – zapis je ukrywa)
const CREATE = { _links: { sitecontactsiterelationship: { href: '/siterelationships/3' }, serviceprovider: { href: '/serviceproviders/758' }, jobgroup: { href: '/jobgroups/82' }, priority: { href: '/priorities/14' } },
  files: { links: [{ href: '/files/1', title: 'x' }] }, optedInJobRequisites: { links: [] }, siteContact: { notifyOnCreate: false, notifyOnComplete: false }, contactTenant: { notifyOnCreate: false, notifyOnComplete: false },
  siteContactSameAsReporter: true, skipRequestApprovalNotification: false, notifyOnCreate: true, notifyOnComplete: true, isOnNextPlannedVisit: false, isByPlannedDate: false, assets: { asset: null, subasset: null },
  requiredDocumentTypes: { links: [{ href: '/documenttypes/1' }] }, summary: 'Coat hooks behind reception', description: 'Request to provide coat hooks', noRequisiteRequired: true };
const COMMENCE = { _links: {}, files: { links: [] }, onSiteDate: '2026-11-18T14:59:00+00:00' };
const COMPLETE = { _links: {}, escalationFiles: { links: [] }, assets: {}, completionDate: '2026-11-18T15:39:00+00:00',
  files: [{ formFile: {}, tags: { tags: [] }, id: null, title: 'REACTIVE LED', visibility: 'partnership', documentDate: '2026-11-18T15:39:00+00:00', expiresAt: null, notifyExpiry: false, isStatutory: false, userTags: [], advancedClosed: true, _links: { file: { href: '/files/2793300' }, documentType: { href: '/documenttypes/1' } }, description: 'LED strip' },
    { formFile: {}, title: 'photo', _links: { file: { href: '/files/2793301' }, documentType: { href: '/documenttypes/3' } } }] };

test('rozpoznaje tylko trzy zapytania zapisu do API Vantify', () => {
  assert.strictEqual(A.op('POST', API + '/sites/6324/jobs/reactive'), 'create');
  assert.strictEqual(A.op('post', API + '/sites/6324/jobs/3056375/workflow/operation/commence'), 'commence');
  assert.strictEqual(A.op('POST', API + '/sites/6324/jobs/3056375/workflow/operation/complete?x=1'), 'complete');
  assert.strictEqual(A.op('GET', API + '/sites/6324/jobs/reactive'), '');
  assert.strictEqual(A.op('POST', 'https://evil.example/sites/6324/jobs/reactive'), '');
  assert.strictEqual(A.op('POST', API + '/files'), '');
});
test('wzór bez tekstów, dat i plików tego zlecenia; reszta (firma, priorytet, grupa, kontakt) zostaje', () => {
  const c = A.wzor('create', CREATE);
  assert.ok(!('summary' in c) && !('description' in c)); assert.deepStrictEqual(c.files, { links: [] });
  assert.deepStrictEqual(c._links, CREATE._links); assert.strictEqual(c.siteContactSameAsReporter, true);
  const m = A.wzor('commence', COMMENCE); assert.ok(!('onSiteDate' in m)); assert.strictEqual(m._date, COMMENCE.onSiteDate);
  const k = A.wzor('complete', COMPLETE);
  assert.deepStrictEqual(k.files, []); assert.strictEqual(k._date, COMPLETE.completionDate);
  assert.strictEqual(k._file._links.documentType.href, '/documenttypes/1'); assert.strictEqual(k._file.visibility, 'partnership');
  assert.ok(!('title' in k._file) && !('description' in k._file) && !('documentDate' in k._file)); assert.strictEqual(k._file._links.file.href, '');
  assert.strictEqual(A.wzor('complete', { completionDate: 'x', files: [] }), null, 'bez pliku nie wiadomo, jak dołączyć Job Sheet');
  assert.strictEqual(JSON.stringify(A.wzor('complete', COMPLETE)).includes('LED'), false);
  // zdjęcie dołączone przed Job Sheet: wzór i tak z Job Sheet (przegląd Codex #146); bez Job Sheet i różne typy = bez wzoru
  const odwr = { ...COMPLETE, files: [COMPLETE.files[1], COMPLETE.files[0]] };
  assert.strictEqual(A.wzor('complete', odwr)._file._links.documentType.href, '/documenttypes/1');
  assert.strictEqual(A.wzor('complete', { ...COMPLETE, files: [COMPLETE.files[1], { ...COMPLETE.files[0], title: 'meter' }] }), null);
  assert.strictEqual(A.wzor('complete', { ...COMPLETE, files: [COMPLETE.files[1]] })._file._links.documentType.href, '/documenttypes/3', 'jeden plik: jego typ');
});
test('daty w tym samym zapisie co strona Vantify', () => {
  const d = new Date(Date.UTC(2026, 10, 5, 19, 26, 9));
  assert.strictEqual(A.fmt(d, '2026-11-18T15:39:00.000Z'), '2026-11-05T19:26:09.000Z');
  assert.strictEqual(A.fmt(d, '2026-11-18T15:39:00Z'), '2026-11-05T19:26:09Z');
  assert.match(A.fmt(d, '2026-11-18T15:39:00+00:00'), /^2026-11-05T\d\d:26:09[+-]\d\d:\d\d$/);
  assert.match(A.fmt(d, '2026-11-18T15:39+0000'), /^2026-11-05T\d\d:26[+-]\d{4}$/);
  assert.strictEqual(A.fmt(d, ''), '2026-11-05T19:26:09+00:00');
});
test('zapytania z wzoru: nowy Summary/Description, data, plik Job Sheet z typem dokumentu z wzoru', () => {
  const c = A.create(A.wzor('create', CREATE), { summary: ' Coat hooks on office door ', description: 'Hooks\nLocation: Tower B' });
  assert.strictEqual(c.summary, 'Coat hooks on office door'); assert.strictEqual(c.description, 'Hooks\nLocation: Tower B'); assert.deepStrictEqual(c.files, { links: [] });
  assert.deepStrictEqual(c._links, CREATE._links); assert.ok(!Object.keys(c).some(k => k[0] === '_' && k !== '_links'));
  const d = new Date(Date.UTC(2026, 10, 5, 19, 26));
  const m = A.commence(A.wzor('commence', COMMENCE), { date: d }); assert.match(m.onSiteDate, /^2026-11-05T/); assert.ok(!('_date' in m));
  const k = A.complete(A.wzor('complete', COMPLETE), { date: d, files: [{ href: '/files/999', title: 'REACTIVE Coat hooks 05112026' }] });
  assert.match(k.completionDate, /^2026-11-05T/); assert.strictEqual(k.files.length, 1);
  assert.strictEqual(k.files[0]._links.file.href, '/files/999'); assert.strictEqual(k.files[0]._links.documentType.href, '/documenttypes/1');
  assert.strictEqual(k.files[0].title, 'REACTIVE Coat hooks 05112026'); assert.match(k.files[0].documentDate, /^2026-11-05T/); assert.ok(!('_file' in k));
});
test('świeży odczyt przed zamknięciem: różnica = powód, zgodne = pusto', () => {
  const j = { id: 3066755, status: 'acknowledged', is_final_status: false, summary: 'Coat hooks', _links: { commence: {} } };
  assert.strictEqual(A.check(j, { id: 3066755, summary: 'Coat hooks' }), '');
  assert.strictEqual(A.check({ ...j, status: 'commenced', _links: { complete: {} } }, { id: 3066755 }), '');
  assert.strictEqual(A.check({ ...j, status: 'approval_pending', _links: {} }, { id: 3066755 }), 'approval');
  assert.strictEqual(A.check({ ...j, status: 'completed', is_final_status: true }, { id: 3066755 }), 'final');
  assert.strictEqual(A.check(j, { id: 3066755, summary: 'Other' }), 'summary');
  assert.strictEqual(A.check(j, { id: 1 }), 'other');
  assert.strictEqual(A.check({ ...j, _links: {} }, { id: 3066755 }), 'state');
});

// ---------- wykonanie w ukrytym oknie (atrapa XHR jak strona Vantify) ----------
function world(action, wz, jobs) {
  const calls = [], results = [], store = {};
  class XHR {
    open(m, u) { this.m = m; this.u = u; this.h = {}; }
    setRequestHeader(k, v) { this.h[k] = v; }
    addEventListener() {}
    send(b) {
      const c = { m: this.m, u: this.u, h: { ...this.h }, body: b }; calls.push(c);
      const p = this.u.replace(API, ''), id = Number((/\/jobs\/(\d+)/.exec(p) || [])[1]);
      let st = 200, res = {};
      if (this.m === 'GET' && /^\/sites\/6324\/jobs\/\d+$/.test(p)) { const j = jobs[id]; if (!j) st = 404; else res = j; }
      else if (this.m === 'GET' && /\/files$/.test(p)) res = { files: (jobs[id].files || []) };
      else if (p === '/sites/6324/jobs/reactive') { st = 201; res = { id: 3070002, status: 'approval_pending' }; jobs[3070002] = { id: 3070002, status: 'approval_pending', summary: JSON.parse(b).summary, _links: {} }; }
      else if (p === '/files') { st = 201; res = { policy: { key: 'k', bucket: 'b', GoogleAccessId: 'g', policy: 'p', signature: 's', 'Content-Disposition': 'c', success_action_redirect: 'r' }, _links: { remote: { href: 'https://storage.googleapis.com/savillsuk.elogbooks.net' }, file: { href: '/files/999' } } }; }
      else if (this.u.startsWith('https://storage.googleapis.com/')) { st = 200; res = null; }
      else if (/operation\/commence$/.test(p)) { st = 204; jobs[id].status = 'commenced'; jobs[id]._links = { complete: {}, files: { href: '/sites/6324/jobs/' + id + '/files' } }; res = null; }
      else if (/operation\/complete$/.test(p)) { st = 204; Object.assign(jobs[id], { status: 'completed', is_final_status: true }); jobs[id].files = [{ _links: { file: { href: '/files/999' } } }]; res = null; }
      else st = 404;
      this.status = st; this.responseText = res == null ? '' : JSON.stringify(res);
      setImmediate(() => this.onload && this.onload());
    }
  }
  const w = { XMLHttpRequest: XHR, __oestAction: action, __oestWzory: wz, sessionStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } },
    atob: s => Buffer.from(s, 'base64').toString('binary'), Blob, FormData, Uint8Array };
  const ctx = vm.createContext({ window: w, Promise, JSON, Array, Number, String, Error, Object, Uint8Array, Date, setImmediate });
  vm.runInContext(SRC, ctx);
  const run = async () => { w.__oestAkcja(API, 'Bearer T', r => results.push(JSON.parse(JSON.stringify(r)))); for (let i = 0; i < 60; i++) await new Promise(r => setImmediate(r)); };
  return { w, calls, results, run, store };
}
const WZ = { create: A.wzor('create', CREATE), commence: A.wzor('commence', COMMENCE), complete: A.wzor('complete', COMPLETE) };
const PDF = Buffer.from('%PDF-1.4 job sheet').toString('base64');
test('założenie: jedno POST z wzorem i tekstem, potem odczyt; drugi raz to samo zadanie nic nie wysyła', async () => {
  const s = world({ op: 'create', site: 6324, nonce: 'n1', summary: 'Coat hooks on office door', description: 'Hooks' }, WZ, {});
  await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'ok', id: 3070002, job: { id: 3070002, status: 'approval_pending', final: false, summary: 'Coat hooks on office door' } }]);
  const post = s.calls.filter(c => c.m === 'POST');
  assert.strictEqual(post.length, 1); assert.strictEqual(post[0].h.Authorization, 'Bearer T');
  const b = JSON.parse(post[0].body); assert.strictEqual(b.summary, 'Coat hooks on office door'); assert.deepStrictEqual(b._links, CREATE._links); assert.deepStrictEqual(b.files, { links: [] });
  s.w.__oestAkcja(API, 'Bearer T', r => s.results.push(JSON.parse(JSON.stringify(r)))); await new Promise(r => setImmediate(r));
  assert.deepStrictEqual(s.results[1], { status: 'error', code: 'repeat' }); assert.strictEqual(s.calls.filter(c => c.m === 'POST').length, 1, 'przeładowanie strony nie zakłada drugiego zlecenia');
});
test('bez wzoru: nic nie wysyła, mówi czego brakuje', async () => {
  const s = world({ op: 'create', nonce: 'n2', summary: 'a', description: 'b' }, {}, {}); await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'nowzor', op: 'create' }]); assert.strictEqual(s.calls.length, 0);
  const t = world({ op: 'close', nonce: 'n3', id: 1 }, { commence: WZ.commence }, {}); await t.run();
  assert.deepStrictEqual(t.results, [{ status: 'nowzor', op: 'complete' }]); assert.strictEqual(t.calls.length, 0);
});
test('zamknięcie zatwierdzonego: odczyt → plik → Commence → Complete z plikiem → odczyt: zamknięte, plik przy zleceniu', async () => {
  const jobs = { 3066755: { id: 3066755, status: 'acknowledged', is_final_status: false, summary: 'Coat hooks', _links: { commence: {} } } };
  const s = world({ op: 'close', nonce: 'n4', id: 3066755, summary: 'Coat hooks', onSite: '2026-11-05T19:00:00Z', done: '2026-11-05T19:26:09Z', file: { b64: PDF, name: 'REACTIVE Coat hooks 05112026.pdf', title: 'REACTIVE Coat hooks 05112026', type: 'application/pdf' } }, WZ, jobs);
  await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'ok', job: { id: 3066755, status: 'completed', final: true, summary: 'Coat hooks' }, closed: true, fileSeen: true }]);
  const seq = s.calls.map(c => c.m + ' ' + c.u.replace(API, '').replace('https://storage.googleapis.com', 'STORAGE'));
  assert.deepStrictEqual(seq, ['GET /sites/6324/jobs/3066755', 'POST /files', 'POST STORAGE/savillsuk.elogbooks.net', 'POST /sites/6324/jobs/3066755/workflow/operation/commence', 'POST /sites/6324/jobs/3066755/workflow/operation/complete', 'GET /sites/6324/jobs/3066755', 'GET /sites/6324/jobs/3066755/files']);
  const meta = JSON.parse(s.calls[1].body); assert.deepStrictEqual(meta, { title: 'REACTIVE Coat hooks 05112026', filename: 'REACTIVE Coat hooks 05112026.pdf', type: 'application/pdf', size: 18 });
  const fd = s.calls[2].body; assert.deepStrictEqual([...fd.keys()], ['key', 'bucket', 'GoogleAccessId', 'policy', 'signature', 'Content-Disposition', 'success_action_redirect', 'file'], 'pola jak strona Vantify, plik na końcu');
  assert.strictEqual(s.calls[2].h.Authorization, undefined, 'token Vantify nie idzie do Google Storage');
  assert.match(JSON.parse(s.calls[3].body).onSiteDate, /^2026-11-05T/);
  const done = JSON.parse(s.calls[4].body); assert.match(done.completionDate, /^2026-11-05T/); assert.strictEqual(done.files[0]._links.file.href, '/files/999'); assert.strictEqual(done.files[0]._links.documentType.href, '/documenttypes/1');
});
test('zamknięcie: czeka na zatwierdzenie / inna nazwa / już zamknięte → stop przed jakimkolwiek zapisem', async () => {
  for (const [j, why] of [[{ status: 'approval_pending', _links: {} }, 'approval'], [{ status: 'acknowledged', summary: 'Other', _links: { commence: {} } }, 'summary'], [{ status: 'completed', is_final_status: true }, 'final']]) {
    const jobs = { 5: { id: 5, summary: 'Coat hooks', is_final_status: false, ...j } };
    const s = world({ op: 'close', nonce: 'x' + why, id: 5, summary: 'Coat hooks', file: { b64: PDF, name: 'a.pdf', title: 'a' } }, WZ, jobs); await s.run();
    assert.strictEqual(s.results[0].status, 'differs'); assert.strictEqual(s.results[0].why, why);
    assert.strictEqual(s.calls.filter(c => c.m === 'POST').length, 0, why + ': coś wysłane');
  }
});
test('już rozpoczęte (commenced): bez drugiego Commence; błąd Vantify przy Complete → błąd z krokiem, bez „ok”', async () => {
  const jobs = { 7: { id: 7, status: 'commenced', is_final_status: false, summary: 'A', _links: { complete: {}, files: { href: '/sites/6324/jobs/7/files' } } } };
  const s = world({ op: 'close', nonce: 'c1', id: 7, summary: 'A', file: { b64: PDF, name: 'a.pdf', title: 'a' } }, WZ, jobs); await s.run();
  assert.strictEqual(s.results[0].status, 'ok'); assert.ok(!s.calls.some(c => /commence$/.test(c.u)));
  const t = world({ op: 'close', nonce: 'c2', id: 8, summary: 'A', file: { b64: PDF, name: 'a.pdf', title: 'a' } }, WZ, { 8: { id: 8, status: 'commenced', summary: 'A', _links: { complete: {} } } });
  const send = t.w.XMLHttpRequest.prototype.send; t.w.XMLHttpRequest.prototype.send = function (b) { if (/operation\/complete$/.test(this.u)) { this.status = 422; this.responseText = JSON.stringify({ message: 'Completion date required' }); setImmediate(() => this.onload()); return; } return send.call(this, b); };
  await t.run();
  assert.deepStrictEqual(t.results, [{ status: 'error', code: 'http422', msg: 'Completion date required', step: 'complete' }]);
});
test('status: odczyt kilku zleceń, tylko GET; wygasłe logowanie → login', async () => {
  const s = world({ op: 'status', nonce: 's1', ids: [1, 2] }, {}, { 1: { id: 1, status: 'approval_pending', summary: 'A' }, 2: { id: 2, status: 'completed', is_final_status: true, summary: 'B' } }); await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'ok', jobs: [{ id: 1, status: 'approval_pending', final: false, summary: 'A' }, { id: 2, status: 'completed', final: true, summary: 'B' }] }]);
  assert.ok(s.calls.every(c => c.m === 'GET'));
  const t = world({ op: 'status', nonce: 's2', ids: [1] }, {}, {}); t.w.XMLHttpRequest.prototype.send = function () { this.status = 401; this.responseText = ''; setImmediate(() => this.onload()); }; await t.run();
  assert.strictEqual(t.results[0].status, 'login');
});
test('status z tytułem pliku: ponowne sprawdzenie, czy Job Sheet jest przy zamkniętym zleceniu (przegląd Codex #146)', async () => {
  const links = id => ({ files: { href: '/sites/6324/jobs/' + id + '/files' } });
  const jobs = { 1: { id: 1, status: 'completed', is_final_status: true, summary: 'A', _links: links(1), files: [{ title: 'REACTIVE A 05112026' }] }, 2: { id: 2, status: 'completed', is_final_status: true, summary: 'B', _links: links(2), files: [{ title: 'Other' }] } };
  const s = world({ op: 'status', nonce: 's3', ids: [1, 2], fileTitle: 'REACTIVE A 05112026' }, {}, jobs); await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'ok', jobs: [{ id: 1, status: 'completed', final: true, summary: 'A', fileSeen: true }, { id: 2, status: 'completed', final: true, summary: 'B', fileSeen: false }] }]);
  assert.ok(s.calls.every(c => c.m === 'GET'));
  assert.deepStrictEqual(s.calls.map(c => c.u.replace(API, '')), ['/sites/6324/jobs/1', '/sites/6324/jobs/1/files', '/sites/6324/jobs/2', '/sites/6324/jobs/2/files']);
});
test('okno Vantify w apce: udane zapytanie strony → wzór bez tekstów i numer zlecenia do telefonu; nieudane nic', async () => {
  const got = [], listeners = [];
  class XHR { open() {} send() {} addEventListener(n, f) { listeners.push(() => f()); } }
  const w = { XMLHttpRequest: XHR, OESTVantifyBridge: { wzor: (k, t, id) => got.push([k, t ? JSON.parse(t) : null, id]) } };
  vm.runInContext(SRC, vm.createContext({ window: w, JSON, Array, Number, String, Error, Object, Promise }));
  const x = new w.XMLHttpRequest(); x.open('POST', API + '/sites/6324/jobs/reactive'); x.send(JSON.stringify(CREATE)); x.status = 201; x.responseText = JSON.stringify({ id: 3066755 }); listeners.pop()();
  const y = new w.XMLHttpRequest(); y.open('POST', API + '/sites/6324/jobs/3066755/workflow/operation/commence'); y.send(JSON.stringify(COMMENCE)); y.status = 422; listeners.pop()();
  const z = new w.XMLHttpRequest(); z.open('POST', API + '/sites/6324/jobs/3066755/workflow/operation/complete'); z.send(JSON.stringify(COMPLETE)); z.status = 204; listeners.pop()();
  assert.strictEqual(got.length, 2); assert.strictEqual(got[0][0], 'create'); assert.strictEqual(got[0][2], '3066755');
  assert.ok(!JSON.stringify(got).includes('Coat hooks') && !JSON.stringify(got).includes('LED'), 'do telefonu bez Summary/Description/opisów plików');
  assert.strictEqual(got[1][0], 'complete'); assert.strictEqual(got[1][2], '3066755');
});
