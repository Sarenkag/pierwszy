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
  const rows = new Map(); let saved = {}, n = 0; const clock = { t: Date.UTC(2026, 10, 1, 10) };
  const deps = Object.assign({
    db: { all: async () => [...rows.values()].map(x => ({ ...x })), get: async id => rows.has(id) ? { ...rows.get(id) } : undefined, put: async r => { rows.set(r.id, { ...r }); }, del: async id => { rows.delete(id); } },
    settings: { load: () => saved, save: s => { saved = s; } },
    compress: async (file) => ({ blob: { size: file.size, type: 'image/jpeg' }, width: 10, height: 10 }),
    wifi: () => true, now: () => (clock.t += 1000), id: () => 'p' + (++n)
  }, over);
  return { store: Z.createStore(deps), rows, clock, getSettings: () => saved };
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
  // od 09/11/2026 po 2 pliki naraz (audyt zdjęć, punkt 8): para w drodze kończy się, następne czekają
  let wifi = true; const { store } = fakeStore({ wifi: () => wifi });
  await store.save({ size: MB }, { code: 'A' }); await store.save({ size: MB }, { code: 'B' }); await store.save({ size: MB }, { code: 'C' });
  const d = fakeDrive(), up = d.upload; d.upload = async (...a) => { const r = await up(...a); wifi = false; return r; };
  assert.deepStrictEqual(await store.sync(d), { skipped: 'wifi', sent: 2 });
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

test('jeden zapis: zwraca plik, nazwa z punktem, zdjęcie w inspekcji nie znika przy sprzątaniu', async () => {
  const { store, rows } = fakeStore();
  store.setSettings({ phoneLimitMB: 100, driveLimitMB: 1000 });
  const a = await store.save({ size: 60 * MB }, { category: 'Weekly Flushing', code: 'TB', point: 'L13 Kitchen tap', hold: 'inspekcja', when: new Date(2026, 10, 4, 9, 0, 0) });
  assert.ok(a.blob && a.blob.size === 60 * MB, 'wołający dostaje ten sam plik');
  assert.strictEqual(a.name, 'TB L13 Kitchen tap 090000.jpg');
  assert.deepStrictEqual(Z.search(await store.list(), 'kitchen').map(r => r.id), [a.id]);
  for (let i = 0; i < 2; i++) await store.save({ size: 60 * MB }, { code: 'X' + i, when: new Date(2026, 10, 4, 10, i) });
  await store.sync(fakeDrive());
  assert.ok(rows.get(a.id).blob, 'trzymane przez inspekcję zostaje na telefonie mimo limitu');
  assert.deepStrictEqual([...rows.values()].filter(r => r.blob).map(r => r.id), [a.id], 'pozostałe wysłane sprzątnięte po limicie');
});

test('release zwalnia tylko nieużywane i nie świeże, keep znów trzyma', async () => {
  const { store, rows } = fakeStore();
  const a = await store.save({ size: 1 }, { hold: 'inspekcja' }), b = await store.save({ size: 1 }, { hold: 'inspekcja' }), c = await store.save({ size: 1 }, { hold: 'reactive' });
  assert.strictEqual(await store.release('inspekcja', [a.id], 60 * 60 * 1000), 0, 'świeże (godzina) zostają trzymane');
  assert.strictEqual(await store.release('inspekcja', new Set([a.id]), 0), 1);
  assert.strictEqual(rows.get(a.id).hold, 'inspekcja');
  assert.strictEqual(rows.get(b.id).hold, '');
  assert.strictEqual(rows.get(c.id).hold, 'reactive', 'cudze trzymanie nietknięte');
  await store.keep([b.id], 'inspekcja');
  assert.strictEqual(rows.get(b.id).hold, 'inspekcja');
});

