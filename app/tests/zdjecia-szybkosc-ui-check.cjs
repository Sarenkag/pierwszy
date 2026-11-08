// Szybszy zapis zdjęć (audyt wydajności 07/11/2026, „tak” Grzegorza 07/11 21:56). Prawdziwy scenariusz Grzegorza:
// Weekly Flushing TB – 20 kranów z innym zdjęciem 12 MP (3072×4080 jak z Pixela), 3 zdjęcia ogólne i kartka formularza.
// Sprawdza:
//  1. kompresja idzie w Web Workerze (OESTZdjecia.compressedIn() === 'worker'), a bez OffscreenCanvas – jak dawniej w głównym wątku;
//  2. oba sposoby dają te same wymiary zdjęć (KINDS: kran 800 px, ogólne 1600 px, kartka 1600 px) i prawie ten sam rozmiar pliku;
//  3. z Workerem żadne pełne zdjęcie nie jest dekodowane, skalowane ani kodowane w głównym wątku (czas blokady tylko w raporcie);
//  6. zdjęcie z aparatu zmniejsza się w tle już w czasie podglądu (OESTZdjecia.prepare), zapis po „OK” bierze gotowy wynik;
//  5. edytor: z opts.max zapis od razu w 2560 px (bez JPEG 12 MP), kształty i kadr na tym samym miejscu; bez max – jak dawniej;
//  4. raport: zdjęcia zmniejszane raz – drugie Wyślij tej samej inspekcji nie dekoduje ich ponownie; Word i PDF w kolejce poniżej 1 MB.
// Wynik z przeglądarki NIE zastępuje sprawdzenia na Pixelu 8 Pro.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const LIMIT = 1024 * 1024, GENERAL = 3, PODGLAD_MS = 600; // podgląd po zdjęciu w teście trwa 600 ms (człowiek zwykle patrzy dłużej)
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
    // kodowanie JPEG dużego płótna w głównym wątku (to właśnie blokuje ekran); miniatury < 0,3 MP się nie liczą
    window.__enc = 0; const tb = HTMLCanvasElement.prototype.toBlob; HTMLCanvasElement.prototype.toBlob = function () { if (window.__on && this.width * this.height >= 300000) window.__enc++; return tb.apply(this, arguments); };
    // dekodowanie i skalowanie pełnego zdjęcia w głównym wątku: createImageBitmap oraz drawImage ze źródła ≥ 3 MP
    window.__mdec = 0; window.__mdraw = 0; const cib2 = window.createImageBitmap; window.createImageBitmap = function () { if (window.__on) window.__mdec++; return cib2.apply(this, arguments); };
    const di = CanvasRenderingContext2D.prototype.drawImage; CanvasRenderingContext2D.prototype.drawImage = function (src) { const w = src && (src.naturalWidth || src.videoWidth || src.width) || 0, h = src && (src.naturalHeight || src.videoHeight || src.height) || 0; if (window.__on && w * h >= 3000000) window.__mdraw++; return di.apply(this, arguments); };
    try { new PerformanceObserver(l => { if (window.__on) for (const e of l.getEntries()) window.__lt += e.duration; }).observe({ type: 'longtask' }); } catch (_) {}
  }, worker);
  await pg.goto(url + 'inspekcje/index.html#ppm=EFA-INS-026'); await pg.waitForTimeout(2000);
  if (await pg.locator('#sendCfg').isVisible().catch(() => false)) { await pg.click('#sendCfg'); await pg.waitForTimeout(300); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) await q.check(); await pg.click('.oest-ask [data-a="ok"]'); await pg.waitForTimeout(300); }
  const taps = await pg.locator('[data-flcam]').count(); assert.ok(taps >= 20, 'Flushing TB: kranów ' + taps);
  const list = []; for (let i = 0; i < taps; i++) list.push(i); for (let i = 0; i < GENERAL; i++) list.push(30 + i); list.push(51);
  assert.equal(await makePhotos(pg, list), list.length);
  // aparat jak w apce na telefonie (OESTAparat.take → podgląd OK): zdjęcie podajemy z pamięci strony, bez wyboru pliku
  // podgląd po zdjęciu trwa (człowiek patrzy i stuka „OK”): w tym czasie aparat woła opts.prepare – zdjęcie zmniejsza się w tle (punkt 1 audytu)
  await pg.evaluate(([ms, noPrep]) => { window.__n = 0; window.OESTAparat = Object.assign({}, window.OESTAparat || {}, { available: () => true,
    take: o => { const b = window.__ph[window.__n++]; if (!noPrep && o && typeof o.prepare === 'function') o.prepare(b); return new Promise(ok => setTimeout(() => { window.__okAt = performance.now(); ok(b); }, ms)); },
    edit: () => Promise.resolve(null) }); }, [PODGLAD_MS, !!process.env.OEST_BEZ_PODGLADU_W_TLE]);
  const cdp = await ctx.newCDPSession(pg); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pg.evaluate(() => { window.__lt = 0; window.__on = true; });
  const t0 = Date.now();
  const okMs = [], poOk = () => pg.evaluate(() => performance.now() - window.__okAt).then(v => okMs.push(v));
  for (let i = 0; i < taps; i++) { await pg.click('[data-flcam="' + i + '"]'); await pg.waitForFunction(n => document.querySelectorAll('.fl-pics img').length >= n, i + 1, { timeout: 120000, polling: 10 }); await poOk(); }
  for (let i = 0; i < GENERAL; i++) { await pg.click('#camIn'); await pg.waitForFunction(n => document.querySelectorAll('#photos .thumb').length >= n, i + 1, { timeout: 120000, polling: 10 }); await poOk(); }
  await pg.click('#shCamIn'); await pg.waitForFunction(() => document.querySelectorAll('#sheetPhotos .thumb').length >= 1, null, { timeout: 120000, polling: 10 }); await poOk();
  const addMs = Date.now() - t0;
  const r = await pg.evaluate(() => { window.__on = false; return { lt: window.__lt, enc: window.__enc, mdec: window.__mdec, mdraw: window.__mdraw, dec: window.__dec, via: window.OESTZdjecia.compressedIn() }; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  r.addMs = addMs; r.poOk = Math.round(okMs.reduce((a, b) => a + b, 0) / okMs.length); r.hits = await pg.evaluate(() => window.OESTZdjecia.preparedHits());
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
// Edytor (punkt 4 audytu): po „Zapisz” zdjęcie 12 MP wychodzi od razu w największym rozmiarze, jaki zapisze moduł zdjęć
// (OESTZdjecia.maxPx(), Standard = 2560 px), z kształtami i kadrem w tym samym miejscu co w pełnej rozdzielczości.
async function editorCheck(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
  pg.on('pageerror', e => errs.push(e.message));
  await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
  await pg.goto(url + 'inspekcje/index.html#ppm=EFA-INS-026'); await pg.waitForTimeout(1500);
  const out = {};
  for (const [name, max, crop] of [['pelne', 0, false], ['max', -1, false], ['pelneKadr', 0, true], ['maxKadr', -1, true]]) {
    await pg.evaluate(([max]) => new Promise(ok => {
      const c = document.createElement('canvas'); c.width = 3072; c.height = 4080; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 3072, 4080); gr.addColorStop(0, '#30405a'); gr.addColorStop(1, '#c9b48a'); g.fillStyle = gr; g.fillRect(0, 0, 3072, 4080);
      g.fillStyle = '#fff'; g.font = 'bold 160px sans-serif'; g.fillText('TB-L13 ISO-027', 300, 1500);
      c.toBlob(b => { window.__w = undefined; window.__t = performance.now(); const m = max < 0 ? window.OESTZdjecia.maxPx() : max;
        window.OESTAparat.edit(b, { max: m }).then(r => { window.__ms = performance.now() - window.__t; window.__w = r || null; }); ok(); }, 'image/jpeg', 0.9);
    }), [max]);
    await pg.waitForSelector('.oest-editor canvas'); await pg.waitForTimeout(300);
    const b = await pg.locator('.oest-editor canvas').boundingBox();
    await pg.click('.oest-editor [data-t="arrow"]');
    await pg.mouse.move(b.x + b.width * .2, b.y + b.height * .7); await pg.mouse.down(); await pg.mouse.move(b.x + b.width * .6, b.y + b.height * .35, { steps: 6 }); await pg.mouse.up();
    if (crop) { await pg.click('.oest-editor [data-t="crop"]'); await pg.mouse.move(b.x + b.width * .1, b.y + b.height * .2); await pg.mouse.down(); await pg.mouse.move(b.x + b.width * .9, b.y + b.height * .8, { steps: 6 }); await pg.mouse.up(); }
    await pg.click('.oest-editor [data-a="save"]');
    await pg.waitForFunction(() => window.__w !== undefined, null, { timeout: 30000 });
    out[name] = await pg.evaluate(async name => { const r = window.__w; if (!r) return null; window['__r_' + name] = r; const im = await createImageBitmap(r); const o = { w: im.width, h: im.height, size: r.size, ms: Math.round(window.__ms) }; im.close(); return o; }, name);
    await pg.waitForFunction(() => !document.querySelector('.oest-editor'), null, { timeout: 3000 }).catch(() => {});
  }
  // ten sam obraz: wynik „max” vs pełny wynik zmniejszony do tego samego rozmiaru – średnia różnica pikseli (0–255)
  out.diff = await pg.evaluate(async () => {
    async function px(b, w, h) { const im = await createImageBitmap(b); const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w, h); im.close(); return g.getImageData(0, 0, w, h).data; }
    const r = {};
    for (const [a, f] of [['max', 'pelne'], ['maxKadr', 'pelneKadr']]) {
      const im = await createImageBitmap(window['__r_' + a]), w = im.width, h = im.height; im.close();
      const x = await px(window['__r_' + a], w, h), y = await px(window['__r_' + f], w, h); let s = 0; for (let i = 0; i < x.length; i += 4) s += (Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2])) / 3;
      r[a] = +(s / (x.length / 4)).toFixed(2);
    }
    return r;
  });
  out.maxPx = await pg.evaluate(() => window.OESTZdjecia.maxPx());
  out.errs = errs; await ctx.close(); return out;
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const url = 'http://127.0.0.1:' + server.address().port + '/';
    const E = await editorCheck(browser, url);
    assert.deepEqual(E.errs, [], 'edytor: błędy strony');
    assert.equal(E.maxPx, 2560, 'Standard: największe zdjęcie modułu 2560 px');
    assert.deepEqual([E.pelne.w, E.pelne.h], [3072, 4080], 'edytor bez max: pełna rozdzielczość jak dawniej');
    assert.equal(Math.max(E.max.w, E.max.h), 2560, 'edytor z max: dłuższy bok 2560 px (' + E.max.w + '×' + E.max.h + ')');
    assert.ok(Math.abs(E.max.w / E.max.h - 3072 / 4080) < 0.002, 'edytor z max: te same proporcje');
    assert.ok(Math.max(E.maxKadr.w, E.maxKadr.h) <= 2560 && Math.abs(E.maxKadr.w / E.maxKadr.h - E.pelneKadr.w / E.pelneKadr.h) < 0.01, 'kadr z max: proporcje kadru ' + JSON.stringify([E.maxKadr, E.pelneKadr]));
    assert.ok(E.diff.max < 3 && E.diff.maxKadr < 3, 'kształty i kadr w tym samym miejscu co w pełnej rozdzielczości (różnica ' + JSON.stringify(E.diff) + ')');
    const W = await run(browser, url, true), M = await run(browser, url, false);
    for (const [n, r] of [['Worker', W], ['główny wątek', M]]) {
      assert.deepEqual(r.errs, [], n + ': błędy strony');
      assert.equal(r.saved.length, r.taps + GENERAL + 1, n + ': zapisanych zdjęć');
      assert.ok(r.files.some(f => f.name.endsWith('.pdf')) && r.files.some(f => f.name.endsWith('.docx')), n + ': brak Word lub PDF w kolejce');
      assert.deepEqual(r.files.filter(f => f.size >= LIMIT).map(f => f.name), [], n + ': raport ponad 1 MB');
      assert.ok(r.decFirst >= r.saved.length, n + ': pierwsze Wyślij zmniejsza każde zdjęcie (' + r.decFirst + ')');
      assert.equal(r.decSecond, 0, n + ': drugie Wyślij nie powinno zmniejszać zdjęć od nowa');
    }
    if (!process.env.OEST_BEZ_PODGLADU_W_TLE) for (const [n, r] of [['Worker', W], ['główny wątek', M]]) assert.equal(r.hits, r.saved.length, n + ': każde zdjęcie z aparatu ma być zmniejszone już w czasie podglądu (' + r.hits + '/' + r.saved.length + ')');
    assert.equal(W.via, 'worker', 'kompresja ma iść w Workerze');
    assert.equal(M.via, 'main', 'bez OffscreenCanvas – zapas w głównym wątku');
    W.saved.forEach((s, i) => {
      const m = M.saved[i];
      assert.equal(s.kind, m.kind, 'rodzaj zdjęcia ' + i);
      assert.deepEqual([s.w, s.h], [m.w, m.h], 'wymiary zdjęcia ' + i + ' (' + s.kind + ')');
      assert.ok(Math.abs(s.size - m.size) <= Math.max(2048, m.size * 0.03), 'rozmiar zdjęcia ' + i + ': ' + s.size + ' vs ' + m.size);
    });
    const dims = [...new Set(W.saved.map(s => s.kind + ' ' + Math.max(s.w, s.h) + ' px'))].join(', ');
    // Blokada ekranu: twardo sprawdzamy przyczynę, nie czas. Pomiar long tasks pod CDP throttle bywa na CI losowy
    // (PR #88: raz 157/222 ms, raz 0/0 ms), więc czas tylko raportujemy. Worker = zero dekodowań, skalowań i kodowań pełnych zdjęć w głównym wątku.
    assert.equal(W.enc, 0, 'Worker: duże zdjęcia nie mogą być kodowane w głównym wątku (' + W.enc + ')');
    assert.equal(W.mdec, 0, 'Worker: dekodowanie zdjęć nie może iść w głównym wątku (' + W.mdec + ')');
    assert.equal(W.mdraw, 0, 'Worker: skalowanie pełnych zdjęć nie może iść w głównym wątku (' + W.mdraw + ')');
    assert.ok(M.mdec >= M.saved.length && M.mdraw >= M.saved.length, 'bez Workera dekodowanie i skalowanie w głównym wątku (' + M.mdec + '/' + M.mdraw + ')');
    assert.ok(M.enc >= M.saved.length, 'bez Workera każde zdjęcie kodowane w głównym wątku (' + M.enc + '/' + M.saved.length + ')');
    const kb = W.files.map(f => f.name + ' ' + Math.round(f.size / 1024) + ' KB').join(', ');
    console.log('ZDJECIA SZYBKOSC UI PASS: Flushing TB ' + W.taps + ' kranów + ' + GENERAL + ' ogólne + kartka (' + W.saved.length + ' zdjęć 12 MP, ' + dims + '). ' +
      'Praca na pełnych zdjęciach w głównym wątku (dekodowanie/skalowanie/kodowanie): Worker ' + [W.mdec, W.mdraw, W.enc].join('/') + ', bez Workera ' + [M.mdec, M.mdraw, M.enc].join('/') + '. Blokada ekranu przy dodawaniu (CPU 4×, tylko informacja): Worker ' + Math.round(W.lt) + ' ms, główny wątek ' + Math.round(M.lt) + ' ms; czas dodawania ' + W.addMs + ' / ' + M.addMs + ' ms. Po „OK” do miniatury średnio ' + W.poOk + ' ms (Worker) / ' + M.poOk + ' ms (główny wątek), gotowe z podglądu ' + W.hits + '/' + W.saved.length + '. ' +
      'Edytor 12 MP → ' + E.max.w + '×' + E.max.h + ' (' + Math.round(E.max.size / 1024) + ' KB, ' + E.max.ms + ' ms) zamiast ' + E.pelne.w + '×' + E.pelne.h + ' (' + Math.round(E.pelne.size / 1024) + ' KB, ' + E.pelne.ms + ' ms), różnica obrazu ' + E.diff.max + '/' + E.diff.maxKadr + '. ' +
      'Wyślij: 1. raz ' + W.decFirst + ' zmniejszeń, 2. raz ' + W.decSecond + '. Kolejka: ' + kb);
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
