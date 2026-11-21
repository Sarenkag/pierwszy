// Testy samej bramki: dowód, że każda kontrola naprawdę łapie problem (a nie tylko przechodzi na obecnym kodzie).
// Działają na sztucznych mini-projektach w katalogu tymczasowym; nie dotykają apki.
'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { spawnSync, execFileSync } = require('node:child_process');
const Q = path.resolve(__dirname, '..');
const run = (script, args, cwd, env) => { const p = spawnSync(process.execPath, [path.join(Q, script), ...args], { cwd: cwd || Q, encoding: 'utf8', env: env ? { ...process.env, ...env } : process.env }); return { code: p.status, out: (p.stdout || '') + (p.stderr || '') }; };
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'oest-qg-'));
const write = (root, files) => { for (const [f, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), c); } };

// ---------- G1: architektura ----------
function www(extraIndex = '', extraFiles = {}) {
  const d = tmp();
  write(d, {
    'index.html': `<section class="view" id="v-home"></section><script src="moduly/a/a.js"></script><script src="app.js"></script>${extraIndex}`,
    'inspekcje/index.html': `<script src="../moduly/a/a.js"></script>`,
    'moduly/a/a.js': `(function(w){ w.OESTA = { x: 1 }; })(window);`,
    'app.js': `(function(w){ w.OESTApp = { go(){ return w.OESTA.x; } }; })(window); // tekst "OESTNic" w napisie to nie użycie`,
    // zasady (quality/zasady.cjs): mapa ekranów, jedyna rejestracja Wstecz Androida
    'moduly/ekrany/ekrany.json': JSON.stringify({ ekrany: [{ id: 'home', rodzic: null, pudelko: 'v-home', pl: 'Główny', en: 'Home' }] }),
    'moduly/wstecz/wstecz.js': `(function(w){ function wstecz(){} if (w.App) w.App.addListener('backButton', function () { wstecz(); }); })(window);`,
    ...extraFiles
  });
  return d;
}
// rejestr „jedno miejsce” próbki: historia tylko w moduly/wstecz; lista zastanych zasad osobno (zbaseline)
const REJESTR = { rzeczy: [
  { rzecz: 'historia', opis: 'historia', wzory: ['\\bhistory\\s*\\.\\s*(?:pushState|replaceState|back|go)\\s*\\(', '["\']popstate["\']'], wlasciciele: ['moduly/wstecz/wstecz.js'] },
  { rzecz: 'okno-przegladarki', opis: 'window.open', wzory: ['\\b(?:window|w|g|self|globalThis)\\s*\\.\\s*open\\s*\\(', '\\b(?:window|w|g|self|globalThis)\\s*\\[\\s*["\']open["\']\\s*\\]'], wlasciciele: [] }
], kluczeWlasciciele: {} };
const g1 = (d, baseline, zbaseline, rejestr) => {
  const b = path.join(d, 'baseline.json'), zb = path.join(d, 'zasady.json'), rj = path.join(d, 'rejestr.json');
  fs.writeFileSync(b, JSON.stringify({ entries: (baseline || []).map(id => ({ id })) }));
  fs.writeFileSync(zb, JSON.stringify({ entries: (zbaseline || []).map(e => typeof e === 'string' ? { id: e } : e) }));
  fs.writeFileSync(rj, typeof rejestr === 'string' ? rejestr : JSON.stringify(rejestr || REJESTR));
  return run('check-architecture.cjs', ['--www', d, '--baseline', b, '--baseline-zasady', zb, '--rejestr', rj, '--json', path.join(d, 'out.json')]);
};

test('G1: czysty układ = PASS, napisy i komentarze nie liczą się jako użycie', () => {
  const r = g1(www()); assert.equal(r.code, 0, r.out); assert.match(r.out, /G1 PASS/);
});
test('G1: skrypt używający API ładowanego później = nowe naruszenie LOAD_ORDER → FAIL', () => {
  const d = www('<script src="late.js"></script>', { 'app.js': '(function(w){ w.OESTApp = { go(){ return w.OESTLate.y; } }; })(window);', 'late.js': '(function(w){ w.OESTLate = { y: 2 }; })(window);' });
  const r = g1(d); assert.equal(r.code, 1); assert.match(r.out, /LOAD_ORDER/);
});
test('G1: brakujący plik skryptu → MISSING_SCRIPT → FAIL', () => {
  const r = g1(www('<script src="nie-ma.js"></script>')); assert.equal(r.code, 1); assert.match(r.out, /MISSING_SCRIPT/);
});
test('G1: moduł zależny od kodu apki → MODULE_DEPENDS_ON_APP → FAIL', () => {
  const d = www('', { 'moduly/a/a.js': '(function(w){ w.OESTA = { x: () => w.OESTApp }; })(window);' });
  const r = g1(d); assert.equal(r.code, 1); assert.match(r.out, /MODULE_DEPENDS_ON_APP/);
});
test('G1: to samo API w dwóch plikach → DUPLICATE_DEFINITION → FAIL', () => {
  const d = www('<script src="b.js"></script>', { 'b.js': '(function(w){ w.OESTA = {}; })(window);' });
  const r = g1(d); assert.equal(r.code, 1); assert.match(r.out, /DUPLICATE_DEFINITION/);
});
test('G1: naruszenie z baseline przechodzi, a wpis baseline, który już nie występuje, daje FAIL (baseline tylko maleje)', () => {
  const d = www('<script src="nie-ma.js"></script>');
  assert.equal(g1(d, ['MISSING_SCRIPT|index.html|nie-ma.js']).code, 0);
  const clean = www(); const r = g1(clean, ['MISSING_SCRIPT|index.html|nie-ma.js']);
  assert.equal(r.code, 1); assert.match(r.out, /baseline nieaktualny/);
});

// ---------- G0/G2: runner PASS / FAIL / SKIPPED / NOT RUN ----------
function project(manifest, files) {
  const d = tmp(); write(d, { 'quality/required-tests.json': JSON.stringify(manifest), ...files }); fs.mkdirSync(path.join(d, 'app/tests'), { recursive: true }); return d;
}
const gate = (d, part, env) => { const out = path.join(d, 'r.json'); const r = run('run-gate.cjs', ['--root', d, '--part', part, '--out', out], undefined, env); return { ...r, json: JSON.parse(fs.readFileSync(out, 'utf8')) }; };
const statusOf = (j, f) => j.results.find(r => r.id === f).status;

