// Ekran główny mieści się w całości na telefonie i się nie przewija (Grzegorz 07/11/2026):
// - między czarnym paskiem a logo nie ma ~1 cm pustego miejsca (był podwójny odstęp: .wrap + #v-home),
// - Wi‑Fi, HDD (zamiast Dysk/Drive w obu językach) i licznik zdjęć bez słowa „Zdjęcia” (np. 13/200MB) w JEDNEJ linii,
// - całość mieści się bez przewijania (palcem nic się nie przesuwa), PL i EN, zmiana języka niczego nie przesuwa.
// Chrome 412×915 jak Pixel 8 Pro, pasek systemowy 48 px (na telefonie podaje go Capacitor). Wynik NIE zastępuje sprawdzenia na Pixelu.
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
const PASEK = 48, MAX_ODSTEP = 12;
// 412×915 = Pixel 8 Pro w przeglądarce; 384×780 = Pixel 8 Pro w trybie „wysoka rozdzielczość” minus paski Androida – nadal bez przewijania
const EKRANY = [{ width: 412, height: 915 }, { width: 384, height: 780 }];
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  let browser;
  try {
    browser = await chromium.launch(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {});
    for (const vp of EKRANY) {
      const c = await browser.newContext({ viewport: vp, hasTouch: true });
      await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      await c.addInitScript(() => { if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); });
      await c.addInitScript(h => { const set = () => document.documentElement && (document.documentElement.style.setProperty('--safe-area-inset-top', h + 'px'), true); if (!set()) new MutationObserver((m, o) => { if (set()) o.disconnect(); }).observe(document, { childList: true }); }, PASEK);
      const p = await c.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
      const setLang = l => p.evaluate(l => { OESTSettings.update(s => { s.appearance.language = l; }); OESTSettingsUI.applyTheme(); }, l);
      const zmierz = () => p.evaluate(() => {
        const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right), h: Math.round(b.height) }; };
        const st = document.querySelector('.hm-st'), tiles = [...document.querySelectorAll('#hmTiles .tile')].map(e => e.getBoundingClientRect());
        return {
          logo: r('.hm-logo'), st: r('.hm-st'), net: r('#hmNet'), drv: r('#hmDrive'), ph: r('#hmPhotos'), days: r('#hmDays'),
          stPrzelewa: st.scrollWidth > st.clientWidth + 1,
          drvTxt: document.querySelector('#hmDrive span').textContent, phTxt: document.querySelector('#hmPhotos span').textContent,
          tiles: tiles.length, tilesDol: Math.round(Math.max(...tiles.map(b => b.bottom))), tileMinH: Math.round(Math.min(...tiles.map(b => b.height))),
          tileUciete: [...document.querySelectorAll('#hmTiles .tile')].some(e => e.scrollHeight > e.clientHeight + 1),
          sh: document.documentElement.scrollHeight, bsh: document.body.scrollHeight, wsh: document.querySelector('.wrap').scrollHeight - document.querySelector('.wrap').clientHeight, ih: innerHeight
        };
      });
      await p.goto(url + 'index.html#home'); await p.waitForTimeout(700);
      const w = {};
      for (const l of ['pl', 'en']) {
        await setLang(l); await p.waitForTimeout(500);
        const m = w[l] = await zmierz(), k = `${vp.width}×${vp.height} ${l.toUpperCase()}`;
        check(m.logo.t - PASEK <= MAX_ODSTEP, `${k}: między czarnym paskiem a logo ${m.logo.t - PASEK} px pustego miejsca (max ${MAX_ODSTEP})`);
        check(m.logo.t >= PASEK, `${k}: logo wchodzi pod czarny pasek (${m.logo.t} px)`);
        check(m.net.t === m.drv.t && m.drv.t === m.ph.t && !m.stPrzelewa, `${k}: Wi‑Fi / HDD / zdjęcia nie są w jednej linii (${m.net.t}/${m.drv.t}/${m.ph.t})`);
        check(/^HDD · /.test(m.drvTxt), `${k}: zamiast „HDD” jest „${m.drvTxt}”`);
        check(/^\d+(\.\d)?\/\d+MB$/.test(m.phTxt), `${k}: licznik zdjęć „${m.phTxt}” zamiast np. 13/200MB`);
        check(m.tiles === 8 && m.tilesDol <= m.ih, `${k}: kafelki wychodzą poza ekran (dół ${m.tilesDol} / ${m.ih}, kafelków ${m.tiles})`);
        check(!m.tileUciete, `${k}: napis w kafelku ucięty (najniższy kafelek ${m.tileMinH} px)`);
        check(m.sh <= m.ih && m.bsh <= m.ih && m.wsh <= 0, `${k}: ekran da się przewinąć (${m.sh} px treści na ${m.ih} px)`);
        // palcem w dół i w górę: nic się nie przesuwa
        await p.mouse.move(200, 600); await p.mouse.wheel(0, 400); await p.waitForTimeout(150);
        await p.evaluate(() => scrollTo(0, 500)); await p.waitForTimeout(100);
        const y = await p.evaluate(() => scrollY + document.scrollingElement.scrollTop + document.body.scrollTop + document.querySelector('.wrap').scrollTop);
        check(y === 0, `${k}: ekran przesunął się o ${y} px`);
        // najdłuższe napisy, jakie mogą się pojawić, też mieszczą się w jednej linii
        for (const t of l === 'pl' ? ['HDD · brak połączenia', 'HDD · zsynchronizowany', 'HDD · 99 w kolejce'] : ['HDD · not connected', 'HDD · 99 queued']) {
          const o = await p.evaluate(t => { const d = document.querySelector('#hmDrive span'), f = document.querySelector('#hmPhotos span'), n = document.querySelector('#hmNet span'); const a = [d.textContent, f.textContent, n.textContent]; d.textContent = t; f.textContent = '199/200MB'; n.textContent = 'Dane komórkowe'; const st = document.querySelector('.hm-st'); const ok = st.scrollWidth <= st.clientWidth + 1 && document.querySelector('#hmNet').getBoundingClientRect().top === document.querySelector('#hmPhotos').getBoundingClientRect().top; d.textContent = a[0]; f.textContent = a[1]; n.textContent = a[2]; return ok; }, t);
          check(o, `${k}: „Dane komórkowe · ${t} · 199/200MB” nie mieści się w jednej linii`);
        }
        // na Wi‑Fi (codzienny przypadek) napis HDD jest pełny, bez „…”
        for (const t of l === 'pl' ? ['HDD · brak połączenia', 'HDD · zsynchronizowany', 'HDD · 99 w kolejce'] : ['HDD · not connected', 'HDD · 99 queued']) {
          const o = await p.evaluate(t => { const d = document.querySelector('#hmDrive span'), f = document.querySelector('#hmPhotos span'), n = document.querySelector('#hmNet span'); const a = [d.textContent, f.textContent, n.textContent]; d.textContent = t; f.textContent = '199/200MB'; n.textContent = 'Wi‑Fi'; const ok = d.scrollWidth <= d.clientWidth + 1; d.textContent = a[0]; f.textContent = a[1]; n.textContent = a[2]; return ok; }, t);
          check(o, `${k}: na Wi‑Fi napis „${t}” jest ucięty`);
        }
        R[k] = { odstep: m.logo.t - PASEK, linia: m.st.h, hdd: m.drvTxt, zdjecia: m.phTxt, kafelekH: m.tileMinH, dolKafelkow: m.tilesDol, ekran: m.ih, tresc: m.sh };
      }
      // zmiana PL ↔ EN nic nie przesuwa
      for (const x of ['logo', 'st', 'days']) check(w.pl[x].t === w.en[x].t && w.pl[x].h === w.en[x].h, `${vp.width}×${vp.height}: ${x} skacze przy zmianie języka`);
      check(w.pl.tilesDol === w.en.tilesDol, `${vp.width}×${vp.height}: kafelki skaczą przy zmianie języka`);
      if (process.env.OEST_EKRAN_ZRZUT && vp.height === 915) for (const l of ['pl', 'en']) { await setLang(l); await p.waitForTimeout(400); await p.screenshot({ path: process.env.OEST_EKRAN_ZRZUT.replace('.png', '-' + l + '.png') }); }
      await setLang('pl');
      // inne ekrany przewijają się dalej normalnie (blokada tylko na ekranie głównym)
      await p.goto(url + 'index.html#settings'); await p.waitForTimeout(500);
      const ust = await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.wrap')); return s.overflowY + ' ' + s.paddingBottom; });
      check(ust === 'visible 48px', `${vp.width}×${vp.height}: układ ekranu głównego został na Ustawieniach (${ust})`);
      check(errors.length === 0, 'błędy JS: ' + errors.slice(0, 3).join(' | '));
      await c.close();
    }
  } finally { if (browser) await browser.close(); server.close(); }
  console.log('POMIARY ' + JSON.stringify(R));
  if (fails.length) { console.error('EKRAN GLOWNY UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exitCode = 1; return; }
  console.log(`EKRAN GLOWNY UI PASS: bez pustego miejsca pod paskiem, Wi‑Fi/HDD/zdjęcia w jednej linii, całość bez przewijania na ${EKRANY.map(v => v.width + '×' + v.height).join(' i ')}, PL/EN bez skoków.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
