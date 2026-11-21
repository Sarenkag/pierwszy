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
const ATTACH = { _links: { file: { href: '/files/2793327' }, documentType: { href: '/documenttypes/3' } }, tags: { tags: [] }, id: null, title: 'Leak photo', visibility: 'partnership', isContract: null, documentDate: '2026-11-05T15:54:17+00:00', expiresAt: null, isStatutory: false, userTags: [], notifyExpiry: false, isJobFile: true, description: 'sink', applicableTo: [] };
const COMMENCE = { _links: {}, files: { links: [] }, onSiteDate: '2026-11-18T14:59:00+00:00' };
const COMPLETE = { _links: {}, escalationFiles: { links: [] }, assets: {}, completionDate: '2026-11-18T15:39:00+00:00',
  files: [{ formFile: {}, tags: { tags: [] }, id: null, title: 'REACTIVE LED', visibility: 'partnership', documentDate: '2026-11-18T15:39:00+00:00', expiresAt: null, notifyExpiry: false, isStatutory: false, userTags: [], advancedClosed: true, _links: { file: { href: '/files/2793300' }, documentType: { href: '/documenttypes/1' } }, description: 'LED strip' },
    { formFile: {}, title: 'photo', _links: { file: { href: '/files/2793301' }, documentType: { href: '/documenttypes/3' } } }] };