// ---------- G1: zasady architektury (docs/ZASADY.md, quality/zasady.cjs) – próbki z celowym błędem (R24) ----------
const mapa = ekrany => JSON.stringify({ ekrany });
const DOM = { id: 'home', rodzic: null, pudelko: 'v-home', pl: 'Główny', en: 'Home' };
const zasadaFail = (r, re) => { assert.equal(r.code, 1, r.out); assert.match(r.out, re); assert.match(r.out, /G1 FAIL/); };
test('Zasady LOGIKA (R27): nowa funkcja wpisana w <script> strony → FAIL; ta sama w module, w komentarzu albo w napisie → PASS', () => {
  zasadaFail(g1(www('<script>function policz(a) { return a + 1; }</script>')), /LOGIKA\|index\.html/);
  zasadaFail(g1(www('<script>var licz = function (a) { return a; };</script>')), /LOGIKA\|index\.html/);
  zasadaFail(g1(www('<script>window.ok = (a) => a;</script>')), /LOGIKA\|index\.html/);
  zasadaFail(g1(www('<script>var policz = (x = Number(1)) => x;</script>')), /LOGIKA\|index\.html/);
  assert.equal(require('../zasady.cjs').funkcjeStrony('<script>var policz = function policz() {};</script>'), 1);
  assert.equal(require('../zasady.cjs').funkcjeStrony('<script>var opis = `${(window.policz = x => x)(1)}`;</script>'), 1);
  assert.equal(require('../zasady.cjs').funkcjeStrony('<script>var wzor = /function policz()/;</script>'), 0);
  assert.equal(require('../zasady.cjs').funkcjeStrony('<script>var w = licznik++ / 2; function policz() {}</script>'), 1);
  assert.equal(require('../zasady.cjs').funkcjeStrony('<script>var w = licznik-- / 2; function policz() {}</script>'), 1);
  assert.equal(require('../zasady.cjs').funkcjeStrony('<script>var p = (x = Number(1)) => x; if (a == (b)) {} var q = async () => 1;</script>'), 2);
  assert.equal(g1(www('<script src="moduly/b/b.js"></script>', { 'moduly/b/b.js': '(function(w){ function policz(a) { return a + 1; } w.OESTB = { policz }; })(window);' })).code, 0);
  assert.equal(g1(www('<script>// function stara(a) {}\n/* var x = function () {}; */ OESTA.x;</script>')).code, 0);
  assert.equal(g1(www('<script>var s = "function napis(a) {}";</script>')).code, 0);
});
test('Zasady LOGIKA: lista zastanych w quality/baselines/logika.json – więcej funkcji niż „maks” → FAIL, tyle samo → PASS, mniej → FAIL z prośbą o obniżenie', () => {
  const html = n => '<script>' + Array.from({ length: n }, (_, i) => 'function f' + i + '() {}').join('\n') + '</script>';
  const zLogika = (d, maks) => { fs.writeFileSync(path.join(d, 'logika.json'), JSON.stringify({ entries: [{ id: 'LOGIKA|index.html', maks }] })); return d; };
  assert.equal(g1(zLogika(www(html(2)), 2)).code, 0);
  zasadaFail(g1(zLogika(www(html(3)), 2)), /LOGIKA\|index\.html/);
  zasadaFail(g1(zLogika(www(html(1)), 2)), /LOGIKA\|index\.html/);
});
test('Zasady: literówka w rodzicu („hme”) → EKRANY zly-rodzic → FAIL', () => {
  const d = www('<section class="view" id="v-cal"></section>', { 'moduly/ekrany/ekrany.json': mapa([DOM, { id: 'cal', rodzic: 'hme', pudelko: 'v-cal', pl: 'K', en: 'C' }]) });
  zasadaFail(g1(d), /EKRANY\|zly-rodzic\|cal\|hme/);
});
test('Zasady: przecinek za dużo w ekrany.json → EKRANY zly-json → FAIL (nie przechodzi po cichu)', () => {
  const d = www('', { 'moduly/ekrany/ekrany.json': '{ "ekrany": [ { "id": "home", "rodzic": null, "pudelko": "v-home", "pl": "G", "en": "H" }, ] }' });
  zasadaFail(g1(d), /EKRANY\|zly-json/);
});
test('Zasady: brak pliku mapy, sekcja bez wpisu, wpis bez sekcji, „up” jako ekran, pętla rodziców → FAIL', () => {
  const brak = www(); fs.rmSync(path.join(brak, 'moduly/ekrany/ekrany.json'));
  zasadaFail(g1(brak), /EKRANY\|brak-pliku/);
  zasadaFail(g1(www('<section class="view" id="v-keys"></section>')), /EKRANY\|sekcja-bez-wpisu\|v-keys/);
  zasadaFail(g1(www('', { 'moduly/ekrany/ekrany.json': mapa([DOM, { id: 'keys', rodzic: 'home', pudelko: 'v-keys', pl: 'K', en: 'K' }]) })), /EKRANY\|wpis-bez-sekcji\|v-keys/);
  zasadaFail(g1(www('', { 'moduly/ekrany/ekrany.json': mapa([DOM, { id: 'up', rodzic: 'home', pudelko: 'v-home', pl: 'x', en: 'x' }]) })), /EKRANY\|up\|up/);
  zasadaFail(g1(www('', { 'moduly/ekrany/ekrany.json': mapa([DOM, { id: 'a', rodzic: 'b', pudelko: 'v-home', pl: 'a', en: 'a' }, { id: 'b', rodzic: 'a', pudelko: 'v-home', pl: 'b', en: 'b' }]) })), /EKRANY\|petla\|a/);
  zasadaFail(g1(www('', { 'moduly/ekrany/ekrany.json': mapa([DOM, { id: 'x', rodzic: 'home', pudelko: 'v-home', pl: 'x' }]) })), /EKRANY\|brak-pola\|x\|en/);
});
test('Zasady EKRANY: id sekcji i strzałka ‹ w apostrofach czytane tak samo jak w cudzysłowach', () => {
  const m = mapa([DOM, { id: 'settings', rodzic: 'home', pudelko: 'v-settings', pl: 'U', en: 'S' }, { id: 'questions', rodzic: 'settings', pudelko: 'v-questions', pl: 'P', en: 'Q' }]);
  const zb = [{ id: 'ZNACZNIK|brak|index.html', maks: 1 }, { id: 'ZNACZNIK|stary|index.html|data-go', maks: 1 }];
  const html = go => "<section class='view' id='v-settings'></section><section class='view' id='v-questions'><div class='top'><button class='back' type='button' data-go='" + go + "'>‹</button></div></section>";
  assert.equal(g1(www(html('settings'), { 'moduly/ekrany/ekrany.json': m }), [], zb).code, 0);
  zasadaFail(g1(www(html('home'), { 'moduly/ekrany/ekrany.json': m }), [], zb), /EKRANY\|strzalka\|v-questions\|home/);
});
test('Zasady EKRANY: strzałka ‹ z nowym znacznikiem musi mieć data-nav="up"; zwykły znacznik z wieloma atrybutami sprawdza się szybko', () => {
  const m = mapa([DOM, { id: 'settings', rodzic: 'home', pudelko: 'v-settings', pl: 'U', en: 'S' }, { id: 'questions', rodzic: 'settings', pudelko: 'v-questions', pl: 'P', en: 'Q' }]);
  const html = nav => '<section class="view" id="v-settings"></section><section class="view" id="v-questions"><div class="top"><button class="back" type="button" data-nav="' + nav + '">‹</button></div></section>';
  zasadaFail(g1(www(html('missing'), { 'moduly/ekrany/ekrany.json': m })), /EKRANY\|strzalka\|v-questions\|missing/);
  assert.equal(g1(www(html('up'), { 'moduly/ekrany/ekrany.json': m })).code, 0);
  const atr = Array.from({ length: 200 }, (_, i) => `data-x${i}="x"`).join(' ');
  const t0 = Date.now(), r = g1(www('', { 'b.js': `x.innerHTML = '<div ${atr}></div>';` }));
  assert.equal(r.code, 0, r.out); assert.ok(Date.now() - t0 < 3000, 'G1 ' + (Date.now() - t0) + ' ms');
});
test('Zasady EKRANY: dwie sekcje .view z tym samym id → FAIL', () => {
  zasadaFail(g1(www('<section class="view" id="v-home"></section>')), /EKRANY\|sekcja-podwojna\|v-home/);
});
test('Zasady: strzałka ‹ w sekcji prowadzi gdzie indziej niż rodzic z mapy → FAIL; zgodna → PASS', () => {
  const m = mapa([DOM, { id: 'settings', rodzic: 'home', pudelko: 'v-settings', pl: 'U', en: 'S' }, { id: 'questions', rodzic: 'settings', pudelko: 'v-questions', pl: 'P', en: 'Q' }]);
  const zla = www('<section class="view" id="v-settings"></section><section class="view" id="v-questions"><div class="top"><button class="back" type="button" data-go="home">‹</button></div></section>', { 'moduly/ekrany/ekrany.json': m });
  zasadaFail(g1(zla, [], [{ id: 'ZNACZNIK|brak|index.html', maks: 1 }, { id: 'ZNACZNIK|stary|index.html|data-go', maks: 1 }]), /EKRANY\|strzalka\|v-questions\|home/);
  const dobra = www('<section class="view" id="v-settings"></section><section class="view" id="v-questions"><div class="top"><button class="back" type="button" data-go="settings">‹</button></div></section>', { 'moduly/ekrany/ekrany.json': m });
  const r = g1(dobra, [], [{ id: 'ZNACZNIK|brak|index.html', maks: 1 }, { id: 'ZNACZNIK|stary|index.html|data-go', maks: 1 }]); assert.equal(r.code, 0, r.out);
});
test('Zasady JM: historia poza właścicielem, window.open i window["open"] (także w apostrofach) → FAIL; w komentarzu → PASS', () => {
  zasadaFail(g1(www('', { 'app.js': '(function(w){ w.OESTApp = { go(){ history.pushState({}, "", "#x"); return w.OESTA.x; } }; })(window);' })), /JM\|historia\|app\.js\]/);
  zasadaFail(g1(www('', { 'app.js': "(function(w){ w.OESTApp = { go(){ w.open('x'); return w.OESTA.x; } }; })(window);" })), /JM\|okno-przegladarki\|app\.js\]/);
  zasadaFail(g1(www('', { 'app.js': "(function(w){ w.OESTApp = { go(){ window['open']('x'); return w.OESTA.x; } }; })(window);" })), /JM\|okno-przegladarki\|app\.js\]/);
  assert.equal(g1(www('', { 'app.js': '(function(w){ /* history.pushState({}) */ w.OESTApp = { go(){ return w.OESTA.x; } }; })(window); // w.open(x)' })).code, 0);
});
test('Zasady JM wzory Word: plik .docx poza moduly/wzory i wzór base64 w kodzie → FAIL; .docx w moduly/wzory → PASS', () => {
  const R = { ...REJESTR, rzeczy: [...REJESTR.rzeczy, { rzecz: 'wzor-word', opis: 'wzór', wzory: ['UEsDB[A-Za-z0-9+/]{200}'], wlasciciele: [] }] };
  assert.equal(g1(www('', { 'moduly/wzory/basic.docx': 'PK' }), [], [], R).code, 0);
  zasadaFail(g1(www('', { 'moduly/wzory/basic.docx': 'PK', 'templates/OEST-basic.docx': 'PK' }), [], [], R), /JM\|wzor-plik\|templates\/OEST-basic\.docx\]/);
  zasadaFail(g1(www('', { 'app.js': '(function(w){ w.OESTApp = { t: "UEsDB' + 'A'.repeat(300) + '", go(){ return w.OESTA.x; } }; })(window);' }), [], [], R), /JM\|wzor-word\|app\.js\]/);
  const R2 = { ...R, rzeczy: [...R.rzeczy, { rzecz: 'wzor-sciezka', opis: 'ścieżka', wzory: ['["\'`][A-Za-z0-9_./-]+\\.docx["\'`]'], wlasciciele: ['moduly/wzory/wzory.js'] }] };
  zasadaFail(g1(www('', { 'app.js': "(function(w){ w.OESTApp = { go(){ fetch('templates/nowy.docx'); return w.OESTA.x; } }; })(window);" }), [], [], R2), /JM\|wzor-sciezka\|app\.js\]/);
  assert.equal(g1(www('', { 'moduly/wzory/wzory.js': '(function(g){ g.OESTWzory = { p: "basic.docx" }; })(window);', 'app.js': '(function(w){ w.OESTApp = { go(){ return w.OESTA.x + ".docx"; } }; })(window);' }), [], [], R2).code, 0);
});
test('Zasady JM: jedno nowe trafienie ponad „maks” → FAIL; mniej trafień = obniż „maks” → FAIL; równe → PASS', () => {
  const app = n => www('', { 'app.js': '(function(w){ w.OESTApp = { go(){ ' + 'history.back(); '.repeat(n) + 'return w.OESTA.x; } }; })(window);' });
  const zb = [{ id: 'JM|historia|app.js', maks: 2 }];
  assert.equal(g1(app(2), [], zb).code, 0);
  zasadaFail(g1(app(3), [], zb), /JM\|historia\|app\.js\]/);
  zasadaFail(g1(app(1), [], zb), /lista zastanych nieaktualna::JM\|historia\|app\.js: trafień 1, a na liście maks 2 – obniż/);
  assert.equal(g1(app(1), [], [{ id: 'JM|historia|app.js', maks: 1 }]).code, 0);
  zasadaFail(g1(app(1), [], ['JM|historia|app.js']), /maks undefined/);
});
test('Zasady EKRANY: mapa nie jest obiektem (liczba, null, tablica) albo nie ma listy ekranów → FAIL', () => {
  for (const zla of ['5', 'null', '[]', '{}', '{"ekrany":3}']) zasadaFail(g1(www('', { 'moduly/ekrany/ekrany.json': zla })), /EKRANY\|zly-ksztalt/);
});
test('Zasady JM: Wstecz Androida z dodatkowym wywołaniem przed wstecz() → PASS', () => {
  const r = g1(www('', { 'moduly/wstecz/wstecz.js': "(function(w){ function wstecz(){} if (w.App) w.App.addListener('backButton', function () { console.debug('x'); wstecz(); }); })(window);" }));
  assert.equal(r.code, 0, r.out);
});
test('Zasady JM: klucz oest.* i baza w dwóch plikach, Wstecz Androida zarejestrowany dwa razy albo wcale, brak właściciela z rejestru → FAIL', () => {
  zasadaFail(g1(www('', { 'b.js': 'localStorage.getItem("oest.lang");', 'c.js': "localStorage.setItem('oest.lang','pl');" })), /JM\|klucz\|oest\.lang\|b\.js/);
  zasadaFail(g1(www('', { 'b.js': 'indexedDB.open("oest-x", 1);', 'c.js': "indexedDB.open('oest-x', 2);" })), /JM\|baza\|oest-x\|c\.js/);
  zasadaFail(g1(www('', { 'b.js': "App.addListener('backButton', function () { wstecz(); });" })), /JM\|backButton\|b\.js\+moduly\/wstecz\/wstecz\.js/);
  const bez = www(); fs.writeFileSync(path.join(bez, 'moduly/wstecz/wstecz.js'), '(function(w){ })(window);');
  zasadaFail(g1(bez), /JM\|backButton\|brak/);
  zasadaFail(g1(www('', { 'moduly/wstecz/wstecz.js': "(function(w){ function wstecz(){} w.App.addListener('backButton', function () { wsteczz(); }); })(window);" })), /JM\|backButton\|moduly\/wstecz\/wstecz\.js/);
  const rj = { rzeczy: [{ rzecz: 'x', opis: 'x', wzory: ['zzz'], wlasciciele: ['moduly/nie-ma/nie-ma.js'] }] };
  zasadaFail(g1(www(), [], [], rj), /JM\|brak-wlasciciela\|x\|moduly\/nie-ma\/nie-ma\.js/);
  zasadaFail(g1(www(), [], [], '{ "rzeczy": [ ], }'), /Nie da się odczytać rejestru/);
});
test('Zasady KOPIA: ta sama funkcja (≥40 tokenów) w dwóch plikach i dwa identyczne pliki → FAIL; krótka funkcja → PASS', () => {
  const fn = 'function dzien(d){ var x = new Date(d); var y = x.getFullYear(); var m = x.getMonth() + 1; var dd = x.getDate(); return (dd < 10 ? "0" : "") + dd + "/" + (m < 10 ? "0" : "") + m + "/" + y; }';
  zasadaFail(g1(www('', { 'b.js': fn, 'c.js': '// inna\n' + fn.replace('function dzien', 'function data') })), /Ta sama funkcja w 2 plikach: data@c\.js, dzien@b\.js\. \[KOPIA\|funkcja\|[0-9a-f]{10}\|b\.js\+c\.js\]/);
  // zmiana nazwy zastanej kopii nie tworzy nowego wyjątku (id = treść + pliki)
  const id = JSON.parse(fs.readFileSync(path.join((() => { const d = www('', { 'b.js': fn, 'c.js': fn.replace('function dzien', 'function data') }); g1(d); return d; })(), 'out.json'), 'utf8')).zasady.fresh[0].id;
  assert.equal(g1(www('', { 'b.js': fn.replace('function dzien', 'function dzien2'), 'c.js': fn.replace('function dzien', 'function inna') }), [], [{ id, maks: 2 }]).code, 0);
  zasadaFail(g1(www('', { 'b.js': 'var a = 1;', 'c.js': 'var a = 1;' })), /KOPIA\|plik\|b\.js\+c\.js/);
  // strzałkowa i metoda obiektu/klasy też są kopią
  const ciało = '{ var x = new Date(d); var y = x.getFullYear(); var m = x.getMonth() + 1; var dd = x.getDate(); return (dd < 10 ? "0" : "") + dd + "/" + (m < 10 ? "0" : "") + m + "/" + y; }';
  zasadaFail(g1(www('', { 'b.js': 'const A = { f: (d) => ' + ciało + ' };', 'c.js': 'var g = (d) => ' + ciało + ';' })), /KOPIA\|funkcja\|[0-9a-f]{10}\|b\.js\+c\.js/);
  zasadaFail(g1(www('', { 'b.js': 'const A = { data(d) ' + ciało + ' };', 'c.js': 'class B { dzien(d) ' + ciało + ' }' })), /KOPIA\|funkcja\|[0-9a-f]{10}\|b\.js\+c\.js/);
  assert.equal(g1(www('', { 'b.js': 'if (a) { b(); }', 'c.js': 'while (a) { b(); }' })).code, 0);
  // „}” w RegExp nie kończy funkcji: wspólny początek, różne zakończenia → nie kopia
  const pocz = 'var a = String(t); var b = a.length; var c = a.slice(0, 3); var d = a.slice(3); var e = b + c.length + d.length; var f = a.replace(/\\}/g, "");';
  assert.equal(g1(www('', { 'b.js': 'function sum(t) { ' + pocz + ' return e + f.length + 1; }', 'c.js': 'function clean(t) { ' + pocz + ' return f.trim().toUpperCase(); }' })).code, 0);
  // trzecia kopia w pliku już objętym wyjątkiem → więcej niż „maks” → FAIL
  const kop = n => www('', { 'b.js': Array.from({ length: n }, (_, i) => 'function f' + i + '(d) ' + ciało).join('\n'), 'c.js': 'function g(d) ' + ciało });
  const kid = JSON.parse(fs.readFileSync(path.join((() => { const d = kop(1); g1(d); return d; })(), 'out.json'), 'utf8')).zasady.fresh[0].id;
  assert.equal(g1(kop(1), [], [{ id: kid, maks: 2 }]).code, 0);
  zasadaFail(g1(kop(2), [], [{ id: kid, maks: 2 }]), /maks 2/);
  assert.equal(g1(www('', { 'b.js': 'function f(a){ return a + 1; }', 'c.js': 'function g(a){ return a + 1; } var c = 2;' })).code, 0);
});
test('Zasady ZNACZNIK: przycisk bez znacznika, z dwoma znacznikami, stary data-go → FAIL; jeden znacznik → PASS', () => {
  zasadaFail(g1(www('', { 'b.js': "x.innerHTML = '<button type=\"button\">A</button>';" })), /ZNACZNIK\|brak\|b\.js\]/);
  zasadaFail(g1(www('', { 'b.js': "x.innerHTML = '<button data-nav=\"cal\" data-akcja=\"zapisz\">A</button>';" })), /ZNACZNIK\|brak\|b\.js\]/);
  zasadaFail(g1(www('', { 'b.js': "x.innerHTML = '<a href=\"#\" data-go=\"cal\" data-nav=\"cal\">A</a>';" })), /ZNACZNIK\|stary\|b\.js\|data-go\]/);
  // role=button w każdej postaci (spacje wokół =, bez cudzysłowów) też musi mieć znacznik
  for (const r of ['role = "button"', 'role=button', "role='button'"]) zasadaFail(g1(www('', { 'b.js': `x.innerHTML = '<div ${r}>A</div>';` })), /ZNACZNIK\|brak\|b\.js\]/);
  assert.equal(g1(www('', { 'b.js': "x.innerHTML = '<div role=buttons>A</div>';" })).code, 0);
  // „>” w wartości atrybutu i w ${…} nie kończy znacznika
  assert.equal(g1(www('', { 'b.js': "x.innerHTML = '<button title=\"A > B\" data-akcja=\"porownaj\">A</button>'; y = `<button ${a > 1 ? 'x' : 'y'} data-nav=\"cal\">B</button>`;" })).code, 0);
  assert.equal(g1(www('', { 'b.js': "x.innerHTML = '<button data-nav=\"cal\">A</button><a href=\"#\" data-akcja=\"x\">B</a><div role=\"button\" data-okno=\"y\"></div>';" })).code, 0);
});

