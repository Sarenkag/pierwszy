// Vantify w apce i zapis „Zbadaj” (Grzegorz 10/11/2026, PROD-035): zasady blokujące build.
// 1) zapis nie zawiera haseł, tokenów, wartości wysyłanych formularzy, e-maili, telefonów ani danych osób,
// 2) apka nie zapisuje loginu/hasła Vantify (brak SharedPreferences, brak odczytu pól formularza w Javie),
// 3) okno Vantify: tylko https, most JS tylko dla stron vantify.com, aktywność niewystawiona innym apkom.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const R = require('../www/vantify-rejestr.js');
const J = p => fs.readFileSync(path.join(__dirname, '..', 'android', 'app', 'src', 'main', p), 'utf8');
test('adres: tokeny i klucze w adresie ukryte, ścieżka SPA (#/…) zostaje bez parametrów', () => {
  assert.strictEqual(R.url('https://savillsuk.cafm.vantify.com/api/v2/jobs?page=1&access_token=abc&sig=zz#/user/jobs?jobsPage=1'),
    'https://savillsuk.cafm.vantify.com/api/v2/jobs?page=1&access_token=…&sig=…#/user/jobs');
});
test('wysyłane dane (np. logowanie): tylko nazwy pól, nigdy wartości; hasło ukryte', () => {
  const s = JSON.stringify(R.body(JSON.stringify({ username: 'greg@example.com', password: 'Tajne123', site: { id: 6324 } }), true));
  assert.doesNotMatch(s, /greg|Tajne|6324/);
  assert.match(s, /"password":"\(ukryte\)"/);
  assert.deepStrictEqual(R.body('username=greg%40x.com&password=Tajne', true), { form: ['username', 'password'] });
});
test('odpowiedzi: kształt danych bez osób, e-maili i telefonów; terminy i liczby zostają', () => {
  const res = { total: 97, data: [{ id: 3000623, completeBy: '2026-11-20 23:59:59', reporterName: 'Jan Kowalski', siteContactPhoneNumber: '07123 456789', note: 'kontakt jan@firma.pl', phone2: '+44 7123 456 789', token: 'abc' }] };
  const s = JSON.stringify(R.body(JSON.stringify(res), false));
  assert.doesNotMatch(s, /Kowalski|07123|jan@firma|abc|456 789/);
  assert.match(s, /"total":97/); assert.match(s, /"completeBy":"2026-11-20 23:59:59"/); assert.match(s, /"n":1/);
});
test('adres: dane osób w parametrach i ścieżce ukryte, zostają tylko techniczne parametry (przegląd Codex #132)', () => {
  const u = R.url('https://a.vantify.com/api/people/greg@example.com?email=greg@example.com&phone=07123456789&search=Jan%20Kowalski&status=Open&from=2026-11-01&page=2');
  assert.doesNotMatch(u, /greg|07123|Kowalski|Jan/);
  assert.match(u, /status=Open&from=2026-11-01&page=2$/);
});
test('adres: nazwy w ścieżce i parametry we fragmencie ukryte, techniczne segmenty i numery zostają (przegląd Codex #132)', () => {
  assert.strictEqual(R.url('https://a.vantify.com/api/people/Jan-Kowalski'), 'https://a.vantify.com/api/people/…');
  assert.strictEqual(R.url('https://a.vantify.com/api/users/jan-kowalski/jobs'), 'https://a.vantify.com/api/users/…/jobs');
  assert.strictEqual(R.url('https://a.vantify.com/#access_token=abc123'), 'https://a.vantify.com/#…');
  assert.strictEqual(R.url('https://a.vantify.com/api/v2/jobTypes/3000623#/user/jobs/42'), 'https://a.vantify.com/api/v2/jobTypes/3000623#/user/jobs/42');
});
test('odpowiedzi: lista dozwolonych – teksty opisowe i wszystko pod polem osoby bez wartości, nie-JSON bez treści (przegląd Codex #132)', () => {
  const s = JSON.stringify(R.body(JSON.stringify({ contact: { first: 'Jan', last: 'Kowalski' }, description: 'Call Jan on 07123 456789', title: 'Jan', status: 'Open', frequency: 'Quarterly', n: 3 }), false));
  assert.doesNotMatch(s, /Jan|Kowalski|07123/);
  assert.match(s, /"status":"Open"/); assert.match(s, /"frequency":"Quarterly"/); assert.match(s, /"first":"string"/);
  assert.deepStrictEqual(R.body('<p>Jan Kowalski 07123 456789</p>', false), { text: '<p>Jan Kowalski 07123 456789</p>'.length });
});
test('XHR użyty ponownie: każde żądanie zapisane raz, ze swoim adresem (przegląd Codex #132)', () => {
  const vm = require('vm'), logs = [];
  class X { constructor() { this.l = []; this.status = 200; this.responseType = ''; }
    open() {} setRequestHeader() {} getResponseHeader() { return 'application/json'; }
    addEventListener(t, f, o) { this.l.push({ f, once: !!(o && o.once) }); }
    send() { const l = this.l; this.l = l.filter(x => !x.once); l.forEach(x => x.f()); } }
  const w = { XMLHttpRequest: X, location: { href: 'https://savillsuk.cafm.vantify.com/' }, addEventListener() {}, OESTVantifyBridge: { log: j => logs.push(JSON.parse(j)) }, URL, Headers: class {} };
  w.window = w; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'www', 'vantify-rejestr.js'), 'utf8'), Object.assign(w, { JSON, Date, Object, encodeURIComponent, decodeURIComponent }));
  const x = new w.XMLHttpRequest();
  x.open('GET', '/api/jobs'); x.responseText = '{"n":1}'; x.send();
  x.open('GET', '/api/counts'); x.responseText = '{"n":2}'; x.send();
  const xhr = logs.filter(e => e.k === 'xhr').map(e => e.u.replace(/^https:\/\/[^/]+/, ''));
  assert.strictEqual(xhr.join(','), '/api/jobs,/api/counts');
});
test('fetch z obiektem URL: zapisany prawdziwy adres (przegląd Codex #132)', async () => {
  const vm = require('vm'), logs = [];
  const w = { location: { href: 'https://savillsuk.cafm.vantify.com/' }, addEventListener() {}, OESTVantifyBridge: { log: j => logs.push(JSON.parse(j)) }, URL, Headers,
    fetch: async () => ({ status: 200, headers: new Headers({ 'content-type': 'application/json' }), clone() { return { text: async () => '{"n":1}' }; } }) };
  w.window = w; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'www', 'vantify-rejestr.js'), 'utf8'), Object.assign(w, { JSON, Date, Object, String, encodeURIComponent, decodeURIComponent }));
  await w.fetch(new URL('/api/jobs?page=2', w.location.href)); await w.fetch({ url: 'https://savillsuk.cafm.vantify.com/api/req', method: 'POST' });
  await new Promise(r => setTimeout(r, 10));
  assert.strictEqual(logs.filter(e => e.k === 'fetch').map(e => e.u.replace(/^https:\/\/[^/]+/, '')).join(','), '/api/jobs?page=2,/api/req');
});
test('Java: apka nie zapisuje loginu ani hasła Vantify', () => {
  for (const f of ['VantifyActivity.java', 'VantifyPlugin.java']) {
    const s = J('java/com/oest/inspekcje/' + f);
    assert.doesNotMatch(s, /SharedPreferences|getSharedPreferences|setSavePassword|\.value\s*\)|querySelector\(['"]input/, f);
  }
});
test('Java: okno Vantify tylko https, most JS tylko na vantify.com, aktywność niewystawiona', () => {
  const a = J('java/com/oest/inspekcje/VantifyActivity.java');
  assert.match(a, /return !"https"\.equals\(r\.getUrl\(\)\.getScheme\(\)\)/);
  assert.match(a, /h\.endsWith\("\.vantify\.com"\)/);
  assert.match(a, /public void log\(String json\) \{\s*if \(!vantify\(host\)/);
  assert.match(a, /public void file\(String text, String name\) \{\s*if \(!vantify\(host\)/);
  assert.match(a, /setAllowFileAccess\(false\)/);
  // Android 13+: systemowy Wstecz przez OnBackInvokedCallback (targetSdk 36 nie woła onBackPressed), wyjście zapisuje wynik
  assert.match(a, /registerOnBackInvokedCallback/); assert.match(a, /private void back\(\) \{[^}]*finishWithResult\(\)/);
  // edge-to-edge (Android 15+): okno odsuwa się od pasków systemowych i klawiatury
  assert.match(a, /setOnApplyWindowInsetsListener/);
  // zapis „Zbadaj” przetrwa zamknięcie apki w tle: zapis przy przejściu w tło, odzyskanie przy następnym otwarciu
  assert.match(a, /protected void onPause\(\) \{[^\n]*write\("log\.json"/); assert.doesNotMatch(a, /for \(File f : old\) f\.delete\(\)/);
  // eksport przekazywany tylko w całości: zapis atomowy (tmp → rename), export.csv na końcu, przy błędzie zostaje w Vantify bez RESULT_OK
  assert.match(a, /new File\(dir\(this\), name \+ "\.tmp"\)/); assert.match(a, /tmp\.renameTo\(dst\)/);
  assert.match(a, /write\("name\.txt"[^;]*\); write\("export\.csv", csv\);/);
  const fin = a.slice(a.indexOf('private void finishWithResult()')); const res = fin.indexOf('setResult(RESULT_OK');
  assert.ok(/catch \(Exception e\) \{[^}]*export\.csv"\)\.delete\(\)[\s\S]*?return;/.test(fin.slice(0, res)), 'błąd zapisu eksportu: kasuje plik i wraca przed RESULT_OK');
  // wpis o pobieraniu: tylko host i rozszerzenie (bez nazwy pliku i ścieżki)
  assert.match(a, /add\("download", url\.startsWith\("blob:"\) \? "blob" : Uri\.parse\(url\)\.getHost\(\), ext\(name\)\)/);
  const m = J('AndroidManifest.xml'); assert.match(m, /android:name="\.VantifyActivity"\s+android:exported="false"/);
  assert.match(J('java/com/oest/inspekcje/MainActivity.java'), /registerPlugin\(VantifyPlugin\.class\)/);
});

test('Zbadaj: wysyłka pliku (FormData) – nazwy pól i rozmiar, bez treści', () => {
  const fd = new FormData();
  fd.append('file', new Blob(['tajne zdjecie'], { type: 'image/jpeg' }), 'przed.jpg');
  fd.append('description', 'Repair light fixture');
  fd.append('password', 'x');
  const r = R.body(fd, true);
  assert.deepEqual(r, { formData: [{ k: 'file', file: 'image/jpeg', size: 13 }, { k: 'description', v: '(tekst 20)' }, { k: 'password', v: '(ukryte)' }] });
  assert.ok(!JSON.stringify(r).includes('tajne') && !JSON.stringify(r).includes('Repair'));
});
