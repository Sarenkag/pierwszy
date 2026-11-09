// ZASADA Grzegorza (05/11/2026 08:09 i 08:20): każdy plik raportu (Word i PDF) poniżej 1 MB; tylko gdy byłby większy –
// przed utworzeniem pytanie „Zmniejsz zdjęcia / Zostaw tak”. Przegląd ChatGPT 09/11/2026, pkt 6 (zgoda „lecisz z 1 4 6”):
// Reactive tę zasadę omijał (zdjęcia ogólne 1600 px trafiały do raportu bez kontroli).
// Prawdziwy scenariusz Reactive: nowe zadanie, 4 zdjęcia przed + 4 po jak z Pixela (4080×3072, każde inne), zapis przez moduł zdjęć
// (Średnie 1600 px), „Wyślij do siebie” → „Zbuduj i wyślij”, pomiar plików, które trafiły do kolejki wysyłki.
//  - odpowiedź „Zmniejsz zdjęcia”: pytanie z rozmiarem > 1 MB, oba pliki w kolejce < 1 MB,
//  - odpowiedź „Zostaw tak”: raport zostaje duży (bez cichego zmniejszania).
// Test czeka na stan (raport w kolejce), nie mierzy czasu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const LIMIT = 1024 * 1024, PHOTOS = 4;
const SRC = [1, 2].map(i => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'dane', 'zdjecie-' + i + '.jpg')).toString('base64'));
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'); res.end(b); });
});
// zdjęcie jak z Pixela (3072×4080), za każdym razem inny kadr i jasność (jak raport-rozmiar-ui-check)
async function photo(pg, i) {
  const b64 = await pg.evaluate(([src, i]) => new Promise(res => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = 3072; c.height = 4080; const g = c.getContext('2d'), k = 0.05 * (i % 5);
    g.filter = 'brightness(' + (0.85 + 0.05 * (i % 6)) + ')'; g.drawImage(im, im.width * k, im.height * k * 0.6, im.width * (1 - k * 1.5), im.height * (1 - k), 0, 0, c.width, c.height);
    res(c.toDataURL('image/jpeg', 0.9).split(',')[1]); }; im.src = src; }), [SRC[i % 2], i]);
  return { name: 'p' + i + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') };
}
async function scenario(browser, url, answer) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
  pg.setDefaultTimeout(60000); pg.on('pageerror', e => errs.push(e.message));
  await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ id: 'rozmiar-test', email: 'test@example.com', first: 'Greg', last: 'Sarna' })); });
  try {
    await pg.goto(url + '/#reactive'); await pg.locator('[data-rx=new]').click(); await pg.locator('[data-rx-field=title]').waitFor();
    await pg.locator('[data-rx-field=title]').fill('Ceiling tile water damage');
    for (const [phase, off] of [['before', 0], ['after', 10]]) for (let i = 0; i < PHOTOS; i++) {
      await pg.locator('[data-rx-photos=' + phase + ']').setInputFiles(await photo(pg, off + i));
      await pg.waitForFunction(([ph, n]) => document.querySelectorAll('#rx-' + ph + ' img').length >= n, [phase, i + 1]);
    }
    await pg.evaluate(() => { OESTSettings.update(s => { s.profile.first = 'Greg'; s.profile.last = 'Sarna'; s.profile.companyEmail = 'work@example.com'; });
      window.Capacitor = { isNativePlatform: () => true, Plugins: {}, registerPlugin: () => ({ share: async () => ({ status: 'shared' }) }) };
      // raport przechwycony w chwili zapisu do kolejki (ta sama treść, którą apka wysyła)
      const put = IDBObjectStore.prototype.put; IDBObjectStore.prototype.put = function (v) { try { if (this.name === 'queue' && v && v.docx && v.pdf && !window.__raport) window.__raport = { docx: v.docx.byteLength, pdf: v.pdf.byteLength }; } catch (_) {} return put.apply(this, arguments); }; });
    await pg.locator('[data-rx=send]').click(); await pg.locator('[data-rx=send-now]').click();
    await pg.waitForSelector('.oest-ask'); const askText = (await pg.locator('.oest-ask').innerText()).replace(/\s+/g, ' ');
    await pg.click('.oest-ask [data-a="' + answer + '"]');
    await pg.waitForFunction(() => window.__raport && /W kolejce do wysłania/.test(document.querySelector('#rxMessage')?.textContent || ''));
    const out = await pg.evaluate(() => window.__raport);
    assert.deepEqual(errs, [], 'błędy strony');
    return { askText, out };
  } finally { await ctx.close(); }
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const url = 'http://127.0.0.1:' + server.address().port, kb = o => 'Word ' + Math.round(o.docx / 1024) + ' KB, PDF ' + Math.round(o.pdf / 1024) + ' KB';
    const small = await scenario(browser, url, 'ok');
    assert.match(small.askText, /Plik raportu będzie miał \d+,\d MB \(limit 1 MB\)/, 'pytanie o rozmiar: ' + small.askText);
    assert.ok(small.out.docx < LIMIT && small.out.pdf < LIMIT, '„Zmniejsz zdjęcia” – raport ma być < 1 MB: ' + kb(small.out));
    const big = await scenario(browser, url, 'no');
    assert.ok(Math.max(big.out.docx, big.out.pdf) >= LIMIT, '„Zostaw tak” – raport bez zmian (duży): ' + kb(big.out));
    console.log('reactive-rozmiar-ui-check: Reactive ' + PHOTOS + ' przed + ' + PHOTOS + ' po (Pixel → Średnie 1600 px) | pytanie: ' + small.askText +
      ' | Zmniejsz: ' + kb(small.out) + ' | Zostaw tak: ' + kb(big.out));
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