test('Runner Node: PASS, FAIL, SKIPPED (test.skip/todo) i NOT RUN (brak pliku) są rozróżniane; tylko same PASS = sukces', () => {
  const d = project({ node: [{ file: 'app/tests/ok.test.cjs' }, { file: 'app/tests/zly.test.cjs' }, { file: 'app/tests/skip.test.cjs' }, { file: 'app/tests/brak.test.cjs' }], browser: [], allowedSkips: [] }, {
    'app/tests/ok.test.cjs': "require('node:test')('a',()=>{});",
    'app/tests/zly.test.cjs': "require('node:test')('a',()=>{require('node:assert').equal(1,2)});",
    'app/tests/skip.test.cjs': "const t=require('node:test');t('a',()=>{});t.skip('b',()=>{});",
    'app/tests/nowy.test.cjs': "require('node:test')('a',()=>{});"
  });
  const r = gate(d, 'node');
  assert.equal(r.code, 1);
  assert.equal(statusOf(r.json, 'app/tests/ok.test.cjs'), 'PASS');
  assert.equal(statusOf(r.json, 'app/tests/zly.test.cjs'), 'FAIL');
  assert.equal(statusOf(r.json, 'app/tests/skip.test.cjs'), 'SKIPPED');
  assert.equal(statusOf(r.json, 'app/tests/brak.test.cjs'), 'NOT RUN');
  assert.equal(statusOf(r.json, 'app/tests/nowy.test.cjs'), 'PASS', 'test spoza listy też jest uruchamiany');
});
test('Runner Node: wszystkie PASS = kod 0', () => {
  const d = project({ node: [{ file: 'app/tests/ok.test.cjs' }], browser: [], allowedSkips: [] }, { 'app/tests/ok.test.cjs': "require('node:test')('a',()=>{});" });
  assert.equal(gate(d, 'node').code, 0);
});
// udawany Playwright do testów bramki: launch() daje przeglądarkę, której strona może zgłosić błąd w konsoli (page.blad())
function fakePw(d, { launchFail = false } = {}) {
  const f = path.join(d, 'fake-pw.cjs');
  fs.writeFileSync(f, `
    function page(){ const h = {}; const p = { on(n, cb){ (h[n] = h[n] || []).push(cb); }, url: () => 'http://127.0.0.1:9/index.html', context: () => c,
      blad(t){ (h.console || []).forEach(cb => cb({ type: () => 'error', text: () => t, location: () => ({ url: 'http://127.0.0.1:9/app.js', lineNumber: 7 }) })); },
      wyjatek(t){ (h.pageerror || []).forEach(cb => cb(new Error(t))); },
      siec(u){ (h.console || []).forEach(cb => cb({ type: () => 'error', text: () => 'Failed to load resource: net::ERR_FAILED', location: () => ({ url: u, lineNumber: 0 }) })); } };
      return p; }
    const c = { pages: () => [], on(){}, route: async () => {}, newPage: async () => page() };
    module.exports = { chromium: { launch: async () => { ${launchFail ? "throw new Error('Executable doesn\\'t exist at /x/chrome');" : ''} return { newContext: async () => c, newPage: async () => page(), close: async () => {} }; } } };`);
  return { OEST_PLAYWRIGHT_PATH: f };
}
test('Runner przeglądarkowy: sprawdzenie wstępne – brak Playwright albo przeglądarki = jeden jasny powód NOT RUN w każdym teście (#37)', () => {
  const m = { node: [], browser: [{ file: 'app/tests/a-ui-check.cjs', passMarker: 'A PASS' }], allowedSkips: [] };
  const d = project(m, { 'app/tests/a-ui-check.cjs': "console.log('A PASS')", 'app/www/inspekcje/index.html': '', 'app/www/ppm.js': '' });
  let r = gate(d, 'browser', { OEST_PLAYWRIGHT_PATH: path.join(d, 'nie-ma-playwright.cjs') });
  assert.equal(statusOf(r.json, 'app/tests/a-ui-check.cjs'), 'NOT RUN'); assert.match(r.json.results[0].detail, /Sprawdzenie wstępne: nie zainstalowano Playwright/); assert.equal(r.code, 1);
  r = gate(d, 'browser', fakePw(d, { launchFail: true }));
  assert.equal(statusOf(r.json, 'app/tests/a-ui-check.cjs'), 'NOT RUN'); assert.match(r.json.results[0].detail, /przeglądarka się nie uruchamia \(Executable doesn't exist/);
});
test('Runner przeglądarkowy: błąd w konsoli strony albo nieobsłużony wyjątek = FAIL testu, mimo „PASS” w wyniku (#33)', () => {
  const m = { node: [], browser: [{ file: 'app/tests/a-ui-check.cjs', passMarker: 'A PASS' }, { file: 'app/tests/b-ui-check.cjs', passMarker: 'B PASS' }, { file: 'app/tests/c-ui-check.cjs', passMarker: 'C PASS' }, { file: 'app/tests/d-ui-check.cjs', passMarker: 'D PASS' }], allowedSkips: [] };
  const t = (marker, act) => `const pw=require(process.env.OEST_PLAYWRIGHT_PATH);(async()=>{const b=await pw.chromium.launch();const p=await b.newPage();${act};console.log('${marker}');})();`;
  const d = project(m, { 'app/www/inspekcje/index.html': '', 'app/www/ppm.js': '',
    'app/tests/a-ui-check.cjs': t('A PASS', "p.blad('TypeError: x is undefined')"),
    'app/tests/b-ui-check.cjs': t('B PASS', "p.wyjatek('Boom')"),
    'app/tests/c-ui-check.cjs': t('C PASS', "p.siec('https://api.open-meteo.com/v1/forecast')"),
    'app/tests/d-ui-check.cjs': t('D PASS', "p.siec('http://127.0.0.1:9/brak.js')") });
  const r = gate(d, 'browser', fakePw(d));
  assert.equal(statusOf(r.json, 'app/tests/a-ui-check.cjs'), 'FAIL'); assert.match(r.json.results.find(x => x.id.endsWith('a-ui-check.cjs')).detail, /KONSOLA FAIL: 1 błędów[\s\S]*TypeError: x is undefined/);
  assert.equal(statusOf(r.json, 'app/tests/b-ui-check.cjs'), 'FAIL');
  assert.equal(statusOf(r.json, 'app/tests/c-ui-check.cjs'), 'PASS', 'zablokowany internet (testy bez sieci) to nie błąd apki');
  assert.equal(statusOf(r.json, 'app/tests/d-ui-check.cjs'), 'FAIL', 'brak pliku z serwera testu to błąd');
});
test('Runner przeglądarkowy: kod 0 bez potwierdzenia PASS = NOT RUN; brak zbudowanej strony = NOT RUN', () => {
  const m = { node: [], browser: [{ file: 'app/tests/a-ui-check.cjs', passMarker: 'A PASS' }, { file: 'app/tests/b-ui-check.cjs', passMarker: 'B PASS' }], allowedSkips: [] };
  const d = project(m, { 'app/tests/a-ui-check.cjs': "console.log('A PASS')", 'app/tests/b-ui-check.cjs': "/* wyszedł wcześnie */" });
  const pw = fakePw(d);
  let r = gate(d, 'browser', pw); assert.equal(statusOf(r.json, 'app/tests/a-ui-check.cjs'), 'NOT RUN'); // brak app/www
  write(d, { 'app/www/inspekcje/index.html': '', 'app/www/ppm.js': '' });
  r = gate(d, 'browser', pw);
  assert.equal(statusOf(r.json, 'app/tests/a-ui-check.cjs'), 'PASS');
  assert.equal(statusOf(r.json, 'app/tests/b-ui-check.cjs'), 'NOT RUN');
  assert.equal(r.code, 1);
});
test('Runner: pominięta inspekcja w raport-ui-check = SKIPPED, także gdy test jej nie zgłosił', () => {
  const m = { node: [], browser: [{ file: 'app/tests/raport-ui-check.cjs', passMarker: 'raport-ui-check: ', scenarios: 'ppm-inspections' }], allowedSkips: [] };
  const d = project(m, {
    'app/www/inspekcje/index.html': '',
    // lista jak w apce; EFA-INS-099 tylko w komentarzu – nie jest zadaniem i nie może być wymagane
    'app/www/ppm.js': "// EFA-INS-099 usunięte z listy\nwindow.OEST_PPM = { tasks: [ { id: 'EFA-INS-001' }, { id: 'EFA-INS-002' }, { id: 'EFA-INS-003' }, { id: 'db-X' }, { id: 's-y' } ] };",
    'app/tests/raport-ui-check.cjs': "console.log('raport-ui-check: 1 inspekcji, każda ma Word i PDF: EFA-INS-001 | pominięte (wymagają odpowiedzi): EFA-INS-002')"
  });
  const r = gate(d, 'browser', fakePw(d)), row = r.json.results[0];
  assert.equal(row.status, 'SKIPPED'); assert.deepEqual(row.scenarios.missing, ['EFA-INS-002', 'EFA-INS-003']); assert.deepEqual(row.scenarios.silent, ['EFA-INS-003']); assert.equal(row.scenarios.expected, 3, 'tylko EFA-INS z listy zadań, bez komentarzy');
  assert.equal(r.code, 1);
});

// ---------- ochrona kryteriów (ratchet) ----------
function repo(manifest, baseline) {
  const d = tmp(), g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'ignore' });
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  write(d, { 'quality/required-tests.json': JSON.stringify(manifest), 'quality/baselines/architecture.json': JSON.stringify({ entries: baseline.map(id => ({ id })) }), 'app/tests/a.test.cjs': '' });
  g('add', '-A'); g('commit', '-qm', 'base'); g('checkout', '-qb', 'pr');
  return { d, g };
}
const M = { node: [{ file: 'app/tests/a.test.cjs' }], browser: [{ file: 'app/tests/x-ui-check.cjs', passMarker: 'X PASS', timeoutSec: 900 }], allowedSkips: [] };
const ratchet = d => run('check-ratchet.cjs', ['--root', d, '--base', 'main']);