test('rozpoznaje tylko zapytania zapisu do API Vantify (założenie, Commence, Complete, plik do zlecenia)', () => {
  assert.strictEqual(A.op('POST', API + '/sites/6324/jobs/reactive'), 'create');
  assert.strictEqual(A.op('post', API + '/sites/6324/jobs/3056375/workflow/operation/commence'), 'commence');
  assert.strictEqual(A.op('POST', API + '/sites/6324/jobs/3056375/workflow/operation/complete?x=1'), 'complete');
  assert.strictEqual(A.op('GET', API + '/sites/6324/jobs/reactive'), '');
  assert.strictEqual(A.op('POST', 'https://evil.example/sites/6324/jobs/reactive'), '');
  assert.strictEqual(A.op('POST', API + '/files'), '');
  assert.strictEqual(A.op('POST', API + '/sites/6324/jobs/3066755/files'), 'attach');
  assert.strictEqual(A.op('GET', API + '/sites/6324/jobs/3066755/files'), '');
  assert.strictEqual(A.op('POST', API + '/sites/6324/jobs/3066755/messages'), 'update');
  assert.strictEqual(A.op('GET', API + '/sites/6324/jobs/3066755/messages'), '');
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
      else if (p === '/sites/6324/jobs/reactive') { st = 201; res = { id: 3070002, status: 'approval_pending' }; const body = JSON.parse(b); jobs[3070002] = { id: 3070002, status: 'approval_pending', summary: body.summary, _links: { files: { href: '/sites/6324/jobs/3070002/files' } }, files: (body.files.links || []).slice(0, world.keep == null ? 99 : world.keep).map(l => ({ _links: { file: { href: l.href } } })) }; }
      else if (p === '/files') { st = 201; const nf = 999 + calls.filter(c => c.u.replace(API, '') === '/files').length - 1; res = { policy: { key: 'k', bucket: 'b', GoogleAccessId: 'g', policy: 'p', signature: 's', 'Content-Disposition': 'c', success_action_redirect: 'r' }, _links: { remote: { href: 'https://storage.googleapis.com/savillsuk.elogbooks.net' }, file: { href: '/files/' + nf }, resource: { href: '/files/' + nf + '/resource', title: 't', type: 'image/jpeg' } } }; }
      else if (this.u.startsWith('https://storage.googleapis.com/')) { st = 200; res = null; }
      else if (this.m === 'POST' && /^\/sites\/6324\/jobs\/\d+\/messages$/.test(p)) { st = 201; const body = JSON.parse(b); jobs[id].messages = (jobs[id].messages || []).concat(world.dropMsg ? [] : [{ body: body.body }]); res = { id: 7 }; }
      else if (this.m === 'GET' && /\/messages$/.test(p)) res = { messages: jobs[id].messages || [] };
      else if (this.m === 'POST' && /^\/sites\/6324\/jobs\/\d+\/files$/.test(p)) { st = 201; const body = JSON.parse(b); jobs[id].files = (jobs[id].files || []).concat(world.drop ? [] : [{ _links: { file: { href: body._links.file.href } } }]); res = { id: 1 }; }
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
  assert.deepStrictEqual(s.results, [{ status: 'ok', id: 3070002, job: { id: 3070002, status: 'approval_pending', final: false, summary: 'Coat hooks on office door' }, photos: 0, photosSeen: 0, hrefs: [], seenHrefs: [] }]);
  const post = s.calls.filter(c => c.m === 'POST');
  assert.strictEqual(post.length, 1); assert.strictEqual(post[0].h.Authorization, 'Bearer T');
  const b = JSON.parse(post[0].body); assert.strictEqual(b.summary, 'Coat hooks on office door'); assert.deepStrictEqual(b._links, CREATE._links); assert.deepStrictEqual(b.files, { links: [] });
  s.w.__oestAkcja(API, 'Bearer T', r => s.results.push(JSON.parse(JSON.stringify(r)))); await new Promise(r => setImmediate(r));
  assert.deepStrictEqual(s.results[1], { status: 'error', code: 'repeat' }); assert.strictEqual(s.calls.filter(c => c.m === 'POST').length, 1, 'przeładowanie strony nie zakłada drugiego zlecenia');
});
const JPG = Buffer.from('jpegdata').toString('base64');
test('założenie ze zdjęciami przed: najpierw pliki, zlecenie z PIERWSZYM zdjęciem (jak zapis 18/11), reszta przez Files → Add; zdjęcia sprawdzone przy zleceniu (Grzegorz 20–21/11/2026)', async () => {
  const files = [{ b64: JPG, name: 'Before-photo-1.jpg', title: 'Before photo 1', type: 'image/jpeg' }, { b64: JPG, name: 'Before-photo-2.jpg', title: 'Before photo 2', type: 'image/jpeg' }];
  const s = world({ op: 'create', nonce: 'p1', summary: 'Door handle', description: 'Loose handle', files }, WZ, {}); await s.run();
  const seq = s.calls.map(c => c.m + ' ' + c.u.replace(API, '').replace('https://storage.googleapis.com', 'STORAGE'));
  assert.deepStrictEqual(seq, ['POST /files', 'POST STORAGE/savillsuk.elogbooks.net', 'POST /files', 'POST STORAGE/savillsuk.elogbooks.net', 'POST /sites/6324/jobs/reactive', 'GET /sites/6324/jobs/3070002', 'GET /sites/6324/jobs/3070002/files', 'POST /sites/6324/jobs/3070002/files', 'GET /sites/6324/jobs/3070002', 'GET /sites/6324/jobs/3070002/files']);
  { const at = JSON.parse(s.calls[7].body); assert.deepStrictEqual(at._links, { file: { href: '/files/1000' }, documentType: { href: '/documenttypes/3' } }); assert.strictEqual(at.title, 'Before photo 2'); }
  assert.deepStrictEqual(JSON.parse(s.calls[0].body), { title: 'Before photo 1', filename: 'Before-photo-1.jpg', type: 'image/jpeg', size: 8 });
  const b = JSON.parse(s.calls[4].body);
  assert.strictEqual(b.files.links.length, 1, 'przy zakładaniu tylko jedno zdjęcie (3 naraz = http400, 21/11/2026)');
  assert.deepStrictEqual(b.files.links[0], { _links: { file: { href: '/files/999' }, resource: { href: '/files/999/resource', title: 't', type: 'image/jpeg' } }, title: 'Before photo 1', filename: 'Before-photo-1.jpg', type: 'image/jpeg', href: '/files/999' });
  assert.ok(!b.files.links.some(l => l.href === '/files/1000'), 'drugie zdjęcie nie w zakładaniu');
  assert.deepStrictEqual(s.results[0], { status: 'ok', id: 3070002, job: { id: 3070002, status: 'approval_pending', final: false, summary: 'Door handle' }, photos: 2, photosSeen: 2, hrefs: ['/files/999', '/files/1000'], seenHrefs: ['/files/999', '/files/1000'] });
});
test('założenie: zdjęcie nie dotarło przy zleceniu → wynik mówi ile widać; błąd wysyłki zdjęcia → zlecenie nie zakładane', async () => {
  const files = [{ b64: JPG, name: 'a.jpg', title: 'Before photo 1', type: 'image/jpeg' }, { b64: JPG, name: 'b.jpg', title: 'Before photo 2', type: 'image/jpeg' }];
  world.drop = true; const s = world({ op: 'create', nonce: 'p2', summary: 'x', description: 'y', files }, WZ, {}); await s.run(); world.drop = false;
  assert.strictEqual(s.results[0].status, 'ok', 'dosłanie drugiego zdjęcia nie cofa założenia');
  assert.strictEqual(s.results[0].photos, 2); assert.strictEqual(s.results[0].photosSeen, 1); assert.deepStrictEqual(s.results[0].seenHrefs, ['/files/999'], 'karta wie, którego zdjęcia brakuje');
  const t = world({ op: 'create', nonce: 'p3', summary: 'x', description: 'y', files: [{ b64: JPG, name: 'a.jpg', title: 'A', type: 'image/jpeg' }] }, WZ, {});
  const XHR = t.w.XMLHttpRequest, send = XHR.prototype.send; XHR.prototype.send = function (b) { if (/storage\.googleapis/.test(this.u)) { this.status = 500; this.responseText = ''; setImmediate(() => this.onload()); return; } return send.call(this, b); };
  await t.run();
  assert.strictEqual(t.results[0].status, 'error'); assert.strictEqual(t.results[0].step, 'upload');
  assert.ok(!t.calls.some(c => /jobs\/reactive$/.test(c.u)), 'bez zdjęcia w Vantify nie zakłada zlecenia');
});
test('bez wzoru założenia: nic nie wysyła, mówi czego brakuje (create uczy się raz z okna – zapis 18/11 ukrył wartości)', async () => {
  const s = world({ op: 'create', nonce: 'n2', summary: 'a', description: 'b' }, {}, {}); await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'nowzor', op: 'create' }]); assert.strictEqual(s.calls.length, 0);
});
// ---------- wzory wbudowane z zapisu „Zbadaj” 18/11/2026 (Grzegorz 20/11/2026: zamykanie i zdjęcia bez nauki w oknie) ----------
test('wzory wbudowane: kształt jak w zapisie 18/11 (Commence, Complete z Job Sheet = typ 1, Files → Add = typ 3)', () => {
  const d = new Date(Date.UTC(2026, 10, 20, 15, 0));
  assert.deepStrictEqual(A.commence(A.built('commence'), { date: d }), { _links: {}, files: { links: [] }, onSiteDate: A.fmt(d, '2026-11-05T15:54:17+00:00') });
  const c = A.complete(A.built('complete', { visibility: 'Vis' }), { date: d, files: [{ href: '/files/9', title: 'REACTIVE Shelves 20112026' }] });
  assert.deepStrictEqual(Object.keys(c).sort(), ['_links', 'assets', 'completionDate', 'escalationFiles', 'files']);
  assert.deepStrictEqual(c.files[0]._links, { file: { href: '/files/9' }, documentType: { href: '/documenttypes/1' } });
  assert.strictEqual(c.files[0].title, 'REACTIVE Shelves 20112026'); assert.strictEqual(c.files[0].visibility, 'Vis'); assert.ok(!JSON.stringify(c).includes('_built') && !JSON.stringify(c).includes('_date'));
  const a = A.attach(A.built('attach', {}), { title: 'Before photo 1', href: '/files/5', date: d });
  assert.deepStrictEqual(a._links, { file: { href: '/files/5' }, documentType: { href: '/documenttypes/3' } }); assert.ok(!('visibility' in a), 'bez znanej widoczności pole pominięte');
  for (const k of ['tags', 'id', 'isContract', 'documentDate', 'expiresAt', 'isStatutory', 'userTags', 'notifyExpiry', 'isJobFile', 'description', 'applicableTo']) assert.ok(k in a, 'Files → Add bez pola ' + k);
});
test('zamknięcie bez nauczonego wzoru: Commence + Complete z wzoru wbudowanego, Job Sheet typu wymaganego przez zlecenie, widoczność z pliku przy zleceniu', async () => {
  const jobs = { 3070050: { id: 3070050, status: 'acknowledged', is_final_status: false, summary: 'Shelves', _links: { commence: {}, files: { href: '/sites/6324/jobs/3070050/files' } }, requiredDocumentTypes: { count: 1, documentTypes: [{ id: 1, _links: { self: { href: '/documenttypes/1' } } }] }, files: [{ visibility: 'VisFromJob', _links: { file: { href: '/files/400' } } }] } };
  const s = world({ op: 'close', nonce: 'b1', id: 3070050, summary: 'Shelves', onSite: '2026-11-20T09:00:00Z', done: '2026-11-20T10:00:00Z', file: { b64: PDF, name: 'REACTIVE Shelves 20112026.pdf', title: 'REACTIVE Shelves 20112026', type: 'application/pdf' } }, { create: WZ.create }, jobs); await s.run();
  const seq = s.calls.map(c => c.m + ' ' + c.u.replace(API, '').replace('https://storage.googleapis.com', 'STORAGE'));
  assert.deepStrictEqual(seq, ['GET /sites/6324/jobs/3070050', 'GET /sites/6324/jobs/3070050/files', 'POST /files', 'POST STORAGE/savillsuk.elogbooks.net', 'POST /sites/6324/jobs/3070050/workflow/operation/commence', 'POST /sites/6324/jobs/3070050/workflow/operation/complete', 'GET /sites/6324/jobs/3070050', 'GET /sites/6324/jobs/3070050/files']);
  const cm = JSON.parse(s.calls[4].body); assert.deepStrictEqual(Object.keys(cm).sort(), ['_links', 'files', 'onSiteDate']); assert.match(cm.onSiteDate, /^2026-11-20T09:00:00\+00:00$/);
  const cp = JSON.parse(s.calls[5].body); assert.match(cp.completionDate, /^2026-11-20T10:00:00\+00:00$/);
  assert.deepStrictEqual(cp.files[0]._links, { file: { href: '/files/999' }, documentType: { href: '/documenttypes/1' } }); assert.strictEqual(cp.files[0].visibility, 'VisFromJob');
  assert.strictEqual(s.results[0].status, 'ok'); assert.strictEqual(s.results[0].closed, true);
});
test('zamknięcie wzorem wbudowanym: Vantify odrzuca (4xx) → „nowzor” z krokiem (okno Vantify), kilka wymaganych typów → okno bez wysyłki; 5xx/sieć = zwykły błąd', async () => {
  const base = () => ({ 9: { id: 9, status: 'acknowledged', summary: 'A', _links: { commence: {}, files: { href: '/sites/6324/jobs/9/files' } } } });
  const a = { op: 'close', id: 9, summary: 'A', file: { b64: PDF, name: 'a.pdf', title: 'REACTIVE A', type: 'application/pdf' } };
  const reject = (s, re, st) => { const XHR = s.w.XMLHttpRequest, send = XHR.prototype.send; XHR.prototype.send = function (b) { if (re.test(this.u)) { s.calls.push({ m: this.m, u: this.u, body: b }); this.status = st; this.responseText = JSON.stringify({ message: 'Invalid field' }); setImmediate(() => this.onload()); return; } return send.call(this, b); }; };
  const s = world({ ...a, nonce: 'r1' }, {}, base()); reject(s, /complete$/, 422); await s.run();
  assert.deepStrictEqual(s.results[0], { status: 'nowzor', op: 'complete', built: true, code: 'http422', msg: 'Invalid field' }); assert.ok(s.calls.some(c => /commence$/.test(c.u)), 'Commence przeszło przed odrzuceniem Complete');
  const t = world({ ...a, nonce: 'r2' }, {}, base()); reject(t, /commence$/, 400); await t.run();
  assert.strictEqual(t.results[0].status, 'nowzor'); assert.strictEqual(t.results[0].op, 'commence'); assert.ok(!t.calls.some(c => /complete$/.test(c.u)));
  const u = world({ ...a, nonce: 'r3' }, {}, base()); reject(u, /complete$/, 500); await u.run();
  assert.strictEqual(u.results[0].status, 'error'); assert.strictEqual(u.results[0].step, 'complete');
  const v = world({ ...a, nonce: 'r4' }, { complete: WZ.complete, commence: WZ.commence }, base()); reject(v, /complete$/, 422); await v.run();
  assert.strictEqual(v.results[0].status, 'error', 'nauczony wzór odrzucony = zwykły błąd, nie okno');
  const two = base(); two[9].requiredDocumentTypes = { count: 2, documentTypes: [{ id: 1 }, { id: 4 }] };
  const w2 = world({ ...a, nonce: 'r5' }, {}, two); await w2.run();
  assert.deepStrictEqual(w2.results[0], { status: 'nowzor', op: 'complete', why: 'doctype' }); assert.ok(w2.calls.every(c => c.m === 'GET'));
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
test('zlecenie wymaga innego typu dokumentu niż zapamiętany Job Sheet → okno Vantify, nic nie wysłane (przegląd Codex #146)', async () => {
  const need = id => ({ count: 1, documentTypes: [{ id, _links: { self: { href: '/documenttypes/' + id } } }] });
  const job = rd => ({ 3066755: { id: 3066755, status: 'acknowledged', summary: 'Coat hooks', _links: { commence: {} }, requiredDocumentTypes: rd } });
  const a = { op: 'close', id: 3066755, summary: 'Coat hooks', file: { b64: PDF, name: 'REACTIVE Coat hooks 05112026.pdf', title: 'REACTIVE Coat hooks 05112026', type: 'application/pdf' } };
  const s = world({ ...a, nonce: 'd1' }, WZ, job(need(7))); await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'nowzor', op: 'complete', why: 'doctype' }]); assert.ok(s.calls.every(c => c.m === 'GET'));
  const t = world({ ...a, nonce: 'd2' }, WZ, job(need(1))); await t.run(); assert.strictEqual(t.results[0].status, 'ok', 'wymagany ten sam typ – zamyka');
  const u = world({ ...a, nonce: 'd3' }, WZ, job({ count: 0 })); await u.run(); assert.strictEqual(u.results[0].status, 'ok', 'bez wymagań – zamyka');
  assert.strictEqual(A.check({ id: 1, status: 'acknowledged', _links: { complete: {} }, requiredDocumentTypes: { count: 1, documentTypes: [{ id: 3 }] } }, { id: 1, docType: '/documenttypes/1' }), 'doctype');
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
  // dodanie pliku w oknie: numer zlecenia i adres dodanego pliku, żeby apka potwierdziła go odczytem (przegląd Codex #167)
  const f = new w.XMLHttpRequest(); f.open('POST', API + '/sites/6324/jobs/3066755/files'); f.send(JSON.stringify(ATTACH)); f.status = 201; listeners.pop()();
  assert.strictEqual(got[2][0], 'attach'); assert.strictEqual(got[2][2], '3066755|/files/2793327'); assert.ok(!JSON.stringify(got[2][1]).includes('Leak'));
});
test('priorytet przy zakładaniu (Grzegorz 20/11/2026): lista tego samego rodzaju, dni z terminu, wybrany idzie w zleceniu', () => {
  const list = [
    { name: 'P5', active: true, entityType: 'entity_reactive', completePeriod: { period: 432000 }, completePeriodDisplayValue: '5 days', _links: { self: { href: 'https://savillsuk-api.cafm.vantify.com/priorities/5' } } },
    { name: 'P8', active: true, entityType: 'entity_reactive', completePeriod: { period: 15552000 }, completePeriodDisplayValue: '180 days', _links: { self: { href: '/priorities/137' } } },
    { name: 'Quote', active: true, entityType: 'entity_quote', completePeriod: { period: 86400 }, _links: { self: { href: '/priorities/6' } } },
    { name: 'Old', active: false, entityType: 'entity_reactive', _links: { self: { href: '/priorities/9' } } }];
  const p = A.priorities(list, 'entity_reactive');
  assert.deepStrictEqual(p.map(x => [x.name, x.days, x.label]), [['P5', 5, '5 days'], ['P8', 180, '180 days']]);
  const rel = A.create(A.wzor('create', CREATE), { summary: 's', description: 'd', priority: 'https://savillsuk-api.cafm.vantify.com/priorities/137' });
  assert.strictEqual(rel._links.priority.href, /^https?:/.test(CREATE._links.priority.href) ? 'https://savillsuk-api.cafm.vantify.com/priorities/137' : '/priorities/137', 'adres w tym samym zapisie co we wzorze');
  const keep = A.create(A.wzor('create', CREATE), { summary: 's', description: 'd' });
  assert.deepStrictEqual(keep._links.priority, CREATE._links.priority, 'bez wyboru zostaje priorytet ze wzoru');
});

