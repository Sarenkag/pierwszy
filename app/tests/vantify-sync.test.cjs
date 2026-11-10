// vantify-sync.js (Grzegorz 10/11/2026 „Zacznij od automatycznego updatu”): w ukrytym oknie Vantify przechwytuje nagłówek
// Authorization i adres listy zleceń ze zwykłych wywołań strony, potem czyta wszystkie strony listy (tylko GET).
// Scenariusz z zapisów „Zbadaj”: 97 zleceń One Eastside, 4 strony po 30; wygasłe logowanie → ekran #/login.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '../www/vantify-sync.js'), 'utf8');
const API = 'https://savillsuk-api.cafm.vantify.com';
function job(i) { return { id: 3051000 + i, type: i % 10 ? 'planned' : 'reactive', summary: 'Task ' + i, status: 'acknowledged', attendanceDueAt: '2026-12-18T18:00:00+00:00', completionDueAt: '2026-12-18T23:59:59+00:00', frequency: '1M', serviceProviderName: 'Jan Kowalski', description: 'Call Jan 07123' }; }
function world({ total = 97, per = 30, hash = '#/user/jobs', status = 200, wait = 3000 } = {}) {
  const calls = [], results = [], timers = [];
  const all = Array.from({ length: total }, (_, i) => job(i));
  class XHR {
    open(m, u) { this.m = m; this.u = u; this.h = {}; }
    setRequestHeader(k, v) { this.h[k] = v; }
    send() {
      calls.push({ m: this.m, u: this.u, h: { ...this.h } });
      const p = Number((/[?&]page=(\d+)/.exec(this.u) || [0, 1])[1]);
      const ok = this.h.Authorization === 'Bearer T';
      this.status = ok ? status : 401;
      this.responseText = JSON.stringify({ page: p, limit: String(per), pages: Math.ceil(total / per), count: total, jobs: all.slice((p - 1) * per, p * per) });
      timers.push(() => this.onload && this.onload());
    }
  }
  const w = { XMLHttpRequest: XHR, location: { hash }, __oestSyncWait: wait, OESTVantifySync: { result: j => results.push(JSON.parse(j)) } };
  let now = 0;
  const ctx = vm.createContext({ window: w, Date: { now: () => now }, setTimeout: (f, ms) => timers.push(f), Promise, JSON, Array, Number, String, Error, isNaN });
  vm.runInContext(SRC, ctx);
  // strona Vantify robi swoje wywołania już po wstrzyknięciu skryptu
  function spa(u) { const x = new w.XMLHttpRequest(); x.open('GET', u); x.setRequestHeader('Authorization', 'Bearer T'); x.send(); }
  async function run(n = 200, step = 300) { for (let i = 0; i < n && timers.length; i++) { const f = timers.shift(); now += step; f(); await new Promise(r => setImmediate(r)); } }
  return { w, calls, results, spa, run };
}
test('zalogowany: przechwyca token i adres listy, pobiera wszystkie 4 strony, oddaje 97 zleceń bez danych osób', async () => {
  const s = world();
  s.spa(API + '/users/14255/alerts');
  s.spa(API + '/users/14255/jobs?limit=30&order=x&page=1&site=6324&status%5B%5D=7');
  await s.run();
  assert.strictEqual(s.results.length, 1);
  const r = s.results[0];
  assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.count, 97); assert.strictEqual(r.jobs.length, 97);
  const own = s.calls.slice(2);
  assert.deepStrictEqual(own.map(c => (/page=(\d+)/.exec(c.u) || [])[1]), ['1', '2', '3', '4']);
  assert.ok(own.every(c => c.m === 'GET' && c.h.Authorization === 'Bearer T' && /site=6324/.test(c.u)), 'tylko GET, ten sam filtr i token co strona');
  assert.deepStrictEqual(Object.keys(r.jobs[1]).sort(), ['attendanceDueAt', 'completionDueAt', 'frequency', 'id', 'status', 'summary', 'type']);
  assert.doesNotMatch(JSON.stringify(r), /Kowalski|07123|Bearer/);
});
test('wygasłe logowanie: strona przechodzi na #/login → status login (bez prób pobierania)', async () => {
  const s = world({ hash: '#/login' });
  await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'login' }]); assert.strictEqual(s.calls.length, 0);
});
test('brak tokenu w czasie oczekiwania → login; token bez listy → przejście na Jobs, potem błąd nolist', async () => {
  const a = world({ hash: '#/user/dashboard' }); await a.run();
  assert.deepStrictEqual(a.results, [{ status: 'login' }]);
  const b = world({ hash: '#/user/dashboard' }); b.spa(API + '/users/14255/alerts'); await b.run(1);
  assert.strictEqual(b.w.location.hash, '#/user/jobs', 'otwiera listę Jobs, żeby strona sama zapytała o zlecenia'); await b.run();
  assert.deepStrictEqual(b.results, [{ status: 'error', code: 'nolist' }]);
});
test('odmowa w trakcie (401) → login; niepełna lista → błąd (lepiej nic niż „zamknięte” zlecenia)', async () => {
  const a = world({ status: 401 }); a.spa(API + '/users/1/jobs?page=1&site=6324'); await a.run();
  assert.deepStrictEqual(a.results, [{ status: 'login' }]);
  const b = world({ total: 97 }); b.w.XMLHttpRequest.prototype.send = function () { this.status = 200; this.responseText = JSON.stringify({ pages: 1, count: 97, jobs: [job(1)] }); const x = this; setImmediate(() => x.onload && x.onload()); };
  b.spa(API + '/users/1/jobs?page=1&site=6324'); await b.run();
  assert.deepStrictEqual(b.results, [{ status: 'error', code: 'partial' }]);
});
test('obce adresy (np. Google Analytics) nie dają tokenu ani listy', async () => {
  const s = world({ wait: 1500 });
  const x = new s.w.XMLHttpRequest(); x.open('GET', 'https://evil.example.com/users/1/jobs?page=1'); x.setRequestHeader('Authorization', 'Bearer X'); x.send();
  await s.run();
  assert.deepStrictEqual(s.results, [{ status: 'login' }]);
});
// Java: ukryte okno (VantifyPlugin.sync) wstrzykuje skrypt tylko na stronach Vantify, przyjmuje wynik tylko od nich, ma limit czasu i sprząta
test('VantifyPlugin.sync: tylko *.vantify.com, tylko https, limit czasu, okno usuwane po wyniku', async () => {
  const j = fs.readFileSync(path.join(__dirname, '../android/app/src/main/java/com/oest/inspekcje/VantifyPlugin.java'), 'utf8');
  assert.match(j, /@PluginMethod public void sync\(PluginCall call\)/);
  assert.match(j, /open\("public\/vantify-sync\.js"\)/);
  assert.match(j, /private void inject\(\) \{ if \(web != null && VantifyActivity\.vantify\(host\)\)/);
  assert.match(j, /public void result\(String json\) \{ if \(VantifyActivity\.vantify\(host\)/);
  assert.match(j, /shouldOverrideUrlLoading[^\n]*"https"\.equals/);
  assert.match(j, /postDelayed\(\(\) -> finish\("\{\\"status\\":\\"timeout\\"\}"\), TIMEOUT\)/);
  assert.match(j, /removeView\(web\); web\.destroy\(\)/);
  assert.doesNotMatch(j, /password|haslo|hasło/i);
});