test('release: 30 dni liczone od wyczyszczenia, nie od zrobienia zdjęcia (Grzegorz 08/11: „niech trzyma przez miesiąc”)', async () => {
  const { store, rows, clock } = fakeStore();
  const D = 864e5, M = 30 * D;
  const a = await store.save({ size: 1 }, { hold: 'inspekcja' });
  clock.t += 20 * D; // inspekcja trwa 20 dni, zdjęcie jest w szkicu
  assert.strictEqual(await store.release('inspekcja', [a.id], M), 0);
  assert.ok(!rows.get(a.id).unused, 'w inspekcji: bez znacznika');
  // Wyczyść inspekcję: zdjęcia nie ma już w żadnym szkicu – zdjęcie ma 20 dni, ale trzymamy jeszcze pełne 30
  assert.strictEqual(await store.release('inspekcja', [], M), 0, 'zaraz po wyczyszczeniu nic nie zwolnione');
  assert.strictEqual(rows.get(a.id).hold, 'inspekcja');
  clock.t += 29 * D;
  assert.strictEqual(await store.release('inspekcja', [], M), 0, 'po 29 dniach wciąż trzymane');
  clock.t += 2 * D;
  assert.strictEqual(await store.release('inspekcja', [], M), 1, 'po 31 dniach zwolnione');
  assert.strictEqual(rows.get(a.id).hold, '');
  assert.ok(rows.get(a.id).blob, 'zwolnione zostaje w folderze OEST (tylko podlega limitowi)');
});

test('release: zdjęcie, które wróciło do inspekcji (Przywróć / Odzyskaj), liczy 30 dni od nowa', async () => {
  const { store, rows, clock } = fakeStore();
  const D = 864e5, M = 30 * D;
  const a = await store.save({ size: 1 }, { hold: 'inspekcja' });
  clock.t += 40 * D;
  await store.release('inspekcja', [], M); // wyczyszczona
  clock.t += 25 * D;
  await store.keep([a.id], 'inspekcja'); // ↺ Przywróć
  assert.ok(!rows.get(a.id).unused, 'keep zdejmuje znacznik');
  await store.release('inspekcja', [], M); // znów wyczyszczona
  clock.t += 10 * D;
  assert.strictEqual(await store.release('inspekcja', [], M), 0, 'po 10 dniach od drugiego wyczyszczenia trzymane');
  assert.strictEqual(rows.get(a.id).hold, 'inspekcja');
});

test('rozmiar wg rodzaju w Standardzie: formularz 1600, ogólne 1600, przy pytaniu 800', () => {
  assert.strictEqual(Z.fit(4080, 3072, 'standard', 'formularz').width, 1600);
  assert.strictEqual(Z.fit(4080, 3072, 'standard', 'ogolne').width, 1600);
  assert.strictEqual(Z.fit(4080, 3072, 'standard', 'punkt').width, 800);
  assert.strictEqual(Z.fit(4080, 3072, 'standard').width, 1920, 'bez rodzaju (inne moduły) 1920');
  assert.strictEqual(Z.fit(4080, 3072, 'wysoka', 'punkt').width, 3000, 'inne ustawienia jakości bez zmian');
});

test('zdjęcie na dowód (krany, izolatory) Małe 800 px', () => {
  assert.strictEqual(Z.fit(4080, 3072, 'standard', 'dowod').width, 800);
});

test('ogólne do wyboru: Duże 2560 / Średnie 1600 / Małe 800, domyślnie Średnie, zła wartość → Średnie', async () => {
  assert.deepStrictEqual(Z.GENERAL.map(g => Z.fit(4080, 3072, 'standard', g.kind).width), [2560, 1600, 800]);
  assert.strictEqual(Z.cleanSettings({}).general, 'srednie');
  assert.strictEqual(Z.cleanSettings({ general: 'xx' }).general, 'srednie');
  let saved = {}, seen = [];
  const store = Z.createStore({ owner: () => 'a', db: { all: async () => [], get: async () => null, put: async () => {}, del: async () => {} },
    settings: { load: () => saved, save: s => { saved = s; } }, compress: async (f, preset, kind) => { seen.push(kind); return { blob: { size: 1 }, width: 1, height: 1 }; },
    wifi: () => true, now: () => 0, id: () => 'x' + seen.length });
  await store.save({}, { kind: 'ogolne' });
  store.setSettings({ general: 'duze' }); await store.save({}, { kind: 'ogolne' });
  store.setSettings({ general: 'male' }); await store.save({}, { kind: 'ogolne' });
  await store.save({}, { kind: 'dowod' });
  assert.deepStrictEqual(seen, ['ogolne', 'duze', 'male', 'dowod']);
});

