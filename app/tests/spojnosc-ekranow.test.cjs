// Spójność całej apki (Grzegorz 19/11/2026: „naruszanie spójności całego programu”):
// zdjęcie z Reactive otwierane przez window.open() lądowało pod wszystkimi ekranami (także w Ustawieniach).
// Zasada: okienka i podglądy otwiera tylko wspólny moduł (moduly/przycisk – OESTPrzycisk.ask, moduly/aparat, …);
// kod ekranów nie używa window.open() i nie dokleja niczego do <body>. Nowy plik z takim kodem = czerwony build.
'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '../..'), WWW = path.join(ROOT, 'app/www');
// źródła: app/www (bez kopii generowanych przez copy-web) + moduly/ i inspekcje/ z katalogu głównego (ta sama ścieżka co w apce)
const GEN = new Set(['moduly', 'inspekcje']), files = [];
function walk(d, base, top) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!['lib', 'node_modules', 'templates'].includes(e.name) && !(top && GEN.has(e.name))) walk(p, base, false); } else if (/\.(js|html)$/.test(e.name)) files.push([p, base]); } }
walk(WWW, WWW, true); for (const g of GEN) walk(path.join(ROOT, g), ROOT, false);
const rel = ([p, base]) => path.relative(base, p).split(path.sep).join('/'), read = ([p]) => fs.readFileSync(p, 'utf8');
// wspólne moduły okienek/nakładek i zastane miejsca (lista może tylko maleć)
const BODY_OK = new Set(['moduly/przycisk/przycisk.js', 'moduly/aparat/aparat.js', 'moduly/notatki/glos.js', 'moduly/odczyt/odczyt.js', 'zdjecia-ui.js', 'inspekcje/index.html', 'inspekcje/form-ui.js']);
test('żaden ekran nie otwiera window.open() (w WebView dokleja treść pod wszystkie ekrany)', () => {
  const bad = files.filter(f => /\b(?:w|window|self|globalThis)\.open\s*\(/.test(read(f))).map(rel);
  assert.deepEqual(bad, [], 'window.open() w: ' + bad.join(', ') + ' – użyj OESTPrzycisk.ask({node})');
});
test('do <body> dokleja tylko wspólny moduł okienek (lista zastanych może tylko maleć)', () => {
  const hits = files.filter(f => /document\.body\.(?:append|appendChild|prepend|insertBefore)\s*\(/.test(read(f))).map(rel);
  const bad = hits.filter(f => !BODY_OK.has(f));
  assert.deepEqual(bad, [], 'doklejanie do <body> poza modułem okienek: ' + bad.join(', '));
  const gone = [...BODY_OK].filter(f => !hits.includes(f));
  assert.deepEqual(gone, [], 'usuń z listy BODY_OK pliki, które już nie doklejają: ' + gone.join(', '));
});
