// Cała ścieżka (Grzegorz 08/11/2026): raport z kolejki → mail z Word + PDF (bez zmian) → archiwum na telefonie →
// Word na Dysku (OEST Raporty / budynek / rodzaj). Ponowne wysłanie tego samego raportu nadpisuje plik na Dysku.
// Błąd Dysku nie psuje maila. Moduły ładowane jak w apce (wysylka.js + raporty.js), IndexedDB w pamięci.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

function memIDB() {
  const dbs = new Map();
  const req = () => ({ result: undefined, onsuccess: null, onerror: null, onupgradeneeded: null });
  return {
    open(name) {
      const rq = req();
      setTimeout(() => {
        let fresh = false;
        if (!dbs.has(name)) { dbs.set(name, new Map()); fresh = true; }
        const stores = dbs.get(name);
        const db = {
          createObjectStore(n, o) { stores.set(n, { key: (o && o.keyPath) || null, rows: new Map() }); },
          transaction(n) {
            const t = { oncomplete: null, onerror: null, onabort: null };
            t.objectStore = sn => {
              const st = stores.get(sn), clone = v => v === undefined ? v : structuredClone(v);
              return {
                get: k => ({ result: clone(st.rows.get(k)) }),
                getAll: () => ({ result: [...st.rows.values()].map(clone) }),
                put: (v, k) => { st.rows.set(st.key ? v[st.key] : k, clone(v)); return {}; },
                delete: k => { st.rows.delete(k); return {}; }
              };
            };
            setTimeout(() => t.oncomplete && t.oncomplete(), 0);
            return t;
          }
        };
        rq.result = db;
        if (fresh && rq.onupgradeneeded) rq.onupgradeneeded();
        rq.onsuccess && rq.onsuccess();
      }, 0);
      return rq;
    }
  };
}

