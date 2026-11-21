// Plan audytu 19/11/2026, punkt 1.3 (ustalenie nr 108): tabelaryczny test klawisza Wstecz telefonu.
// Tabela = moduly/ekrany/ekrany.json (jedna mapa ekranów apki, ZASADY.md R1). Dla KAŻDEGO ekranu z mapy:
//   1. ekran otwiera się pod swoim adresem (ekrany z „:id” dostają prawdziwy rekord: klucz, tablicę, zmianę, zlecenie, szkic, węzeł drzewa),
//   2. okienko apki (pytanie OESTPrzycisk) i każdy <dialog> na tym ekranie: Wstecz zamyka okienko, ekran zostaje,
//   3. Wstecz na ekranie: idzie do rodzica z mapy (ten sam numer w „:id”), a na ekranie bez rodzica pyta „Chcesz wyjść z aplikacji?”,
//      Wstecz w tym pytaniu = Nie (pytanie znika, apka zostaje).
// Wstecz = zdarzenie „backButton” wtyczki App (Capacitor), dokładnie to, co wysyła telefon – nie wywołanie funkcji modułu.
// Rozbieżności, które już są w apce, są na liście quality/baselines/wstecz-tabela.json (lista może tylko maleć):
// nowa rozbieżność = FAIL, rozbieżność z listy, której już nie ma = FAIL (usuń wpis). Ekran, którego nie da się otworzyć = FAIL.
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro (gest Wstecz).
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www'), REPO = path.resolve(__dirname, '../..');
const MAPA = JSON.parse(fs.readFileSync(path.join(REPO, 'moduly/ekrany/ekrany.json'), 'utf8')).ekrany;
const BASELINE = path.join(REPO, 'quality/baselines/wstecz-tabela.json');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const KONTO = { provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' };

// prawdziwe rekordy dla ekranów z „:id” – zapisane przez moduły apki (te same magazyny, z których czytają ekrany)
async function zasiej(pg) {
  return pg.evaluate(async () => {
    const owner = () => window.OESTSettings.get().owner, ids = {};
    const blob = await new Promise(r => { const c = document.createElement('canvas'); c.width = 40; c.height = 30; c.getContext('2d').fillRect(0, 0, 40, 30); c.toBlob(r, 'image/jpeg', 0.8); });
    const preview = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).map(b => b.toString(16).padStart(2, '0')).join('');
    await window.OESTKeysStore.createRepository({ owner }).save({ id: 'k1', label: 'Test key', number: '1', kind: 'other', photos: [{ id: 'p1', hash, blob, preview, width: 40, height: 30 }], doors: [{ id: 'd1', name: 'Door 1', building: 'Tower A', floor: '1', photos: [{ id: 'p2', hash, blob, preview, width: 40, height: 30 }] }] });
    ids.key = 'k1';
    await window.OESTPowerStore.createRepository({ owner }).saveBoard({ id: 'b1', code: 'DB1', floor: '1', location: 'Plant room', building: 'Tower A', boxPhotos: [{ id: 'p3', hash, blob, preview, width: 40, height: 30 }], cardPhotos: [{ id: 'p4', hash: hash.replace(/^./, c => c === 'a' ? 'b' : 'a'), blob, preview, width: 40, height: 30 }] }, []);
    ids.board = 'b1';
    const R = window.OESTReactiveUI.repository, d = new Date(), day = x => new Date(d.getTime() + x * 864e5 - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    // zmiana archiwalna (dla handover/archive) i bieżąca (handover/shift, handover/draft, zlecenia Reactive)
    await R.startShift(day(-10), day(-8));
    const stara = (await R.get()).shifts[0];
    await R.archive(stara.id, 'Back test handover', ['demo@example.com']);
    await R.startShift(day(0), day(3));
    await R.saveReactive({ title: 'Door handle detached', building: 'Tower B', level: '5', room: 'Kitchen', note: 'Back test', status: 'open', requestedBy: 'General requests', beforeMediaIds: [], afterMediaIds: [] });
    const s = await R.get();
    ids.shift = (s.shifts.find(x => !x.archived) || {}).id; ids.archive = s.archives[0] && s.archives[0].id; ids.job = s.jobs[0] && s.jobs[0].id; 
    const T = window.OESTReactiveTree.tree, roots = Array.isArray(T) ? T : (T && T.children) || [];
    const top = roots.find(n => n && n.children && n.children.length), leaf = roots.find(n => n && !(n.children && n.children.length));
    ids.node = top && top.id; ids.leaf = leaf ? leaf.id : top && top.children.find(c => !(c.children && c.children.length)).id;
    return ids;
  });
}
// Mapa zapisuje handover/draft i handover/archive bez części zmiennej, a apka wymaga numeru zmiany / archiwum
// (handover.js: draft(part[2]), archive(part[2])) – test dokleja go, a niespójność mapy jest na liście (mapa-bez-id:…).
const DOKLEJ = { 'handover/draft': 'shift', 'handover/archive': 'archive' };
const ID = { 'keys/detail/:id': 'key', 'keys/edit/:id': 'key', 'powertrace/view/:id': 'board', 'powertrace/edit/:id': 'board', 'handover/shift/:id': 'shift',
  'reactive/new/:id': 'leaf', 'reactive/draft/:id': 'draft', 'reactive/job/:id': 'job', 'reactive/complete/:id': 'job', 'reactive/tree/:id': 'node' };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port, fails = [], roz = [], tabela = [];
  let browser, sprawdzen = 0;
  const check = (ok, msg) => { sprawdzen++; if (!ok) fails.push(msg); return ok; };
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    // rekordy raz, w jednym profilu przeglądarki (IndexedDB zostaje między stronami tego kontekstu)
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(k => {
      if (!sessionStorage.getItem('bez.konta')) localStorage.setItem('oest.account', k); else localStorage.removeItem('oest.account');
      // telefon: wtyczka App przyjmuje słuchacza „backButton”; test wysyła to zdarzenie jak Android
      window.__wstecz = []; window.__wyjscie = 0;
      window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { addListener: (n, cb) => { if (n === 'backButton') window.__wstecz.push(cb); return Promise.resolve({ remove() {} }); }, exitApp: () => { window.__wyjscie++; } } } };
    }, JSON.stringify(KONTO));
    const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.goto(B + '/index.html#home'); await pg.waitForLoadState('networkidle');
    const ids = await zasiej(pg);
    // szkic Reactive: tworzy go sama apka po wejściu w nowe zgłoszenie (węzeł drzewa) – adres zmienia się na reactive/draft/<id>
    await pg.goto(B + '/index.html#reactive/new/' + ids.leaf); await pg.waitForLoadState('networkidle');
    await pg.waitForFunction(() => /^#reactive\/draft\/[-\w]+$/.test(location.hash), null, { timeout: 5000 }).catch(() => {});
    ids.draft = (await pg.evaluate(() => (location.hash.match(/^#reactive\/draft\/([-\w]+)$/) || [])[1])) || null;
    for (const k of new Set([...Object.values(ID), ...Object.values(DOKLEJ)])) check(!!ids[k], 'nie udało się utworzyć rekordu „' + k + '” dla ekranów z :id');
    const stan = () => pg.evaluate(() => ({ hash: location.hash.slice(1), widok: [...document.querySelectorAll('.view')].filter(s => !s.hidden).map(s => s.id).join(','), pytanie: !!document.querySelector('.oest-ask'), sluchaczy: window.__wstecz.length, wyjscie: window.__wyjscie }));
    // po Wstecz: czekamy na stan (okienko pytania zniknęło z DOM albo ma zostać), nie na czas
    const wstecz = async (okienkoZnika = true) => { await pg.evaluate(() => window.__wstecz.forEach(cb => cb())); if (okienkoZnika) await pg.locator('.oest-ask').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {}); await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(150); };
    const pudelko = id => (MAPA.find(e => e.id === id) || {}).pudelko;
    for (const e of MAPA) {
      const id = e.id, adres = ID[id] ? id.replace(':id', ids[ID[id]]) : DOKLEJ[id] ? id + '/' + ids[DOKLEJ[id]] : id, rodzic = e.rodzic && (ID[e.rodzic] ? e.rodzic.replace(':id', ids[ID[e.rodzic]]) : e.rodzic);
      await pg.evaluate(bez => bez ? sessionStorage.setItem('bez.konta', '1') : sessionStorage.removeItem('bez.konta'), id === 'start');
      await pg.goto(B + '/index.html#' + adres); await pg.waitForLoadState('networkidle'); await pg.waitForTimeout(150);
      const s0 = await stan();
      if (!check(s0.sluchaczy === 1, id + ': strona zarejestrowała ' + s0.sluchaczy + ' słuchaczy „backButton” (ma być dokładnie 1)')) continue;
      // ekran jest otwarty, gdy adres i sekcja się zgadzają, a ekran z rodzicem ma widoczną strzałkę ‹ w górnym pasku
      // (panel błędu modułu, np. „Ta zmiana jest już zarchiwizowana”, nie ma strzałki – to nie jest ten ekran)
      const strzalka = await pg.evaluate(p => { const b = document.querySelector('#' + p + ' .top .back'); return !!b && b.offsetParent !== null; }, e.pudelko);
      const otwarty = s0.hash === adres && s0.widok === e.pudelko && (!e.rodzic || strzalka);
      const wiersz = { id, adres, rodzic: rodzic || null, otwarty, przed: s0.hash + ' ' + s0.widok };
      tabela.push(wiersz);
      if (DOKLEJ[id]) roz.push({ id: 'mapa-bez-id:' + id, opis: id + ': mapa ekrany.json nie ma części zmiennej, apka otwiera ten ekran tylko jako ' + id + '/<id>' });
      if (!otwarty) { roz.push({ id: 'nie-otwiera:' + id, opis: id + ': pod adresem #' + adres + ' widać #' + s0.hash + ' ' + s0.widok + (strzalka ? '' : ' bez strzałki ‹') + ' zamiast ekranu w ' + e.pudelko }); continue; }
      // 2a. okienko apki (pytanie): Wstecz zamyka, ekran zostaje
      await pg.evaluate(() => { window.OESTPrzycisk.confirm('Test okienka', { ok: 'OK', cancel: 'Anuluj' }); });
      await pg.locator('.oest-ask').waitFor({ timeout: 3000 }).catch(() => {});
      check(await pg.locator('.oest-ask').count() > 0, id + ': okienko pytania nie otworzyło się');
      await wstecz();
      const s1 = await stan();
      if (!(s1.pytanie === false && s1.hash === adres && s1.widok === e.pudelko)) roz.push({ id: 'okienko:' + id, opis: id + ': Wstecz przy otwartym okienku → okienko ' + (s1.pytanie ? 'zostało' : 'zamknięte') + ', ekran #' + s1.hash + ' ' + s1.widok });
      else check(true, '');
      // 2b. każdy <dialog> obecny na ekranie: Wstecz zamyka najwyższy, ekran zostaje
      const dialogi = await pg.evaluate(() => [...document.querySelectorAll('dialog[id]')].map(d => d.id));
      for (const d of dialogi) {
        await pg.evaluate(d => document.getElementById(d).showModal(), d);
        await wstecz();
        const s2 = await stan(), zamk = await pg.evaluate(d => !document.getElementById(d).open, d);
        if (!(zamk && s2.hash === adres && s2.widok === e.pudelko)) roz.push({ id: 'dialog:' + id + ':' + d, opis: id + ': Wstecz przy <dialog id=' + d + '> → ' + (zamk ? 'zamknięty' : 'otwarty') + ', ekran #' + s2.hash });
        else check(true, '');
      }
      // 3. Wstecz na ekranie (na ekranie bez rodzica ma się pojawić pytanie – nie czekamy na jego zniknięcie)
      await wstecz(!!e.rodzic);
      if (!e.rodzic) await pg.locator('.oest-ask').waitFor({ timeout: 3000 }).catch(() => {});
      const s3 = await stan();
      if (!e.rodzic) {
        const ok = s3.pytanie && s3.hash === adres && s3.wyjscie === 0;
        wiersz.po = s3.pytanie ? 'pytanie o wyjście' : '#' + s3.hash;
        if (!ok) roz.push({ id: 'wstecz:' + id, opis: id + ': Wstecz na ekranie bez rodzica → ' + wiersz.po + ' (ma być pytanie „Chcesz wyjść z aplikacji?”)' });
        else {
          check(true, '');
          await wstecz(); const s4 = await stan(); // Wstecz w pytaniu = Nie
          check(!s4.pytanie && s4.hash === adres && s4.wyjscie === 0, id + ': Wstecz w pytaniu o wyjście nie zadziałał jak „Nie” (pytanie ' + s4.pytanie + ', #' + s4.hash + ', wyjście ' + s4.wyjscie + ')');
        }
      } else {
        wiersz.po = '#' + s3.hash + ' ' + s3.widok;
        const ok = !s3.pytanie && s3.hash === rodzic && s3.widok === pudelko(e.rodzic);
        if (!ok) roz.push({ id: 'wstecz:' + id + '>' + s3.hash.replace(Object.values(ids).find(v => v && s3.hash.endsWith('/' + v)) || '\u0000', ':id'), opis: id + ': Wstecz → ' + wiersz.po + (s3.pytanie ? ' + pytanie' : '') + ' zamiast #' + rodzic });
        else check(true, '');
      }
    }
    check(!errs.length, 'błędy strony: ' + errs.join(' | '));
    await ctx.close();
  } finally { if (browser) await browser.close(); server.close(); }
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Set(base.entries.map(x => x.id)), now = new Set(roz.map(x => x.id));
  for (const r of roz) if (!known.has(r.id)) fails.push('nowa rozbieżność spoza listy ' + path.basename(BASELINE) + ': ' + r.id + ' – ' + r.opis);
  for (const k of known) if (!now.has(k)) fails.push('wpis ' + k + ' z listy ' + path.basename(BASELINE) + ' już nie występuje – usuń go (lista maleje)');
  check(tabela.length === MAPA.length, 'sprawdzono ' + tabela.length + ' z ' + MAPA.length + ' ekranów mapy');
  if (process.env.OEST_DEBUG) { console.log(JSON.stringify(tabela, null, 1)); console.log(JSON.stringify(roz, null, 1)); }
  if (fails.length) { console.error('WSTECZ TABELA UI FAIL:\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('WSTECZ TABELA UI PASS: ' + tabela.length + ' ekranów z mapy (ekrany.json), okienko i <dialog> na każdym, zdarzenie backButton; znane rozbieżności z listy: ' + roz.length + '; ' + sprawdzen + ' sprawdzeń');
})().catch(e => { console.error('WSTECZ TABELA UI FAIL:', e && e.stack || e); process.exit(1); });
