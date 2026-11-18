// Kafelek „Nowości firm” (moduly/nowosci, Grzegorz 18/11/2026) – PIC, Savills, Smart Managed Solutions.
// N1 kafelek stoi na miejscu „Statystyk”: siatka 2×4 bez zmian, ekran główny dalej się nie przewija;
// N2 apka pobiera nagłówki raz na dobę (drugie otwarcie w tej samej dobie = zero zapytań);
// N3 bez sieci żadnego zapytania, okienko mówi „Brak sieci”, nic nie udaje;
// N4 okienko: max 5 nagłówków, One Eastside na górze, potem najnowsze, skrót firmy przy każdym, bez dubli;
// N5 znaczek z liczbą nowych na kafelku znika po otwarciu okienka; zmiana PL/EN nie przerysowuje listy.
// Chrome 412×915 jak Pixel 8 Pro. Zapytania do Google News są podstawione (stałe dane), nic nie wychodzi do sieci.
// Wynik NIE zastępuje sprawdzenia na Pixelu.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const SHOT = process.env.OEST_SHOT_DIR || '';
const DAY = 86400000, NOW = Date.now();
const d = n => new Date(NOW - n * DAY).toUTCString();
const item = (t, pub, days) => `<item><title>${t} - ${pub}</title><link>https://news.google.com/rss/articles/${encodeURIComponent(t.slice(0, 20))}</link><pubDate>${d(days)}</pubDate><source url="https://x.example">${pub}</source></item>`;
const rss = items => `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>t</title>${items.join('')}</channel></rss>`;
const FEEDS = {
  'Pension Insurance Corporation': rss([item('PIC paves the way to a £85 million buy-in for the Interface Europe Pension Scheme', 'PIC', 28), item('From gridlock to growth: cities need more planning powers', 'PIC', 37)]),
  'Savills': rss([item('Savills: Birmingham build to rent pipeline hits record', 'Property Week', 4), item('Savills advises on Midlands BTR portfolio sale', 'React News', 12)]),
  'Smart Managed Solutions': rss([item('Investcorp to take majority stake in Smart Managed Solutions', 'PEI Private Equity', 25)]),
  'One Eastside': rss([item('PIC completes One Eastside in Birmingham', 'PIC', 107), item('Savills: Birmingham build to rent pipeline hits record', 'Property Week', 4)])
};
const fails = [];
function check(ok, msg) { if (!ok) fails.push(msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {});
    const c = await browser.newContext({ viewport: { width: 412, height: 915 }, hasTouch: true, deviceScaleFactor: SHOT ? 2 : 1 });
    let calls = 0;
    await c.route(/^https:\/\/news\.google\.com\/rss\/search/, r => {
      calls++;
      const q = decodeURIComponent(new URL(r.request().url()).searchParams.get('q'));
      const k = Object.keys(FEEDS).find(k => q.includes(k));
      r.fulfill({ status: 200, contentType: 'application/xml', body: k ? FEEDS[k] : rss([]) });
    });
    await c.route(/^https?:\/\/(?!127\.0\.0\.1|news\.google\.com)/, r => r.abort());
    await c.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
    const p = await c.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '#home');
    await p.waitForFunction(() => { const c = window.OESTNowosci && OESTNowosci.cache(); return c && c.items.length; });
    // N1
    const tiles = await p.evaluate(() => [...document.querySelectorAll('#hmTiles .tile')].map(e => ({ t: e.querySelector('b').textContent, news: !!e.dataset.hnews })));
    check(tiles.length === 8, 'N1: kafelków ' + tiles.length + ' zamiast 8');
    check(tiles[6] && tiles[6].news && tiles[6].t === 'Nowości firm', 'N1: „Nowości firm” nie stoi na miejscu Statystyk: ' + JSON.stringify(tiles[6]));
    check(!tiles.some(t => t.t === 'Statystyki'), 'N1: Statystyki nadal na ekranie');
    const scroll = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    check(scroll <= 0, 'N1: ekran główny przewija się o ' + scroll + ' px');
    check(calls === 4, 'N2: pierwsze pobranie = 4 zapytania, było ' + calls);
    // N5 znaczek
    const badge = await p.evaluate(() => { const b = document.querySelector('#hmTiles [data-hnews] .kf-n'); return b && !b.hidden ? b.textContent : ''; });
    check(badge === '5', 'N5: znaczek nowych „' + badge + '” zamiast 5');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ekran-glowny-PL.png') });
    // N4 okienko
    await p.click('#hmTiles [data-hnews]');
    await p.waitForSelector('#hmPop.in .hm-nw');
    const rows = await p.evaluate(() => [...document.querySelectorAll('#hmPop .hm-nw')].map(a => ({ f: a.querySelector('.hm-nf').textContent, t: a.querySelector('b').textContent, s: a.querySelector('small').textContent, href: a.getAttribute('href') })));
    check(rows.length === 5, 'N4: nagłówków ' + rows.length + ' zamiast 5');
    check(rows[0] && /One Eastside/.test(rows[0].s) && rows[1] && /One Eastside/.test(rows[1].s), 'N4: One Eastside nie na górze: ' + JSON.stringify(rows.slice(0, 2)));
    check(rows[0] && rows[0].t === 'Savills: Birmingham build to rent pipeline hits record' && rows[0].f === 'Savills', 'N4: pierwszy powinien być najnowszy o One Eastside (Savills): ' + JSON.stringify(rows[0]));
    check(rows[1] && rows[1].f === 'PIC' && rows[1].t === 'PIC completes One Eastside in Birmingham', 'N4: drugi = PIC One Eastside: ' + JSON.stringify(rows[1]));
    check(new Set(rows.map(r => r.t)).size === rows.length, 'N4: dubel nagłówka');
    check(rows.every(r => !/ - (PIC|Property Week|React News|PEI Private Equity)$/.test(r.t)), 'N4: wydawca doklejony do tytułu');
    check(rows.every(r => /^https:\/\/news\.google\.com\//.test(r.href)), 'N4: link nie do artykułu');
    check(rows.slice(2).map(r => r.f).join(',') === 'Savills,Smart,PIC', 'N4: kolejność po One Eastside nie wg daty: ' + rows.slice(2).map(r => r.f));
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'okno-PL.png') });
    const before = await p.evaluate(() => document.querySelector('#hmPop .hm-nw'));
    await p.evaluate(() => { OESTSettings.update(s => { s.appearance.language = 'en'; }); OESTSettingsUI.applyTheme(); });
    const ttl = await p.evaluate(() => document.querySelector('#hmPop .hm-ph b').textContent);
    check(/Company news/.test(ttl), 'N5: tytuł okienka po EN „' + ttl + '”');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'okno-EN.png') });
    await p.click('#hmPop [data-hx]');
    await p.waitForFunction(() => document.getElementById('hmPop').hidden);
    const badge2 = await p.evaluate(() => { const b = document.querySelector('#hmTiles [data-hnews] .kf-n'); return b && !b.hidden ? b.textContent : ''; });
    check(badge2 === '', 'N5: znaczek po otwarciu nadal „' + badge2 + '”');
    // N2 ta sama doba – zero nowych zapytań
    await p.reload(); await p.waitForFunction(() => window.OESTNowosci && document.querySelector('#hmTiles [data-hnews]'));
    await p.evaluate(() => OESTNowosci.load(false));
    check(calls === 4, 'N2: w tej samej dobie kolejne zapytania (' + calls + ')');
    // N3 bez sieci: zero zapytań, komunikat
    await p.evaluate(() => { localStorage.removeItem('oest.news'); });
    await c.setOffline(true);
    const n0 = calls;
    await p.evaluate(() => OESTNowosci.load(true));
    check(calls === n0, 'N3: bez sieci poszło zapytanie');
    await p.click('#hmTiles [data-hnews]');
    await p.waitForSelector('#hmPop.in');
    const note = await p.evaluate(() => document.querySelector('#hmPop .hm-note').textContent);
    check(/No network|Brak sieci/.test(note), 'N3: brak komunikatu o sieci: „' + note + '”');
    check(!errors.length, 'błędy JS: ' + errors.join(' | '));
  } finally { if (browser) await browser.close(); server.close(); }
  if (fails.length) { console.error('NOWOSCI UI FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('NOWOSCI UI PASS: kafelek na miejscu Statystyk (2×4, bez przewijania), pobranie raz na dobę, bez sieci zero zapytań, 5 nagłówków z One Eastside na górze, znaczek nowych, PL/EN.');
})().catch(e => { console.error(e); process.exit(1); });
