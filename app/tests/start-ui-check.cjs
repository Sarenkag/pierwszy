// Ekran Start (pierwsze uruchomienie, bez konta): na Ionic + Vue. Przycisk Google w przeglądarce kończy się komunikatem (bez udawania logowania),
// „Wejdź bez logowania” zakłada konto lokalne i otwiera ekran główny; kolejny start z kontem nie pokazuje logowania.
// Wynik NIE zastępuje sprawdzenia na Pixelu 8 Pro.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  if (req.url.split('?')[0].endsWith('/')) p = path.join(p, 'index.html');
  fs.readFile(p, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(p)] || 'application/octet-stream'); res.end(b); });
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
  const errors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 } });
    const p = await ctx.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '/index.html'); await p.locator('#googleBtn').waitFor();
    const C = '#oest-szkielet ion-content';
    assert.equal(await p.evaluate(() => OESTEkrany.trasa()), 'start', 'bez konta: ekran Start');
    assert.equal(await p.evaluate(() => OESTKonto.get()), null);
    assert.equal(await p.locator('ion-toolbar ion-back-button:visible').count(), 0, 'Start nie ma strzałki Wstecz');
    assert.match(await p.locator(C).textContent(), /OEST/);
    assert.match(await p.locator('#googleBtn').textContent(), /Zaloguj przez Google/);
    // Google w przeglądarce bez identyfikatora: komunikat, nic nie udaje logowania, wejście bez logowania zostaje dostępne
    await p.locator('#googleBtn').click();
    await p.locator('#authErr').waitFor();
    assert.match(await p.locator('#authErr').textContent(), /Google|działa tylko|works only|not set up/i);
    assert.equal(await p.evaluate(() => OESTKonto.get()), null, 'błąd logowania nie zakłada konta');
    await p.locator('#skipBtn').waitFor();
    await p.locator('#skipBtn').click();
    await p.waitForFunction(() => OESTEkrany.trasa() === 'home');
    assert.equal(await p.evaluate(() => OESTKonto.get().provider), 'local', 'konto lokalne po wejściu bez logowania');
    // kolejny start z kontem: bez ekranu logowania
    await p.reload(); await p.waitForFunction(() => window.OESTEkrany && OESTEkrany.trasa() === 'home');
    assert.equal(await p.locator('#googleBtn').count(), 0);
    // adres Start otwiera ekran logowania także z kontem (jak po wylogowaniu)
    await p.evaluate(() => OESTEkrany.go('start')); await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => OESTEkrany.trasa()), 'start');
    assert.deepEqual(errors, [], 'błędy strony');
    console.log('START UI PASS: ekran Start bez konta, błąd Google bez udawania, wejście bez logowania, kolejny start z kontem');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
