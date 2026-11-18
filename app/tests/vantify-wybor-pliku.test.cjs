// Okienko Vantify w apce: pole „Upload” (np. Job Sheet przy Complete, Grzegorz 18/11/2026) otwiera wybór pliku Androida.
// Zasady (blokują build): 1) WebView ma WebChromeClient z onShowFileChooser, 2) wybór przez ACTION_GET_CONTENT + CATEGORY_OPENABLE
// (Dysk, Pobrane, zdjęcia), 3) rodzaje z <input accept> (".pdf", "image/*") zamieniane na MIME, 4) strona ZAWSZE dostaje odpowiedź
// (także Anuluj i błąd) – inaczej pole przestaje reagować, 5) wiele plików (ClipData), 6) „Zbadaj” zapisuje tylko rodzaje i liczbę plików, bez nazw.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const src = fs.readFileSync(path.join(__dirname, '../android/app/src/main/java/com/oest/inspekcje/VantifyActivity.java'), 'utf8');
const body = (name) => { const i = src.indexOf(name); assert.ok(i >= 0, 'brak ' + name); let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } return ''; };
test('okienko Vantify obsługuje wybór pliku', () => {
  assert.match(src, /web\.setWebChromeClient\(new WebChromeClient\(\)/);
  const f = body('public boolean onShowFileChooser');
  assert.match(f, /pick\.onReceiveValue\(null\)/, 'poprzedni wybór bez odpowiedzi');
  assert.match(f, /startActivityForResult\(pickIntent\(/);
  assert.match(f, /catch \(Exception e\) \{ pick = null; cb\.onReceiveValue\(null\)/, 'błąd otwarcia bez odpowiedzi dla strony');
  assert.match(f, /return true;/);
  const p = body('static Intent pickIntent');
  assert.match(p, /ACTION_GET_CONTENT/); assert.match(p, /CATEGORY_OPENABLE/); assert.match(p, /EXTRA_MIME_TYPES/); assert.match(p, /EXTRA_ALLOW_MULTIPLE/);
  const m = body('static String[] mimes');
  assert.match(m, /getMimeTypeFromExtension/); assert.match(m, /contains\("\/"\)/);
});
test('wynik wyboru zawsze wraca do strony (także Anuluj), wiele plików, bez nazw w „Zbadaj”', () => {
  const r = body('protected void onActivityResult');
  assert.match(r, /req != PICK \|\| pick == null/);
  assert.match(r, /getClipData\(\)/);
  assert.match(r, /pick\.onReceiveValue\(got\); pick = null;/);
  assert.doesNotMatch(r, /if \(res == RESULT_OK[^;]*\) pick\.onReceiveValue/, 'Anuluj musi też odpowiadać');
  assert.match(r, /add\("upload-picked", got == null \? "cancel" : String\.valueOf\(got\.length\), ""\)/);
  assert.match(body('public boolean onShowFileChooser'), /add\("upload", String\.join\(",", types\)/);
  assert.doesNotMatch(src, /getLastPathSegment|DISPLAY_NAME/, 'nazwy plików nie trafiają do zapisu');
});