// ---------- dosłanie zdjęć przed do istniejącego zlecenia (przegląd Codex #166) ----------
// kształt z zapisu „Zbadaj” 18/11: POST /sites/6324/jobs/3066755/files {_links:{file, documentType}, title, visibility, documentDate, …}
test('wzór dodania pliku: bez tytułu, opisu, daty i pliku; typ dokumentu i widoczność zostają; zapytanie z nowym plikiem', () => {
  const t = A.wzor('attach', ATTACH);
  assert.ok(!('title' in t) && !('description' in t) && !('documentDate' in t) && !('id' in t));
  assert.strictEqual(t._links.file.href, ''); assert.strictEqual(t._links.documentType.href, '/documenttypes/3'); assert.strictEqual(t.visibility, 'partnership'); assert.strictEqual(t._date, ATTACH.documentDate);
  assert.strictEqual(JSON.stringify(t).includes('Leak') || JSON.stringify(t).includes('sink'), false);
  assert.strictEqual(A.wzor('attach', { title: 'x' }), null, 'bez _links nie wiadomo, jak dodać plik');
  const b = A.attach(t, { title: 'Before photo 2', href: '/files/1200', date: new Date(Date.UTC(2026, 10, 20, 10, 0)) });
  assert.strictEqual(b.title, 'Before photo 2'); assert.strictEqual(b._links.file.href, '/files/1200'); assert.strictEqual(b._links.documentType.href, '/documenttypes/3');
  assert.match(b.documentDate, /^2026-11-20T/); assert.ok(!('_date' in b)); assert.strictEqual(t._links.file.href, '', 'wzór nie zmieniony');
});
const JOB = () => ({ 3070002: { id: 3070002, status: 'approval_pending', summary: 'Door handle', _links: { files: { href: '/sites/6324/jobs/3070002/files' } }, files: [{ _links: { file: { href: '/files/500' } } }] } });
test('sprawdzenie statusu z adresami zdjęć: mówi, które widać przy zleceniu', async () => {
  const s = world({ op: 'status', nonce: 's1', ids: [3070002], fileHrefs: ['/files/500', '/files/1000'] }, WZ, JOB()); await s.run();
  assert.strictEqual(s.results[0].status, 'ok'); assert.deepStrictEqual(s.results[0].jobs[0].seenHrefs, ['/files/500']);
  const t = world({ op: 'status', nonce: 's2', ids: [3070002] }, WZ, JOB()); await t.run();
  assert.ok(!('seenHrefs' in t.results[0].jobs[0])); assert.ok(!t.calls.some(c => /\/files$/.test(c.u)), 'bez adresów nie czyta listy plików');
});
test('dosłanie: bez nauczonego wzoru wzór wbudowany (typ 3, widoczność z pliku przy zleceniu); odrzucony → okno; z wzorem plik → Files → Add → odczyt', async () => {
  const f = [{ b64: JPG, name: 'Before-photo-2.jpg', title: 'Before photo 2', type: 'image/jpeg' }];
  const jb = JOB(); jb[3070002].files[0].visibility = 'VisFromJob';
  const n = world({ op: 'attach', nonce: 'a0', id: 3070002, files: f, known: ['/files/500'] }, WZ, jb); await n.run();
  const nb = JSON.parse(n.calls.find(c => c.m === 'POST' && /jobs\/3070002\/files$/.test(c.u)).body);
  assert.deepStrictEqual(nb._links, { file: { href: '/files/999' }, documentType: { href: '/documenttypes/3' } }); assert.strictEqual(nb.visibility, 'VisFromJob'); assert.strictEqual(nb.title, 'Before photo 2');
  assert.deepStrictEqual(n.results[0], { status: 'ok', sent: ['/files/999'], seenHrefs: ['/files/500', '/files/999'] });
  const r = world({ op: 'attach', nonce: 'a0r', id: 3070002, files: f, known: ['/files/500'] }, WZ, JOB());
  const XHR = r.w.XMLHttpRequest, send = XHR.prototype.send; XHR.prototype.send = function (b) { if (this.m === 'POST' && /jobs\/3070002\/files$/.test(this.u)) { this.status = 422; this.responseText = '{}'; setImmediate(() => this.onload()); return; } return send.call(this, b); };
  await r.run(); assert.deepStrictEqual(r.results[0], { status: 'nowzor', op: 'attach', built: true, code: 'http422', msg: '' });
  const s = world({ op: 'attach', nonce: 'a1', id: 3070002, files: f, known: ['/files/500'] }, { ...WZ, attach: A.wzor('attach', ATTACH) }, JOB()); await s.run();
  const seq = s.calls.map(c => c.m + ' ' + c.u.replace(API, '').replace('https://storage.googleapis.com', 'STORAGE'));
  assert.deepStrictEqual(seq, ['GET /sites/6324/jobs/3070002', 'POST /files', 'POST STORAGE/savillsuk.elogbooks.net', 'POST /sites/6324/jobs/3070002/files', 'GET /sites/6324/jobs/3070002', 'GET /sites/6324/jobs/3070002/files']);
  const b = JSON.parse(s.calls[3].body); assert.strictEqual(b.title, 'Before photo 2'); assert.strictEqual(b._links.file.href, '/files/999'); assert.strictEqual(b._links.documentType.href, '/documenttypes/3');
  assert.deepStrictEqual(s.results[0], { status: 'ok', sent: ['/files/999'], seenHrefs: ['/files/500', '/files/999'] });
});
test('dosłanie: Vantify przyjął, ale pliku nie widać → wynik bez niego; inny numer zlecenia → nic nie wysyła', async () => {
  const f = [{ b64: JPG, name: 'x.jpg', title: 'Before photo 2', type: 'image/jpeg' }], W2 = { ...WZ, attach: A.wzor('attach', ATTACH) };
  const jobs = JOB();
  world.drop = true; const s = world({ op: 'attach', nonce: 'a2', id: 3070002, files: f, known: ['/files/500'] }, W2, jobs); await s.run(); world.drop = false;
  assert.deepStrictEqual(s.results[0], { status: 'ok', sent: ['/files/999'], seenHrefs: ['/files/500'] });
  const t = world({ op: 'attach', nonce: 'a3', id: 1, files: f }, W2, JOB()); await t.run();
  assert.strictEqual(t.results[0].status, 'error'); assert.ok(!t.calls.some(c => c.m === 'POST'));
});
test('dosłanie przerwane w połowie: wynik mówi, które pliki już dodano (bez dublowania przy następnej próbie)', async () => {
  const f = [{ b64: JPG, name: 'a.jpg', title: 'Before photo 1', type: 'image/jpeg' }, { b64: JPG, name: 'c.jpg', title: 'Before photo 3', type: 'image/jpeg' }];
  const s = world({ op: 'attach', nonce: 'a4', id: 3070002, files: f, known: ['/files/500'] }, { ...WZ, attach: A.wzor('attach', ATTACH) }, JOB());
  const XHR = s.w.XMLHttpRequest, send = XHR.prototype.send; let n = 0;
  XHR.prototype.send = function (b) { if (/storage\.googleapis/.test(this.u) && ++n === 2) { this.status = 500; this.responseText = ''; setImmediate(() => this.onload()); return; } return send.call(this, b); };
  await s.run();
  assert.strictEqual(s.results[0].status, 'error'); assert.deepStrictEqual(s.results[0].sent, ['/files/999']);
});
test('odczyt listy plików nieudany (503): status mówi „nie wiadomo” (null), nie „brak wszystkich” (przegląd Codex #167)', async () => {
  const s = world({ op: 'status', nonce: 's9', ids: [3070002], fileHrefs: ['/files/500'] }, WZ, JOB());
  const XHR = s.w.XMLHttpRequest, send = XHR.prototype.send;
  XHR.prototype.send = function (b) { if (this.m === 'GET' && /\/files$/.test(this.u)) { this.status = 503; this.responseText = ''; setImmediate(() => this.onload()); return; } return send.call(this, b); };
  await s.run();
  assert.strictEqual(s.results[0].status, 'ok'); assert.strictEqual(s.results[0].jobs[0].seenHrefs, null);
});
test('po założeniu wygasłe logowanie przy odczycie plików: numer zlecenia wraca, zdjęcia „nie wiadomo” (przegląd Codex #167)', async () => {
  const files = [{ b64: JPG, name: 'a.jpg', title: 'Before photo 1', type: 'image/jpeg' }];
  const s = world({ op: 'create', nonce: 'p9', summary: 'x', description: 'y', files }, WZ, {});
  const XHR = s.w.XMLHttpRequest, send = XHR.prototype.send;
  XHR.prototype.send = function (b) { if (this.m === 'GET' && /\/files$/.test(this.u)) { this.status = 401; this.responseText = ''; setImmediate(() => this.onload()); return; } return send.call(this, b); };
  await s.run();
  assert.strictEqual(s.results[0].status, 'ok'); assert.strictEqual(s.results[0].id, 3070002); assert.strictEqual(s.results[0].seenHrefs, null); assert.deepStrictEqual(s.results[0].hrefs, ['/files/999']);
});