test('folder 200 MB, ostrzeżenia osobno od 100 MB (Grzegorz 05/11)', () => {
  const s = Z.cleanSettings({});
  assert.strictEqual(s.phoneLimitMB, 200);
  assert.strictEqual(s.warnMB, 100);
  assert.strictEqual(Z.cleanSettings({ warnMB: 'x' }).warnMB, 100);
  assert.strictEqual(Z.cleanSettings({ phoneLimitMB: 300, warnMB: 150 }).warnMB, 150);
});

// Audyt 06/11/2026: przerwana wysyłka nie może zrobić duplikatu na Dysku ani zostawić osieroconego pliku.
function propDrive() {
  const d = fakeDrive(); d.finds = 0;
  d.upload = async (parent, name, blob, props) => { const id = 'u' + (d.files.size + 1); d.files.set(id, { parent, name, props }); return { id }; };
  d.find = async (parent, name, props) => { d.finds++; for (const [id, f] of d.files) if (f.parent === parent && (!name || f.name === name) && f.props && f.props.oestPhoto === props.oestPhoto) return { id }; return null; };
  return d;
}
const photosOn = d => [...d.files.values()].filter(f => f.name); // pliki (foldery w fakeDrive mają tylko id)
test('przerwana wysyłka (plik doszedł, apka nie zapisała driveId): ponowna próba bez duplikatu', async () => {
  const { store, rows } = fakeStore();
  await store.save({ size: MB }, { category: 'Flushing', code: 'TB', point: 'Kran 1', when: new Date(2026, 10, 8, 9, 0) });
  const d = propDrive(), up = d.upload;
  d.upload = async (...a) => { await up(...a); throw Error('NETWORK_LOST'); }; // plik jest na Dysku, odpowiedź nie wróciła
  await assert.rejects(store.sync(d));
  const r1 = [...rows.values()][0];
  assert.strictEqual(r1.driveId, '');
  assert.strictEqual(r1.upTry, true);
  d.upload = up;
  const res = await store.sync(d);
  assert.strictEqual(res.sent, 1);
  assert.strictEqual(photosOn(d).length, 1, 'na Dysku jeden plik, nie dwa');
  const r2 = [...rows.values()][0];
  assert.strictEqual(r2.driveId, [...d.files.entries()].find(([, f]) => f.name)[0]);
  assert.strictEqual(r2.upTry, false);
});
test('przerwana wysyłka, plik NIE doszedł: ponowna próba wysyła go normalnie', async () => {
  const { store, rows } = fakeStore();
  await store.save({ size: MB }, { category: 'ATS', code: 'ATS-1', when: new Date(2026, 10, 8, 9, 0) });
  const d = propDrive(), up = d.upload;
  d.upload = async () => { throw Error('NETWORK_LOST'); };
  await assert.rejects(store.sync(d));
  d.upload = up;
  assert.strictEqual((await store.sync(d)).sent, 1);
  assert.strictEqual(photosOn(d).length, 1);
  assert.ok([...rows.values()][0].driveId);
});
test('dwa zdjęcia o tej samej nazwie (ta sama sekunda): każde osobno na Dysku, wyszukiwanie po id zdjęcia', async () => {
  const { store } = fakeStore();
  const when = new Date(2026, 10, 8, 9, 0, 0);
  await store.save({ size: MB }, { category: 'Flushing', code: 'TB', point: 'Kran 1', when });
  await store.save({ size: MB }, { category: 'Flushing', code: 'TB', point: 'Kran 1', when });
  const d = propDrive(), up = d.upload; let n = 0;
  d.upload = async (...a) => { const r = await up(...a); if (++n === 1) throw Error('NETWORK_LOST'); return r; };
  await assert.rejects(store.sync(d));
  // po 2 naraz (09/11/2026): drugie zdjęcie z pary doszło już w pierwszej próbie, ponowna próba kończy pierwsze (bez duplikatu)
  assert.strictEqual([...(await store.list())].filter(r => r.driveId).length, 1);
  assert.strictEqual((await store.sync(d)).sent, 1);
  const f = photosOn(d);
  assert.strictEqual(f.length, 2);
  assert.strictEqual(f[0].name, f[1].name);
  assert.notStrictEqual(f[0].props.oestPhoto, f[1].props.oestPhoto);
});
test('zwykła wysyłka nie robi dodatkowego zapytania na Dysku', async () => {
  const { store } = fakeStore();
  for (let i = 0; i < 3; i++) await store.save({ size: MB }, { category: 'ATS', code: 'ATS-' + i, when: new Date(2026, 10, 8, 9, i) });
  const d = propDrive();
  assert.strictEqual((await store.sync(d)).sent, 3);
  assert.strictEqual(d.finds, 0);
});
test('zdjęcie usunięte w trakcie wysyłki: plik zdjęty z Dysku (bez osieroconego pliku)', async () => {
  const { store, rows } = fakeStore();
  const s = await store.save({ size: MB }, { category: 'ATS', code: 'ATS-1', when: new Date(2026, 10, 8, 9, 0) });
  const d = propDrive(), up = d.upload;
  d.upload = async (...a) => { const r = await up(...a); await store.remove(s.id); return r; };
  assert.strictEqual((await store.sync(d)).sent, 0);
  assert.strictEqual(photosOn(d).length, 0);
  assert.strictEqual(rows.size, 0);
});
test('Codex #104: długa nazwa zdjęcia (> 200 znaków) – ponowna próba szuka tylko po id zdjęcia', async () => {
  const { store } = fakeStore();
  await store.save({ size: MB }, { category: 'Flushing', location: 'L'.repeat(80), code: 'C'.repeat(80), point: 'P'.repeat(80), when: new Date(2026, 10, 8, 9, 0) });
  const d = propDrive(), up = d.upload, names = [];
  d.find = (f => async (parent, name, props) => { names.push(name); return f(parent, name, props); })(d.find);
  d.upload = async (...a) => { await up(...a); throw Error('NETWORK_LOST'); };
  await assert.rejects(store.sync(d));
  d.upload = up;
  assert.strictEqual((await store.sync(d)).sent, 1);
  assert.deepStrictEqual(names, ['']);
  assert.strictEqual(photosOn(d).length, 1);
  assert.ok(photosOn(d)[0].name.length > 200);
});

