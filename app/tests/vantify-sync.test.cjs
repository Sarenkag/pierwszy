// vantify-sync.js (Grzegorz 10/11/2026 „Zacznij od automatycznego updatu”): w ukrytym oknie Vantify przechwytuje nagłówek
// Authorization i adres listy zleceń ze zwykłych wywołań strony, potem czyta wszystkie strony listy (tylko GET).
// Scenariusz z zapisów „Zbadaj”: 97 zleceń One Eastside, 4 strony po 30; wygasłe logowanie → ekran #/login.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '../www/vantify-sync.js'), 'utf8');
const API = 'https://savillsuk-api.cafm.vantify.com';
function job(i) { return { id: 3051000 + i, type: i % 10 ? 'planned' : 'reactive', summary: 'Task ' + i, status: 'acknowledged', attendanceDueAt: '2026-12-18T18:00:00+00:00', completionDueAt: '2026-12-18T23:59:59+00:00', frequency: '1M', serviceProviderName: 'Jan Kowalski', description: 'Call Jan 07123' }; }
function world({ total = 97, per = 30, hash = '#/user/jobs', status = 200, wait = 3000, login = null, dom = null, loginStatus = 401, hang = false } = {}) {
  const calls = [], results = [], timers = [];
  const all = Array.from({ length: total }, (_, i) => job(i));
  class XHR {
    open(m, u) { this.m = m; this.u = u; this.h = {}; }
    setRequestHeader(k, v) { this.h[k] = v; }
    addEventListener(n, f) { if (n === 'loadend') this.le = f; }
    send() {
      calls.push({ m: this.m, u: this.u, h: { ...this.h } });
      if (this.m === 'POST') { if (hang) return; this.status = loginStatus; this.responseText = '{}'; timers.push(() => { this.onload && this.onload(); this.le && this.le(); }); return; }
      const p = Number((/[?&]page=(\d+)/.exec(this.u) || [0, 1])[1]);
      const ok = this.h.Authorization === 'Bearer T';
      this.status = ok ? status : 401;
      this.responseText = JSON.stringify({ page: p, limit: String(per), pages: Math.ceil(total / per), count: total, jobs: all.slice((p - 1) * per, p * per) });
      timers.push(() => this.onload && this.onload());
    }
  }
  const w = { XMLHttpRequest: XHR, location: { hash }, __oestSyncWait: wait, __oestLoginWait: 3000, OESTVantifySync: { result: j => results.push(JSON.parse(j)) } };
  if (login) w.__oestLogin = login;
  if (dom) Object.assign(w, dom);
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
// Zapamiętany login i hasło (Grzegorz 10/11/2026): formularz logowania Vantify wypełniony i wysłany RAZ
function loginForm(onSubmit) {
  const ev = [], user = { getAttribute: () => 'email', dispatchEvent: e => ev.push('u:' + e.type) }, pw = { getAttribute: () => 'password', dispatchEvent: e => ev.push('p:' + e.type) };
  let clicks = 0;
  const form = { querySelectorAll: () => [user, pw], querySelector: () => ({ click: () => { clicks++; onSubmit && setImmediate(() => onSubmit(user, pw)); } }) };
  pw.form = form;
  let shown = true;
  const document = { querySelector: q => (q === 'input[type=password]' && shown ? pw : null) };
  return { dom: { document, HTMLInputElement: { prototype: {} }, Event: function (t) { this.type = t; } }, user, pw, ev, clicks: () => clicks, hide: () => { shown = false; } };
}
test('wygasłe logowanie + zapisany login: wpisuje login i hasło, loguje się raz, potem pobiera listę', async () => {
  let s;
  const f = loginForm((u, p) => { s.w.location.hash = '#/user/dashboard'; f.hide(); s.spa(API + '/users/14255/jobs?limit=30&page=1&site=6324'); });
  s = world({ hash: '#/login', login: { u: 'greg@example.com', p: 'Tajne"1' }, dom: f.dom });
  await s.run();
  assert.strictEqual(f.user.value, 'greg@example.com'); assert.strictEqual(f.pw.value, 'Tajne"1');
  assert.ok(f.ev.includes('u:input') && f.ev.includes('p:input'), 'strona widzi wpisanie (zdarzenia input)');
  assert.strictEqual(f.clicks(), 1, 'jedno logowanie');
  assert.strictEqual(s.results.length, 1); assert.strictEqual(s.results[0].status, 'ok'); assert.strictEqual(s.results[0].count, 97);
  assert.doesNotMatch(JSON.stringify(s.results), /Tajne|greg@/, 'hasło i login nie wracają do apki');
});
function postLogin(sref) { return () => { const x = new sref.s.w.XMLHttpRequest(); x.open('POST', API + '/auth'); x.send('{}'); }; }
test('zapisane hasło odrzucone (Vantify: 401) → login/bad po jednej próbie, bez drugiego logowania', async () => {
  const ref = {}; const f = loginForm(postLogin(ref)); const s = ref.s = world({ hash: '#/login', login: { u: 'a', p: 'zle' }, dom: f.dom });
  await s.run();
  assert.strictEqual(f.clicks(), 1); assert.deepStrictEqual(s.results, [{ status: 'login', code: 'bad' }]);
  assert.ok(s.calls.some(c => c.m === 'POST'), 'odpowiedź logowania z Vantify');
  const g = world({ hash: '#/login', dom: loginForm().dom }); await g.run();
  assert.deepStrictEqual(g.results, [{ status: 'login' }], 'bez zapisanego loginu: jak dotąd');
});
test('brak odpowiedzi na logowanie (sieć) → błąd login-timeout, NIE „złe hasło” (bez blokady zapisanego hasła)', async () => {
  const ref = {}; const f = loginForm(postLogin(ref)); const s = ref.s = world({ hash: '#/login', login: { u: 'a', p: 'dobre' }, dom: f.dom, hang: true });
  await s.run();
  assert.strictEqual(f.clicks(), 1); assert.deepStrictEqual(s.results, [{ status: 'error', code: 'login-timeout' }]);
});
test('hasło już odrzucone wcześniej (VantifyLogin bad): bez wpisywania, od razu login/bad', async () => {
  const f = loginForm(); const s = world({ hash: '#/login', dom: { ...f.dom, __oestLoginBad: 1 } }); await s.run();
  assert.strictEqual(f.clicks(), 0); assert.deepStrictEqual(s.results, [{ status: 'login', code: 'bad' }]);
});
test('przeładowanie strony po wysłaniu formularza nie daje drugiej próby logowania', async () => {
  const store = {}, ss = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } };
  const ref = {}; const f1 = loginForm(postLogin(ref)); const a = ref.s = world({ hash: '#/login', login: { u: 'a', p: 'b' }, dom: { ...f1.dom, sessionStorage: ss } }); await a.run(4);
  assert.strictEqual(f1.clicks(), 1);
  const f2 = loginForm(); const b = world({ hash: '#/login', login: { u: 'a', p: 'b' }, dom: { ...f2.dom, sessionStorage: ss } }); await b.run();
  assert.strictEqual(f2.clicks(), 0, 'nowa strona w tym samym oknie nie loguje drugi raz'); assert.deepStrictEqual(b.results, [{ status: 'login', code: 'bad' }]);
});

