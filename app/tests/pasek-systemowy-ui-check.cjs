// Pasek systemowy telefonu (godzina, bateria) zawsze czytelny (Grzegorz 07/11/2026, zrzut z apk-274):
// stałe czarne tło na całej szerokości pod paskiem, na każdym ekranie i nad każdym okienkiem; treść przewija się pod nim.
// Test przeglądarkowy (Quality Gate G2). Na telefonie wysokość paska podaje Capacitor (--safe-area-inset-top);
// tu ustawiamy ją ręcznie na 48 px, tak jak robi to Android. Wynik z przeglądarki NIE zastępuje sprawdzenia na Pixelu.
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
const PASEK = 48;
const EKRANY = ['index.html#home', 'index.html#ppm', 'index.html#cal', 'index.html#settings', 'index.html#reactive', 'index.html#keys', 'index.html#handover', 'index.html#powertrace', 'index.html#questions', 'index.html#zdjecia', 'inspekcje/index.html#ppm=EFA-INS-025'];
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {});
    const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await c.addInitScript(() => { if (location.protocol !== 'http:') return; if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
    await c.addInitScript(h => { const set = () => document.documentElement && (document.documentElement.style.setProperty('--safe-area-inset-top', h + 'px'), true); if (!set()) new MutationObserver((m, o) => { if (set()) o.disconnect(); }).observe(document, { childList: true }); }, PASEK);
    const p = await c.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    const pasek = () => p.evaluate(() => {
      const s = getComputedStyle(document.documentElement, '::after');
      return { h: parseFloat(s.height), top: s.top, w: parseFloat(s.width), tlo: s.backgroundColor, poz: s.position, z: s.zIndex, klik: s.pointerEvents, szer: innerWidth };
    });
    for (const e of EKRANY) {
      await p.goto('about:blank'); await p.goto(url + e); await p.waitForTimeout(600);
      R.widoki = R.widoki || {}; R.widoki[e] = await p.evaluate(() => (document.querySelector('.view:not([hidden])') || document.body).id || location.pathname);
      const zalogowany = await p.evaluate(() => !(document.getElementById('v-start') && document.getElementById('v-start').offsetParent) && document.body.innerText.length > 50);
      check(zalogowany, `${e}: ekran się nie otworzył (logowanie albo pusto)`);
      const a = await pasek();
      // przed przewinięciem nic widocznego (tekst, przycisk, ikona) nie może zaczynać się pod czarnym pasem (uwaga Codex w PR #81)
      const zasloniete = await p.evaluate(h => [...document.querySelectorAll('body *')].filter(el => {
        if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return false;
        const r = el.getBoundingClientRect(), s = getComputedStyle(el);
        if (r.width < 2 || r.height < 2 || r.bottom <= 0 || s.visibility === 'hidden' || +s.opacity === 0) return false;
        const tresc = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|IMG|svg|H1|H2|H3)$/.test(el.tagName) || [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
        return tresc && r.top < h;
      }).map(el => (el.id || el.getAttribute('class') || el.tagName).toString().slice(0, 30) + '@' + Math.round(el.getBoundingClientRect().top)), PASEK);
      R[e + ' zasloniete'] = zasloniete.slice(0, 5);
      check(zasloniete.length === 0, `${e}: pod czarnym pasem jest treść przed przewinięciem: ${zasloniete.slice(0, 4).join(', ')}`);
      await p.evaluate(() => { scrollTo(0, 600); document.querySelectorAll('*').forEach(el => { if (el.scrollHeight > el.clientHeight + 50 && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTop = 600; }); });
      await p.waitForTimeout(200);
      const b = await pasek();
      R[e] = { wysokosc: a.h, tlo: a.tlo, poPrzewinieciu: b.h };
      check(a.h === PASEK && b.h === PASEK, `${e}: czarny pasek ma ${a.h}/${b.h} px zamiast ${PASEK}`);
      check(a.top === '0px' && a.poz === 'fixed' && a.w === a.szer, `${e}: pasek nie stoi na górze na całej szerokości (${a.poz} top ${a.top}, ${a.w}/${a.szer} px)`);
      check(a.tlo === 'rgb(0, 0, 0)', `${e}: tło pod paskiem nie jest czarne (${a.tlo})`);
      check(a.z === '2147483647' && a.klik === 'none', `${e}: pasek nie jest na wierzchu albo przechwytuje dotyk (z ${a.z}, ${a.klik})`);
    }
    // okienko na wierzchu (np. pytanie, aparat) nie zasłania paska
    await p.goto(url + 'index.html#home'); await p.waitForTimeout(500);
    await p.evaluate(() => { if (window.OESTPytaj) OESTPytaj({ title: 'Test', text: 'x' }); }); await p.waitForTimeout(400);
    R.okienko = await p.evaluate(() => { let m = 0; document.querySelectorAll('body *').forEach(el => { const s = getComputedStyle(el); if (s.position === 'fixed') m = Math.max(m, +s.zIndex || 0); }); return m; });
    check(R.okienko < 2147483647, 'okienko ma z-index ' + R.okienko + ' – zasłoniłoby pasek');
    // w przeglądarce bez paska systemowego: wysokość 0, nic nie zasłania
    const c2 = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await c2.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const q = await c2.newPage(); await q.goto(url + 'index.html#ppm'); await q.waitForTimeout(500);
    R.bezPaska = await q.evaluate(() => parseFloat(getComputedStyle(document.documentElement, '::after').height));
    check(R.bezPaska === 0, 'bez paska systemowego czarny pas ma ' + R.bezPaska + ' px (powinno 0)');
    if (process.env.OEST_PASEK_ZRZUT) { await p.goto('about:blank'); await p.goto(url + 'index.html#ppm'); await p.waitForTimeout(600); await p.evaluate(() => scrollTo(0, 140)); await p.waitForTimeout(200); await p.screenshot({ path: process.env.OEST_PASEK_ZRZUT }); }
    check(errors.length === 0, 'błędy JS: ' + errors.slice(0, 3).join(' | '));
  } finally { if (browser) await browser.close(); server.close(); }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.error('PASEK SYSTEMOWY UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exitCode = 1; return; }
  console.log(`PASEK SYSTEMOWY UI PASS: czarne tło ${PASEK} px na całej szerokości na ${EKRANY.length} ekranach, także po przewinięciu i nad okienkiem; bez paska 0 px.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