test('Ratchet: bez zmian = PASS', () => { const { d } = repo(M, ['X']); assert.equal(ratchet(d).code, 0); });
test('Ratchet: usunięcie testu z listy, zmiana passMarker, dłuższy limit, nowy wyjątek → FAIL', () => {
  for (const mod of [m => { m.node = []; }, m => { m.browser[0].passMarker = 'X'; }, m => { m.browser[0].timeoutSec = 5000; }, m => { m.allowedSkips = [{ id: 'app/tests/a.test.cjs#skip' }]; }]) {
    const { d, g } = repo(M, []); const m = JSON.parse(JSON.stringify(M)); mod(m);
    write(d, { 'quality/required-tests.json': JSON.stringify(m) }); g('commit', '-qam', 'pr');
    const r = ratchet(d); assert.equal(r.code, 1, r.out);
  }
});
test('Ratchet: nowy wpis w baseline → FAIL; usunięcie wpisu → PASS', () => {
  let { d, g } = repo(M, ['X']);
  write(d, { 'quality/baselines/architecture.json': JSON.stringify({ entries: [{ id: 'X' }, { id: 'Y' }] }) }); g('commit', '-qam', 'pr');
  assert.equal(ratchet(d).code, 1);
  ({ d, g } = repo(M, ['X', 'Y']));
  write(d, { 'quality/baselines/architecture.json': JSON.stringify({ entries: [{ id: 'X' }] }) }); g('commit', '-qam', 'pr');
  assert.equal(ratchet(d).code, 0);
});
test('Ratchet R23: zmieniony test z mniejszą liczbą sprawdzeń (usunięte albo zakomentowane) → FAIL; tyle samo albo więcej, razem ze zmianą apki → PASS', () => {
  const baza = "// typ image/* dozwolony\nconst t = 'a/*b';\nassert.equal(a, 1);\nassert.match(b, /x/);\nif (!c) throw Error('c');\n";
  for (const [nowy, kod] of [
    ["assert.equal(a, 1);\nif (!c) throw Error('c');\n", 1],
    ["assert.equal(a, 1);\n// assert.match(b, /x/);\nif (!c) throw Error('c');\n", 1],
    ["assert.equal(a, 1);\nassert.match(b, /x/);\n", 1],
    ["assert.equal(a, 2);\nassert.match(b, /y/);\nif (!c) throw new TypeError('c');\n", 0],
    [baza + "assert.ok(d);\n", 0],
    // „/*” w komentarzu // i w napisie nie zaczyna bloku: dopisany komentarz blokowy nie zmienia liczby
    [baza + "/* nowy komentarz */\n", 0],
    // sprawdzenie przeniesione do napisu albo zastąpione wpisem do tablicy błędów
    ["assert.equal(a, 1);\nconsole.log('assert.match(b, /x/)');\nif (!c) throw Error('c');\n", 1],
    ["assert.equal(a, 1);\nconsole.log(`x ${ok(b)} y`);\nif (!c) bad.push('c');\n", 0],
    // klamra w napisie wewnątrz ${…} nie kończy wyrażenia (przegląd Codex #157): reszta pliku dalej się liczy
    ["console.log(`${'{'}`);\n" + baza, 0],
    ["console.log(`${`n${'}'}`}`);\n" + baza.replace("assert.match(b, /x/);\n", ""), 1]
  ]) {
    const { d, g } = repo(M, []);
    write(d, { 'app/tests/a.test.cjs': baza }); g('add', '-A'); g('commit', '-qm', 'base2'); g('branch', '-f', 'main', 'HEAD');
    write(d, { 'app/tests/a.test.cjs': nowy, 'app/www/app.js': 'x = 1;' }); g('add', '-A'); g('commit', '-qm', 'pr');
    const r = ratchet(d); assert.equal(r.code, kod, r.out); if (kod) assert.match(r.out, /mniej sprawdzeń niż na main \(3 → 2\)/);
  }
});
test('Ratchet: licznik „maks” wpisu zasad może tylko maleć – obniżenie → PASS; podniesienie albo usunięcie licznika → FAIL', () => {
  for (const [nowy, kod] of [[1, 0], [3, 1], [undefined, 1]]) {
    const { d, g } = repo(M, []);
    write(d, { 'quality/baselines/zasady.json': JSON.stringify({ entries: [{ id: 'JM|historia|a.js', maks: 2 }] }) }); g('add', '-A'); g('commit', '-qm', 'base2');
    write(d, { 'quality/baselines/zasady.json': JSON.stringify({ entries: [{ id: 'JM|historia|a.js', ...(nowy ? { maks: nowy } : {}) }] }) }); g('commit', '-qam', 'pr');
    g('branch', '-f', 'main', 'HEAD~1');
    const r = ratchet(d); assert.equal(r.code, kod, r.out); if (kod) assert.match(r.out, /podniesiono „maks”/);
  }
});
test('Ratchet: usunięcie pliku testu z app/tests → FAIL', () => {
  const { d, g } = repo(M, []); g('rm', '-q', 'app/tests/a.test.cjs'); g('commit', '-qm', 'pr');
  const r = ratchet(d); assert.equal(r.code, 1); assert.match(r.out, /Usunięto\/przeniesiono plik testu/);
});

