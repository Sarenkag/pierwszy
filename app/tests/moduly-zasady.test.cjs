// Zasady modułów jako testy blokujące bramkę (Grzegorz 05/11/2026: „zasady modułu = testy automatyczne”).
// Ten plik sprawdza logikę bez przeglądarki; wygląd i dotyk (moduly/przycisk, moduly/checkbox, „Wyślij” w inspekcji) – moduly-zasady-ui-check.cjs.
//
//  WYSYŁKA (moduly/wysylka, PROD-025/026):
//   W1  każda wysyłka najpierw pyta o połączenie (OESTGoogle.ready) – dopiero potem mail;
//   W2  bez połączenia w tle: nic nie wychodzi, nic nie udaje, okno logowania tylko po kliknięciu;
//   W3  błąd Gmaila / brak sieci / anulowane logowanie / brak konta = raport NIE jest „wysłany”;
//   W4  niepewny wynik (mail mógł dojść) i raport przerwany w trakcie nie wychodzą drugi raz same;
//   W5  „Wyślij” nic nie kasuje: raport zostaje w kolejce z PDF, cudze raporty nietknięte, żadnego delete.
//  POŁĄCZENIE GOOGLE (jedno sprawdzanie, app/www/settings-google.js):
//   G1  ready() nigdy nie otwiera okna i nie rzuca; bez internetu nie próbuje nawet cichego tokenu;
//   G2  operacja w tle bez internetu albo bez zgody: zero zapytań do Google.
//  JEDEN MODUŁ NA FUNKCJĘ (kod źródłowy):
//   M1  zdjęcia robi tylko moduly/aparat (każde pole „Zrób zdjęcie” w apce idzie przez OESTAparat.take);
//   M2  tokeny, logowanie i adresy API Google tylko w settings-google.js; maile tylko przez OESTSender.
// Nie mierzy czasu (zasada 08/11/2026): czeka na stan kolejki, nie na zegar.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const REPO = path.resolve(__dirname, '../..');

// ---------- IndexedDB w pamięci (z licznikiem usunięć) ----------
function memIDB(log) {
  const dbs = new Map();
  return {
    open(name) {
      const rq = { result: undefined, onsuccess: null, onerror: null, onupgradeneeded: null };
      setTimeout(() => {
        let fresh = false;
        if (!dbs.has(name)) { dbs.set(name, new Map()); fresh = true; }
        const stores = dbs.get(name);
        rq.result = {
          createObjectStore(n, o) { stores.set(n, { key: (o && o.keyPath) || null, rows: new Map() }); },
          transaction() {
            const t = { oncomplete: null, onerror: null, onabort: null };
            t.objectStore = sn => {
              const st = stores.get(sn), clone = v => v === undefined ? v : structuredClone(v);
              return {
                get: k => ({ result: clone(st.rows.get(k)) }),
                getAll: () => ({ result: [...st.rows.values()].map(clone) }),
                put: (v, k) => { st.rows.set(st.key ? v[st.key] : k, clone(v)); return {}; },
                delete: k => { log.push('delete ' + k); st.rows.delete(k); return {}; },
                clear: () => { log.push('clear ' + sn); st.rows.clear(); return {}; }
              };
            };
            setTimeout(() => t.oncomplete && t.oncomplete(), 0);
            return t;
          }
        };
        if (fresh && rq.onupgradeneeded) rq.onupgradeneeded();
        rq.onsuccess && rq.onsuccess();
      }, 0);
      return rq;
    }
  };
}

