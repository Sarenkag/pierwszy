// Szybszy zapis zdjęć (audyt wydajności 07/11/2026, „tak” Grzegorza 07/11 21:56). Prawdziwy scenariusz Grzegorza:
// Weekly Flushing TB – 20 kranów z innym zdjęciem 12 MP (3072×4080 jak z Pixela), 3 zdjęcia ogólne i kartka formularza.
// Sprawdza:
//  1. kompresja idzie w Web Workerze (OESTZdjecia.compressedIn() === 'worker'), a bez OffscreenCanvas – jak dawniej w głównym wątku;
//  2. oba sposoby dają te same wymiary zdjęć (KINDS: kran 800 px, ogólne 1600 px, kartka 1600 px) i prawie ten sam rozmiar pliku;
//  3. z Workerem główny wątek (ekran) jest blokowany wyraźnie krócej niż bez niego (procesor zwolniony 4× jak w telefonie);
//  4. raport: zdjęcia zmniejszane raz – drugie Wyślij tej samej inspekcji nie dekoduje ich ponownie; Word i PDF w kolejce poniżej 1 MB.
// Wynik z przeglądarki NIE zastępuje sprawdzenia na Pixelu 8 Pro.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const LIMIT = 1024 * 1024, GENERAL = 3;
const SRC = [1, 2].map(i => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'dane', 'zdjecie-' + i + '.jpg')).toString('base64'));
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8'); res.end(b); });
});
// zdjęcie jak z Pixela (3072×4080, JPEG q0.9), za każdym razem inny kadr i jasność; robione w stronie (bez przesyłania przez test)
function makePhotos(pg, list) {
  return pg.evaluate(([srcs, list]) => Promise.all(srcs.map(src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = src; }))).then(async ims => {
    window.__ph = [];
    for (const i of list) {
      const im = ims[i % 2], c = document.createElement('canvas'); c.width = 3072; c.height = 4080; const g = c.getContext('2d'), k = 0.05 * (i % 5);
      g.filter = 'brightness(' + (0.85 + 0.05 * (i % 6)) + ')'; g.drawImage(im, im.width * k, im.height * k * 0.6, im.width * (1 - k * 1.5), im.height * (1 - k), 0, 0, c.width, c.height);
      window.__ph.push(await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)));
    }
    return window.__ph.length;
  }), [SRC, list]);
}
async function run(browser, url, worker) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await ctx.addInitScript(w => {
    localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' }));
    localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' }));
    if (!w) delete window.OffscreenCanvas; // stary WebView bez OffscreenCanvas → zapas w głównym wątku
    window.__dec = 0; const cib = window.createImageBitmap; window.createImageBitmap = function () { window.__dec++; return cib.apply(this, arguments); };
    window.__lt = 0; window.__on = false;
    try { new PerformanceObserver(l => { if (window.__on) for (const e of l.getEntries()) window.__lt += e.duration; }).observe({ type: 'longtask' }); } catch (_) {}
  }, worker);
  await pg.goto(url + 'inspekcje/index.html#ppm=EFA-INS-026'); await pg.waitForTimeout(2000);
  if (await pg.locator('#sendCfg').isVisible().catch(() => false)) { await pg.click('#sendCfg'); await pg.waitForTimeout(300); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await q.check(); await pg.click('.oest-ask [data-a="ok"]'); await pg.waitForTimeout(300); }
  const taps = await pg.locator('[data-flcam]').count(); assert.ok(taps >= 20, 'Flushing TB: kranów ' + taps);
  const list = []; for (let i = 0; i < taps; i++) list.push(i); for (let i = 0; i < GENERAL; i++) list.push(30 + i); list.push(51);
  assert.equal(await makePhotos(pg, list), list.length);
  // aparat jak w apce na telefonie (OESTAparat.take → podgląd OK): zdjęcie podajemy z pamięci strony, bez wyboru pliku
  await pg.evaluate(() => { window.__n = 0; window.OESTAparat = Object.assign({}, window.OESTAparat || {}, { available: () => true, take: () => Promise.resolve(window.__ph[window.__n++]), edit: () => Promise.resolve(null) }); });
  const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pg.evaluate(() => { window.__lt = 0; window.__on = true; });
  const t0 = Date.now();
  for (let i = 0; i < taps; i++) { await pg.click('[data-flcam="' + i + '"]'); await pg.waitForFunction(n => document.querySelectorAll('.fl-pics img').length >= n, i + 1, { timeout: 120000 }); }
  for (let i = 0; i < GENERAL; i++) { await pg.click('#camIn'); await pg.waitForFunction(n => document.querySelectorAll('#photos .thumb').length >= n, i + 1, { timeout: 120000 }); }
  await pg.click('#shCamIn'); await pg.waitForFunction(() => document.querySelectorAll('#sheetPhotos .thumb').length >= 1, null, { timeout: 120000 });
  const addMs = Date.now() - t0;
  const r = await pg.evaluate(() => { window.__on = false; return { lt: window.__lt, dec: window.__dec, via: window.OESTZdjecia.compressedIn() }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  r.addMs = addMs;
  r.saved = (await pg.evaluate(() => window.OESTZdjecia.list())).sort((a, b) => a.saved < b.saved ? -1 : 1).map(x => ({ kind: x.kind, w: x.width, h: x.height, size: x.size }));
  if (await pg.locator('#flWeek [data-w="1"]:not(.on)').isVisible().catch(() => false)) await pg.click('#flWeek [data-w="1"]');
  await pg.waitForTimeout(800);
  // raport: Wyślij dwa razy (np. drugi odbiorca albo poprawka odpowiedzi) – drugi raz bez ponownego zmniejszania zdjęć
  async function send() {
    const d = await pg.evaluate(() => window.__dec), q = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').count(); g.onsuccess = () => res(g.result); }; }));
    await pg.click('#toQueue');
    const asked = await pg.waitForSelector('.oest-ask', { timeout: 8000 }).then(() => true, () => false);
    if (asked) await pg.click('.oest-ask [data-a="ok"]');
    await pg.waitForFunction(n => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').count(); g.onsuccess = () => res(g.result > n); }; }), q, { timeout: 120000, polling: 500 });
    await pg.waitForTimeout(1500);
    return (await pg.evaluate(() => window.__dec)) - d;
  }
  r.decFirst = await send();
  r.decSecond = await send();
  r.files = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => { const it = g.result.sort((a, b) => a.created - b.created).pop(); res(it ? (it.files || []).map(f => ({ name: f.name, size: (f.bytes || f.data || []).byteLength || (f.bytes || f.data || '').length || 0 })) : []); }; }; }));
  r.errs = errs; r.taps = taps;
  await ctx.close();
  return r;
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const url = 'http://127.0.0.1:' + server.address().port + '/';
    const W = await run(browser, url, true), M = await run(browser, url, false);
    for (const [n, r] of [['Worker', W], ['główny wątek', M]]) {
      assert.deepEqual(r.errs, [], n + ': błędy strony');
      assert.equal(r.saved.length, r.taps + GENERAL + 1, n + ': zapisanych zdjęć');
      assert.ok(r.files.some(f => f.name.endsWith('.pdf')) && r.files.some(f => f.name.endsWith('.docx')), n + ': brak Word lub PDF w kolejce');
      assert.deepEqual(r.files.filter(f => f.size >= LIMIT).map(f => f.name), [], n + ': raport ponad 1 MB');
      assert.ok(r.decFirst >= r.saved.length, n + ': pierwsze Wyślij zmniejsza każde zdjęcie (' + r.decFirst + ')');
      assert.equal(r.decSecond, 0, n + ': drugie Wyślij nie powinno zmniejszać zdjęć od nowa');
    }
    assert.equal(W.via, 'worker', 'kompresja ma iść w Workerze');
    assert.equal(M.via, 'main', 'bez OffscreenCanvas – zapas w głównym wątku');
    W.saved.forEach((s, i) => {
      const m = M.saved[i];
      assert.equal(s.kind, m.kind, 'rodzaj zdjęcia ' + i);
      assert.deepEqual([s.w, s.h], [m.w, m.h], 'wymiary zdjęcia ' + i + ' (' + s.kind + ')');
      assert.ok(Math.abs(s.size - m.size) <= Math.max(2048, m.size * 0.03), 'rozmiar zdjęcia ' + i + ': ' + s.size + ' vs ' + m.size);
    });
    const dims = [...new Set(W.saved.map(s => s.kind + ' ' + Math.max(s.w, s.h) + ' px'))].join(', ');
    assert.ok(W.lt < M.lt * 0.6, 'Worker ma krócej blokować ekran: ' + Math.round(W.lt) + ' ms vs ' + Math.round(M.lt) + ' ms');
    const kb = W.files.map(f => f.name + ' ' + Math.round(f.size / 1024) + ' KB').join(', ');
    console.log('ZDJECIA SZYBKOSC UI PASS: Flushing TB ' + W.taps + ' kranów + ' + GENERAL + ' ogólne + kartka (' + W.saved.length + ' zdjęć 12 MP, ' + dims + '). ' +
      'Blokada ekranu przy dodawaniu (CPU 4×): Worker ' + Math.round(W.lt) + ' ms, główny wątek ' + Math.round(M.lt) + ' ms; czas dodawania ' + W.addMs + ' / ' + M.addMs + ' ms. ' +
      'Wyślij: 1. raz ' + W.decFirst + ' zmniejszeń, 2. raz ' + W.decSecond + '. Kolejka: ' + kb);
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
