// Spójność całej apki (Grzegorz 19/11/2026: „naruszanie spójności całego programu”):
// zdjęcie z Reactive otwierane przez window.open() lądowało pod wszystkimi ekranami (także w Ustawieniach).
// Zasada: okienka i podglądy otwiera tylko wspólny moduł (moduly/przycisk – OESTPrzycisk.ask, moduly/aparat, …);
// kod ekranów nie używa window.open() i nie dokleja niczego do <body>. Nowy plik z takim kodem = czerwony build.
'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const WWW = path.resolve(__dirname, '../www');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!['lib', 'node_modules', 'templates'].includes(e.name)) walk(p); } else if (/\.(js|html)$/.test(e.name)) files.push(p); } })(WWW);
const rel = p => path.relative(WWW, p).split(path.sep).join('/');
// wspólne moduły okienek/nakładek i zastane miejsca (lista może tylko maleć)
const BODY_OK = new Set(['moduly/przycisk/przycisk.js', 'moduly/aparat/aparat.js', 'moduly/notatki/glos.js', 'moduly/odczyt/odczyt.js', 'zdjecia-ui.js', 'update.js', 'inspekcje/index.html', 'inspekcje/form-ui.js']);
test('żaden ekran nie otwiera window.open() (w WebView dokleja treść pod wszystkie ekrany)', () => {
  const bad = files.filter(f => /\b(?:w|window|self|globalThis)\.open\s*\(/.test(fs.readFileSync(f, 'utf8'))).map(rel);
  assert.deepEqual(bad, [], 'window.open() w: ' + bad.join(', ') + ' – użyj OESTPrzycisk.ask({node})');
});
test('do <body> dokleja tylko wspólny moduł okienek (lista zastanych może tylko maleć)', () => {
  const hits = files.filter(f => /document\.body\.(?:append|appendChild|prepend|insertBefore)\s*\(/.test(fs.readFileSync(f, 'utf8'))).map(rel);
  const bad = hits.filter(f => !BODY_OK.has(f));
  assert.deepEqual(bad, [], 'doklejanie do <body> poza modułem okienek: ' + bad.join(', '));
  const gone = [...BODY_OK].filter(f => !hits.includes(f));
  assert.deepEqual(gone, [], 'usuń z listy BODY_OK pliki, które już nie doklejają: ' + gone.join(', '));
});