// ---------- apka z modułem wysyłki i podstawionym OESTGoogle (zapis kolejności zdarzeń) ----------
function app(o = {}) {
  const log = [], db = [], mails = [], marked = [];
  const data = new Map([['insp.cfg', JSON.stringify({ email: 'work@firma.com', wifiOnly: false })]]);
  if (o.account !== false) data.set('oest.account', JSON.stringify({ id: 'a', email: 'greg@example.com' }));
  const st = { ready: o.ready !== false, online: o.online !== false, sendErr: o.sendErr || null, connectErr: o.connectErr || null };
  const G = {
    ready: async kind => { log.push('ready ' + kind); return st.ready; },
    connected: () => st.ready,
    connect: async kind => { log.push('connect ' + kind); if (st.connectErr) throw Error(st.connectErr); st.ready = true; return true; },
    background: fn => { log.push('tło'); return fn(); },
    foreground: fn => { log.push('kliknięcie'); return fn(); },
    sendMail: async m => { log.push('sendMail'); if (st.sendErr) throw Error(st.sendErr); mails.push(m); return { id: 'm' + mails.length }; }
  };
  const root = {
    localStorage: { getItem: k => data.get(k) ?? null, setItem(k, v) { data.set(k, v); }, removeItem(k) { data.delete(k); } },
    navigator: { get onLine() { return st.online; } },
    document: { addEventListener() {}, readyState: 'loading', getElementById: () => null, body: null } /* bez paska: tylko logika */,
    addEventListener() {}, dispatchEvent() {}, CustomEvent: function () {}, setTimeout, clearTimeout, indexedDB: memIDB(db),
    Capacitor: { isNativePlatform: () => true }, OEST_CONFIG: { googleWebClientId: 'x' }, OESTGoogle: G,
    fetch: async () => ({}) // szybki test internetu (generate_204): sieć jest
  };
  root.window = root;
  root.OEST_PPM = { markSent: (ppm, id) => marked.push(ppm + ' ' + id) };
  globalThis.OEST_PPM = root.OEST_PPM; // wysylka.js woła OEST_PPM.markSent bez „window.” (w przeglądarce to ten sam obiekt)
  new Function('window', 'setInterval', fs.readFileSync(path.join(REPO, 'moduly/wysylka/wysylka.js'), 'utf8'))(root, () => 0);
  // raport zapisany wprost do kolejki (tak jak robi to inspekcja), bez uruchamiania wysyłki
  const putRaw = rec => new Promise(res => { const rq = root.indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const t = rq.result.transaction('queue', 'readwrite'); t.objectStore('queue').put(rec); t.oncomplete = res; }; });
  const all = () => new Promise(res => { const rq = root.indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const t = rq.result.transaction('queue'); const g = t.objectStore('queue').getAll(); t.oncomplete = () => res(g.result); }; });
  return { root, S: root.OESTSender, st, log, db, mails, marked, putRaw, all };
}
// koniec rundy wysyłki = stan, nie zegar
async function settle(a) { for (let i = 0; i < 200; i++) { await new Promise(r => setTimeout(r, 2)); if (!a.S.busy()) { await new Promise(r => setTimeout(r, 2)); if (!a.S.busy()) return; } } throw Error('wysyłka nie skończyła rundy'); }
const raport = (x = {}) => Object.assign({ type: 'ats', code: 'ATS-TB-1', name: 'ATS TB 09112026', subject: 'ATS TB 09112026', body: 'x', ppm: 'EFA-INS-014',
  docx: new Uint8Array(900).fill(1), pdf: new Uint8Array(1100).fill(2) }, x);

// ===================== WYSYŁKA =====================

test('W1: kliknięte Wyślij – najpierw sprawdzenie połączenia (ready gmail), dopiero potem mail', async () => {
  const a = app(); await a.S.init({}); a.log.length = 0;
  await a.S.enqueue(raport()); await settle(a);
  const r = a.log.indexOf('ready gmail'), s = a.log.indexOf('sendMail');
  assert.ok(r >= 0, 'wysyłka nie sprawdziła połączenia: ' + a.log.join(', '));
  assert.ok(s > r, 'mail poszedł przed sprawdzeniem połączenia: ' + a.log.join(', '));
  assert.equal(a.log[0], 'kliknięcie', 'Wyślij z inspekcji to kliknięcie (wolno zapytać o połączenie): ' + a.log.join(', '));
  assert.equal(a.mails.length, 1);
});

