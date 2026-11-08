// Raporty na Dysk + archiwum na telefonie (moduly/raporty, ustalenia Grzegorza 08/11/2026):
// na Dysk tylko Word, jeden plik na raport (ponowna wysyłka nadpisuje), folder OEST Raporty / budynek / rodzaj,
// na telefonie limit 200 MB – znikają najstarsze, tylko te już na Dysku; ostrzeżenie od 100 MB.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../../moduly/raporty/raporty.js');
const MB = 1024 * 1024;

function setup(o = {}) {
  const db = new Map();
  let owner = 'greg@example.com', clock = Date.parse('2026-11-08T10:00:00Z');
  const store = R.createStore({
    db: { get: async id => db.get(id), put: async r => { db.set(r.id, structuredClone(r)); }, del: async id => { db.delete(id); }, all: async () => [...db.values()].map(r => structuredClone(r)) },
    owner: () => owner, now: () => (clock += 1000), limits: o.limits
  });
  const files = new Map(), folders = new Map(), log = [];
  let n = 0;
  const drive = {
    ensureFolder: async (name, parent) => { const k = (parent || 'root') + '/' + name; if (!folders.has(k)) folders.set(k, 'f' + (++n)); return { id: folders.get(k) }; },
    find: async (parent, name) => { for (const [id, f] of files) if (f.parent === parent && f.name === name) return { id }; return null; },
    upload: async (parent, name, blob) => { const id = 'd' + (++n); files.set(id, { parent, name, blob, v: 1 }); log.push('upload ' + name); return { id }; },
    update: async (id, blob) => { const f = files.get(id); if (!f) throw Error('GOOGLE_HTTP_404'); f.blob = blob; f.v++; log.push('update ' + f.name); return { id }; }
  };
  return { store, db, drive, files, folders, log, setOwner: v => { owner = v; } };
}
const bytes = (mb, fill = 1) => new Uint8Array(Math.round(mb * MB)).fill(fill);
const rep = (name, extra = {}) => Object.assign({ name, docx: bytes(0.6), pdf: bytes(0.7), folder: ['Tower B', 'Taps/Shower Flushing'] }, extra);

test('wysłany raport: Word w OEST Raporty / budynek / rodzaj, nazwa jak raport', async () => {
  const t = setup();
  await t.store.save(rep('Weekly Flushing TB 08112026'));
  const r = await t.store.sync(t.drive);
  assert.strictEqual(r.sent, 1);
  const [f] = [...t.files.values()];
  assert.strictEqual(f.name, 'Weekly Flushing TB 08112026.docx');
  assert.deepStrictEqual([...t.folders.keys()], ['root/OEST Raporty', 'f1/Tower B', 'f2/Taps Shower Flushing']);
  assert.strictEqual(f.parent, t.folders.get('f2/Taps Shower Flushing'));
  const [rec] = await t.store.list();
  assert.strictEqual(rec.dirty, false); assert.ok(rec.driveId); assert.ok(rec.pdf.length > 0, 'PDF zostaje w telefonie');
});

test('ponowna wysyłka po dopisaniu: ten sam plik nadpisany, na Dysku jeden raport', async () => {
  const t = setup();
  await t.store.save(rep('DB-TB-EXT-1 08112026'));
  await t.store.sync(t.drive);
  await t.store.save(rep('DB-TB-EXT-1 08112026', { docx: bytes(0.6, 2) }));
  const [rec] = await t.store.list();
  assert.strictEqual(rec.dirty, true); assert.strictEqual(rec.versions, 2);
  await t.store.sync(t.drive);
  assert.strictEqual(t.files.size, 1, 'tylko ostatni raport');
  assert.deepStrictEqual(t.log, ['upload DB-TB-EXT-1 08112026.docx', 'update DB-TB-EXT-1 08112026.docx']);
  const b = [...t.files.values()][0].blob; assert.strictEqual(new Uint8Array(await b.arrayBuffer())[0], 2, 'na Dysku nowa treść'); assert.match(b.type, /wordprocessingml/);
  assert.strictEqual((await t.store.list()).length, 1);
});

test('przerwa po wysłaniu na Dysk, przed zapisem id: bez duplikatu', async () => {
  const t = setup();
  await t.store.save(rep('ATS TB 08112026'));
  await t.store.sync(t.drive);
  const [rec] = await t.store.list();
  const broken = t.db.get(rec.id); broken.driveId = ''; broken.dirty = true; // jak po zabiciu apki między uploadem a zapisem
  await t.store.sync(t.drive);
  assert.strictEqual(t.files.size, 1);
  assert.deepStrictEqual(t.log, ['upload ATS TB 08112026.docx', 'update ATS TB 08112026.docx']);
});

test('plik skasowany z Dysku ręcznie: tworzony od nowa', async () => {
  const t = setup();
  await t.store.save(rep('AOV TB 08112026'));
  await t.store.sync(t.drive);
  t.files.clear();
  await t.store.save(rep('AOV TB 08112026'));
  await t.store.sync(t.drive);
  assert.strictEqual(t.files.size, 1);
  assert.strictEqual((await t.store.list())[0].dirty, false);
});

test('bez sieci / bez Wi‑Fi: nic nie wysyła, raport czeka w telefonie', async () => {
  const t = setup();
  await t.store.save(rep('X 08112026'));
  const r = await t.store.sync(t.drive, { allowed: () => false });
  assert.strictEqual(r.skipped, 'network'); assert.strictEqual(t.files.size, 0);
  assert.strictEqual((await t.store.stats()).pending, 1);
});

test('limit 200 MB: znikają najstarsze, tylko te już na Dysku; ostrzeżenie od 100 MB', async () => {
  const t = setup();
  for (let i = 1; i <= 3; i++) await t.store.save(rep('R' + i, { docx: bytes(40), pdf: bytes(40) })); // 3 × 80 MB
  let s = await t.store.stats();
  assert.strictEqual(s.warn, true); assert.strictEqual(s.limitMB, 200); assert.strictEqual(s.warnMB, 100);
  await t.store.enforce();
  assert.strictEqual((await t.store.list()).length, 3, 'nic nie jest na Dysku → nic nie znika, mimo 240 MB');
  await t.store.sync(t.drive); // wysyła i od razu pilnuje limitu
  const names = (await t.store.list()).map(r => r.name).sort();
  assert.deepStrictEqual(names, ['R2', 'R3'], 'najstarszy R1 usunięty z telefonu (jest na Dysku)');
  assert.strictEqual(t.files.size, 3, 'na Dysku zostają wszystkie');
});

test('zmieniony raport (stara wersja na Dysku) nie znika z telefonu', () => {
  const p = R.plan([{ id: 'a', bytes: 150 * MB, updated: '1', driveId: 'x', dirty: true }, { id: 'b', bytes: 100 * MB, updated: '2', driveId: 'y' }], {});
  assert.deepStrictEqual(p.remove, ['b']);
});

test('inne konto nie widzi i nie wysyła cudzych raportów', async () => {
  const t = setup();
  await t.store.save(rep('A 08112026'));
  t.setOwner('other@example.com');
  assert.strictEqual((await t.store.list()).length, 0);
  assert.strictEqual((await t.store.sync(t.drive)).sent, 0);
});

test('bez Worda nie zapisuje (nigdy nie udaje kopii)', async () => {
  const t = setup();
  await assert.rejects(t.store.save({ name: 'A', docx: new Uint8Array(0) }), /REPORT_DOCX/);
  await assert.rejects(t.store.save({ name: '', docx: bytes(0.1) }), /REPORT_NAME/);
});
