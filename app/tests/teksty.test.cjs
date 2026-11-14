// Teksty ekranów w plikach danych (Grzegorz 09/11/2026): app/teksty/<ekran>.json zamiast tekstów w kodzie.
// Pilnuje: każdy plik poprawny (PL i EN, unikalne id, te same {wstawki}), każdy tekst, o który pyta kod, jest w pliku,
// w pliku nie ma tekstów, których kod nie używa, kod podaje dokładnie te wstawki, które są w tekście,
// a moduł moduly/bledy wybiera język i wstawia wartości.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../scripts/teksty.js');
const bledy = require('../../moduly/bledy/bledy.js');

const ROOT = path.resolve(__dirname, '..', '..');
const KOD = ['app/www', 'moduly', 'inspekcje'];
function pliki() {
  const out = [];
  (function walk(d) {
    for (const f of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const p = d + '/' + f.name;
      if (/(^|\/)(lib|node_modules|templates)$|^app\/www\/(inspekcje|moduly)$/.test(p)) continue;
      if (f.isDirectory()) walk(p); else if (/\.(js|html)$/.test(f.name) && p !== 'app/www/teksty.js') out.push(p);
    }
  })('');
  return out;
}
// wywołania X("id", { a: …, b: … }) w pliku, który przypina X do ekranu przez OESTTx("<ekran>." + id
function wywolania(src) {
  const out = [], re = /\bX\("([a-z0-9-]+)"/g; let m;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length, gl = 1, klucze = [];
    for (; i < src.length && gl > 0; i++) {
      const c = src[i];
      if (c === '"' || c === "'") { const z = c; i++; while (i < src.length && src[i] !== z) i += src[i] === '\\' ? 2 : 1; continue; }
      if (c === '(' || c === '{' || c === '[') gl++;
      else if (c === ')' || c === '}' || c === ']') gl--;
      else if (gl === 2 && /\w/.test(c) && /[{,]\s*$/.test(src.slice(0, i))) { const k = /^(\w+)\s*:/.exec(src.slice(i)); if (k) { klucze.push(k[1]); i += k[0].length - 1; } }
    }
    out.push({ id: m[1], klucze: klucze.sort() });
  }
  return out;
}

test('pliki tekstów są poprawne', () => {
  const { pliki: p, bledy: b } = T.wczytaj();
  assert.deepStrictEqual(b, []);
  assert.ok(Object.keys(p).length >= 1);
});

test('walidacja łapie błędy w pliku', () => {
  const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'teksty-'));
  fs.writeFileSync(path.join(dir, 'zly.json'), JSON.stringify({ teksty: [
    { id: 'a', pl: 'Tekst {n}', en: 'Text' }, { id: 'a', pl: 'x', en: 'y' }, { id: 'B', pl: 'x', en: 'y' },
    { id: 'c', pl: '', en: 'y' }, { id: 'd', pl: ' x', en: 'y' }, { id: 'e', pl: '<b>x</b>', en: 'y' }] }));
  fs.writeFileSync(path.join(dir, 'zepsuty.json'), '{ "teksty": [');
  const b = T.wczytaj(dir).bledy.join('\n');
  for (const s of ['różne wstawki', 'id powtórzone', 'id tylko małe', 'brak tekstu PL', 'spacja na początku', 'znaczniki HTML', 'zepsuty.json: to nie jest poprawny JSON']) assert.ok(b.includes(s), s + '\n' + b);
});

test('kod pyta tylko o istniejące teksty, z właściwymi wstawkami, i każdy tekst jest używany', () => {
  const { pliki: p } = T.wczytaj();
  const uzyte = {};
  for (const f of pliki()) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const m = /OESTTx\("([a-z0-9-]+)\." \+ id/.exec(src);
    if (!m) continue;
    const ekran = m[1];
    assert.ok(p[ekran], f + ': brak pliku app/teksty/' + ekran + '.json');
    const wg = Object.fromEntries(p[ekran].map(e => [e.id, e]));
    for (const w of wywolania(src)) {
      assert.ok(wg[w.id], f + ': brak tekstu "' + w.id + '" w app/teksty/' + ekran + '.json');
      assert.strictEqual(w.klucze.map(k => '{' + k + '}').join(','), T.wstawki(wg[w.id].pl), f + ': wstawki dla "' + w.id + '"');
      (uzyte[ekran] = uzyte[ekran] || new Set()).add(w.id);
    }
  }
  for (const [ekran, lista] of Object.entries(p)) {
    assert.ok(uzyte[ekran], 'app/teksty/' + ekran + '.json: żaden plik kodu go nie używa');
    assert.deepStrictEqual(lista.map(e => e.id).filter(id => !uzyte[ekran].has(id)), [], 'app/teksty/' + ekran + '.json: teksty nieużywane w kodzie');
  }
});

test('moduł wybiera język i wstawia wartości', () => {
  bledy.zaladujTeksty(T.slownik(T.wczytaj().pliki));
  assert.strictEqual(bledy.wJezyku('pl', () => bledy.tx('ekran-glowny.do-zrobienia', { n: 3 })), '3 do zrobienia');
  assert.strictEqual(bledy.wJezyku('en', () => bledy.tx('ekran-glowny.do-zrobienia', { n: 3 })), '3 to do');
  assert.strictEqual(bledy.wJezyku('pl', () => bledy.tx('ekran-glowny.zdjecia-rozmiar', { n: 2, mb: '1,5 MB' })), 'zdjęcia: 2 · 1,5 MB');
  assert.strictEqual(bledy.wJezyku('en', () => bledy.tx('ekran-glowny.stan-z', { czas: '9 Nov, 03:00' })), 'Updated 9 Nov, 03:00');
  assert.strictEqual(bledy.tx('nie.ma'), 'nie.ma');
  // ekran z własnym językiem (ustawienia kalendarza) podaje go trzecim argumentem
  assert.strictEqual(bledy.wJezyku('pl', () => bledy.tx('ekran-glowny.do-zrobienia', { n: 2 }, 'en')), '2 to do');
  assert.strictEqual(bledy.wJezyku('en', () => bledy.tx('ekran-glowny.do-zrobienia', { n: 2 }, 'pl')), '2 do zrobienia');
});

// Przegląd 12/11/2026 pkt 3: grafik jest w Mój profil → Mój grafik (settings-ui.js), nie w „Kalendarz i grafik”
test('komunikat o braku grafiku kieruje do Mój profil → Mój grafik', () => {
  const pl = bledy.wJezyku('pl', () => bledy.text(new Error('SHIFT_MISSING')));
  const en = bledy.wJezyku('en', () => bledy.text(new Error('SHIFT_MISSING')));
  assert.match(pl, /Mój profil → Mój grafik/);
  assert.match(en, /My Profile → My shifts/);
  assert.doesNotMatch(pl + en, /Kalendarz i grafik|Calendar & shifts/);
});