test('W1: kliknięte Wyślij bez połączenia – najpierw ready, potem connect (okno Google), dopiero potem mail', async () => {
  const a = app({ ready: false }); await a.S.init({}); a.log.length = 0;
  await a.S.enqueue(raport()); await settle(a);
  assert.deepEqual(a.log.filter(x => x !== 'kliknięcie' && x !== 'tło'), ['ready gmail', 'connect gmail', 'sendMail']);
});

test('W2: wysyłka w tle bez połączenia – nic nie wychodzi, żadnego okna logowania, raport czeka', async () => {
  const a = app({ ready: false }); await a.S.init({});
  await a.putRaw(Object.assign(raport(), { id: 'r1', created: 1, acct: 'greg@example.com', status: 'wait' }));
  a.log.length = 0; await a.S.run(); await settle(a);
  assert.ok(a.log.includes('ready gmail'), 'nie sprawdzono połączenia: ' + a.log.join(', '));
  assert.ok(!a.log.includes('connect gmail'), 'w tle otworzyło okno logowania Google');
  assert.ok(!a.log.includes('sendMail'), 'w tle wysłało bez połączenia');
  const [r] = await a.all();
  assert.equal(r.status, 'wait'); assert.equal(r.sentAt, undefined);
});

test('W3: błąd Gmaila – raport NIE jest wysłany (status błąd z opisem, klocek PPM bez „Wysłana”)', async () => {
  const a = app({ sendErr: 'GOOGLE_HTTP_500: backend' }); await a.S.init({});
  await a.S.enqueue(raport()); await settle(a);
  const [r] = await a.all();
  assert.equal(r.status, 'err'); assert.ok(r.err && r.err.length > 3, 'błąd bez opisu dla użytkownika');
  assert.equal(r.sentAt, undefined); assert.deepEqual(a.marked, [], 'klocek PPM oznaczony jako wysłany mimo błędu');
  assert.ok(r.pdf.length && r.docx.length, 'po błędzie zniknęły pliki raportu');
});

test('W3: brak sieci – nic nie wychodzi i nic nie jest „wysłane”', async () => {
  const a = app({ online: false }); await a.S.init({});
  await a.S.enqueue(raport()); await settle(a);
  assert.equal(a.mails.length, 0); assert.ok(!a.log.includes('sendMail'));
  const [r] = await a.all(); assert.equal(r.status, 'wait'); assert.deepEqual(a.marked, []);
});

test('W3: anulowane logowanie Google – raport czeka, nie jest wysłany', async () => {
  const a = app({ ready: false, connectErr: 'GOOGLE_CANCELLED' }); await a.S.init({});
  await a.S.enqueue(raport()); await settle(a);
  assert.ok(!a.log.includes('sendMail'), 'mail poszedł mimo anulowania');
  const [r] = await a.all(); assert.equal(r.status, 'wait'); assert.equal(r.sentAt, undefined);
});

test('W3: bez konta Google w apce moduł nic nie wysyła i nie sprawdza Gmaila', async () => {
  const a = app({ account: false }); await a.S.init({});
  await a.putRaw(Object.assign(raport(), { id: 'r1', created: 1, acct: '', status: 'wait' }));
  await a.S.run({ login: true }); await settle(a);
  assert.equal(a.S.active(), false);
  assert.deepEqual(a.log.filter(x => /ready|connect|sendMail/.test(x)), []);
});