// ---- Audyt wydajności zdjęć, punkty 7 i 8 (zgoda Grzegorza 09/11/2026) ----
function manualLater() { const q = []; const later = (fn, ms) => { const t = { fn, ms, off: false }; q.push(t); return () => { t.off = true; }; };
  later.run = async () => { const due = q.splice(0).filter(t => !t.off); due.forEach(t => t.fn()); for (let i = 0; i < 20; i++) await Promise.resolve(); return due.length; }; later.q = q; return later; }

test('punkt 7: przegląd limitu folderu RAZ po serii zdjęć, nie po każdym; limit dalej działa', async () => {
  const later = manualLater(); let scans = 0;
  // magazyn z licznikiem przeglądów folderu (db.all)
  const z = (() => { const rowsX = new Map(); let n = 0, t = Date.UTC(2026, 10, 9, 3); let saved = {};
    const deps = { later, db: { all: async () => { scans++; return [...rowsX.values()].map(x => ({ ...x })); }, get: async id => rowsX.has(id) ? { ...rowsX.get(id) } : undefined, put: async r => { rowsX.set(r.id, { ...r }); }, del: async id => { rowsX.delete(id); } },
      settings: { load: () => saved, save: x => { saved = x; } }, compress: async file => ({ blob: { size: file.size, type: 'image/jpeg' }, width: 10, height: 10 }), wifi: () => true, now: () => (t += 1000), id: () => 'z' + (++n) };
    return { store: Z.createStore(deps), rows: rowsX }; })();
  z.store.setSettings({ phoneLimitMB: 100, driveLimitMB: 100000 });
  let changes = 0; z.store.onChange(() => changes++);
  for (let i = 0; i < 20; i++) await z.store.save({ size: 10 * MB }, { code: 'K' + i, when: new Date(2026, 10, 9, 3, i) });
  assert.strictEqual(scans, 0, 'zapis zdjęcia nie przegląda folderu');
  assert.ok(changes >= 20, 'licznik na ekranie odświeża się od razu po każdym zdjęciu');
  assert.strictEqual(later.q.filter(t => !t.off).length, 1, 'jeden zaplanowany przegląd na całą serię');
  assert.ok(later.q.every(t => t.ms === 1500));
  assert.strictEqual(await later.run(), 1);
  assert.strictEqual(scans, 1, 'po serii dokładnie jeden przegląd');
  // limit: niewysłane zostają (jak dotąd); po wysyłce sprzątanie do 100 MB
  assert.strictEqual([...z.rows.values()].filter(r => r.blob).length, 20);
  await z.store.sync(fakeDrive());
  assert.ok([...z.rows.values()].filter(r => r.blob).reduce((a, r) => a + r.size, 0) <= 100 * MB, 'limit folderu dalej pilnowany');
});