// ---------- analiza wpływu zmian (krok 2, tryb „tylko-raport”) ----------
const WPLYW = { tryb: 'tylko-raport', strony: ['index.html', 'inspekcje/index.html'], testy: { 'app/tests/ekran-ui-check.cjs': ['index.html'], 'app/tests/raport-ui-check.cjs': ['inspekcje/index.html'] }, zasobyDynamiczne: {}, pelnaRegresja: ['quality/**', '.github/**', 'app/package.json'], dokumentacja: ['docs/**', '**/*.md'], android: ['app/android/**'] };
const PPM = f => `window.OEST_PPM = { tasks: [ { id: 'EFA-INS-001', form: 'a' }, { id: 'EFA-INS-002', form: 'b' } ], forms: { a: { slots: [['Kran', 'hot']] }, b: { slots: [['${f}', 'cold']] } }, due() { return 1; } };`;
function appRepo() {
  const d = tmp(), g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'ignore' });
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  write(d, {
    'quality/wplyw.json': JSON.stringify(WPLYW), 'quality/required-tests.json': JSON.stringify({ node: [], browser: [{ file: 'app/tests/ekran-ui-check.cjs' }, { file: 'app/tests/raport-ui-check.cjs' }], allowedSkips: [] }),
    'app/www/index.html': '<link rel="stylesheet" href="theme.css"><script src="moduly/m/m.js"></script><script src="ppm.js"></script><script src="ekran.js"></script><a href="inspekcje/index.html">PPM</a><!-- <script src="stary.js"></script> -->',
    'app/www/inspekcje/index.html': '<script src="../moduly/m/m.js"></script><script src="../ppm.js"></script><script src="form.js"></script><a href="../index.html">Wstecz</a>',
    'app/www/theme.css': '', 'app/www/ekran.js': '', 'app/www/sierota.js': '', 'app/www/ppm.js': PPM('Zimny'),
    'moduly/m/m.js': '', 'app/www/moduly/m/m.js': '', 'inspekcje/form.js': '', 'app/www/inspekcje/form.js': '',
    'app/tests/ekran-ui-check.cjs': '', 'app/tests/raport-ui-check.cjs': "require('./pomoc.cjs')", 'app/tests/pomoc.cjs': '', 'app/tests/a.test.cjs': '',
    'docs/X.md': '', 'app/android/A.java': ''
  });
  g('add', '-A'); g('commit', '-qm', 'base'); g('checkout', '-qb', 'pr');
  return { d, g };
}
// zmienia pliki, robi commit i zwraca wynik analizy
function impact(files, event = 'pull_request', prep) {
  const { d, g } = appRepo(); if (prep) prep(d, g); write(d, files); g('add', '-A'); g('commit', '-qm', 'pr', '--allow-empty');
  const out = path.join(d, 'w.json'), r = run('wplyw.cjs', ['--root', d, '--base', 'main', '--event', event, '--json', out]);
  assert.equal(r.code, 0, r.out); return JSON.parse(fs.readFileSync(out, 'utf8'));
}
const sel = w => w.wybrane.map(x => path.basename(x.test)).sort(), skip = w => w.pominiete.map(x => path.basename(x.test)).sort();