test('W4: niepewny wynik Gmaila – raport „niepewny”, NIE wychodzi drugi raz sam (bez dubli)', async () => {
  const a = app({ sendErr: 'EMAIL_RESULT_UNCERTAIN' }); await a.S.init({});
  await a.S.enqueue(raport()); await settle(a);
  let [r] = await a.all();
  assert.equal(r.status, 'err', 'niepewny wynik nie może zostać „wysłany” ani wrócić do zwykłego czekania');
  a.st.sendErr = null; const przed = a.log.filter(x => x === 'sendMail').length;
  await a.S.run(); await settle(a); await a.S.run({ login: true }); await settle(a);
  assert.equal(a.log.filter(x => x === 'sendMail').length, przed, 'raport z niepewnym wynikiem wysłany ponownie bez „Ponów”');
  [r] = await a.all(); assert.equal(r.status, 'err');
});

test('W4: raport przerwany w trakcie wysyłania (zamknięta apka) – po starcie „niepewny”, nie wychodzi sam', async () => {
  const a = app();
  await a.putRaw(Object.assign(raport(), { id: 'r1', created: 1, acct: 'greg@example.com', status: 'sending' }));
  await a.S.init({}); await settle(a);
  assert.ok(!a.log.includes('sendMail'), 'przerwany raport wysłany drugi raz bez pytania');
  const [r] = await a.all(); assert.equal(r.status, 'err'); assert.ok(r.err);
});

test('W5: Wyślij nic nie kasuje – raport zostaje w kolejce jako wysłany, PDF zostaje, zero usunięć', async () => {
  const a = app(); await a.S.init({});
  await a.putRaw(Object.assign(raport({ code: 'OBCY', name: 'Obcy 09112026' }), { id: 'cudzy', created: 0, acct: 'ktos@example.com', status: 'wait' }));
  await a.S.enqueue(raport()); await settle(a);
  const rows = await a.all(), moj = rows.find(r => r.code === 'ATS-TB-1'), cudzy = rows.find(r => r.id === 'cudzy');
  assert.equal(rows.length, 2, 'raport zniknął z kolejki po wysłaniu');
  assert.equal(moj.status, 'sent'); assert.ok(moj.sentAt);
  assert.equal(moj.pdf.length, 1100, 'PDF raportu skasowany po wysłaniu');
  assert.equal(moj.name, 'ATS TB 09112026'); assert.equal(moj.subject, 'ATS TB 09112026');
  assert.equal(cudzy.status, 'wait', 'raport innego konta wysłany albo zmieniony'); assert.equal(cudzy.pdf.length, 1100);
  assert.deepEqual(a.db, [], 'moduł wysyłki usunął coś z kolejki: ' + a.db.join(', '));
  assert.equal(a.mails.length, 1, 'wysłany także raport innego konta');
  assert.deepEqual(a.marked, ['EFA-INS-014 ' + moj.id], 'klocek PPM dostaje „Wysłana” dopiero po potwierdzonym mailu');
});

// ===================== POŁĄCZENIE GOOGLE =====================
const { createGoogle } = require('../www/settings-google.js');
function google(o = {}) {
  const calls = { login: 0, silent: 0, fetch: 0, ask: 0 }; let online = o.online !== false;
  const g = createGoogle({ account: () => ({ email: 'me@example.com' }), online: () => online,
    login: async () => { calls.login++; return { email: 'me@example.com', token: 'T' }; },
    silent: async () => { calls.silent++; return o.silent === false ? null : { email: 'me@example.com', token: 'S' }; },
    ask: async () => { calls.ask++; return false; },
    recentTap: () => !!o.tap,
    fetch: async () => { calls.fetch++; return { ok: true, status: 200, json: async () => ({ id: 'x' }) }; } });
  return { g, calls, setOnline: v => { online = v; } };
}

test('G1: ready() – bez internetu false, bez cichego tokenu, bez okna i bez wyjątku', async () => {
  const x = google({ online: false });
  assert.equal(await x.g.ready('gmail'), false);
  assert.deepEqual(x.calls, { login: 0, silent: 0, fetch: 0, ask: 0 });
});