function app(o = {}) {
  const data = new Map([['oest.account', JSON.stringify({ id: 'a', email: 'greg@example.com' })], ['insp.cfg', JSON.stringify({ email: 'work@firma.com', wifiOnly: false })]]);
  const mails = [], files = new Map(), folders = new Map(), events = [];
  let n = 0, driveDown = !!o.driveDown;
  const G = {
    ready: async () => true, connected: () => true, background: fn => fn(), foreground: fn => fn(),
    sendMail: async m => { mails.push(m); return { id: 'm' + mails.length }; },
    ensureFolder: async (name, parent) => { if (driveDown) throw Error('GOOGLE_OFFLINE'); const k = (parent || 'root') + '/' + name; if (!folders.has(k)) folders.set(k, 'f' + (++n)); return { id: folders.get(k) }; },
    findFile: async (parent, name) => { for (const [id, f] of files) if (f.parent === parent && f.name === name) return { id }; return null; },
    uploadFile: async (parent, name, blob) => { const id = 'd' + (++n); files.set(id, { parent, name, blob }); events.push('upload ' + name); return { id }; },
    updateFile: async (id, blob) => { files.get(id).blob = blob; events.push('update ' + files.get(id).name); return { id }; }
  };
  const root = {
    localStorage: { getItem: k => data.get(k) ?? null, setItem(k, v) { data.set(k, v); }, removeItem(k) { data.delete(k); } },
    navigator: { onLine: true }, document: { addEventListener() {}, readyState: 'loading', getElementById: () => null, body: null } /* bez paska stanu: tylko logika */,
    addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {}, setTimeout, clearTimeout, indexedDB: memIDB(),
    Capacitor: { isNativePlatform: () => true }, OEST_CONFIG: { googleWebClientId: 'x' }, OESTGoogle: G, fetch: async () => ({})
  };
  root.window = root;
  const R = require('../../moduly/raporty/raporty.js');
  root.OESTRaporty = R.createBrowser(root);
  new Function('window', 'setInterval', fs.readFileSync(__dirname + '/../../moduly/wysylka/wysylka.js', 'utf8'))(root, () => 0);
  return { root, S: root.OESTSender, R: root.OESTRaporty, mails, files, folders, events, setDrive: v => { driveDown = !v; } };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function settle(a) { for (let i = 0; i < 40; i++) { await wait(5); if (!a.R.busy() && !a.S.busy()) { await wait(5); if (!a.R.busy()) return; } } }
const item = (fill = 1) => ({ type: 'flush', code: 'TB', name: 'Weekly Flushing TB 08112026', subject: 'Weekly Flushing TB 08112026', body: 'x',
  docx: new Uint8Array(1000).fill(fill), pdf: new Uint8Array(1200).fill(fill), rpt: ['Tower B', 'Taps/Shower Flushing'], ppm: 'EFA-INS-010' });

test('mail Word + PDF, potem Word na Dysku w OEST Raporty / Tower B / rodzaj; PDF i Word w telefonie', async () => {
  const a = app();
  await a.S.init({});
  await a.S.enqueue(item()); await settle(a);
  assert.equal(a.mails.length, 1);
  assert.deepEqual(a.mails[0].files.map(f => f.name), ['Weekly Flushing TB 08112026.pdf', 'Weekly Flushing TB 08112026.docx'], 'mail bez zmian: Word + PDF');
  assert.deepEqual(a.events, ['upload Weekly Flushing TB 08112026.docx'], 'na Dysk tylko Word');
  assert.deepEqual([...a.folders.keys()], ['root/OEST Raporty', 'f1/Tower B', 'f2/Taps Shower Flushing']);
  const [rec] = await a.R.list();
  assert.equal(rec.docx.length, 1000); assert.equal(rec.pdf.length, 1200); assert.equal(rec.dirty, false);
});

test('ponowne Wyślij tego samego raportu (dopisane zdjęcie): drugi mail, ten sam plik na Dysku nadpisany', async () => {
  const a = app();
  await a.S.init({});
  await a.S.enqueue(item(1)); await settle(a);
  await a.S.enqueue(item(2)); await settle(a);
  assert.equal(a.mails.length, 2);
  assert.equal(a.files.size, 1, 'na Dysku tylko ostatni raport');
  assert.deepEqual(a.events, ['upload Weekly Flushing TB 08112026.docx', 'update Weekly Flushing TB 08112026.docx']);
  const b = [...a.files.values()][0].blob; assert.equal(new Uint8Array(await b.arrayBuffer())[0], 2);
});

test('Dysk niedostępny: mail wychodzi, raport czeka w telefonie i trafia na Dysk przy następnej próbie', async () => {
  const a = app({ driveDown: true });
  await a.S.init({});
  await a.S.enqueue(item()); await settle(a);
  assert.equal(a.mails.length, 1, 'mail wysłany mimo braku Dysku');
  assert.equal(a.files.size, 0);
  assert.equal((await a.R.stats()).pending, 1);
  a.setDrive(true);
  await a.S.run({}); await settle(a); // np. start apki / powrót sieci: kolejka pusta → zaległe raporty na Dysk
  assert.equal(a.files.size, 1);
  assert.equal((await a.R.stats()).pending, 0);
});

test('Reactive bez budynku: folder OEST Raporty / Reactive', async () => {
  const a = app();
  await a.S.init({});
  const it = item(); delete it.rpt; it.type = 'reactive'; it.name = 'Reactive leak L13 08112026';
  await a.S.enqueue(it); await settle(a);
  assert.deepEqual([...a.folders.keys()], ['root/OEST Raporty', 'f1/Reactive']);
});

test('Word tylko w liście plików wg ⚙ (formularz ze zdjęć / Flushing basic): też trafia do archiwum i na Dysk', async () => {
  const a = app();
  await a.S.init({});
  const it = item(); const docx = it.docx, pdf = it.pdf; it.docx = new Uint8Array(0); it.pdf = new Uint8Array(0);
  it.files = [{ name: it.name + '.pdf', mime: 'application/pdf', bytes: pdf }, { name: it.name + ' - basic.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: new Uint8Array(10).fill(7) }, { name: it.name + '.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', bytes: docx }];
  await a.S.enqueue(it); await settle(a);
  assert.equal(a.mails.length, 1);
  const [rec] = await a.R.list();
  assert.equal(rec.docx.length, 1000, 'główny Word „nazwa.docx”'); assert.equal(rec.pdf.length, 1200);
  assert.deepEqual(a.events, ['upload Weekly Flushing TB 08112026.docx']);
});

test('archiwum w telefonie nie zapisało się (np. brak miejsca): Word zostaje w kolejce, potem trafia do archiwum bez drugiego maila', async () => {
  const a = app();
  await a.S.init({});
  const save = a.R.save; let fail = true;
  a.R.save = r => fail ? Promise.reject(Error('QuotaExceededError')) : save(r);
  await a.S.enqueue(item()); await settle(a);
  assert.equal(a.mails.length, 1);
  assert.equal((await a.R.list()).length, 0);
  fail = false;
  await a.S.run({}); await settle(a);
  assert.equal(a.mails.length, 1, 'bez ponownego maila');
  const [rec] = await a.R.list();
  assert.ok(rec && rec.docx.length === 1000, 'Word w archiwum po ponowieniu');
  assert.equal(a.files.size, 1, 'i na Dysku');
});
