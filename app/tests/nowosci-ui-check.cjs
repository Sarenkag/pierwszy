// Kafelek „Nowości firm” (moduly/nowosci, Grzegorz 18/11/2026) – PIC, Savills, Smart Managed Solutions.
// N1 kafelek stoi na miejscu „Statystyk”: siatka 2×4 bez zmian, ekran główny dalej się nie przewija;
// N2 apka pobiera nagłówki raz na dobę (drugie otwarcie w tej samej dobie = zero zapytań);
// N3 bez sieci żadnego zapytania, okienko mówi „Brak sieci”, nic nie udaje;
// N4 okienko: max 5 nagłówków, One Eastside na górze, potem najnowsze, skrót firmy przy każdym, bez dubli;
// N4b data artykułu DD/MM/YYYY (AI-008); One Eastside nie wypada przy obcięciu do 40; N4c „przeczytane” bez pobranych nie przesuwa granicy.
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
// Filtry Grzegorza 18/11 20:32: PIC i Savills tylko o One Eastside (zapytanie wymaga „One Eastside”), Smart – wszystko + oferty pracy.
const FEEDS = [
  ['Pension Insurance Corporation', rss([item('PIC completes One Eastside in Birmingham', 'PIC', 107), item('Sphere hands Birmingham skyscraper to PIC', 'Sustainable Construction', 106)])],
  ['Savills', rss([item('Savills lets final penthouse at One Eastside', 'Property Week', 4)])],
  ['Smart Managed Solutions', rss([item('Investcorp to take majority stake in Smart Managed Solutions', 'PEI Private Equity', 25), item('Smart Managed Solutions wins new data centre contract', 'FM World', 10)])]
];
const job = (t, city, days, id) => `<item><title>${t}</title><pubDate>${d(days)}</pubDate><link>https://smartmanagedsolutions-1734694596.teamtailor.com/jobs/${id}</link><tt:locations><tt:location><tt:name>${city}</tt:name><tt:city>${city}</tt:city></tt:location></tt:locations></item>`;
const JOBS = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:tt="https://teamtailor.com/locations"><channel><title>Smart</title>${[job('Mechanical Engineer', 'London', 0, 1), job('Electrical  Engineer', 'Birmingham', 2, 2), job('Contract Supervisor', 'London', 5, 3)].join('')}</channel></rss>`;
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
      const f = FEEDS.find(([k]) => q.includes(k));
      r.fulfill({ status: 200, contentType: 'application/xml', body: f ? f[1] : rss([]) });
    });
    await c.route(/^https:\/\/smartmanagedsolutions-1734694596\.teamtailor\.com\/jobs\.rss/, r => { calls++; r.fulfill({ status: 200, contentType: 'application/rss+xml', body: JOBS }); });
    await c.route(/^https?:\/\/(?!127\.0\.0\.1|news\.google\.com|smartmanagedsolutions-1734694596\.teamtailor\.com)/, r => r.abort());
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
    check(calls === 4, 'N2: pierwsze pobranie = 4 zapytania (3 × Google News + oferty pracy), było ' + calls);
    // N5 znaczek
    const badge = await p.evaluate(() => { const b = document.querySelector('#hmTiles [data-hnews] .kf-n'); return b && !b.hidden ? b.textContent : ''; });
    check(badge === '5', 'N5: znaczek nowych „' + badge + '” zamiast 5');
    if (SHOT) await p.screenshot({ path: path.join(SHOT, 'ekran-glowny-PL.png') });
    // N4 okienko
    await p.click('#hmTiles [data-hnews]');
    await p.waitForSelector('#hmPop.in .hm-nw');
    const all = await p.evaluate(() => [...document.querySelectorAll('#hmPop .hm-nw')].map(a => ({ f: a.querySelector('.hm-nf').textContent, t: a.querySelector('b').textContent, s: a.querySelector('small').textContent, href: a.getAttribute('href') })));
    const rows = all.slice(0, 5), sum = all[5];
    check(all.length === 6, 'N4: wierszy ' + all.length + ' zamiast 5 + 1 zbiorczy ofert pracy');
    check(sum && sum.f === 'Smart' && /3 ofert pracy/.test(sum.t) && /teamtailor\.com\/jobs$/.test(sum.href), 'N4: brak wiersza zbiorczego ofert pracy: ' + JSON.stringify(sum));
    check(rows.length === 5, 'N4: nagłówków ' + rows.length + ' zamiast 5');
    const exp = [['Savills', 'Savills lets final penthouse at One Eastside', /One Eastside/], ['PIC', 'Sphere hands Birmingham skyscraper to PIC', /One Eastside/], ['PIC', 'PIC completes One Eastside in Birmingham', /One Eastside/],
      ['Smart', 'Electrical Engineer', /Oferta pracy · Birmingham/], ['Smart', 'Smart Managed Solutions wins new data centre contract', /FM World/]];
    exp.forEach(([f, t, s], i) => check(rows[i] && rows[i].f === f && rows[i].t === t && s.test(rows[i].s), 'N4: pozycja ' + (i + 1) + ' powinna być ' + f + ' „' + t + '”, jest ' + JSON.stringify(rows[i])));
    check(!all.some(r => /London/.test(r.s)), 'N4: oferta z Londynu jako osobny wiersz (powinna być tylko w zbiorczym)');
    check(new Set(rows.map(r => r.t)).size === rows.length, 'N4: dubel nagłówka');
    check(rows.every(r => !/ - (PIC|Property Week|React News|PEI Private Equity)$/.test(r.t)), 'N4: wydawca doklejony do tytułu');
    check(rows.every(r => /^https:\/\/(news\.google\.com|smartmanagedsolutions-1734694596\.teamtailor\.com)\//.test(r.href)), 'N4: link nie do artykułu/oferty');
    check(rows.every(r => /\d{2}\/\d{2}\/\d{4}$/.test(r.s)), 'N4b: data nie w formacie DD/MM/YYYY: ' + rows.map(r => r.s).join(' | '));
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
    // N4b 45 nowszych zwykłych (Smart) + 1 starszy One Eastside → One Eastside zostaje w pamięci i na górze
    const keep = await p.evaluate(async () => {
      const old = localStorage.getItem('oest.news'); localStorage.removeItem('oest.news');
      const f = window.fetch; const now = Date.now();
      window.fetch = u => { const q = decodeURIComponent(new URL(u).searchParams.get('q'));
        const it = q.includes('Pension') ? '<item><title>Old One Eastside story - X</title><link>https://news.google.com/a/oes</link><pubDate>' + new Date(now - 300 * 864e5).toUTCString() + '</pubDate><source>X</source></item>'
          : q.includes('Smart Managed') ? Array.from({ length: 45 }, (_, i) => '<item><title>Smart news number ' + i + ' - X</title><link>https://news.google.com/a/' + i + '</link><pubDate>' + new Date(now - i * 36e5).toUTCString() + '</pubDate><source>X</source></item>').join('') : '';
        return Promise.resolve(new Response('<rss><channel>' + it + '</channel></rss>')); };
      await OESTNowosci.load(true); window.fetch = f;
      const r = { inCache: OESTNowosci.cache().items.some(x => x.oes), first: OESTNowosci.top(5)[0].title };
      localStorage.setItem('oest.news', old); return r;
    });
    check(keep.inCache && keep.first === 'Old One Eastside story', 'N4b: One Eastside wypadł przy obcięciu: ' + JSON.stringify(keep));
    // N4d jeden kanał zawodzi przy odświeżeniu: jego zapisane pozycje zostają, ponowienie za godzinę (nie za dobę)
    const part = await p.evaluate(async () => {
      const old = localStorage.getItem('oest.news'), f = window.fetch;
      window.fetch = u => /Pension/.test(decodeURIComponent(u)) ? Promise.reject(new TypeError('offline')) : Promise.resolve(new Response('<rss><channel></channel></rss>'));
      const r0 = OESTNowosci.cache().items.filter(x => x.src === 'pic').length;
      const c = await OESTNowosci.load(true); window.fetch = f;
      const r = { before: r0, after: c.items.filter(x => x.src === 'pic').length, retryInH: Math.round((c.t + 864e5 - Date.now()) / 36e5) };
      localStorage.setItem('oest.news', old); return r;
    });
    check(part.before === 2 && part.after === 2 && part.retryInH === 1, 'N4d: zawodzący kanał wyczyścił zapisane albo brak ponowienia za godzinę: ' + JSON.stringify(part));
    // N4c „przeczytane” przy pustej pamięci nie przesuwa granicy
    const seen = await p.evaluate(() => { const old = localStorage.getItem('oest.news'), s0 = localStorage.getItem('oest.news.seen'); localStorage.removeItem('oest.news'); OESTNowosci.seen(); const s1 = localStorage.getItem('oest.news.seen'); localStorage.setItem('oest.news', old); return s0 === s1; });
    check(seen, 'N4c: seen() bez pobranych nagłówków przesunął granicę przeczytania');
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
  console.log('NOWOSCI UI PASS: kafelek na miejscu Statystyk (2×4, bez przewijania), pobranie raz na dobę, bez sieci zero zapytań, PIC i Savills tylko o One Eastside, Smart: wiadomości + oferty pracy (Birmingham osobno, reszta w wierszu zbiorczym), daty DD/MM/YYYY, znaczek nowych, PL/EN.');
})().catch(e => { console.error(e); process.exit(1); });