test('G1: ready() – brak zgody: false, nigdy okno logowania; wyjątek cichego tokenu też = false', async () => {
  const x = google({ silent: false });
  assert.equal(await x.g.ready('drive'), false); assert.equal(x.calls.login, 0); assert.equal(x.calls.ask, 0);
  const y = createGoogle({ account: () => ({ email: 'me@example.com' }), silent: async () => { throw Error('plugin'); }, login: async () => { throw Error('okno!'); }, fetch: async () => { throw Error('fetch!'); } });
  assert.equal(await y.ready('gmail'), false);
});

test('G2: wysyłka maila w tle bez internetu – GOOGLE_OFFLINE i zero zapytań do Google (nie udaje)', async () => {
  const x = google({ online: false });
  await assert.rejects(x.g.background(() => x.g.sendMail({ to: 'a@example.com', subject: 's', body: 'b', files: [] })), /GOOGLE_OFFLINE/);
  assert.deepEqual(x.calls, { login: 0, silent: 0, fetch: 0, ask: 0 });
});

test('G2: wysyłka maila w tle bez zgody – GOOGLE_CONNECT, bez okna, zero zapytań do Gmaila', async () => {
  const x = google({ silent: false, tap: true });
  await assert.rejects(x.g.background(() => x.g.sendMail({ to: 'a@example.com', subject: 's', body: 'b', files: [] })), /GOOGLE_CONNECT/);
  assert.equal(x.calls.fetch, 0); assert.equal(x.calls.login, 0); assert.equal(x.calls.ask, 0);
});

