const test = require('node:test');
const assert = require('node:assert');
const Z = require('../../moduly/zdjecia/zdjecia.js');
const MB = 1024 * 1024;

test('nazwa i folder z kontekstu', () => {
  const p = Z.place({ category: 'Local Isolators', code: 'ISO-027', location: 'TB L13' }, new Date(2026, 10, 1, 17, 14, 5));
  assert.deepStrictEqual(p.folder, ['2026-11', '01', 'Local Isolators']);
  assert.strictEqual(p.name, 'TB L13 ISO-027 171405.jpg');
  assert.strictEqual(Z.place({ source: 'reactive', code: 'a/b:c' }, new Date(2026, 0, 2, 3, 4, 5)).name, 'a b c 030405.jpg');
});

test('kompresja nie powiększa i trzyma limity presetów', () => {
  assert.deepStrictEqual(Z.fit(4080, 3072, 'standard'), { width: 1920, height: 1446, quality: 0.8 });
  assert.strictEqual(Z.fit(800, 600, 'standard').width, 800);
  assert.strictEqual(Z.fit(8160, 6144, 'oryginal').width, 8160);
});

test('limity: z telefonu tylko wysłane, z Dysku najstarsze', () => {
  const r = (id, day, size, extra) => Object.assign({ id, created: '2026-11-' + day + 'T10:00:00Z', size: size * MB, hasBlob: true }, extra);
  const recs = [r('a', '01', 60), r('b', '02', 60, { driveId: 'x' }), r('c', '03', 60, { driveId: 'y' })];
  const p = Z.plan(recs, { phoneLimitMB: 100, driveLimitMB: 100 });
  assert.deepStrictEqual(p.phoneRemove, ['b', 'c']); // 'a' niewysłane zostaje mimo że najstarsze
  assert.deepStrictEqual(p.driveRemove, ['b']);
  assert.strictEqual(p.phoneOver, false);
  assert.strictEqual(Z.plan([r('a', '01', 200)], { phoneLimitMB: 100 }).phoneOver, true);
});

test('wyszukiwanie po kodzie i dniu', () => {
  const recs = [{ id: 1, day: '2026-11-01', code: 'ISO-027', created: '1' }, { id: 2, day: '2026-11-02', code: 'DB-1', created: '2' }];
  assert.deepStrictEqual(Z.search(recs, 'iso-027').map(x => x.id), [1]);
  assert.deepStrictEqual(Z.search(recs, '2026-11').map(x => x.id), [2, 1]);
});

function fakeStore(over) {
  const rows = new Map(); let saved = {}, n = 0, t = Date.UTC(2026, 10, 1, 10);
  const deps = Object.assign({
    db: { all: async () => [...rows.values()].map(x => ({ ...x })), get: async id => rows.has(id) ? { ...rows.get(id) } : undefined, put: async r => { rows.set(r.id, { ...r }); }, del: async id => { rows.delete(id); } },
    settings: { load: () => saved, save: s => { saved = s; } },
    compress: async (file) => ({ blob: { size: file.size, type: 'image/jpeg' }, width: 10, height: 10 }),
    wifi: () => true, now: () => (t += 1000), id: () => 'p' + (++n)
  }, over);
  return { store: Z.createStore(deps), rows, getSettings: () => saved };
}
function fakeDrive() {
  const files = new Map(); let n = 0;
  return { files, ensureFolder: async (name, parent) => { const key = parent + '/' + name; if (!files.has(key)) files.set(key, { id: 'f' + (++n) }); return files.get(key); },
    upload: async (parent, name) => { const id = 'u' + (++n); files.set(id, { parent, name }); return { id }; },
    remove: async id => { files.delete(id); } };
}

