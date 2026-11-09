// Data i godzina na zdjęciach (Grzegorz 09/11/2026, propozycja 5 z przeglądu apek: „tak, ale tylko opcjonalnie, domyślnie na nie”).
// Sprawdza w przeglądarce (paczka jak w APK, app/www):
//  1. Ustawienia → „Raporty i zdjęcia”: przełącznik „Data i godzina na zdjęciach” jest, domyślnie WYŁĄCZONY, zapis przyciskiem
//     „Zapisz ustawienia” trafia do modułu zdjęć (jedno źródło: OESTZdjecia.settings().stamp), po ponownym otwarciu apki zostaje;
//     PL/EN podmienia napis w miejscu – nic się nie przesuwa i nie przerysowuje;
//  2. moduł zdjęć (moduly/zdjecia) – zdjęcie 12 MP jak z Pixela: wyłączone = zdjęcie bez zmian, włączone = napis w prawym dolnym rogu,
//     reszta zdjęcia ta sama, te same wymiary; tak samo w Web Workerze i w głównym wątku (stary WebView bez OffscreenCanvas);
//  3. zmniejszanie w tle w czasie podglądu (prepare) nie daje zdjęcia z inną datą: inna data zrobienia = zdjęcie liczone od nowa;
//  4. stamp:false (poprawione zdjęcie, które już ma datę) = bez drugiego napisu.
// Zrzuty (OEST_SCREENSHOTS): zdjęcie z datą, ustawienia PL i EN. Wynik z przeglądarki NIE zastępuje sprawdzenia na Pixelu 8 Pro.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright'), root = path.resolve(__dirname, '../www');
const SRC = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(__dirname, 'dane', 'zdjecie-1.jpg')).toString('base64');
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]); let p = path.resolve(root, '.' + name);
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  if (name.endsWith('/')) p = path.join(p, 'index.html');
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', p.endsWith('.js') ? 'text/javascript; charset=utf-8' : p.endsWith('.css') ? 'text/css' : p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'); res.end(b); });
});
const out = process.env.OEST_SCREENSHOTS;
function account(ctx, worker) {
  return ctx.addInitScript(w => {
    if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 't', email: 'demo@example.com', first: 'Greg', last: 'Sarna' }));
    if (!w) delete window.OffscreenCanvas; // stary WebView: zdjęcie w głównym wątku
  }, worker);
}

// zdjęcie 3072×4080 (jak z Pixela) zapisane przez moduł; zwraca piksele dwóch obszarów: prawy dolny róg i lewa górna ćwiartka
function saveAndRead(pg, opts) {
  return pg.evaluate(async ([src, o]) => {
    if (!window.__src) {
      const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const c = document.createElement('canvas'); c.width = 3072; c.height = 4080; c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      window.__src = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
    }
    const Z = window.OESTZdjecia; Z.setSettings({ stamp: !!o.on });
    if (o.prepare) { Z.prepare(window.__src, 'ogolne'); await new Promise(r => setTimeout(r, 50)); }
    const h0 = Z.preparedHits();
    const info = { kind: 'ogolne', category: 'Test' }; if (o.when) info.when = new Date(o.when); if (o.stamp === false) info.stamp = false;
    const r = await Z.save(window.__src, info);
    const bm = await createImageBitmap(r.blob), c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height;
    const g = c.getContext('2d'); g.drawImage(bm, 0, 0);
    const W = bm.width, H = bm.height, cw = Math.round(W * 0.45), ch = Math.round(H * 0.07);
    const corner = Array.from(g.getImageData(W - cw, H - ch, cw, ch).data), top = Array.from(g.getImageData(0, 0, Math.round(W / 2), Math.round(H / 4)).data);
    if (o.keep) window.__last = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(r.blob); });
    return { w: W, h: H, stamp: r.stamp, where: Z.compressedIn(), hit: Z.preparedHits() - h0, corner, top, text: Z.stampText(info.when || new Date()) };
  }, [SRC, opts]);
}
function diff(a, b) { let s = 0; for (let i = 0; i < a.length; i += 4) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / (a.length / 4) / 3; }
function white(a) { let n = 0; for (let i = 0; i < a.length; i += 4) if (a[i] > 225 && a[i + 1] > 225 && a[i + 2] > 225) n++; return n; }

