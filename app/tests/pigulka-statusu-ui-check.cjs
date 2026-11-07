// Pigułka statusu (Grzegorz 07/11/2026 18:29): moduly/znacznik → OESTZnacznik.status(tryb).
// Zasada: zawsze ten sam kształt, cień, wypełnienie, wielkość i zaokrąglenie – różni się tylko kolor i napis; PL i EN bez skoków.
// Sprawdza w Chrome (412×915 jak Pixel 8 Pro) każdy tryb w PL i EN: wymiary, zaokrąglenie, cień, czcionka, napis mieści się, kolory trybów.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/pigulka-statusu-ui-check.cjs  (po npm run copy-web)
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
// zatwierdzone wartości (README modułu) – zmiana wymaga zgody Grzegorza
const TRYBY = {
  zalegla: { pl: 'Zaległa', en: 'Overdue', kolor: 'rgb(255, 123, 114)' },
  nierozpoczeta: { pl: '– – – –', en: '– – – –', kolor: 'rgb(195, 201, 232)' },
  wtrakcie: { pl: 'W trakcie', en: 'In progress', kolor: 'rgb(240, 199, 94)' },
  wstrzymana: { pl: 'Wstrzymana', en: 'On hold', kolor: 'rgb(121, 184, 255)' },
  gotowa: { pl: 'Gotowa', en: 'Ready', kolor: 'rgb(95, 214, 160)' }
};
const SZEROKOSC = 98;
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    for (const lang of ['pl', 'en']) {
      const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
      await c.addInitScript(l => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); }, lang);
      await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
      await p.goto(url + '/index.html#ppm'); await p.waitForTimeout(400);
      // język tak jak przełącza go Grzegorz: Ustawienia → Wygląd → Język
      await p.evaluate(l => { window.OESTSettings.update(s => { s.appearance.language = l; }); window.OESTSettingsUI.applyTheme(); }, lang);
      R[lang] = await p.evaluate(tryby => {
        const box = document.createElement('div'); box.style.cssText = 'position:fixed;left:0;top:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px';
        box.innerHTML = tryby.map(t => window.OESTZnacznik.status(t)).join(''); document.body.appendChild(box);
        return [...box.children].map(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return { tryb: el.classList[1], tekst: el.textContent, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, miesciSie: el.scrollWidth <= el.clientWidth,
            radius: s.borderTopLeftRadius, cien: s.boxShadow.replace(/rgb[a]?\([^)]*\)/g, 'K'), cienNapisu: s.textShadow.replace(/rgb[a]?\([^)]*\)/g, 'K'), font: s.fontSize + ' ' + s.fontWeight,
            ramka: s.borderTopWidth, kolor: s.color, ramkaKolor: s.borderTopColor, align: s.textAlign, pelneTlo: s.backgroundColor === s.color };
        });
      }, Object.keys(TRYBY));
      await c.close();
    }
    const wszystkie = [...R.pl, ...R.en], wzor = wszystkie[0];
    for (const lang of ['pl', 'en']) for (const x of R[lang]) {
      const o = TRYBY[x.tryb], gdzie = `${lang}/${x.tryb}`;
      check(!!o, `${gdzie}: nieznany tryb`); if (!o) continue;
      check(x.tekst === o[lang], `${gdzie}: napis „${x.tekst}” zamiast „${o[lang]}”`);
      check(x.w === SZEROKOSC, `${gdzie}: szerokość ${x.w} px zamiast ${SZEROKOSC} px`);
      check(x.miesciSie, `${gdzie}: napis „${x.tekst}” nie mieści się w pigułce`);
      check(x.kolor === o.kolor && x.ramkaKolor === o.kolor, `${gdzie}: kolor ${x.kolor}/${x.ramkaKolor} zamiast ${o.kolor}`);
      check(!x.pelneTlo, `${gdzie}: pełne wypełnienie (ma być delikatne tło jak w innych trybach)`);
      for (const k of ['h', 'radius', 'cien', 'cienNapisu', 'font', 'ramka', 'align']) check(x[k] === wzor[k], `${gdzie}: ${k} = ${x[k]}, a w ${wzor.tryb} = ${wzor[k]} (ma być identycznie)`);
    }
    check(wzor.cien.split(',').length === 3 && wzor.cien.includes('inset'), `cień 3D niepełny: ${wzor.cien}`);
    check(wzor.font === '12px 700', `czcionka ${wzor.font} zamiast 12px 700`);
    check(errors.length === 0, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log(JSON.stringify(R, null, 1));
  if (fails.length) { console.error('PIGULKA STATUSU UI FAIL\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('PIGULKA STATUSU UI PASS (' + Object.keys(TRYBY).length + ' trybów × PL/EN, ' + SZEROKOSC + ' px)');
})();