test('zapis, wysyłka na Dysk, potem sprzątanie telefonu po limicie', async () => {
  const { store, rows, getSettings } = fakeStore();
  store.setSettings({ phoneLimitMB: 100, driveLimitMB: 1000 });
  for (let i = 0; i < 3; i++) await store.save({ size: 60 * MB }, { category: 'ATS', code: 'ATS-' + i, when: new Date(2026, 10, 1, 9, i) });
  assert.strictEqual([...rows.values()].filter(r => r.blob).length, 3, 'niewysłane zostają mimo limitu');
  const d = fakeDrive(), res = await store.sync(d);
  assert.strictEqual(res.sent, 3);
  assert.ok(getSettings().rootId && getSettings().lastSync);
  const left = [...rows.values()].filter(r => r.blob).map(r => r.code);
  assert.deepStrictEqual(left, ['ATS-2'], 'na telefonie zostaje najnowsze');
  assert.strictEqual(rows.size, 3, 'wpisy zostają do wyszukiwania');
});

test('limit Dysku kasuje najstarsze z Dysku; bez Wi-Fi brak automatu', async () => {
  const { store, rows } = fakeStore();
  store.setSettings({ phoneLimitMB: 100000, driveLimitMB: 100 });
  await store.save({ size: 60 * MB }, { code: 'A' }); await store.save({ size: 60 * MB }, { code: 'B' });
  const d = fakeDrive(); await store.sync(d);
  const a = [...rows.values()].find(r => r.code === 'A');
  assert.strictEqual(a.driveDeleted, true); assert.ok(a.blob, 'na telefonie nadal jest');
  const off = fakeStore({ wifi: () => null });
  await off.store.save({ size: MB }, {});
  assert.deepStrictEqual(await off.store.sync(fakeDrive()), { skipped: 'wifi', sent: 0 });
  assert.strictEqual((await off.store.sync(fakeDrive(), true)).sent, 1, 'ręcznie wysyła bez Wi-Fi');
});

test('utrata Wi-Fi w trakcie: reszta czeka; ręcznie wysyła wszystko', async () => {
  let wifi = true; const { store } = fakeStore({ wifi: () => wifi });
  await store.save({ size: MB }, { code: 'A' }); await store.save({ size: MB }, { code: 'B' });
  const d = fakeDrive(), up = d.upload; d.upload = async (...a) => { const r = await up(...a); wifi = false; return r; };
  assert.deepStrictEqual(await store.sync(d), { skipped: 'wifi', sent: 1 });
  assert.strictEqual((await store.sync(d, true)).sent, 1);
});

test('osobne konta nie widzą i nie wysyłają swoich zdjęć', async () => {
  let who = 'a@x'; const { store } = fakeStore({ owner: () => who });
  await store.save({ size: MB }, { code: 'A' });
  who = 'b@x';
  assert.strictEqual((await store.list()).length, 0);
  assert.strictEqual((await store.sync(fakeDrive())).sent, 0);
  who = 'a@x'; assert.strictEqual((await store.list()).length, 1);
});

test('pełny Dysk: sprzątanie po każdej wysyłce i przed następną próbą', async () => {
  const { store, rows } = fakeStore();
  store.setSettings({ driveLimitMB: 100, phoneLimitMB: 100000 });
  for (const c of ['A', 'B', 'C']) await store.save({ size: 60 * MB }, { code: c });
  const d = fakeDrive(); let n = 0; const up = d.upload;
  d.upload = async (...a) => { if (++n === 3) throw Error('GOOGLE_HTTP_403'); return up(...a); };
  await assert.rejects(store.sync(d));
  const onDrive = [...rows.values()].filter(r => r.driveId && !r.driveDeleted).map(r => r.code);
  assert.deepStrictEqual(onDrive, ['B'], 'po drugiej wysyłce najstarsze A zniknęło z Dysku mimo błędu trzeciej');
});

test('save powiadamia onSaved, sync nie', async () => {
  const { store } = fakeStore(); let saved = 0; store.onSaved(() => saved++);
  await store.save({ size: MB }, {}); await store.sync(fakeDrive());
  assert.strictEqual(saved, 1);
});