test('Wpływ: sama dokumentacja i kod Android = żaden test G2 nie jest potrzebny, każdy z powodem', () => {
  const w = impact({ 'docs/X.md': 'nowe', 'app/android/A.java': '//' });
  assert.equal(w.pelna, false); assert.deepEqual(sel(w), []); assert.deepEqual(skip(w), ['ekran-ui-check.cjs', 'raport-ui-check.cjs']);
  assert.ok(w.pominiete.every(p => /dokumentacja/.test(p.powod) && /android/.test(p.powod)), JSON.stringify(w.pominiete));
});
test('Wpływ: plik jednego ekranu = tylko testy tej strony; link <a href> i komentarz HTML nie są wczytaniem', () => {
  const w = impact({ 'app/www/ekran.js': '//zmiana' });
  assert.deepEqual(sel(w), ['ekran-ui-check.cjs']); assert.deepEqual(skip(w), ['raport-ui-check.cjs']);
  assert.match(w.pominiete[0].powod, /ekran\.js.*nie są wczytywane przez inspekcje\/index\.html/);
  assert.ok(!w.strony['index.html'].includes('inspekcje/index.html') && !w.strony['index.html'].includes('stary.js'));
});
test('Wpływ: moduł wspólny (moduly/) wczytywany przez obie strony = testy obu stron', () => {
  const w = impact({ 'moduly/m/m.js': '//zmiana' });
  assert.deepEqual(sel(w), ['ekran-ui-check.cjs', 'raport-ui-check.cjs']); assert.equal(w.zmiany[0].klasa, 'wspólne');
});
test('Wpływ: dane formularza (ppm.js) = lista dotkniętych inspekcji; zmiana funkcji w ppm.js = wszystkie', () => {
  let w = impact({ 'app/www/ppm.js': PPM('Zimny 2') });
  assert.equal(w.zmiany[0].klasa, 'dane formularza'); assert.deepEqual(w.inspekcje, ['EFA-INS-002']); assert.ok(sel(w).includes('raport-ui-check.cjs'));
  w = impact({ 'app/www/ppm.js': PPM('Zimny').replace('return 1', 'return 2') });
  assert.equal(w.inspekcje, null, 'kod (nie dane) w ppm.js = wszystkie inspekcje');
  const priv = f => `(function(w){ function alive(r){ return ${f}; }\n w.OEST_PPM = {\n  tasks: [ { id: 'EFA-INS-001', form: 'a' } ],\n  forms: { a: { slots: [] } },\n  stage(r){ return alive(r); } }; })(window);`;
  w = impact({ 'app/www/ppm.js': priv('false') }, 'pull_request', (d, g) => { write(d, { 'app/www/ppm.js': priv('true') }); g('commit', '-qam', 'prywatna'); g('branch', '-f', 'main'); });
  assert.equal(w.inspekcje, null, 'zmiana prywatnej funkcji (niewidoczna w eksporcie) = wszystkie inspekcje');
  w = impact({ 'app/www/ppm.js': PPM('Zimny').replace("forms: {", "forms: { wspolne: { rooms: ['B2'] },") });
  assert.equal(w.inspekcje, null, 'zmiana formularza bez zadania o tej nazwie (dane wspólne, np. plantRooms) = wszystkie inspekcje');
});
test('Wpływ: zmieniony test lub jego pomocnik = ten test', () => {
  assert.deepEqual(sel(impact({ 'app/tests/ekran-ui-check.cjs': '//' })), ['ekran-ui-check.cjs']);
  assert.deepEqual(sel(impact({ 'app/tests/pomoc.cjs': '//' })), ['raport-ui-check.cjs']);
  assert.deepEqual(sel(impact({ 'app/tests/a.test.cjs': '//' })), [], 'test Node: G0 i tak zawsze w całości');
});
test('Wpływ: pełna regresja – plik bramki, plik nieznany, plik apki bez wczytania, usunięty plik, nowy test bez mapy', () => {
  const cases = [
    [{ 'quality/x.cjs': '' }, /plik bramki/], [{ 'app/package.json': '{}' }, /plik bramki/], [{ 'Inne/plik.txt': 'x' }, /spoza mapy/],
    [{ 'app/www/sierota.js': '//' }, /żadna strona go nie wczytuje/], [{ 'app/tests/nowy-ui-check.cjs': '' }, /nie ma strony w quality\/wplyw\.json/],
    [{ 'app/tests/dane/zdjecie-1.jpg': 'x' }, /dane testów/], [{ 'app/tests/nikt.cjs': '' }, /nieznani użytkownicy/]
  ];
  for (const [files, why] of cases) { const w = impact(files); assert.equal(w.pelna, true, JSON.stringify(files)); assert.match(w.powodyPelnej.join(' '), why); assert.deepEqual(skip(w), []); }
  const w = impact({}, 'pull_request', (d, g) => g('rm', '-q', 'app/www/ekran.js'));
  assert.equal(w.pelna, true); assert.match(w.powodyPelnej.join(' '), /usunięty/);
});
test('Wpływ: push na main, merge_group i wywołanie z Android APK = zawsze pełna bramka, nawet dla samej dokumentacji', () => {
  for (const ev of ['push', 'merge_group', 'workflow_dispatch']) { const w = impact({ 'docs/X.md': 'x' }, ev); assert.equal(w.pelna, true); assert.deepEqual(skip(w), []); }
});
test('Wpływ: nie ma przełącznika „bezpieczne” – argumenty i zmienne spoza analizy nie zmieniają wyboru', () => {
  const { d, g } = appRepo(); write(d, { 'moduly/m/m.js': '//' }); g('commit', '-qam', 'pr');
  const out = path.join(d, 'w.json');
  const p = spawnSync(process.execPath, [path.join(Q, 'wplyw.cjs'), '--root', d, '--base', 'main', '--event', 'pull_request', '--json', out, '--bezpieczne', '--skip', 'all'], { encoding: 'utf8', env: { ...process.env, OEST_BEZPIECZNE: '1', OEST_SKIP: '1' } });
  assert.equal(p.status, 0); assert.deepEqual(sel(JSON.parse(fs.readFileSync(out, 'utf8'))), ['ekran-ui-check.cjs', 'raport-ui-check.cjs']);
});
test('Ratchet: mapa wpływu może tylko poszerzać testy – zawężenie strony testu, nowy wzorzec dokumentacji, zmiana trybu → FAIL', () => {
  const W = { tryb: 'tylko-raport', strony: ['index.html'], testy: { 'app/tests/x-ui-check.cjs': ['index.html'] }, zasobyDynamiczne: {}, pelnaRegresja: ['quality/**'], dokumentacja: ['docs/**'], android: [] };
  const mods = [m => { m.testy['app/tests/x-ui-check.cjs'] = []; }, m => { m.dokumentacja.push('app/www/**'); }, m => { m.tryb = 'wybor'; }, m => { m.pelnaRegresja = []; }];
  for (const mod of mods) {
    const { d, g } = repo(M, []); write(d, { 'quality/wplyw.json': JSON.stringify(W) }); g('add', '-A'); g('commit', '-qm', 'mapa'); g('branch', '-f', 'main');
    const m = JSON.parse(JSON.stringify(W)); mod(m); write(d, { 'quality/wplyw.json': JSON.stringify(m) }); g('commit', '-qam', 'pr');
    const r = ratchet(d); assert.equal(r.code, 1, r.out); assert.match(r.out, /Mapa wpływu|tryb/);
  }
  const { d, g } = repo(M, []); write(d, { 'quality/wplyw.json': JSON.stringify(W) }); g('add', '-A'); g('commit', '-qm', 'mapa'); g('branch', '-f', 'main');
  const m = JSON.parse(JSON.stringify(W)); m.testy['app/tests/x-ui-check.cjs'].push('inspekcje/index.html'); write(d, { 'quality/wplyw.json': JSON.stringify(m) }); g('commit', '-qam', 'pr');
  assert.equal(ratchet(d).code, 0, 'poszerzenie zakresu jest dozwolone');
});
test('Podsumowanie: analiza wpływu to tylko informacja – „POMINIĘTY (wpływ)” i rozbieżność mapy nie zmieniają wyniku bramki', () => {
  const d = tmp(), ok = { status: 'PASS' };
  const res = (extra) => { write(d, {
    'lang.json': JSON.stringify({ ...ok, detail: '' }), 'node.json': JSON.stringify({ results: [] }), 'architecture.json': JSON.stringify({ ...ok, total: 0, baseline: 0, fresh: [], stale: [], zasady: { total: 0, byRule: {}, fresh: [], stale: [] } }),
    'ratchet.json': JSON.stringify({ ...ok, errors: [], warnings: [], notes: [] }),
    'browser.json': JSON.stringify({ results: [{ id: 'app/tests/x-ui-check.cjs', status: 'PASS', seconds: 40, wczytane: ['index.html', 'nowy.js'] }, ...extra] }),
    'wplyw.json': JSON.stringify({ tryb: 'tylko-raport', status: 'OK', base: 'abc', pelna: false, powodyPelnej: [], zmiany: [{ plik: 'docs/a.md', klasa: 'dokumentacja', powod: 'nie trafia do apki' }], wybrane: [], pominiete: [{ test: 'app/tests/x-ui-check.cjs', powod: 'zmiana nie dotyczy stron apki' }], zaleznosci: { 'app/tests/x-ui-check.cjs': ['index.html'] } })
  }); write(d, { 'm.json': JSON.stringify({ node: [], browser: [{ file: 'app/tests/x-ui-check.cjs' }] }) }); return run('summarize.cjs', [d, path.join(d, 'm.json')]); };
  let r = res([]);
  assert.equal(r.code, 0, r.out); assert.match(r.out, /POMINIĘTY \(wpływ\)/); assert.match(r.out, /Rozbieżność mapy.*nowy\.js/s); assert.match(r.out, /byłyby pominięte: 40 s/);
  r = res([{ id: 'app/tests/y-ui-check.cjs', status: 'FAIL', seconds: 1 }]);
  assert.equal(r.code, 1, 'FAIL testu nadal blokuje, niezależnie od analizy wpływu');
});