// „Zbadaj automatycznie” (Grzegorz 10/11/2026): bot czyta zamiast klikać – tylko GET, po linkach _links, limit, bez danych osób
const REJ = fs.readFileSync(path.join(__dirname, '../www/vantify-rejestr.js'), 'utf8');
function explorer({ max = 300 } = {}) {
  const calls = [], results = [], timers = [];
  const site = { id: 6324, name: 'One Eastside', _links: { self: { href: API + '/sites/6324' }, jobs: { href: API + '/sites/6324/jobs{?page}', templated: true }, meters: { href: API + '/sites/6324/meters' }, export_jobs: { href: API + '/sites/6324/jobs/export' }, approve: { href: API + '/sites/6324/quotes/1/approve' }, foreign: { href: 'https://evil.example.com/x' } } };
  const jobs = n => ({ count: 3, jobs: [1, 2, 3].map(i => ({ id: 3051000 + i, summary: 'Task ' + i, contactName: 'Jan Kowalski', _links: { self: { href: API + '/sites/6324/jobs/' + (3051000 + i) } } })) });
  function respond(u) {
    const p = u.replace(API, '').split('?')[0];
    if (p === '/sites/6324') return site;
    if (/^\/sites\/6324\/jobs$/.test(p) || /\/users\/14255\/jobs$/.test(p)) return jobs();
    if (/^\/sites\/6324\/jobs\/\d+$/.test(p)) return { id: 1, status: 'acknowledged', reporterEmail: 'a@b.c', _links: { files: { href: API + p + '/files' } } };
    if (/\/files$/.test(p)) return { files: [] };
    if (p === '/users/14255') return { id: 14255, firstName: 'Greg', _links: { sites: { href: API + '/users/14255/sites' } } };
    return { ok: true };
  }
  class XHR {
    open(m, u) { this.m = m; this.u = u; this.h = {}; }
    setRequestHeader(k, v) { this.h[k] = v; }
    addEventListener() {}
    getResponseHeader() { return 'application/json'; }
    send() {
      calls.push({ m: this.m, u: this.u, h: { ...this.h } });
      if (/main\.js$/.test(this.u)) { this.status = 200; this.responseText = 'a.post(this.api+"/sites/"+s+"/jobs/"+j+"/complete",b);c.post(u+"/files",fd);x="/sites/{site}/jobs/{job}/paperwork"'; }
      else { this.status = this.h.Authorization === 'Bearer T' ? 200 : 401; this.responseText = JSON.stringify(respond(this.u)); }
      timers.push(() => this.onload && this.onload());
    }
  }
  const w = { XMLHttpRequest: XHR, location: { hash: '#/user/jobs', href: 'https://savillsuk.cafm.vantify.com/#/user/jobs', origin: 'https://savillsuk.cafm.vantify.com' }, __oestMode: 'explore', __oestExploreMax: max, __oestSyncWait: 3000,
    addEventListener() {}, document: { scripts: [{ src: 'https://savillsuk.cafm.vantify.com/main.js' }, { src: 'https://www.googletagmanager.com/gtag.js' }] },
    OESTVantifySync: { result: j => results.push(JSON.parse(j)) } };
  let now = 0;
  const ctx = vm.createContext({ window: w, Date: { now: () => now }, setTimeout: (f) => timers.push(f), Promise, JSON, Array, Number, String, Error, isNaN, URL, Object, encodeURIComponent, decodeURIComponent });
  vm.runInContext(REJ, ctx); vm.runInContext(SRC, ctx);
  function spa(u) { const x = new w.XMLHttpRequest(); x.open('GET', u); x.setRequestHeader('Authorization', 'Bearer T'); x.send(); }
  async function run(n = 3000) { for (let i = 0; i < n && timers.length; i++) { const f = timers.shift(); now += 300; f(); await new Promise(r => setImmediate(r)); } }
  return { calls, results, spa, run };
}
test('Zbadaj automatycznie: tylko GET po linkach API Vantify, pomija export/approve i obce strony, kod strony, bez danych osób', async () => {
  const s = explorer();
  s.spa(API + '/users/14255/jobs?limit=30&page=1&site=6324&status%5B%5D=7');
  await s.run();
  assert.strictEqual(s.results.length, 1); const r = s.results[0];
  assert.strictEqual(r.status, 'ok');
  const own = s.calls.slice(1);
  assert.ok(own.every(c => c.m === 'GET'), 'tylko odczyt');
  assert.ok(own.every(c => c.u.startsWith(API) || c.u === 'https://savillsuk.cafm.vantify.com/main.js'), 'tylko Vantify (bez Google i obcych)');
  assert.ok(!own.some(c => /export|approve/.test(c.u)), 'bez adresów, które mogą coś zmienić');
  assert.ok(own.some(c => c.u === API + '/sites/6324/meters'), 'idzie po linkach (_links)');
  assert.ok(own.filter(c => /\/sites\/6324\/jobs\/\d+$/.test(c.u)).length <= 3, 'każdy wzór adresu najwyżej 3 razy');
  assert.ok(own.some(c => c.u === API + '/sites/6324/quotes'), 'wyceny (quotes)');
  const txt = JSON.stringify(r.log);
  assert.doesNotMatch(txt, /Kowalski|a@b\.c|Greg|Bearer/, 'bez danych osób i tokenu');
  assert.ok(r.log.some(e => e.k === 'code' && e.m === 'POST' && /complete/.test(e.u)), 'z kodu strony: jak zamyka zlecenie');
  assert.ok(r.log.some(e => e.k === 'code' && e.m === 'PATH' && /paperwork/.test(e.u)));
  assert.ok(r.log.some(e => e.k === 'auto' && /\/sites\/6324\/jobs\/3051001/.test(e.u) && e.res && e.res.status === 'acknowledged'));
});
test('Zbadaj automatycznie: limit zapytań', async () => {
  const s = explorer({ max: 3 }); s.spa(API + '/users/14255/jobs?page=1&site=6324'); await s.run();
  assert.strictEqual(s.results[0].count, 3); assert.strictEqual(s.results[0].log.filter(e => e.k === 'auto').length, 3);
});
// Java: ukryte okno (VantifyPlugin.sync) wstrzykuje skrypt tylko na stronach Vantify, przyjmuje wynik tylko od nich, ma limit czasu i sprząta
test('VantifyPlugin.sync: tylko *.vantify.com, tylko https, limit czasu, okno usuwane po wyniku', async () => {
  const j = fs.readFileSync(path.join(__dirname, '../android/app/src/main/java/com/oest/inspekcje/VantifyPlugin.java'), 'utf8');
  assert.match(j, /@PluginMethod public void sync\(PluginCall call\)/);
  assert.match(j, /asset\("public\/vantify-sync\.js"\)/);
  assert.match(j, /explore \? "window\.__oestMode='explore';" \+ asset\("public\/vantify-rejestr\.js"\)/, 'Zbadaj automatycznie: ten sam zapis bez danych osób');
  assert.match(j, /private void inject\(\) \{ if \(web != null && VantifyActivity\.vantify\(host\)\)/);
  assert.match(j, /public void result\(String json\) \{ if \(VantifyActivity\.vantify\(host\)/);
  assert.match(j, /shouldOverrideUrlLoading[^\n]*"https"\.equals/);
  assert.match(j, /postDelayed\(\(\) -> finish\("\{\\"status\\":\\"timeout\\"\}"\), explore \? TIMEOUT_EXPLORE : TIMEOUT\)/);
  assert.match(j, /removeView\(web\); web\.destroy\(\)/);
  // login i hasło tylko w ukrytym oknie i tylko dla strony Vantify; odrzucone hasło blokuje kolejne próby
  assert.match(j, /VantifyLogin\.script\(a\) \+ script/);
  assert.match(j, /"bad"\.equals\(r\.optString\("code"\)\)\) VantifyLogin\.markBad\(a\)/);
  const k = fs.readFileSync(path.join(__dirname, '../android/app/src/main/java/com/oest/inspekcje/VantifyLogin.java'), 'utf8');
  assert.match(k, /"AndroidKeyStore"/); assert.match(k, /AES\/GCM\/NoPadding/);
  assert.match(k, /if \(bad\(c\)\) return "window\.__oestLoginBad=1;";/, 'po odrzuceniu nie loguje się ponownie, bez hasła');
  assert.match(j, /Sync\.current != null && Sync\.current\.join\(call, ex\)/, 'jedno ukryte okno naraz (równoległe wywołania czekają na ten sam wynik)');
  assert.match(j, /for \(PluginCall c : calls\) c\.resolve\(r\)/);
  assert.match(k, /JSONObject\.quote\(l\[1\]\)/, 'hasło jako bezpieczny literał JS');
  assert.doesNotMatch(j + k, /Log\.(d|i|w|e|v)\(/, 'bez wypisywania do logów');
});
