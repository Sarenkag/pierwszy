// Kreator opisu zlecenia Reactive (Grzegorz 18/11/2026 „Tak, ruszaj”, PROD-039): zastępuje „Typ” i „Co dokładnie”.
// Uruchomienie: node app/tests/reactive-kreator-ui-check.cjs
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
  window.Capacitor = { isNativePlatform: () => true, Plugins: plugins, isPluginAvailable: n => !!plugins[n], registerPlugin: n => plugins[n] || new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }), convertFileSrc: x => x };
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const B = 'http://127.0.0.1:' + server.address().port; let browser; const errors = [];
  // Nawigacja do ekranu apki: gdy strona już jest apką (index.html, szkielet wystartował) – OESTEkrany.go (adres zmienia tylko replaceState,
  // hash w adresie nie jest nawigacją); w przeciwnym razie (pusta karta, strona inspekcji) – prawdziwe wczytanie strony.
  const idz = async (pg, r) => { const u = new URL(pg.url()); if (!/inspekcje/.test(u.pathname) && /(index\.html|\/)$/.test(u.pathname) && await pg.evaluate(() => !!(window.OESTEkrany && OESTEkrany.trasa())).catch(() => false)) await pg.evaluate(x => OESTEkrany.go(x), r); else await pg.goto(B + '/index.html#' + r); };
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
    await ctx.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'rx-kr', email: 'demo@example.com', first: 'Greg', last: 'Sarna' })); });
    await ctx.addInitScript(fakePhone);
    const pg = await ctx.newPage(); pg.setDefaultTimeout(10000); pg.on('pageerror', e => errors.push(e.message));
    const ask = () => pg.locator('.oest-ask:not([data-wy-out])');
    const gone = () => pg.waitForSelector('.oest-ask', { state: 'detached' });
    const msg = re => pg.waitForFunction(r => new RegExp(r).test(document.querySelector('#rxMessage')?.textContent || ''), re.source);
    const saved = () => pg.waitForFunction(() => document.querySelector('#rxMessage')?.textContent.includes('Szkic zapisany'));
    const row = id => pg.locator('[data-rx=row][data-id=' + id + ']').click();
    const calls = () => pg.evaluate(() => window.__vt.calls);
    const jobs = () => pg.evaluate(() => OESTReactiveUI.repository.get().then(d => d.jobs));
    const drafts = () => pg.evaluate(() => OESTReactiveUI.repository.get().then(d => Object.values(d.reactiveDrafts || {})));
    const photo = path.join(require('node:os').tmpdir(), 'rx-kr-' + process.pid + '.png');
    await idz(pg, 'reactive');
    const png = await pg.evaluate(() => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const x = c.getContext('2d'); x.fillStyle = '#987'; x.fillRect(0, 0, 320, 240); return c.toDataURL('image/png').split(',')[1]; });
    fs.writeFileSync(photo, Buffer.from(png, 'base64'));
    // ---------- 1. Typ: 16 przycisków, domyślnie REPAIR ----------
    await pg.locator('[data-rx=new]').click(); await pg.locator('[data-rx-field=title]').waitFor();
    await row('type'); check(await pg.locator('[data-rx=type]').count() === 16, 'Typ: nie 16 przycisków');
    check(await pg.locator('[data-rx=type].on').getAttribute('data-value') === 'REPAIR', 'Typ: domyślnie nie REPAIR');
    await pg.locator('[data-rx=type][data-value=HANG]').click(); await saved();
    check(/HANG · Powieszenie/.test(await pg.locator('[data-rx=row][data-id=type]').textContent()), 'Typ: brak HANG na karcie');
    // ---------- 2. Gdzie: budynek, piętro, nr mieszkania ----------
    await row('where'); await pg.locator('[data-rx=building][data-value="Tower B"]').click(); await pg.locator('[data-rx-field=level]').selectOption('5');
    await pg.locator('[data-rx-field=flat]').fill('504'); await pg.locator('[data-rx-field=room]').fill('Office'); await saved();
    // ---------- 3. Co: okno grup → Meble → checkboxy, „＋ Dodaj”, Wstecz o jeden poziom ----------
    await row('co'); await pg.locator('[data-rx=kr-open]').click(); await pg.locator('[data-rx=kr-group]').first().waitFor();
    check(await pg.locator('[data-rx=kr-group]').count() === 15, 'Co: nie 15 grup');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'kreator-grupy.png') });
    await pg.locator('[data-rx=kr-group][data-id=furniture]').click(); await pg.locator('[data-rx=kr-item]').first().waitFor();
    check(await pg.locator('[data-rx=kr-item]').first().getAttribute('data-id') === 'coat hooks', 'Meble: haczyki nie na górze');
    await pg.locator('[data-rx=kr-item][data-id="coat hooks"]').click(); await pg.locator('[data-rx=kr-item][data-id=mirror]').click();
    await pg.locator('[data-rx=kr-item][data-id=mirror]').click(); // odznaczenie
    await pg.locator('[data-rx=kr-add]').click(); await pg.locator('.rx-kr-new').fill('key cabinet'); await pg.locator('.rx-kr-pl').fill('szafka na klucze'); await ask().locator('[data-a=ok]').click(); await gone();
    check(await pg.locator('[data-rx=kr-item][data-id="key cabinet"]:checked').count() === 1, '＋ Dodaj: nowa pozycja nie zaznaczona');
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'kreator-pozycje.png') });
    await pg.evaluate(() => document.dispatchEvent(new Event('backbutton'))); await pg.locator('[data-rx=kr-group]').first().waitFor();
    check(await pg.locator('[data-rx=kr-group][data-id=furniture]').textContent().then(t => /✓/.test(t)), 'Wstecz: grupy bez ✓ przy Meblach');
    await pg.locator('[data-rx=kr-done]').click(); await pg.locator('[data-rx-field=title]').waitFor();
    // ---------- 4. Na czym + opis EN ----------
    await pg.locator('[data-rx=kr-on][data-value=door]').click(); await saved();
    { const d = (await drafts())[0]; check(JSON.stringify(d.kreator.items) === '["coat hooks","key cabinet"]' && d.kreator.on === 'door' && d.flat === '504', 'kreator: złe wybory ' + JSON.stringify(d.kreator));
      check(d.title === 'Hang coat hooks and key cabinet on door', 'nazwa z kreatora: ' + d.title);
      check(d.problem === 'Coat hooks fixed to the door, evenly spaced and checked secure. Key cabinet hung on the door, level and checked secure.', 'opis EN: ' + d.problem); }
    check(await pg.locator('[data-rx=kr-weight]').count() === 0, 'waga bez ciężkich pozycji');
    // ---------- 5. nauka: drugi raz ta pozycja na górze ----------
    await pg.locator('[data-rx=kr-open]').first().click(); await pg.locator('[data-rx=kr-group][data-id=furniture]').click(); await pg.locator('[data-rx=kr-item]').first().waitFor();
    { const ids = await pg.locator('[data-rx=kr-item]').evaluateAll(a => a.map(x => x.dataset.id)); check(ids[0] === 'coat hooks' && ids[1] === 'key cabinet', 'nauka: kolejność ' + ids.slice(0, 3)); }
    // ---------- 6. ciężkie: dwie wagi, bez „alone” ----------
    await pg.locator('[data-rx=kr-groups]').click(); await pg.locator('[data-rx=kr-group][data-id=heavy]').click(); await pg.locator('[data-rx=kr-item][data-id="stone block"]').click(); await pg.locator('[data-rx=kr-done]').click();
    await pg.locator('[data-rx=kr-weight]').first().waitFor();
    check(await pg.locator('[data-rx=kr-weight]').count() === 2, 'ciężkie: nie dwie wagi');
    await pg.locator('[data-rx=kr-weight][data-value=veryHeavy]').click(); await saved();
    { const d = (await drafts())[0]; check(/Stone block \(approx\. over 100 kg\) hung/.test(d.problem) && !/alone|trolley/i.test(d.problem), 'ciężkie: opis ' + d.problem); }
    // ---------- 7. Open Vantify: Summary i opis z kreatora ----------
    await pg.locator('[data-rx=vt-open]').click(); await pg.locator('.rx-vt-sum').waitFor();
    { const sum = await pg.locator('.rx-vt-sum').inputValue(), desc = await pg.locator('.rx-vt-desc').inputValue();
      check(sum === 'Hang coat hooks, key cabinet and stone block (approx. over 100 kg) on door – Flat 504, EN Office, Level 5, Tower B', 'Summary z kreatora: ' + sum);
      check(/^Hang coat hooks, key cabinet and stone block/.test(desc) && /Location: Tower B, Level 5, Flat 504, EN Office/.test(desc), 'Description z kreatora: ' + desc); }
    await ask().locator('[data-a=no]').click(); await gone();
    // ---------- 7b. zmiana budynku na Premises: nr mieszkania dalej widoczny i do usunięcia (przegląd Codex #147) ----------
    await row('where'); await pg.locator('[data-rx=building][data-value="Premises"]').click(); await pg.locator('[data-rx-field=flat]').waitFor();
    check(await pg.locator('[data-rx-field=flat]').inputValue() === '504', 'Premises: nr mieszkania ukryty');
    await pg.locator('[data-rx-field=flat]').fill(''); await saved();
    { const d = (await drafts())[0]; check(!d.flat, 'nr mieszkania nie usunięty'); }
    // ---------- 8. EN ----------
    await pg.evaluate(() => window.OESTSettings.update(s => { s.appearance.language = 'en'; })); await pg.reload(); await pg.locator('[data-rx-field=title]').waitFor();
    await row('co'); await pg.locator('[data-rx=kr-open]').first().click(); await pg.locator('[data-rx=kr-group]').first().waitFor();
    { const t = await pg.locator('.rx-body').innerText(); check(/Furniture/.test(t) && !/Meble/.test(t), 'EN: grupy po polsku'); }
    // ---------- 9. stare zadanie z drzewka: zostaje „What exactly” z dotychczasowym wyborem (PROD-039, przegląd Codex #147) ----------
    await idz(pg, 'reactive/new/handle-0'); await pg.reload(); await pg.locator('[data-rx-field=title]').waitFor();
    check(await pg.locator('[data-rx=row][data-id=tree]').count() === 1 && await pg.locator('[data-rx=row][data-id=co]').count() === 0, 'stare zadanie: brak sekcji drzewka, wymuszony kreator');
    check(/›/.test(await pg.locator('[data-rx=row][data-id=tree]').textContent()), 'stare zadanie: zniknął zapisany wybór');
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  if (errors.length) fails.push('błędy strony: ' + errors.join(' | '));
  if (fails.length) { console.error('REACTIVE KREATOR UI FAIL\n- ' + fails.join('\n- ')); process.exitCode = 1; }
  else console.log('REACTIVE KREATOR UI PASS: 16 typów (REPAIR domyślnie), nr mieszkania, okno grup → checkboxy, ＋ Dodaj, Wstecz o poziom, Na czym, opis EN z zatwierdzonych zdań, nauka kolejności, ciężkie: 2 wagi bez „alone”, Open Vantify z kreatora, EN');
})();