// ---------- G2 naraz (szybkość, 07/11/2026): te same testy, ten sam wynik, testy mierzące czas zawsze same ----------
const slow = (tag, ms) => `const fs=require('fs'),f=process.env.LOG;fs.appendFileSync(f,'start ${tag} '+Date.now()+'\\n');setTimeout(()=>{fs.appendFileSync(f,'end ${tag} '+Date.now()+'\\n');console.log('${tag} PASS')},${ms});`;
function g2project() {
  const m = { node: [], allowedSkips: [], browser: ['a', 'b', 'c'].map(x => ({ file: `app/tests/${x}-ui-check.cjs`, passMarker: `${x} PASS` })).concat([{ file: 'app/tests/czas-ui-check.cjs', passMarker: 'czas PASS', osobno: true }]) };
  return project(m, { 'app/www/inspekcje/index.html': '', 'app/www/ppm.js': '', 'app/tests/a-ui-check.cjs': slow('a', 700), 'app/tests/b-ui-check.cjs': slow('b', 700), 'app/tests/c-ui-check.cjs': "process.exit(3)", 'app/tests/czas-ui-check.cjs': slow('czas', 300) });
}
const g2run = (d, args) => { const out = path.join(d, 'r-' + Date.now() + '.json'), LOG = path.join(d, 'log.txt'); fs.writeFileSync(LOG, ''); const p = spawnSync(process.execPath, [path.join(Q, 'run-gate.cjs'), '--root', d, '--part', 'browser', '--out', out, ...args], { encoding: 'utf8', env: { ...process.env, ...fakePw(d), LOG } }); return { code: p.status, json: JSON.parse(fs.readFileSync(out, 'utf8')), log: fs.readFileSync(LOG, 'utf8').trim().split('\n').map(l => l.split(' ')).map(([e, t, ms]) => ({ e, t, ms: +ms })) }; };
test('G2 naraz: wspólne testy idą jednocześnie, test „osobno” startuje dopiero po ich końcu; FAIL nadal = FAIL, kolejność wyników jak na liście', () => {
  const d = g2project(), r = g2run(d, []);
  const at = (e, t) => r.log.find(x => x.e === e && x.t === t).ms;
  assert.ok(at('start', 'b') < at('end', 'a'), 'a i b powinny iść naraz');
  assert.ok(at('start', 'czas') >= Math.max(at('end', 'a'), at('end', 'b')), 'test mierzący czas musi iść sam');
  assert.deepEqual(r.json.results.map(x => [path.basename(x.id), x.status]), [['a-ui-check.cjs', 'PASS'], ['b-ui-check.cjs', 'PASS'], ['c-ui-check.cjs', 'FAIL'], ['czas-ui-check.cjs', 'PASS']]);
  assert.equal(r.code, 1);
});
test('G2 w częściach: --grupa dzieli testy bez zgubienia żadnego; brak części = NOT RUN w podsumowaniu', () => {
  const d = g2project(), w = g2run(d, ['--grupa', 'wspolne']), c = g2run(d, ['--grupa', 'czas-ui-check.cjs']);
  assert.deepEqual(w.json.results.map(x => path.basename(x.id)), ['a-ui-check.cjs', 'b-ui-check.cjs', 'c-ui-check.cjs']);
  assert.deepEqual(c.json.results.map(x => path.basename(x.id)), ['czas-ui-check.cjs']);
  const s = tmp(), ok = { status: 'PASS' }, m = path.join(d, 'quality/required-tests.json');
  write(s, { 'lang.json': JSON.stringify({ ...ok, detail: '' }), 'node.json': JSON.stringify({ results: [] }), 'architecture.json': JSON.stringify({ ...ok, total: 0, baseline: 0, fresh: [], stale: [], zasady: { total: 0, byRule: {}, fresh: [], stale: [] } }), 'ratchet.json': JSON.stringify({ ...ok, errors: [], warnings: [], notes: [] }),
    'browser-wspolne.json': JSON.stringify({ results: w.json.results.filter(x => x.status === 'PASS') }) });
  let r = run('summarize.cjs', [s, m]); assert.equal(r.code, 1); assert.match(r.out, /czas-ui-check\.cjs \| ⚠️ NOT RUN/); assert.match(r.out, /c-ui-check\.cjs \| ⚠️ NOT RUN/);
  write(s, { 'browser-wspolne.json': JSON.stringify({ results: w.json.results.map(x => ({ ...x, status: 'PASS' })) }), 'browser-czas-ui-check.cjs.json': JSON.stringify(c.json) });
  r = run('summarize.cjs', [s, m]); assert.equal(r.code, 0, r.out); assert.match(r.out, /PASS 8 · FAIL 0 · SKIPPED 0 · NOT RUN 0/);
});

