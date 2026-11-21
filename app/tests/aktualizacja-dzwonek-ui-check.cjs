// Nowa wersja apki NIE zasłania ekranu (Grzegorz 20/11/2026): zamiast dużego paska na dole jest wpis w dzwonku,
// da się go odłożyć („Później” – wraca dopiero przy następnej wersji), nic nie instaluje się samo.
// Udajemy apkę Android (Capacitor) z wersją 671 i wydanie apk-672 na GitHubie. Wynik NIE zastępuje sprawdzenia na Pixelu.
// OEST_ZRZUTY=<folder> zapisuje zrzuty PL/EN.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www'), OUT = process.env.OEST_ZRZUTY || '';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const fails = []; const check = (ok, msg) => { if (!ok) fails.push(msg); };
const RELEASE = { tag_name: 'apk-672', assets: [{ name: 'OEST-672.apk', browser_download_url: 'https://example.invalid/OEST-672.apk', size: 60 * 1048576 }] };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port + '/';
  const browser = await chromium.launch(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {});
  try {
    const c = await browser.newContext({ viewport: { width: 384, height: 855 }, deviceScaleFactor: OUT ? 2 : 1, hasTouch: true });
    await c.addInitScript(() => {
      window.__installs = 0; window.__failNext = false;
      const AppUpdate = { info: () => Promise.resolve({ versionCode: 671 }), install: () => { window.__installs++; return window.__failNext ? Promise.reject(new Error('timeout')) : new Promise(() => {}); }, addListener: () => ({ remove() {} }) };
      window.Capacitor = { isNativePlatform: () => true, isPluginAvailable: n => n === 'AppUpdate' || n === 'App', registerPlugin: n => n === 'AppUpdate' ? AppUpdate : {}, Plugins: { AppUpdate, App: { addListener() { return { remove() {} }; } } } };
      if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 }));
      const set = () => document.documentElement && (document.documentElement.style.setProperty('--safe-area-inset-top', '44px'), document.documentElement.style.setProperty('--safe-area-inset-bottom', '44px'), true);
      if (!set()) new MutationObserver((m, o) => { if (set()) o.disconnect(); }).observe(document, { childList: true });
    });
    await c.route(/^https:\/\/api\.github\.com\/repos\/Sarenkag\/pierwszy\/releases\/latest/, r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(RELEASE) }));
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)(?!api\.github\.com)/, r => r.abort());
    const p = await c.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    const setLang = l => p.evaluate(l => { OESTSettings.update(s => { s.appearance.language = l; }); OESTSettingsUI.applyTheme(); }, l);
    const shot = n => OUT ? p.screenshot({ path: path.join(OUT, n) }) : null;
    await p.goto(url + 'index.html#home'); await p.waitForTimeout(5200); // update.js sprawdza 4 s po starcie

    // 1. ekran główny: żadnego paska, kafelki niczym nie przykryte
    const home = await p.evaluate(() => {
      const fixed = [...document.body.querySelectorAll('body > *')].filter(e => getComputedStyle(e).position === 'fixed' && !e.hidden && e.offsetParent !== null && /aktualiz|update|wersja|version/i.test(e.textContent));
      return { banner: !!document.getElementById('updBanner'), fixed: fixed.map(e => e.textContent.trim().slice(0, 60)), badge: document.querySelector('#hmBell .hm-badge').textContent, installs: window.__installs };
    });
    check(!home.banner && !home.fixed.length, 'na ekranie głównym jest pasek nowej wersji: ' + home.fixed.join(' | '));
    check(home.installs === 0, 'apka sama zaczęła pobierać/instalować');
    for (const l of ['pl', 'en']) { await setLang(l); await p.waitForTimeout(400); await shot('po-ekran-' + l + '.png'); }

    // 2. dzwonek: wpis „Nowa wersja apki” z „Później”, PL i EN
    for (const l of ['pl', 'en']) {
      await setLang(l); await p.waitForTimeout(300);
      await p.click('#hmBell'); await p.waitForTimeout(900);
      const b = await p.evaluate(() => { const r = document.querySelector('[data-hgo="update"]'); const later = document.querySelector('[data-hlater]'); return { row: r && r.textContent.replace(/\s+/g, ' ').trim(), later: later && later.textContent.trim() }; });
      const want = l === 'pl' ? ['Nowa wersja apki', 'Wersja 672', 'Później'] : ['New app version', 'Version 672', 'Later'];
      check(b.row && b.row.includes(want[0]) && b.row.includes(want[1]), `${l}: w dzwonku brak wpisu o wersji 672 (${b.row})`);
      check(b.later === want[2], `${l}: przycisk odłożenia to „${b.later}” zamiast „${want[2]}”`);
      await shot('po-dzwonek-' + l + '.png');
      await p.evaluate(() => document.dispatchEvent(new Event('backbutton'))); await p.waitForTimeout(700);
    }

    // 3. stuknięcie wpisu: najpierw pytanie (Pobierz / Anuluj), nic bez zgody
    await setLang('pl'); await p.click('#hmBell'); await p.waitForTimeout(800);
    await p.click('[data-hgo="update"]'); await p.waitForTimeout(900);
    const ask = await p.evaluate(() => ({ ask: [...document.querySelectorAll('.oest-ask')].map(a => a.textContent.replace(/\s+/g, ' ').trim()).join('|'), installs: window.__installs }));
    check(/Pobrać i zainstalować wersję 672/.test(ask.ask), 'stuknięcie wpisu nie pyta o pobranie: ' + ask.ask);
    check(ask.installs === 0, 'pobieranie ruszyło przed zgodą');
    await p.evaluate(() => document.dispatchEvent(new Event('backbutton'))); await p.waitForTimeout(700); // = Anuluj, działa jak „Później”
    check(await p.evaluate(() => localStorage.getItem('oest.update.later') === '672' && !OESTUpdate.note()), '„Anuluj” w pytaniu nie odłożył wersji 672');
    await p.evaluate(() => localStorage.removeItem('oest.update.later')); await p.reload(); await p.waitForTimeout(5200);

    // 4. „Później”: wpis znika, licznik maleje, po ponownym uruchomieniu nie wraca (ta sama wersja)
    const przed = await p.evaluate(() => +document.querySelector('#hmBell .hm-badge').textContent || 0);
    await p.click('#hmBell'); await p.waitForTimeout(800);
    check(!!(await p.$('[data-hlater]')), 'po ponownym uruchomieniu brak wpisu z „Później”');
    if (await p.$('[data-hlater]')) { await p.click('[data-hlater]'); await p.waitForTimeout(400); }
    const po = await p.evaluate(() => ({ row: !!document.querySelector('[data-hgo="update"]'), n: +document.querySelector('#hmBell .hm-badge').textContent || 0, hid: document.querySelector('#hmBell .hm-badge').hidden }));
    check(!po.row, '„Później” nie schował wpisu');
    check((po.hid ? 0 : po.n) === przed - 1, `licznik dzwonka po „Później” ${po.hid ? 0 : po.n}, a powinien ${przed - 1}`);
    await p.evaluate(() => document.dispatchEvent(new Event('backbutton'))); await p.waitForTimeout(500);
    await p.reload(); await p.waitForTimeout(5200);
    await p.click('#hmBell'); await p.waitForTimeout(800);
    check(!(await p.$('[data-hgo="update"]')), 'po „Później” wpis wrócił przy tej samej wersji');
    await p.evaluate(() => document.dispatchEvent(new Event('backbutton'))); await p.waitForTimeout(500);

    // 5. Ustawienia → Konto: instalacja nadal dostępna ręcznie
    const panel = await p.evaluate(() => OESTUpdate.panelHtml());
    check(/Pobierz i zainstaluj wersję 672/.test(panel), 'w Ustawieniach brak przycisku „Pobierz i zainstaluj wersję 672”');

    // 6. przerwane pobieranie: wpis w dzwonku pokazuje błąd i „spróbuj jeszcze raz” (nie udaje zwykłego „dotknij, żeby pobrać”) – uwaga Codex #184
    await p.evaluate(() => { localStorage.removeItem('oest.update.later'); window.__failNext = true; }); await p.reload(); await p.waitForTimeout(5200);
    await p.evaluate(() => { window.__failNext = true; });
    await p.click('#hmBell'); await p.waitForTimeout(800); await p.click('[data-hgo="update"]'); await p.waitForTimeout(900);
    await p.click('.oest-ask .ok'); await p.waitForTimeout(800);
    await p.click('#hmBell'); await p.waitForTimeout(800);
    const err = await p.evaluate(() => { const r = document.querySelector('[data-hgo="update"]'); return r && r.textContent.replace(/\s+/g, ' ').trim(); });
    check(err && /Nie udało się pobrać/.test(err) && /spróbować jeszcze raz/.test(err), 'po przerwanym pobieraniu wpis nie mówi o błędzie: ' + err);
    await p.evaluate(() => document.dispatchEvent(new Event('backbutton'))); await p.waitForTimeout(500);
    check(!errors.length, 'błędy JS: ' + errors.join('; '));
    console.log('licznik dzwonka: przed „Później” ' + przed + ', po ' + (po.hid ? 0 : po.n));
  } finally { await browser.close(); server.close(); }
  if (fails.length) { console.log('BŁĘDY:\n- ' + fails.join('\n- ')); process.exit(1); }
  console.log('AKTUALIZACJA UI PASS: (PL/EN, bez paska, „Później”, pytanie przed pobraniem, błąd pobierania w dzwonku, przycisk w Ustawieniach).');
})().catch(e => { console.error(e); process.exit(1); });