// ===================== JEDEN MODUŁ NA FUNKCJĘ (kod) =====================
// pliki apki pisane ręcznie (bez kopii w app/www/inspekcje i app/www/moduly, bez bibliotek)
function zrodla() {
  const out = [];
  const walk = (d, filter) => { for (const f of fs.readdirSync(path.join(REPO, d), { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p, filter); else if (filter(p)) out.push(p); } };
  for (const f of fs.readdirSync(path.join(REPO, 'app/www'))) if (/\.(js|html)$/.test(f) && !/\.min\.js$|^vendor/.test(f) && fs.statSync(path.join(REPO, 'app/www', f)).isFile()) out.push('app/www/' + f);
  walk('moduly', p => /\.js$/.test(p));
  for (const f of fs.readdirSync(path.join(REPO, 'inspekcje'))) if (/\.(js|html)$/.test(f) && !/\.min\.js$/.test(f) && !/^(jszip|docx|pdf|vendor)/i.test(f)) out.push('inspekcje/' + f);
  return out.map(p => ({ p, t: fs.readFileSync(path.join(REPO, p), 'utf8') }));
}
const ZR = zrodla();

test('M1: zdjęcie robi tylko moduly/aparat – wtyczkę aparatu woła wyłącznie aparat.js', () => {
  const zle = ZR.filter(f => f.p !== 'moduly/aparat/aparat.js' && /OESTKeys\s*\.\s*capture\s*\(|\bcam\s*\.\s*capture\s*\(|getUserMedia\s*\(\s*\{[^}]*video/.test(f.t)).map(f => f.p);
  assert.deepEqual(zle, [], 'własny aparat poza moduly/aparat: ' + zle.join(', '));
});

test('M1: każde pole „Zrób zdjęcie” (capture) w apce przechodzi przez OESTAparat.take, gdy apka jest na telefonie', () => {
  const zle = [], znalezione = [];
  for (const f of ZR) {
    const re = /<input[^>]*\bcapture=\\?["'][^"'\\]*\\?["'][^>]*>/g; let m;
    while ((m = re.exec(f.t))) {
      const id = (/\bid=\\?["']([\w-]+)\\?["']/.exec(m[0]) || [])[1];
      if (!id) { zle.push(f.p + ': pole aparatu bez id – nie da się go podpiąć pod moduł'); continue; }
      znalezione.push(f.p + '#' + id);
      // (a) kliknięcie pola przechwycone w tym samym pliku i przekazane do OESTAparat.take, albo
      // (b) pole ukryte, a apka „klika” je tylko w gałęzi bez modułu (OESTAparat.available() = przeglądarka)
      const klik = new RegExp('\\$\\(\\s*["\']' + id + '["\']\\s*\\)\\s*\\.addEventListener\\(\\s*["\']click["\']([\\s\\S]{0,600})');
      const k = klik.exec(f.t), a = !!(k && /OESTAparat\??\.take\(/.test(k[1]));
      const wolania = [...f.t.matchAll(new RegExp('\\$\\(\\s*["\']' + id + '["\']\\s*\\)\\.click\\(\\)', 'g'))];
      const b = !a && /\bhidden\b/.test(m[0]) && wolania.length > 0 && wolania.every(w => { const przed = f.t.slice(Math.max(0, w.index - 400), w.index); return /OESTAparat\.available\(\)/.test(przed) && /OESTAparat\.take\(/.test(przed) && /\}\s*else\s*\{[^{}]*$/.test(przed); });
      if (!a && !b) zle.push(f.p + '#' + id + ': zdjęcie nie idzie przez OESTAparat.take');
    }
  }
  assert.ok(znalezione.length >= 4, 'test nie znalazł pól aparatu (' + znalezione.join(', ') + ')');
  assert.deepEqual(zle, [], zle.join('\n'));
});

test('M1: OCR telefonu tylko przez moduly/odczyt – wtyczkę recognize woła wyłącznie odczyt.js (Klucze, Power trace)', () => {
  const zle = ZR.filter(f => f.p !== 'moduly/odczyt/odczyt.js' && /\.recognize\s*\(/.test(f.t)).map(f => f.p);
  assert.deepEqual(zle, [], 'własny OCR poza moduly/odczyt: ' + zle.join(', '));
  const uzycia = ZR.filter(f => /OESTOdczyt\.tekst\(/.test(f.t)).map(f => f.p).sort();
  assert.deepEqual(uzycia, ['app/www/keys.js', 'app/www/powertrace.js']);
});

test('M2: zgody, tokeny i adresy API usług Google tylko w jednym miejscu (settings-google.js)', () => {
  // logowanie do samej apki (konto: e-mail i profil, ekran startowy index.html) to osobna funkcja – tu tylko dostęp do usług Google
  const wzory = [/OESTGoogleToken/, /googleapis\.com/, /oest\.gsess/, /gmail\/v1/, /gmail\.send|drive\.file|contacts\.readonly/];
  const zle = ZR.filter(f => f.p !== 'app/www/settings-google.js' && wzory.some(w => w.test(f.t))).map(f => f.p + ' (' + wzory.filter(w => w.test(f.t)).map(String).join(' ') + ')');
  assert.deepEqual(zle, [], 'drugie miejsce połączenia z Google: ' + zle.join(', '));
});

test('M2: maile z raportami wysyła tylko moduly/wysylka (OESTGoogle.sendMail w jednym miejscu)', () => {
  const zle = ZR.filter(f => f.p !== 'moduly/wysylka/wysylka.js' && f.p !== 'app/www/settings-google.js' && /\.sendMail\s*\(/.test(f.t)).map(f => f.p);
  assert.deepEqual(zle, [], 'wysyłka maila poza moduly/wysylka: ' + zle.join(', '));
});

test('M2: moduł wysyłki sprawdza połączenie tylko przez OESTGoogle.ready (bez własnego sprawdzania tokenu)', () => {
  const t = fs.readFileSync(path.join(REPO, 'moduly/wysylka/wysylka.js'), 'utf8');
  assert.match(t, /g\.ready\("gmail"\)/, 'wysyłka maili nie pyta OESTGoogle.ready("gmail")');
  assert.match(t, /g\.ready\("drive"\)/, 'wysyłka raportów na Dysk nie pyta OESTGoogle.ready("drive")');
  assert.doesNotMatch(t, /accessToken|Bearer|sessionStorage/, 'wysylka.js sam obsługuje tokeny Google');
});