test('punkt 8: na Dysk po 2 pliki naraz, od najstarszych, bez podwójnych folderów, każdy raz', async () => {
  const { store, rows } = fakeStore();
  for (let i = 0; i < 5; i++) await store.save({ size: MB }, { category: 'Flushing', code: 'TB', point: 'Kran ' + i, when: new Date(2026, 10, 9, 3, i) });
  const d = fakeDrive(), up = d.upload, ens = d.ensureFolder; let now = 0, peak = 0; const order = [], folderCalls = [];
  d.ensureFolder = async (name, parent) => { folderCalls.push(parent + '/' + name); return ens(name, parent); };
  d.upload = async (parent, name, blob, props) => { now++; peak = Math.max(peak, now); order.push(name); await new Promise(r => setTimeout(r, 5)); now--; return up(parent, name, blob, props); };
  assert.strictEqual((await store.sync(d)).sent, 5);
  assert.strictEqual(peak, 2, 'dwa pliki w drodze naraz, nie więcej');
  assert.deepStrictEqual(order.map(n => n.split(' ')[2]), ['0', '1', '2', '3', '4'], 'od najstarszych');
  assert.strictEqual(new Set(folderCalls).size, folderCalls.length, 'każdy folder tworzony raz');
  assert.ok([...rows.values()].every(r => r.driveId && !r.upTry));
  assert.strictEqual(new Set([...rows.values()].map(r => r.driveId)).size, 5);
});

test('punkt 8: błąd jednego pliku z pary – drugi zapisany, błąd zgłoszony, ponowna próba bez duplikatu', async () => {
  const { store, rows } = fakeStore();
  for (const c of ['A', 'B', 'C']) await store.save({ size: MB }, { category: 'ATS', code: c, when: new Date(2026, 10, 9, 3, c.charCodeAt(0)) });
  const d = propDrive(), up = d.upload; let n = 0;
  d.upload = async (...a) => { if (++n === 1) { await up(...a); throw Error('NETWORK_LOST'); } return up(...a); }; // A doszedł, odpowiedź nie wróciła
  await assert.rejects(store.sync(d), /NETWORK_LOST/);
  const byCode = c => [...rows.values()].find(r => r.code === c);
  assert.ok(byCode('B').driveId, 'drugi z pary zapisany mimo błędu pierwszego');
  assert.strictEqual(byCode('A').upTry, true);
  assert.ok(!byCode('C').driveId, 'następna para czeka');
  d.upload = up;
  assert.strictEqual((await store.sync(d)).sent, 2);
  assert.strictEqual(photosOn(d).length, 3, 'na Dysku trzy pliki, A bez duplikatu');
});

