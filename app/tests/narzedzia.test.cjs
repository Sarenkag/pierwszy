// K01 (21/11/2026): narzędzia w jednym module moduly/narzedzia; formularz inspekcji ich nie powtarza.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '../..');
const w = { atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64') }; w.window = w;
vm.runInNewContext(fs.readFileSync(path.join(root, 'moduly/narzedzia/narzedzia.js'), 'utf8'), { window: w, atob: w.atob, btoa: w.btoa, Uint8Array, String });
const N = w.OESTNarzedzia;

test('narzędzia: te same wyniki co dawne funkcje formularza inspekcji', () => {
  assert.equal(N.pad(3), '03');
  assert.equal(N.pad(12), '12');
  const d = new Date(2026, 10, 2, 8, 5);
  assert.equal(N.data(d), '02/11/2026');
  assert.equal(N.godzina(d), '08:05');
  assert.equal(N.dzienIso(d), '2026-11-02');
  assert.equal(N.kb(1536), '2 KB');
  assert.equal(N.kb(3145728), '3.0 MB');
});

test('narzędzia: base64 w obie strony, także powyżej jednego kawałka 32 KB', () => {
  const u8 = new Uint8Array(70000); for (let i = 0; i < u8.length; i++) u8[i] = (i * 7) & 255;
  const b64 = N.bytesToB64(u8);
  assert.equal(b64, Buffer.from(u8).toString('base64'));
  assert.deepEqual(Array.from(N.b64ToBytes(b64)), Array.from(u8));
  assert.deepEqual(Array.from(N.b64ToBytes('AAH/')), [0, 1, 255]);
});

test('narzędzia: formularz inspekcji nie ma własnych kopii ani pośrednika exifDate', () => {
  const html = [ 'index.html', ...fs.readdirSync(path.join(root, 'inspekcje')).filter(f => /^i-[^/]*\.js$/.test(f)).sort() ].map(f => fs.readFileSync(path.join(path.join(root, 'inspekcje'), f), 'utf8')).join('\n') /* strona inspekcji + jej części i-*.js (docs/podzial-modulow.md) */;
  for (const f of ['pad', 'fmtDate', 'fmtTime', 'isoDay', 'b64ToBytes', 'bytesToB64', 'kb', 'exifDate'])
    assert.doesNotMatch(html, new RegExp('function\\s+' + f + '\\s*\\('), f);
  assert.match(html, /<script src="\.\.\/moduly\/narzedzia\/narzedzia\.js"><\/script>/);
  assert.ok(html.indexOf('moduly/narzedzia/narzedzia.js') < html.indexOf('var NZ = window.OESTNarzedzia'), 'moduł ładuje się przed formularzem');
});
