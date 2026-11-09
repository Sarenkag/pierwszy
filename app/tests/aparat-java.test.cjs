// Audyt wydajności zdjęć, punkt 2 (zgoda Grzegorza 09/11/2026): zmniejszanie zdjęcia z aparatu już w Javie.
// Zasady (blokują build): 1) dłuższy bok po zmniejszeniu w Javie NIGDY poniżej rozmiaru zapisu modułu zdjęć (800 / 1600 / 2560),
// 2) „Duże 2560” i zdjęcia bez rozmiaru (Klucze, Power trace) bez zmian, 3) data zrobienia i obrót z EXIF przechodzą do nowego pliku,
// 4) każdy błąd zostawia pełny plik, 5) aparat w apce przekazuje do Javy rozmiar rodzaju zdjęcia.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..', '..');
const JAVA_DIR = path.join(ROOT, 'app/android/app/src/main/java/com/oest/inspekcje');
const Z = require('../../moduly/zdjecia/zdjecia.js');

function runJava() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oest-photoscale-'));
  const src = path.join(dir, 'src', 'com', 'oest', 'inspekcje'); fs.mkdirSync(src, { recursive: true });
  fs.copyFileSync(path.join(JAVA_DIR, 'PhotoScale.java'), path.join(src, 'PhotoScale.java'));
  fs.writeFileSync(path.join(src, 'Probe.java'), `package com.oest.inspekcje;
public class Probe { public static void main(String[] a) {
  int[][] c = {{4080,3072,800},{4080,3072,1600},{4080,3072,2560},{3072,4080,1600},{3072,4080,800},{4080,3072,0},{4080,3072,-5},{1600,1200,800},{1599,1200,800},{800,600,800},{0,0,800},{8160,6144,800}};
  StringBuilder s = new StringBuilder("{\\"sizes\\":[");
  for (int i = 0; i < c.length; i++) s.append(i > 0 ? "," : "").append(PhotoScale.sampleSize(c[i][0], c[i][1], c[i][2]));
  s.append("],\\"tags\\":[");
  for (int i = 0; i < PhotoScale.EXIF_TAGS.length; i++) s.append(i > 0 ? "," : "").append('"').append(PhotoScale.EXIF_TAGS[i]).append('"');
  System.out.println(s.append("]}"));
} }`);
  const out = path.join(dir, 'out');
  execFileSync('javac', ['-d', out, path.join(src, 'PhotoScale.java'), path.join(src, 'Probe.java')], { stdio: 'pipe' });
  const txt = execFileSync('java', ['-cp', out, 'com.oest.inspekcje.Probe'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
  fs.rmSync(dir, { recursive: true, force: true });
  return JSON.parse(txt.trim().split('\n').pop());
}

test('Java: podział 1/2, 1/4 tylko gdy dłuższy bok zostaje ≥ rozmiar zapisu; Duże 2560 i bez rozmiaru = pełne zdjęcie', () => {
  const r = runJava();
  // Pixel 8 Pro 4080×3072: punkt/dowód 800 → 1/4 (1020 px), formularz/ogólne 1600 → 1/2 (2040 px), Duże 2560 → bez zmian
  assert.deepStrictEqual(r.sizes, [4, 2, 1, 2, 4, 1, 1, 2, 1, 1, 1, 8]);
  const cases = [[4080, 3072, 800], [4080, 3072, 1600], [4080, 3072, 2560], [3072, 4080, 1600], [3072, 4080, 800], [1600, 1200, 800], [1599, 1200, 800], [800, 600, 800], [8160, 6144, 800]];
  const idx = [0, 1, 2, 3, 4, 7, 8, 9, 11];
  cases.forEach(([w, h, max], i) => assert.ok(Math.floor(Math.max(w, h) / r.sizes[idx[i]]) >= max, `${w}×${h} max ${max}: dłuższy bok nie może zejść poniżej ${max}`));
  for (const t of ['DateTimeOriginal', 'DateTime', 'Orientation', 'OffsetTimeOriginal', 'GPSLatitude']) assert.ok(r.tags.includes(t), 'EXIF przenosi ' + t);
});

test('KeysPlugin: zmniejsza tylko z rozmiarem, w tle, z EXIF, a błąd zostawia pełny plik', () => {
  const s = fs.readFileSync(path.join(JAVA_DIR, 'KeysPlugin.java'), 'utf8');
  assert.match(s, /call\.getData\(\)\.put\("shrinkMax",Math\.max\(0,call\.getInt\("max",0\)\)\)/, 'capture zapamiętuje rozmiar z JS');
  assert.match(s, /if\(max<=0\)\{resolveCaptured\(call,file,1\);return;\}/, 'bez rozmiaru (Klucze, Power trace) pełne zdjęcie');
  assert.match(s, /getBridge\(\)\.execute\(\(\)->\{int s=1;try\{s=shrink\(file,max\);\}catch\(Throwable ignored\)\{\}resolveCaptured\(call,file,s\);\}\)/, 'w tle; każdy błąd (też brak pamięci) = pełny plik');
  assert.match(s, /PhotoScale\.sampleSize\(bounds\.outWidth,bounds\.outHeight,max\)/);
  assert.match(s, /for\(String tag:PhotoScale\.EXIF_TAGS\)\{String v=src\.getAttribute\(tag\);if\(v!=null\)dst\.setAttribute\(tag,v\);\}/, 'EXIF przeniesiony');
  assert.match(s, /dst\.saveAttributes\(\);if\(!part\.renameTo\(file\)\)/, 'plik podmieniany dopiero po zapisie EXIF');
});

test('rozmiar dla aparatu wg rodzaju zdjęcia: punkt/dowód 800, formularz 1600, ogólne wg przełącznika', () => {
  assert.strictEqual(Z.maxFor('standard', 'srednie', 'dowod'), 800);
  assert.strictEqual(Z.maxFor('standard', 'srednie', 'punkt'), 800);
  assert.strictEqual(Z.maxFor('standard', 'srednie', 'formularz'), 1600);
  assert.strictEqual(Z.maxFor('standard', 'srednie', 'ogolne'), 1600);
  assert.strictEqual(Z.maxFor('standard', 'male', 'ogolne'), 800);
  assert.strictEqual(Z.maxFor('standard', 'duze', 'ogolne'), 2560);
  assert.strictEqual(Z.maxFor('standard', 'srednie'), 2560, 'bez rodzaju: największy (edytor bez kontekstu)');
  assert.strictEqual(Z.maxFor('oryginal', 'srednie', 'dowod'), 0, 'Oryginał: bez limitu');
  // wartości muszą się zgadzać z tym, co moduł naprawdę zapisze (fit)
  for (const [g, k] of [['srednie', 'dowod'], ['srednie', 'formularz'], ['male', 'ogolne'], ['duze', 'ogolne']])
    assert.strictEqual(Z.fit(4080, 3072, 'standard', k === 'ogolne' ? Z.generalKind(g) : k).width, Z.maxFor('standard', g, k));
});

function loadAparat() {
  const calls = [];
  const ctx = { console, Promise, Math, Error, String, URL, setTimeout, clearTimeout };
  ctx.window = ctx;
  ctx.Capacitor = { isNativePlatform: () => true, convertFileSrc: p => 'http://local' + p,
    Plugins: { OESTPhotoEdit: {}, OESTKeys: { capture: async o => { calls.push({ capture: o }); return { path: '/key-1.jpg' }; }, release: async o => { calls.push({ release: o.path }); } } } };
  ctx.fetch = async () => ({ ok: true, blob: async () => ({ size: 1, type: 'image/jpeg' }) });
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'moduly/aparat/aparat.js'), 'utf8'), ctx);
  ctx.OESTAparat.review = async b => ({ blob: b });
  return { A: ctx.OESTAparat, calls };
}
test('aparat przekazuje do Javy rozmiar zapisu; bez rozmiaru prosi o pełne zdjęcie; plik tymczasowy zawsze zwalniany', async () => {
  const { A, calls } = loadAparat();
  assert.ok(await A.take({ max: 800 }));
  assert.ok(await A.take({ max: 1600.4 }));
  assert.ok(await A.take());
  assert.ok(await A.take({ max: 0 }));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(calls.filter(c => c.capture).map(c => c.capture))), [{ max: 800 }, { max: 1600 }, {}, {}]);
  assert.strictEqual(calls.filter(c => c.release).length, 4);
});

test('inspekcje i Reactive pytają o rozmiar dla rodzaju zdjęcia (nie o największy)', () => {
  const insp = fs.readFileSync(path.join(ROOT, 'inspekcje/index.html'), 'utf8');
  assert.match(insp, /function camOpts\(kind\) \{ var Z = window\.OESTZdjecia; return \{ max: Z && Z\.maxPx \? Z\.maxPx\(kind\) : 0,/);
  const re = fs.readFileSync(path.join(ROOT, 'app/www/reactive.js'), 'utf8');
  assert.match(re, /max:w\.OESTZdjecia\?\.maxPx\?w\.OESTZdjecia\.maxPx\('ogolne'\):0/);
});