// Uwaga z przeglądu PR #114: prawdziwy adapter Google (settings-google.js) przepuszczał jedno żądanie naraz (GOOGLE_BUSY).
// Ten test idzie przez prawdziwe createGoogle i ten sam podział na Dysk co app/www/zdjecia-ui.js drive().
test('punkt 8 z prawdziwym adapterem Google: 5 zdjęć, 2 naraz, wszystkie wysłane, inne żądanie w trakcie = GOOGLE_BUSY', async () => {
  const { createGoogle } = require('../www/settings-google.js');
  let inFlight = 0, peak = 0, n = 0, release = [];
  const G = createGoogle({ account: () => ({ email: 'me@example.com' }), login: async () => ({ email: 'me@example.com', token: 'T' }),
    fetch: async (url, opts) => {
      const upload = /upload\/drive/.test(url); inFlight++; peak = Math.max(peak, inFlight);
      try {
        if (upload) await new Promise(r => release.push(r)); // trzymamy wysyłkę, żeby było widać dwie naraz
        const body = upload ? { id: 'file' + (++n), name: 'x' } : /\?q=/.test(url) ? { files: [] } : { id: 'fold' + (++n), name: 'f' };
        return { ok: true, status: 200, json: async () => body };
      } finally { inFlight--; }
    } });
  await G.connect('drive');
  const drive = { ensureFolder: (name, parent) => G.ensureFolder(name, parent), upload: (p, name, blob, props) => G.uploadFile(p, name, blob, props),
    find: (p, name, props) => G.findFile(p, name, props), remove: id => G.removeFile(id) };
  const { store, rows } = fakeStore();
  for (let i = 0; i < 5; i++) await store.save({ size: MB, type: 'image/jpeg' }, { category: 'Flushing', code: 'TB', point: 'Kran ' + i, when: new Date(2026, 10, 9, 3, i) });
  let settled = false; const job = store.sync(drive); job.then(() => { settled = true; }, () => { settled = true; });
  let checkedBusy = false, waits = 0;
  while (!settled) {
    await new Promise(r => setTimeout(r, 2));
    if (release.length === 2 && !checkedBusy) { await assert.rejects(G.folders(), /GOOGLE_BUSY/, 'inne żądanie nie wchodzi między wysyłki'); checkedBusy = true; }
    if (release.length === 2 || (release.length && (checkedBusy || ++waits > 50))) release.splice(0).forEach(r => r());
  }
  assert.strictEqual((await job).sent, 5);
  assert.ok([...rows.values()].every(r => r.driveId), 'wszystkie na Dysku');
  assert.strictEqual(peak, 2, 'dokładnie 2 wysyłki naraz');
  assert.ok(checkedBusy);
});

// Druga uwaga z przeglądu PR #114: po przerwanej wysyłce (upTry) szukanie pliku na Dysku też szło parami, a adapter puszcza naraz tylko wysyłki.
test('punkt 8 z prawdziwym adapterem Google: ponowna próba po przerwaniu (3 zdjęcia z upTry) bez GOOGLE_BUSY i bez duplikatów', async () => {
  const { createGoogle } = require('../www/settings-google.js');
  const onDrive = new Map(); let n = 0, inFlight = 0, peak = 0;
  const G = createGoogle({ account: () => ({ email: 'me@example.com' }), login: async () => ({ email: 'me@example.com', token: 'T' }),
    fetch: async (url, opts) => {
      inFlight++; peak = Math.max(peak, inFlight);
      try {
        await new Promise(r => setTimeout(r, 3));
        let body;
        if (/upload\/drive/.test(url)) { const m = /"oestPhoto":"([\w-]+)"/.exec(await new Response(opts.body).text()); body = { id: 'file' + (++n), name: 'x' }; onDrive.set(m[1], body.id); }
        else if (/appProperties/.test(decodeURIComponent(url))) { const id = /value='([\w-]+)'/.exec(decodeURIComponent(url))[1]; body = { files: onDrive.has(id) ? [{ id: onDrive.get(id), name: 'x' }] : [] }; }
        else if (/\?q=/.test(url)) body = { files: [] };
        else body = { id: 'fold' + (++n), name: 'f' };
        return { ok: true, status: 200, json: async () => body };
      } finally { inFlight--; }
    } });
  await G.connect('drive');
  const drive = { ensureFolder: (name, parent) => G.ensureFolder(name, parent), upload: (p, name, blob, props) => G.uploadFile(p, name, blob, props),
    find: (p, name, props) => G.findFile(p, name, props), remove: id => G.removeFile(id) };
  const { store, rows } = fakeStore();
  for (let i = 0; i < 3; i++) await store.save({ size: MB, type: 'image/jpeg' }, { category: 'ATS', code: 'ATS-' + i, when: new Date(2026, 10, 9, 3, i) });
  // stan po przerwanej wysyłce: wszystkie mają upTry, pierwsze dwa doszły na Dysk, apka nie zapisała driveId
  const ids = [...rows.keys()];
  for (const id of ids) rows.set(id, { ...rows.get(id), upTry: true });
  onDrive.set(ids[0], 'old0'); onDrive.set(ids[1], 'old1');
  const res = await store.sync(drive);
  assert.strictEqual(res.sent, 3);
  assert.deepStrictEqual(ids.map(id => rows.get(id).driveId), ['old0', 'old1', onDrive.get(ids[2])], 'dwa znalezione, trzecie wysłane');
  assert.strictEqual(onDrive.size, 3, 'bez duplikatów');
  assert.ok(ids.every(id => rows.get(id).upTry === false));
  assert.ok(peak <= 2);
});