// ---------- „Send update” (Grzegorz 20/11/2026): wiadomość do zlecenia, tylko gdy czeka na zatwierdzenie ----------
const MSG = { body: 'Some secret text', visibility: 0, notify: true, _links: { recipients: [] } };
const TXT = 'Works completed. Please approve so the job can be closed.';
const UJ = (status = 'approval_pending', final = false) => ({ 3070020: { id: 3070020, status, is_final_status: final, summary: 'Tap leak', _links: { messages: { href: '/sites/6324/jobs/3070020/messages' } }, messages: [] } });
test('wzór wiadomości: bez treści, reszta zostaje; bez pola body = brak wzoru; zapytanie z tekstem', () => {
  const t = A.wzor('update', MSG);
  assert.ok(!('body' in t)); assert.strictEqual(t.notify, true); assert.strictEqual(JSON.stringify(t).includes('secret'), false);
  assert.strictEqual(A.wzor('update', { text: 'x' }), null);
  assert.deepStrictEqual(A.message(t, { text: ' ' + TXT + ' ' }), { visibility: 0, notify: true, _links: { recipients: [] }, body: TXT });
});
test('Send update: bez wzoru nic nie wysyła; czeka na zatwierdzenie → wiadomość i potwierdzenie odczytem', async () => {
  const n = world({ op: 'update', nonce: 'u0', id: 3070020, text: TXT }, WZ, UJ()); await n.run();
  assert.deepStrictEqual(n.results[0], { status: 'nowzor', op: 'update' }); assert.ok(!n.calls.some(c => c.m === 'POST'));
  const s = world({ op: 'update', nonce: 'u1', id: 3070020, text: TXT, summary: 'Tap leak' }, { ...WZ, update: A.wzor('update', MSG) }, UJ()); await s.run();
  assert.deepStrictEqual(s.calls.map(c => c.m + ' ' + c.u.replace(API, '')), ['GET /sites/6324/jobs/3070020', 'POST /sites/6324/jobs/3070020/messages', 'GET /sites/6324/jobs/3070020/messages']);
  assert.strictEqual(JSON.parse(s.calls[1].body).body, TXT);
  assert.strictEqual(s.results[0].status, 'ok'); assert.strictEqual(s.results[0].seen, true);
  world.dropMsg = true; const t = world({ op: 'update', nonce: 'u2', id: 3070020, text: TXT }, { ...WZ, update: A.wzor('update', MSG) }, UJ()); await t.run(); world.dropMsg = false;
  assert.strictEqual(t.results[0].status, 'ok'); assert.strictEqual(t.results[0].seen, false, 'wiadomości nie widać = nie udaje sukcesu');
});
test('Send update: już zatwierdzone, zamknięte albo inna nazwa → nic nie wysyła (Grzegorz: „sprawdzić, czy nie zostało już approve”)', async () => {
  const W2 = { ...WZ, update: A.wzor('update', MSG) };
  for (const [jobs, why, sum] of [[UJ('acknowledged'), 'approved'], [UJ('completed', true), 'final'], [UJ(), 'summary', 'Other']]) {
    const s = world({ op: 'update', nonce: 'u-' + why, id: 3070020, text: TXT, summary: sum || '' }, W2, jobs); await s.run();
    assert.strictEqual(s.results[0].status, 'differs'); assert.strictEqual(s.results[0].why, why); assert.ok(!s.calls.some(c => c.m === 'POST'), why + ': coś wysłane');
  }
});
test('sprawdzenie statusu z tekstem wiadomości: mówi, czy jest przy zleceniu', async () => {
  const jobs = UJ(); jobs[3070020].messages = [{ body: TXT }];
  const s = world({ op: 'status', nonce: 'u5', ids: [3070020], messageText: TXT }, WZ, jobs); await s.run();
  assert.strictEqual(s.results[0].jobs[0].messageSeen, true);
});
test('odmowa Vantify w całości (Grzegorz 21/11/2026: samo „http400 (create)”): komunikat, naruszenia, błędy formularza, surowy tekst', () => {
  assert.strictEqual(A.errText({ code: 400, message: 'Validation Failed', errors: { children: { summary: { errors: ['This value is too long.'] }, priority: {} } } }), 'Validation Failed; summary: This value is too long.');
  assert.strictEqual(A.errText([{ property_path: 'priority', message: 'Priority not allowed' }, { propertyPath: 'files', message: 'Invalid file' }]), 'priority: Priority not allowed; files: Invalid file');
  assert.strictEqual(A.errText({ title: 'An error occurred', violations: [{ propertyPath: 'summary', title: 'too long' }] }), 'An error occurred; summary: too long');
  assert.strictEqual(A.errText({ message: 'Invalid field' }), 'Invalid field');
  assert.strictEqual(A.errText({}), '');
  assert.strictEqual(A.errText(null, '<html><body>Bad  Request</body></html>'), 'Bad Request');
  assert.strictEqual(A.errText({ message: 'x'.repeat(2000) }).length, 1000);
});
test('zakładanie odrzucone 400: powód z odpowiedzi Vantify trafia do wyniku (krok create)', async () => {
  const s = world({ op: 'create', nonce: 'e400', summary: 'Door', description: 'Door', files: [] }, WZ, {});
  const XHR = s.w.XMLHttpRequest, send = XHR.prototype.send; XHR.prototype.send = function (b) { if (/jobs\/reactive$/.test(this.u)) { this.status = 400; this.responseText = JSON.stringify([{ property_path: 'priority', message: 'Priority not allowed' }]); setImmediate(() => this.onload()); return; } return send.call(this, b); };
  await s.run();
  assert.deepStrictEqual(s.results[0], { status: 'error', code: 'http400', msg: 'priority: Priority not allowed', step: 'create' });
});
