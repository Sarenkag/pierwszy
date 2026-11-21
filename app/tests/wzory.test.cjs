// Moduł Wzory (moduly/wzory): jedno miejsce wzorów Word; każdy wzór ma dokładnie nawiasy z listy „pola”, każdy nawias jest w słowniku.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), PizZip = require('pizzip');
const DIR = path.join(__dirname, '..', '..', 'moduly', 'wzory');
require(path.join(DIR, 'wzory.js'));
const W = globalThis.OESTWzory;
function nawiasy(bytes) {
  const z = new PizZip(bytes), out = new Set();
  for (const f of Object.keys(z.files).filter(f => /^word\/(document|header\d*|footer\d*)\.xml$/.test(f))) {
    const t = z.file(f).asText().replace(/<[^>]+>/g, '');
    for (const m of t.matchAll(/\{([^{}]+)\}/g)) out.add(m[1].replace(/^[#/]/, ''));
  }
  return [...out].sort();
}
test('lista wzorów: 8 wzorów, każdy plik istnieje w module', () => {
  const l = W.lista();
  assert.deepEqual(l.map(w => w.id).sort(), ['basic', 'flush', 'flush-basic-p', 'flush-basic-ta', 'flush-basic-tb', 'gen-basic', 'plant', 'temp-tb']);
  for (const w of l) assert.ok(fs.existsSync(path.join(DIR, w.plik)), w.plik);
});
test('w module nie ma innych plików .docx niż zarejestrowane', () => {
  const docx = fs.readdirSync(DIR).filter(f => /\.docx$/i.test(f)).sort();
  assert.deepEqual(docx, W.lista().map(w => w.plik).sort());
});
test('każdy wzór (dla środka: plik środka) ma dokładnie swoje pola (żaden nieznany nawias, żadne pole bez nawiasu)', () => {
  for (const w of W.lista()) assert.deepEqual(nawiasy(fs.readFileSync(path.join(DIR, w.plik))), [...w.pola].sort(), w.id);
});
test('każde pole każdego wzoru jest we wspólnym słowniku', () => {
  const s = W.slownik();
  for (const w of W.lista()) for (const p of w.pola) assert.ok(s[p] && s[p].opis, w.id + ': ' + p);
  assert.equal(s.date.stare, false); assert.equal(s.data.stare, true); assert.equal(s.name.stare, true);
});
test('bajty: kopia wczytanego pliku, nieznany wzór i niewczytany = REPORT_TEMPLATE_MISSING', () => {
  assert.throws(() => W.bajty('basic'), /REPORT_TEMPLATE_MISSING/);
  assert.throws(() => W.pola('nie-ma'), /REPORT_TEMPLATE_MISSING/);
  const b = fs.readFileSync(path.join(DIR, 'basic.docx'));
  W.ustaw('basic', b);
  const a1 = W.bajty('basic'); a1[0] = 0;
  assert.equal(W.bajty('basic')[0], b[0]);
  assert.equal(W.bajty('basic').length, b.length);
});
test('wczytaj: pobiera każdy plik raz, błąd sieci = REPORT_TEMPLATE_MISSING', async () => {
  const wolane = [];
  globalThis.fetch = async u => { wolane.push(u); return { ok: true, arrayBuffer: async () => fs.readFileSync(path.join(DIR, u)).buffer.slice(0) }; };
  await W.wczytaj(); await W.wczytaj();
  assert.equal(wolane.length, 8);
  assert.ok(W.bajty('plant').length > 1000);
});
test('wczytaj po błędzie sieci: odrzuca REPORT_TEMPLATE_MISSING, a następne wywołanie pobiera od nowa (inspekcje wołają je przed każdym raportem)', async () => {
  delete require.cache[require.resolve(path.join(DIR, 'wzory.js'))]; require(path.join(DIR, 'wzory.js'));
  const W2 = globalThis.OESTWzory; let siec = false, wolane = 0;
  globalThis.fetch = async u => { wolane++; if (!siec) return { ok: false }; return { ok: true, arrayBuffer: async () => fs.readFileSync(path.join(DIR, u)).buffer.slice(0) }; };
  await assert.rejects(W2.wczytaj(), /REPORT_TEMPLATE_MISSING/);
  assert.throws(() => W2.bajty('basic'), /REPORT_TEMPLATE_MISSING/);
  siec = true; await W2.wczytaj();
  assert.ok(W2.bajty('basic').length > 1000); assert.ok(wolane > 7);
});
test('LEGENDA.md (plik tekstowy dla Grzegorza) zgadza się ze słownikiem apki', () => {
  const { legenda, PLIK } = require('../scripts/wzory-legenda.cjs');
  assert.equal(fs.readFileSync(PLIK, 'utf8'), legenda(), 'node app/scripts/wzory-legenda.cjs');
});
test('każda inspekcja z własnym wzorem (ppm.js „wzor”) wskazuje wzór z modułu Wzory; stare pole „tpl” nie wraca', () => {
  globalThis.window = globalThis; globalThis.localStorage = { getItem() { return null; }, setItem() {} };
  require('../www/ppm.js');
  const P = globalThis.OEST_PPM, ids = W.lista().map(w => w.id), uzyte = [];
  const przejdz = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(przejdz);
    assert.equal('tpl' in o, false, 'stare pole tpl w ppm.js'); if (typeof o.wzor === 'string') uzyte.push(o.wzor); Object.values(o).forEach(przejdz); };
  przejdz(P.forms);
  assert.deepEqual([...new Set(uzyte)].sort(), ['plant', 'temp-tb']);
  for (const u of uzyte) assert.ok(ids.includes(u), u);
});

// RAMKA + ŚRODEK (Grzegorz 21/11/2026 17:33: „jak zmienisz w jednym, wszystko się zmieni”): środek wkładany w AKTUALNĄ ramkę basic.docx
test('ramka + środek: bajty() wkłada plik środka w basic.docx; ramka bez zmian, kopii ramki w module nie ma', () => {
  globalThis.PizZip = PizZip;
  const B = fs.readFileSync(path.join(DIR, 'basic.docx')); W.ustaw('basic', B);
  const xml = b => new PizZip(b).file('word/document.xml').asText();
  const wiersze = x => { const t = x.slice(x.indexOf('<w:tbl>'), x.indexOf('</w:tbl>') + 8); return t.split('</w:tr>').slice(0, -1).map(r => r.replace(/<[^>]+>/g, '')); };
  const rb = wiersze(xml(B)), ti = rb.findIndex(r => r.includes('{title}')), wi = rb.findIndex(r => r.includes('Works Complete'));
  const srodki = W.lista().filter(w => w.ramka);
  assert.deepEqual(srodki.map(w => w.id).sort(), ['flush-basic-p', 'flush-basic-ta', 'flush-basic-tb', 'gen-basic']);
  for (const w of srodki) {
    assert.equal(w.ramka, 'basic', w.id);
    const S = fs.readFileSync(path.join(DIR, w.plik)); W.ustaw(w.id, S);
    assert.ok(!/Works Complete|\{title\}|\{site\}/.test(xml(S).replace(/<[^>]+>/g, '')), w.id + ': plik środka nie zawiera ramki');
    const zl = W.bajty(w.id), tz = xml(zl).replace(/<[^>]+>/g, '');
    // pola złożonego Worda = pola ramki bez condition/details + pola środka
    const ramkaPola = W.pola('basic').filter(p => p !== 'condition' && p !== 'details');
    assert.deepEqual(nawiasy(zl), [...new Set([...ramkaPola, ...w.pola])].sort(), w.id);
    // góra i dół ramki identyczne z basic.docx; zmiana ramki = zmiana w każdym złożonym raporcie
    const gora = rb.slice(0, ti + 1).join(''), dol = rb.slice(wi).join('');
    const tb = xml(B).replace(/<[^>]+>/g, ''), pre = tb.slice(0, tb.indexOf(gora) + gora.length), post = tb.slice(tb.lastIndexOf(dol));
    assert.ok(pre.length > gora.length - 1 && tz.startsWith(pre), w.id + ': góra ramki'); assert.ok(tz.endsWith(post), w.id + ': dół ramki');
    const zmieniona = new PizZip(B); zmieniona.file('word/document.xml', xml(B).replace('Works Complete', 'Works Completed TEST'));
    W.ustaw('basic', zmieniona.generate({ type: 'nodebuffer' }));
    assert.ok(xml(W.bajty(w.id)).includes('Works Completed TEST'), w.id + ': zmiana ramki trafia do raportu');
    W.ustaw('basic', B);
  }
});