test('Podsumowanie: nowe naruszenie zasad (np. EKRANY) jest w raporcie z id i liczbami, wiersz zasad = FAIL', () => {
  const d = www('<section class="view" id="v-home"></section>'), r = g1(d);
  assert.equal(r.code, 1, r.out);
  const s = tmp(), ok = { status: 'PASS' }, m = path.join(tmp(), 'required-tests.json');
  fs.writeFileSync(m, JSON.stringify({ node: [], browser: [], allowedSkips: [] }));
  write(s, { 'lang.json': JSON.stringify({ ...ok, detail: '' }), 'node.json': JSON.stringify({ results: [] }), 'architecture.json': fs.readFileSync(path.join(d, 'out.json'), 'utf8'), 'ratchet.json': JSON.stringify({ ...ok, errors: [], warnings: [], notes: [] }), 'browser.json': JSON.stringify({ results: [] }) });
  const o = run('summarize.cjs', [s, m]);
  assert.equal(o.code, 1, o.out);
  assert.match(o.out, /Zasady R1–R26 \(EKRANY, JM, KOPIA, ZNACZNIK\) \| ❌ FAIL \| naruszeń 1 \{"EKRANY":1\}, nowe 1, nieaktualne wpisy 0: .*\[EKRANY\\\|sekcja-podwojna\\\|v-home\]/);
  assert.match(o.out, /Zależności modułów i kolejność skryptów \| ✅ PASS/);
});
