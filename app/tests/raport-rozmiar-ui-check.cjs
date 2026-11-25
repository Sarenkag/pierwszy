const { wpisz, wybierz, ptaszek, wartosc, zdjecia } = require('./ionic-pomoc.cjs');
// ZASADA Grzegorza (05/11/2026 08:09): każdy plik raportu (Word i PDF) poniżej 1 MB.
// Prawdziwy scenariusz: Weekly Flushing TB – 16 kranów (od 21/11/2026 bez apartamentów; wcześniej 20), każdy z INNYM zdjęciem (PDF zapisuje identyczne zdjęcie raz,
// więc jedno powielone zdjęcie zaniżałoby wynik), 3 zdjęcia ogólne na „Duże”, kartka formularza. Buduje raport przez Wyślij
// i mierzy gotowe pliki w kolejce. Uruchamiany w CI przed budową APK.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('./przegladarka.cjs'), root = path.resolve(__dirname, '../www');
let askText = '';
const LIMIT = 1024 * 1024, GENERAL = +(process.env.OEST_GENERAL || 3);
const SRC = [1, 2].map(i => 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'dane', 'zdjecie-' + i + '.jpg')).toString('base64'));
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8'); res.end(b); });
});
// zdjęcie jak z Pixela (4080×3072 w pionie), za każdym razem inny kadr i jasność
async function photo(pg, i) {
  const b64 = await pg.evaluate(([src, i]) => new Promise(res => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = 3072; c.height = 4080; const g = c.getContext('2d'), k = 0.05 * (i % 5);
    g.filter = 'brightness(' + (0.85 + 0.05 * (i % 6)) + ')'; g.drawImage(im, im.width * k, im.height * k * 0.6, im.width * (1 - k * 1.5), im.height * (1 - k), 0, 0, c.width, c.height);
    res(c.toDataURL('image/jpeg', 0.9).split(',')[1]); }; im.src = src; }), [SRC[i % 2], i]);
  return { name: 'p' + i + '.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(b64, 'base64') };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }), pg = await ctx.newPage(), errs = [];
    pg.on('pageerror', e => errs.push(e.message));
    await ctx.addInitScript(() => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' })); });
    await pg.goto('http://127.0.0.1:' + server.address().port + '/inspekcje/index.html#ppm=EFA-INS-026'); await pg.waitForTimeout(2000);
    if (await pg.locator('#sendCfg').isVisible().catch(() => false)) { await pg.click('#sendCfg'); await pg.waitForTimeout(300); const q = pg.locator('[data-sn="q"]:not([disabled])'); if (await q.count()) { await ptaszek(q); const assert = require('node:assert/strict'); assert.equal(await q.evaluate(e => e.checked), true, 'Opcja raportu zaznaczona'); } await pg.click('.oest-ask [data-a="ok"]'); await pg.waitForTimeout(300); }
    const taps = await pg.locator('[data-flcam]').count(); assert.ok(taps >= 16, 'Flushing TB: kranów ' + taps);
    for (let i = 0; i < taps; i++) {
      await zdjecia(pg, '[data-flcam="' + i + '"]', await photo(pg, i)); await pg.waitForFunction(n => photos.filter(p => p.tap != null).length >= n, i + 1, { timeout: 60000 }); // zdjęcie kranu: moduł aparatu (Ionic)
    }
    await wybierz(pg, '#photoSize ion-select', 'duze'); // najgorszy przypadek: ogólne na „Duże”
    for (let i = 0; i < GENERAL; i++) { await zdjecia(pg, '#galIn', await photo(pg, 30 + i)); await pg.waitForFunction(n => photos.filter(p => p.tap == null && !p.sheet).length >= n, i + 1, { timeout: 60000 }); }
    await zdjecia(pg, '#shCamIn', await photo(pg, 51), 'Dodaj z galerii'); // kafelek Formularz → „Dodaj z galerii” await pg.waitForTimeout(2500);
    if (await pg.locator('#flWeek').isVisible().catch(() => false)) await wybierz(pg, '#flWeek', '1'); // tydzień: ion-select
    await pg.click('#toQueue');
    // dużo zdjęć ogólnych: apka pyta przed wysłaniem (Grzegorz 05/11 08:20); OEST_ANSWER=no → „Zostaw tak”
    const asked = await pg.waitForSelector('.oest-ask', { timeout: 20000 }).then(() => true, () => false);
    if (asked) { askText = await pg.locator('.oest-ask').innerText(); await pg.click('.oest-ask [data-a="' + (process.env.OEST_ANSWER || 'ok') + '"]'); }
    await pg.waitForTimeout(asked ? 15000 : 8000);
    const files = await pg.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje', 1); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => { const it = g.result.sort((a, b) => a.created - b.created).pop(); res(it ? (it.files || []).map(f => ({ name: f.name, size: (f.bytes || f.data || []).byteLength || (f.bytes || f.data || []).length || 0 })) : []); }; }; }));
    await ctx.close();
    const kb = files.map(f => f.name + ' ' + Math.round(f.size / 1024) + ' KB').join(', ');
    assert.ok(files.some(f => f.name.endsWith('.pdf')) && files.some(f => f.name.endsWith('.docx')), 'brak Word lub PDF: ' + kb);
    assert.deepEqual(errs, [], 'błędy strony');
    const over = files.filter(f => f.size >= LIMIT);
    if (process.env.OEST_ANSWER === 'no') assert.ok(asked && over.length, '„Zostaw tak” ma zostawić duży raport: ' + kb);
    else assert.deepEqual(over.map(f => f.name), [], 'raport ponad 1 MB (zasada Grzegorza): ' + kb);
    console.log('raport-rozmiar-ui-check: Flushing TB, ' + taps + ' kranów + ' + GENERAL + ' ogólne (Duże) + kartka: ' + kb + (asked ? ' | pytanie: ' + askText.replace(/\s+/g, ' ') : ''));
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