// Przegląd ChatGPT 09/11/2026, pkt 1 (zgoda Grzegorza „lecisz z 1 4 6”): zdjęcie skasowane z Dysku po limicie Dysku,
// a potem zwolnione z inspekcji, było kasowane też z telefonu – znikała ostatnia kopia.
test('pkt 1: zdjęcie bez kopii na Dysku (driveDeleted) nigdy nie znika z telefonu', async () => {
  const r = (id, day, size, extra) => Object.assign({ id, created: '2026-11-' + day + 'T10:00:00Z', size: size * MB, hasBlob: true }, extra);
  const p = Z.plan([r('stare', '01', 150, { driveId: 'd1', driveDeleted: true }), r('nowe', '02', 100, { driveId: 'd2' })], { phoneLimitMB: 200 });
  assert.deepStrictEqual(p.phoneRemove, ['nowe'], 'kasujemy tylko to, co jest na Dysku');
  // pełna ścieżka: limit Dysku zdejmuje stare z Dysku (trzymane przez Reactive), potem release + limit telefonu
  const { store, rows } = fakeStore();
  store.setSettings({ phoneLimitMB: 100, driveLimitMB: 100 });
  const a = await store.save({ size: 60 * MB }, { hold: 'reactive', when: new Date(2026, 10, 1, 9) });
  await store.sync(fakeDrive());
  const b = await store.save({ size: 60 * MB }, { when: new Date(2026, 10, 2, 9) });
  const drive = fakeDrive(); await store.sync(drive);
  assert.strictEqual(rows.get(a.id).driveDeleted, true, 'stare zdjęte z Dysku po limicie Dysku');
  assert.strictEqual(await store.release('reactive', [], 0), 1);
  assert.ok(rows.has(a.id) && rows.get(a.id).blob, 'jedyna kopia zostaje na telefonie');
  assert.ok(!rows.get(b.id).blob, 'telefon zwalnia miejsce zdjęciem, które jest na Dysku');
});

// Data i godzina na zdjęciach (Grzegorz 09/11/2026): opcja, domyślnie WYŁĄCZONA, format dd/mm/rrrr GG:MM, czas zrobienia zdjęcia
test('data i godzina na zdjęciu: domyślnie wyłączona, format dd/mm/rrrr GG:MM, czas zrobienia', async () => {
  assert.strictEqual(Z.DEFAULTS.stamp, false);
  assert.strictEqual(Z.cleanSettings({}).stamp, false);
  assert.strictEqual(Z.cleanSettings({ stamp: 'tak' }).stamp, false); // tylko świadome włączenie (true)
  assert.strictEqual(Z.cleanSettings({ stamp: true }).stamp, true);
  assert.strictEqual(Z.stampText(new Date(2026, 10, 9, 7, 5, 59)), '09/11/2026 07:05');
  assert.strictEqual(Z.stampText(new Date(2026, 0, 31, 23, 59)), '31/01/2026 23:59');
  const got = [];
  const { store } = fakeStore({ compress: async (file, preset, kind, stamp) => { got.push(stamp); return { blob: { size: 1, type: 'image/jpeg' }, width: 10, height: 10 }; } });
  const when = new Date(2026, 10, 9, 22, 14, 30);
  const off = await store.save({ size: 1 }, { kind: 'ogolne', when });
  assert.strictEqual(got[0], '', 'wyłączona: zdjęcie bez napisu');
  assert.strictEqual(off.stamp, '');
  store.setSettings({ stamp: true });
  const on = await store.save({ size: 1 }, { kind: 'punkt', when });
  assert.strictEqual(got[1], '09/11/2026 22:14', 'włączona: data i godzina zrobienia (when), nie zapisu');
  assert.strictEqual(on.stamp, '09/11/2026 22:14');
  await store.save({ size: 1 }, { kind: 'ogolne', when, stamp: false }); // np. poprawione zdjęcie, które już ma datę
  assert.strictEqual(got[2], '', 'stamp:false = bez drugiego napisu');
  store.setSettings({ stamp: false });
  await store.save({ size: 1 }, { kind: 'ogolne', when });
  assert.strictEqual(got[3], '', 'po wyłączeniu znowu bez napisu');
});