async function photos(browser, url, worker) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, serviceWorkers: 'block' }); await account(ctx, worker);
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(url + '/#home'); await pg.waitForFunction(() => window.OESTZdjecia && window.OESTZdjecia.settings);
  assert.equal(await pg.evaluate(() => window.OESTZdjecia.settings().stamp), false, 'domyślnie wyłączone');
  const when = new Date(2026, 10, 9, 22, 14, 30).getTime(), mode = worker ? 'Worker' : 'główny wątek';
  const off = await saveAndRead(pg, { on: false, when });
  const on = await saveAndRead(pg, { on: true, when, keep: worker });
  assert.equal(on.where, worker ? 'worker' : 'main', 'zdjęcie liczone w: ' + mode);
  assert.equal(off.stamp, ''); assert.equal(on.stamp, '09/11/2026 22:14', 'dd/mm/rrrr GG:MM z chwili zrobienia');
  assert.deepEqual([on.w, on.h], [off.w, off.h], 'te same wymiary');
  const dc = diff(on.corner, off.corner), dt = diff(on.top, off.top), wn = white(on.corner) - white(off.corner);
  assert.ok(dc > 15, mode + ': w prawym dolnym rogu jest napis (różnica ' + dc.toFixed(1) + ')');
  assert.ok(wn > 500, mode + ': białe cyfry napisu (' + wn + ' px)');
  assert.ok(dt < 1, mode + ': reszta zdjęcia bez zmian (różnica ' + dt.toFixed(2) + ')');
  // stamp:false – bez drugiego napisu mimo włączonej opcji
  const again = await saveAndRead(pg, { on: true, when, stamp: false });
  assert.equal(again.stamp, ''); assert.ok(diff(again.corner, off.corner) < 1, 'stamp:false = zdjęcie bez napisu');
  // podgląd: zmniejszone w tle z bieżącą datą – zapis z tą samą minutą bierze gotowe, z inną datą (np. EXIF wczoraj) liczy od nowa
  const nowHit = await saveAndRead(pg, { on: true, prepare: true });
  const oldHit = await saveAndRead(pg, { on: true, prepare: true, when });
  if (worker) {
    assert.equal(nowHit.hit + oldHit.hit <= 2, true);
    assert.equal(oldHit.hit, 0, 'inna data zrobienia: nie bierze gotowego zdjęcia z inną datą');
    assert.equal(oldHit.stamp, '09/11/2026 22:14');
    assert.ok(diff(oldHit.corner, on.corner) < 1, 'zdjęcie po podglądzie ma datę zrobienia, nie podglądu');
  }
  if (worker && out) {
    fs.mkdirSync(out, { recursive: true });
    const b64 = (await pg.evaluate(() => window.__last)).split(',')[1]; fs.writeFileSync(path.join(out, 'zdjecie-z-data.jpg'), Buffer.from(b64, 'base64'));
  }
  assert.deepEqual(errs, []);
  await ctx.close();
  return { dc, dt, wn, nowHit: nowHit.hit };
}

async function settings(browser, url) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' }); await account(ctx, true);
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(url + '/#settings/reports'); await pg.locator('#photoStamp').waitFor();
  const box = pg.locator('#photoStamp');
  assert.equal(await box.isChecked(), false, 'domyślnie wyłączone');
  assert.match(await pg.locator('#v-settings').textContent(), /Data i godzina na zdjęciach/);
  await box.scrollIntoViewIfNeeded();
  if (out) await pg.locator('#photoStamp').evaluate(e => e.closest('.panel').scrollIntoView({ block: 'center' }));
  if (out) await pg.screenshot({ path: path.join(out, 'ustawienia-PL.png') });
  // PL/EN: napis podmieniony w miejscu (ten sam element), nic się nie przesuwa
  const mark = await pg.evaluate(() => { const e = document.getElementById('photoStamp'); e.dataset.mark = '1'; const l = e.closest('label').getBoundingClientRect(); return [l.top, l.left, l.height, scrollY]; });
  await pg.evaluate(() => document.querySelector('#v-settings [data-action=language]').click());
  await pg.waitForFunction(() => /Date and time on photos/.test(document.getElementById('v-settings').textContent));
  assert.equal(await pg.evaluate(() => document.getElementById('photoStamp').dataset.mark), '1', 'PL/EN nie przerysowuje');
  assert.deepEqual(await pg.evaluate(() => { const l = document.getElementById('photoStamp').closest('label').getBoundingClientRect(); return [l.top, l.left, l.height, scrollY]; }), mark, 'PL/EN nic nie przesuwa');
  if (out) await pg.screenshot({ path: path.join(out, 'ustawienia-EN.png') });
  await pg.evaluate(() => document.querySelector('#v-settings [data-action=language]').click());
  await pg.waitForFunction(() => /Data i godzina na zdjęciach/.test(document.getElementById('v-settings').textContent));
  // włączenie: dopiero „Zapisz ustawienia” zapisuje w module zdjęć; zostaje po ponownym otwarciu apki
  await box.check(); assert.equal(await pg.evaluate(() => window.OESTZdjecia.settings().stamp), false, 'bez Zapisz nic się nie zmienia');
  await pg.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click();
  assert.equal(await pg.evaluate(() => window.OESTZdjecia.settings().stamp), true, 'zapisane w module zdjęć');
  await pg.reload(); await pg.locator('#photoStamp').waitFor(); assert.equal(await pg.locator('#photoStamp').isChecked(), true, 'po ponownym otwarciu zostaje');
  await pg.locator('#photoStamp').uncheck(); await pg.getByRole('button', { name: 'Zapisz ustawienia', exact: true }).click();
  assert.equal(await pg.evaluate(() => window.OESTZdjecia.settings().stamp), false, 'wyłączenie też zapisane');
  assert.equal(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'bez przewijania w bok');
  assert.deepEqual(errs, []);
  await ctx.close();
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const url = 'http://127.0.0.1:' + server.address().port; let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    await settings(browser, url);
    const a = await photos(browser, url, true), b = await photos(browser, url, false);
    console.log('Worker: róg ' + a.dc.toFixed(1) + ', reszta ' + a.dt.toFixed(2) + ', białe px ' + a.wn + ' · główny wątek: róg ' + b.dc.toFixed(1) + ', reszta ' + b.dt.toFixed(2) + ', białe px ' + b.wn);
    console.log('ZDJECIA DATA UI PASS: domyślnie wyłączone, przełącznik w Raporty i zdjęcia (zapis, PL/EN bez drgań), napis dd/mm/rrrr GG:MM w prawym dolnym rogu (Worker i główny wątek), podgląd w tle z właściwą datą, stamp:false bez drugiego napisu');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
