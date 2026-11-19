// Scenariusz Grzegorza 19/11/2026 (apk-596/598): zlecenie Reactive po polsku, zdjęcie, notatka wstawiona kilka razy →
// stuknięcie zdjęcia → Wstecz → Podgląd → Wstecz → Ustawienia → wysyłka. Każdy zgłoszony błąd ma tu swój warunek:
//  1) zdjęcie otwiera się w okienku apki i NIC nie zostaje pod ekranami (wcześniej window.open doklejał je do <body>, widoczne nawet w Ustawieniach),
//  2) Wstecz telefonu zamyka okienko / podgląd i zostaje w zleceniu (nie wychodzi do listy),
//  3) podgląd wygląda jak raport (biała kartka „Engineers Report”), jest po angielsku i bez powtórzonych notatek,
//  4) wysłany raport (pola do Word/PDF) jest po angielsku i bez powtórzeń.
// Uruchomienie: node app/tests/reactive-podglad-ui-check.cjs
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www'), SHOTS = process.env.OEST_SHOTS || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (p === root) p = path.join(root, 'index.html');
  if (!p.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
const fails = [], check = (ok, msg) => { if (!ok) fails.push(msg); };
function fakePhone() {
  window.__vt = { calls: [], wzory: {}, next: [], open: null };
  const V = {
    wzory: async () => ({ ...window.__vt.wzory }),
    action: async o => { window.__vt.calls.push(JSON.parse(JSON.stringify(o.action))); const n = window.__vt.next.shift(); return typeof n === 'function' ? n(o.action) : n || { status: 'error', code: 'brak' }; },
    open: async o => { window.__vt.calls.push({ op: 'window', ...o }); return window.__vt.open || { events: [] }; }
  };
  const plugins = { Vantify: V, Translate: { plToEn: async ({ text }) => ({ text: 'EN ' + text }) } };
  window.Capacitor = { isNativePlatform: () => true, Plugins: plugins, registerPlugin: n => plugins[n] || new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }), convertFileSrc: x => x };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'rx-pg', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    await ctx.addInitScript(fakePhone);
    const pg = await ctx.newPage(); pg.setDefaultTimeout(10000); pg.on('pageerror', e => errors.push(e.message));
    const ask = () => pg.locator('.oest-ask:not([data-wy-out])');
    const gone = () => pg.waitForSelector('.oest-ask', { state: 'detached' });
    const msg = re => pg.waitForFunction(r => new RegExp(r).test(document.querySelector('#rxMessage')?.textContent || ''), re.source);
    const saved = () => pg.waitForFunction(() => document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));
    const row = id => pg.locator('[data-rx=row][data-id=' + id + ']').click();
    const back = () => pg.evaluate(() => window.OESTWstecz.wstecz());
    const onCard = () => pg.locator('[data-rx-field=title]').waitFor({ timeout: 5000 }).then(() => true, () => false);
    const leaked = () => pg.evaluate(() => ({ body: [...document.body.children].filter(e => e.tagName === 'IMG').length, imgs: [...document.images].filter(i => i.getBoundingClientRect().height > 0 && !i.closest('.view:not([hidden]), .oest-ask, .top')).map(i => i.className || i.alt || 'img') }));
    const photo = path.join(require('node:os').tmpdir(), 'rx-pg-' + process.pid + '.png');
    await pg.goto(B + '/#reactive');
    await pg.evaluate(() => window.OESTSettings.update(s => { s.profile.companyEmail = 'work@example.com'; }));
    const png = await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d'); x.fillStyle = '#6a4'; x.fillRect(0, 0, 320, 240); return c.toDataURL('image/png').split(',')[1]; });
    fs.writeFileSync(photo, Buffer.from(png, 'base64'));
    // ---------- zlecenie po polsku, notatka wstawiona 3 razy, zdjęcie przed ----------
    await pg.locator('[data-rx=new]').click(); await pg.locator('[data-rx-field=title]').waitFor();
    await pg.locator('[data-rx-field=title]').fill('Usunięcie rośliny');
    if (!await pg.locator('[data-rx-field=note]').count()) await row('start');
    await pg.locator('[data-rx-field=note]').fill('Poproszono o usunięcie kwiatu\nPoproszono o usunięcie kwiatu\npoproszono o usunięcie kwiatu');
    await pg.locator('[data-rx-photos=before]').setInputFiles(photo); await pg.waitForFunction(() => document.querySelector('#rx-before img'));
    // ---------- 1+2. zdjęcie: okienko apki, Wstecz zamyka, nic nie zostaje ----------
    await pg.locator('#rx-before img').first().click(); await ask().locator('img.rx-photo-full').waitFor();
    { const l = await leaked(); check(l.body === 0, 'zdjęcie doklejone do <body> (przecieka pod ekrany)'); }
    await back(); await gone();
    check(await onCard(), 'Wstecz po zdjęciu wyszedł ze zlecenia');
    // ---------- 3. Podgląd = kartka raportu po angielsku, bez powtórzeń ----------
    await row('finish'); await pg.locator('[data-rx=sum-view]').click(); await pg.locator('.rr-page').waitFor();
    { const bg = await pg.locator('.rr-page').evaluate(e => getComputedStyle(e).backgroundColor), t = await pg.locator('.rr-page').innerText();
      check(bg === 'rgb(255, 255, 255)', 'podgląd bez tła raportu: ' + bg);
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'podglad-raportu.png') });
      check(/Engineers Report/.test(t) && /Before — Photo 1/.test(t), 'podgląd nie wygląda jak raport');
      check(/EN Usunięcie rośliny/.test(t), 'podgląd: tytuł nie po angielsku');
      check((t.match(/EN Poproszono o usunięcie kwiatu/gi) || []).length === 1, 'podgląd: notatka powtórzona albo nie po angielsku: ' + t);
      check(!/^\s*Poproszono/im.test(t), 'podgląd: polski tekst bez tłumaczenia: ' + t); }
    await back();
    check(await onCard(), 'Wstecz z podglądu wyszedł ze zlecenia (ma wrócić do zlecenia)');
    check(await pg.locator('.rr-page').count() === 0, 'po Wstecz podgląd dalej na ekranie');
    { const v = await pg.locator('[data-rx-field=reportText]').inputValue().catch(() => ''); check(/EN Usunięcie rośliny/.test(v) || v === '', 'pole „Raport (EN)” po polsku: ' + v); }
    // ---------- 1. inne ekrany: nic ze zlecenia nie zostaje (Ustawienia) ----------
    await pg.locator('#rx-before img').first().click(); await ask().locator('img.rx-photo-full').waitFor(); await back(); await gone();
    const jobHash = await pg.evaluate(() => location.hash);
    await back(); await pg.locator('[data-rx=new]').waitFor();
    await pg.evaluate(() => { location.hash = '#settings'; }); await pg.waitForFunction(() => document.querySelector('#v-settings:not([hidden])'));
    { const l = await leaked(); check(l.body === 0 && l.imgs.length === 0, 'Ustawienia: zdjęcie/obraz z innego ekranu pod kafelkami ' + JSON.stringify(l)); }
    // ---------- 4. wysyłka: pola raportu (Word/PDF) po angielsku, bez powtórzeń ----------
    await pg.evaluate(h => { location.hash = h; }, jobHash); await pg.locator('[data-rx-field=title]').waitFor();
    await pg.evaluate(() => { const R = window.OESTReactiveReport; R.build = async f => { window.__sent = f; throw Error('STOP_TEST'); }; });
    await pg.locator('[data-rx=send]').click(); await pg.locator('[data-rx=send-now]').waitFor(); await pg.locator('[data-rx=send-now]').click();
    await pg.waitForFunction(() => window.__sent, null, { timeout: 15000 });
    { const f = await pg.evaluate(() => window.__sent);
      check(/^EN /.test(f.title), 'wysłany raport: tytuł nie po angielsku: ' + f.title);
      check((f.details.match(/EN Poproszono o usunięcie kwiatu/gi) || []).length === 1 && !/^\s*Poproszono/im.test(f.details), 'wysłany raport: notatki po polsku albo powtórzone: ' + f.details); }
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e).toString().split('\n').filter(l => /podglad-ui-check|Timeout/.test(l)).join(' / ')); }
  finally { if (browser) await browser.close(); server.close(); }
  if (errors.length) fails.push('błędy strony: ' + errors.join(' | '));
  if (fails.length) { console.error('REACTIVE PODGLAD UI FAIL\n- ' + fails.join('\n- ')); process.exitCode = 1; }
  else console.log('REACTIVE PODGLAD UI PASS: zdjęcie w okienku apki (nic pod ekranami, także w Ustawieniach), Wstecz zostaje w zleceniu, podgląd = kartka raportu po angielsku bez powtórzeń, wysłany raport po angielsku');
})();