test('data i godzina: napis w prawym dolnym rogu, w granicach zdjęcia (800 px i 2560 px)', () => {
  for (const [w, h] of [[800, 600], [600, 800], [1600, 1200], [2560, 1920]]) {
    const ops = [];
    const g = { measureText: t => ({ width: t.length * parseInt(g.font.split(' ')[1], 10) * 0.55 }),
      fillRect: (x, y, bw, bh) => ops.push({ x, y, bw, bh }), fillText: (t, x, y) => ops.push({ t, x, y }) };
    Z.drawStamp(g, w, h, '09/11/2026 22:14');
    const box = ops[0], txt = ops[1];
    assert.ok(box.x > w / 2 && box.y > h / 2, 'róg prawy dolny ' + w + '×' + h);
    assert.ok(box.x >= 0 && box.x + box.bw <= w && box.y + box.bh <= h, 'mieści się w zdjęciu ' + w + '×' + h);
    assert.strictEqual(txt.t, '09/11/2026 22:14');
    assert.ok(txt.x > box.x && txt.y > box.y && txt.y < box.y + box.bh, 'tekst na pasku');
  }
  const none = []; Z.drawStamp({ fillRect: () => none.push(1), fillText: () => none.push(1), measureText: () => ({ width: 0 }) }, 800, 600, '');
  assert.strictEqual(none.length, 0, 'bez napisu nic nie rysuje');
});

// Data zrobienia, gdy apka nie podała `when` (przegląd Codex PR #127: zdjęcie z galerii w Reactive) – EXIF, potem data pliku, na końcu teraz
function exifJpeg(dt) {
  const str = Buffer.from(dt + '\0', 'latin1'), tiff = Buffer.alloc(8 + 2 + 12 + 4);
  tiff.write('II', 0, 'latin1'); tiff.writeUInt16LE(42, 2); tiff.writeUInt32LE(8, 4); tiff.writeUInt16LE(1, 8);
  tiff.writeUInt16LE(0x0132, 10); tiff.writeUInt16LE(2, 12); tiff.writeUInt32LE(str.length, 14); tiff.writeUInt32LE(tiff.length, 18); tiff.writeUInt32LE(0, 22);
  const app1 = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff, str]), seg = Buffer.alloc(4);
  seg.writeUInt16BE(0xFFE1, 0); seg.writeUInt16BE(app1.length + 2, 2);
  return Buffer.concat([Buffer.from([0xFF, 0xD8]), seg, app1, Buffer.from([0xFF, 0xD9])]);
}
test('data zrobienia bez `when`: EXIF → data pliku → teraz; napis z tej daty', async () => {
  const now = new Date(2026, 10, 9, 22, 30).getTime();
  const exif = new Blob([exifJpeg('2025:01:15 08:30:12')]);
  assert.strictEqual(String(await Z.exifDate(exif)), String(new Date(2025, 0, 15, 8, 30)));
  assert.strictEqual(await Z.exifDate(new Blob([Buffer.from([0xFF, 0xD8, 0xFF, 0xD9])])), null);
  assert.strictEqual(String(await Z.takenAt(exif, now)), String(new Date(2025, 0, 15, 8, 30)));
  const file = new File([Buffer.from([1, 2, 3])], 'a.jpg', { lastModified: new Date(2026, 10, 1, 7, 5).getTime() });
  assert.strictEqual(+(await Z.takenAt(file, now)), new Date(2026, 10, 1, 7, 5).getTime(), 'bez EXIF: data pliku');
  const future = new File([Buffer.from([1])], 'b.jpg', { lastModified: now + 3600000 });
  assert.strictEqual(+(await Z.takenAt(future, now)), now, 'data z przyszłości = teraz');
  const got = [];
  const { store } = fakeStore({ compress: async (f, p, k, stamp) => { got.push(stamp); return { blob: { size: 1, type: 'image/jpeg' }, width: 10, height: 10 }; } });
  store.setSettings({ stamp: true });
  await store.save(exif, { kind: 'ogolne', source: 'reactive' }); // Reactive nie podaje `when`
  assert.strictEqual(got[0], '15/01/2025 08:30', 'zdjęcie z galerii: data zrobienia, nie dodania');
});
