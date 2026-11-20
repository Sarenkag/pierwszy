// Hasło Vantify nie wychodzi do kodu strony (plan architektury 19/11/2026, faza P1, krok S1; ustalenia #39, #41, #42).
// Zasada R17: tajne dane zostają w Androidzie. Ekran apki (JS) nie dostaje hasła ani przez wynik wtyczki, ani przez zmienną okna;
// skrypty do okien Vantify wstrzykuje jedno miejsce (VantifyWeb) i tylko na *.vantify.com.
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const J = path.join(ROOT, 'app/android/app/src/main/java/com/oest/inspekcje');
const java = f => fs.readFileSync(path.join(J, f), 'utf8');
// ciało metody: od nagłówka do zamykającej klamry na tym samym poziomie
function body(src, head) {
  const at = src.indexOf(head); assert.ok(at >= 0, 'brak: ' + head);
  let i = src.indexOf('{', at), d = 0;
  for (let k = i; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); }
  throw new Error('niezamknięte: ' + head);
}
function jsFiles(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) jsFiles(p, out); else if (/\.(js|html)$/.test(e.name)) out.push(p);
  }
  return out;
}
const WWW = jsFiles(path.join(ROOT, 'app/www')).concat(jsFiles(path.join(ROOT, 'moduly')));

test('#39: showLogin oddaje do JS dokładnie {ok} – hasło pokazuje okienko Androida', () => {
  const b = body(java('VantifyPlugin.java'), 'public void showLogin(PluginCall call)');
  const keys = [...b.matchAll(/\bo\.put\("([^"]+)"/g)].map(m => m[1]);
  assert.deepStrictEqual([...new Set(keys)], ['ok'], 'wynik showLogin: tylko klucz ok');
  assert.doesNotMatch(b, /JSObject\.fromJSONObject|call\.resolve\((?!o\))/, 'jedyny wynik to obiekt o');
  assert.match(b, /AlertDialog/, 'hasło w okienku Androida');
  assert.match(b, /FLAG_SECURE/, 'okienko z hasłem bez zrzutów ekranu');
});

test('#39: żaden plik JS ani HTML nie czyta hasła z wyniku wtyczki', () => {
  for (const f of WWW) {
    const s = fs.readFileSync(f, 'utf8');
    assert.doesNotMatch(s, /\.pass\b(?!\s*:)/, 'odczyt .pass w ' + path.relative(ROOT, f));
    assert.doesNotMatch(s, /\[\s*["']pass["']\s*\]/, 'odczyt ["pass"] w ' + path.relative(ROOT, f));
  }
});

test('#41: login i hasło nie są zmienną okna (window.__oestLogin zniknęło)', () => {
  for (const f of WWW) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /__oestLogin(?![A-Za-z])/, path.relative(ROOT, f));
  const L = java('VantifyLogin.java');
  assert.doesNotMatch(L, /__oestLogin(?![A-Za-z])/);
  const script = body(L, 'static String script(Context c)');
  assert.doesNotMatch(script, /load\(|l\[|quote/, 'skrypt wstrzykiwany do okna nie zawiera loginu ani hasła');
  // hasło tylko jako argumenty jednego wywołania, bez przypisania do zmiennej strony
  const fill = body(L, 'static String fill(String[] l)');
  assert.match(fill, /\(function\(f\)\{if\(typeof f==='function'\)f\(" \+ JSONObject\.quote\(l\[0\]\) \+ "," \+ JSONObject\.quote\(l\[1\]\) \+ "\)\}\)\(window\.__oestFill\);/);
  // VantifyLogin.fill woła tylko Sync.fill: raz na okno, tylko gdy otwarta strona (web.getUrl) to Vantify, nie po odrzuceniu
  const P = java('VantifyPlugin.java');
  assert.deepStrictEqual([...P.matchAll(/VantifyLogin\.fill\(/g)].length, 1);
  const f = body(P, 'private void fill()');
  assert.match(f, /if \(filled \|\| finished \|\| web == null\) return;/);
  assert.match(f, /String u = web\.getUrl\(\);\s*if \(u == null \|\| !VantifyActivity\.vantify\(Uri\.parse\(u\)\.getHost\(\)\) \|\| VantifyLogin\.bad\(a\)\) return;/);
  assert.match(f, /filled = true; loginVer = VantifyLogin\.ver\(a\);/);
  // most podaje JS tylko tak/nie, nigdy hasła
  assert.match(P, /@JavascriptInterface public boolean hasLogin\(\) \{ return VantifyLogin\.load\(a\) != null && !VantifyLogin\.bad\(a\); \}/);
  assert.match(P, /@JavascriptInterface public void fillLogin\(\) \{ h\.post\(Sync\.this::fill\); \}/);
  for (const m of P.matchAll(/@JavascriptInterface public (\w+) (\w+)\(/g)) assert.ok(['void', 'boolean'].includes(m[1]), 'most ' + m[2] + ' nie zwraca tekstu do strony');
});

test('#42: skrypty do okien Vantify wstrzykuje jedno miejsce (VantifyWeb), tylko na *.vantify.com', () => {
  const W = java('VantifyWeb.java');
  assert.match(body(W, 'static void inject(WebView web, String host, String js)'), /if \(web == null \|\| js == null \|\| js\.isEmpty\(\) \|\| !VantifyActivity\.vantify\(host\)\) return;\s*web\.evaluateJavascript\(js, null\);/);
  const P = java('VantifyPlugin.java'), A = java('VantifyActivity.java');
  assert.match(body(P, 'private void inject()'), /^\{ VantifyWeb\.inject\(web, host, VantifyLogin\.script\(a\) \+ script\); \}$/);
  assert.match(body(A, 'private void inject()'), /^\{ if \(!rejestr\.isEmpty\(\)\) VantifyWeb\.inject\(web, host, rejestr \+ "\\n" \+ akcje\); \}$/);
  // poza VantifyWeb: tylko jednorazowe wpisanie loginu (Sync.fill) i pobranie pliku eksportu w widocznym oknie
  assert.deepStrictEqual([...P.matchAll(/evaluateJavascript\(/g)].length, 1, 'VantifyPlugin: tylko Sync.fill');
  assert.match(body(P, 'private void fill()'), /evaluateJavascript\(VantifyLogin\.fill\(l\), null\)/);
  assert.deepStrictEqual([...A.matchAll(/evaluateJavascript\(/g)].length, 1, 'VantifyActivity: tylko pobranie pliku');
  assert.match(A, /web\.evaluateJavascript\("fetch\(" \+ JSONObject\.quote\(url\)/);
  assert.match(java('VantifyActivity.java'), /static boolean vantify\(String h\) \{ return h != null && \(h\.equals\("vantify\.com"\) \|\| h\.endsWith\("\.vantify\.com"\)\); \}/);
});
