// „Wyślij” przez Androidowe „Udostępnij” (inspekcje, apka bez logowania Google) – audyt niezależny 19/11/2026, pozycje P0 nr 17 i 18.
// Wtyczka ReportShare odpowiada „shared”, gdy tylko otworzy się okno wyboru apki (także gdy użytkownik je anuluje),
// więc apka NIE wie, czy mail wyszedł. Wymagania (docs/PRODUCT.md, wysyłka): najpierw sprawdzić połączenie, nigdy nie udawać wysłania,
// „Wyślij” nic nie kasuje. Sprawdzamy na prawdziwej stronie inspekcji (app/www po copy-web) z atrapą wtyczki:
//  1. brak internetu → okno wyboru się NIE otwiera, raport czeka w kolejce, komunikat o braku połączenia,
//  2. jest internet → okno się otwiera, raport ma status „przekazano · niepotwierdzone”: Word i zdjęcia zostają, PPM nie jest „Wysłana”,
//  3. drugie „Wyślij wszystko” nie otwiera wyboru apki drugi raz dla tego samego raportu (bez dubli maili),
//  4. „Potwierdzam, wysłane” → dopiero wtedy status wysłany i PPM „Wysłana”,
//  5. „Wyślij ponownie” → raport wraca do kolejki; dwa szybkie „Wyślij wszystko” przy wolnej sieci = jedno okno wyboru,
//  6. błąd wtyczki → status błąd, raport czeka.
// NIE sprawdza (Pixel 8 Pro): prawdziwego okna Androida i Gmaila.
// Uruchomienie: node app/tests/udostepnij-ui-check.cjs (po npm run copy-web)
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require('./przegladarka.cjs');
const root = path.resolve(__dirname, '../www');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.docx': 'application/octet-stream' };
const server = http.createServer((req, res) => {
  const p = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root + path.sep) && p !== root) { res.writeHead(403).end(); return; }
  const file = p === root ? path.join(root, 'index.html') : p;
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; } res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(b); });
});
const PPM_ID = 'EFA-INS-001';
let STEP = 'start';
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    async function open(mode) {
      const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, serviceWorkers: 'block' });
      // połączenie: test generate_204 z moduly/wysylka (reachable) – tu atrapa zamiast prawdziwego internetu
      await ctx.route('https://www.gstatic.com/generate_204', r => mode.net ? r.fulfill({ status: 204, body: '' }) : r.abort());
      await ctx.addInitScript(m => {
        if (location.protocol === 'about:') return; // pusta strona po wyjściu z inspekcji (brak rodzica w historii) – bez localStorage
        localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'share-test', email: '', first: 'G', last: 'S' }));
        localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' }));
        window.__shareCalls = [];
        const P = { ReportShare: { share: async o => { window.__shareCalls.push({ files: o.files.map(f => f.name), to: o.to }); console.log('OEST-SHARE'); if (m.reject) throw new Error('SHARE_UNAVAILABLE'); return { status: 'shared' }; } } };
        window.Capacitor = { isNativePlatform: () => true, Plugins: P, isPluginAvailable: n => !!P[n], convertFileSrc: x => x,
          registerPlugin: n => P[n] || new Proxy({}, { get: (_, k) => k === 'then' ? undefined : () => Promise.reject(Error('UNAVAILABLE')) }) };
        // okienka apki (moduly/przycisk ask): odpowiedź „OK” jak użytkownik
        window.__said = []; // treść okienek zapamiętana przed kliknięciem (okienko znika od razu)
        // okienka z samym tekstem to ion-alert (OESTOkna.pytaj, szkielet Ionic): treść z nagłówka i .alert-message, „OK” = ostatni przycisk
        new MutationObserver(() => {
          const a = document.querySelector('.oest-ask:not([data-wy-out])'); const b = a && a.querySelector('[data-a=ok]'); if (b) { window.__said.push(a.innerText); console.log('OEST-ASK ' + a.innerText); b.click(); }
          const al = document.querySelector('ion-alert:not([data-said])'), ab = al && al.querySelector('.alert-button-group .alert-button:last-child');
          if (ab) { al.setAttribute('data-said', '1'); const t = [al.querySelector('.alert-title'), al.querySelector('.alert-message')].map(e => e ? e.textContent : '').join(' ').trim(); window.__said.push(t); console.log('OEST-ASK ' + t); setTimeout(() => ab.click(), 600); }
        }).observe(document, { childList: true, subtree: true });
      }, mode);
      const page = await ctx.newPage(), errors = [];
      page.said = []; page.shares = 0; // z konsoli – przeżywa przejście strony (np. powrót po wysłaniu)
      page.on('console', m => { const t = m.text(); if (t.startsWith('OEST-ASK ')) page.said.push(t.slice(9)); else if (t === 'OEST-SHARE') page.shares++; });
      page.setDefaultTimeout(10000);
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/inspekcje/index.html#ppm=' + PPM_ID);
      await page.locator('#toQueue').waitFor({ state: 'visible' });
      if (await page.locator('#allOk').isVisible().catch(() => false)) await page.click('#allOk');
      if (await page.locator('#podpis').isVisible().catch(() => false)) await page.fill('#podpis', 'G. Sarna');
      return { ctx, page, errors };
    }
    const queue = page => page.evaluate(() => new Promise(res => { const rq = indexedDB.open('inspekcje'); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => res(g.result.map(i => ({ id: i.id, status: i.status, docx: i.docx ? i.docx.length : 0, pdf: i.pdf ? i.pdf.length : 0 }))); }; }));
    const ppm = page => page.evaluate(id => { try { return (JSON.parse(localStorage.getItem('oest.ppm.stage') || '{}') || {})[id] || null; } catch (e) { return null; } }, PPM_ID);
    const ppmStage = async page => { const keys = await page.evaluate(() => Object.keys(localStorage)); const k = keys.filter(x => /ppm/i.test(x) && /stage/i.test(x))[0]; return k ? page.evaluate(([k, id]) => (JSON.parse(localStorage.getItem(k) || '{}') || {})[id] || null, [k, PPM_ID]) : ppm(page); };
    const calls = page => page.evaluate(() => window.__shareCalls.length);

    STEP = '1 brak internetu';
    {
      const { ctx, page, errors } = await open({ net: false });
      await page.click('#toQueue');
      for (let i = 0; i < 150 && !page.said.join(' ').includes('Brak połączenia z internetem'); i++) await new Promise(r => setTimeout(r, 100));
      assert.match(page.said.join(' '), /Brak połączenia z internetem/, 'komunikat o braku połączenia');
      assert.equal(page.shares, 0, 'bez internetu okno wyboru apki się nie otwiera');
      await page.waitForURL(u => !/\/inspekcje\//.test(u.href), { timeout: 8000 }).catch(() => {}); // po Wyślij inspekcja sama wychodzi do rodzica – nie ścigamy się z tym przejściem
      // kolejka w nowej karcie: ta karta pamięta otwartą inspekcję (sessionStorage) i czasem wraca do formularza zamiast kolejki
      const qp = await ctx.newPage(); qp.on('pageerror', e => errors.push(e.message));
      await qp.goto(base + '/inspekcje/index.html#queue'); await qp.locator('#qSend').waitFor({ state: 'visible' });
      const q = await queue(qp);
      assert.equal(q.length, 1, 'raport w kolejce'); assert.equal(q[0].status, 'wait', 'raport czeka');
      assert.ok(q[0].docx > 0, 'Word zostaje');
      assert.deepEqual(errors, []);
      await ctx.close();
    }

    STEP = '2–5 internet, Udostępnij';
    {
      const { ctx, page, errors } = await open({ net: true });
      await page.click('#toQueue');
      for (let i = 0; i < 150 && page.shares < 1; i++) await new Promise(r => setTimeout(r, 100));
      assert.equal(page.shares, 1, 'z internetem okno wyboru apki otwiera się raz');
      if (!page.url().startsWith(base)) await page.goto(base + '/inspekcje/index.html#queue');
      await page.waitForFunction(() => new Promise(res => { const rq = indexedDB.open('inspekcje'); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => res(g.result.length === 1 && g.result[0].status === 'shared'); }; }), null, { timeout: 15000 });
      let q = await queue(page);
      assert.equal(q[0].status, 'shared', 'status: przekazano, niepotwierdzone (nie „wysłane”)');
      assert.ok(q[0].docx > 0, 'Word NIE jest kasowany po otwarciu okna wyboru');
      assert.ok(q[0].pdf > 0, 'PDF zostaje');
      let st = await ppmStage(page);
      assert.ok(st, 'PPM ma etap'); assert.notEqual(st.s, 'sent', 'PPM nie jest „Wysłana” bez potwierdzenia'); assert.notEqual(st.mail, 'sent', 'mail PPM nie jest „wysłany”');

      STEP = '3 bez dubla';
      await page.goto(page.url().split('#')[0] + '#queue'); await page.reload();
      await page.locator('#qSend').waitFor({ state: 'visible' });
      assert.match(await page.locator('#qList').innerText(), /przekazano · niepotwierdzone/);
      assert.match(await page.locator('#qSub').innerText(), /Do potwierdzenia: 1/);
      assert.ok(await page.locator('#qSend').isDisabled(), 'nic do wysłania – raport czeka na potwierdzenie, nie na drugi mail');
      await page.evaluate(() => { window.__shareCalls = []; });
      assert.equal(await calls(page), 0);

      STEP = '5 wyślij ponownie';
      await page.locator('[data-again]').click();
      await page.waitForFunction(() => !document.querySelector('[data-again]'));
      q = await queue(page); assert.equal(q[0].status, 'wait', 'ponownie = znów w kolejce');
      // wolna sieć: drugie „Wyślij wszystko” w trakcie sprawdzania połączenia nie otwiera wyboru apki drugi raz (uwaga Codex #158)
      await ctx.unroute('https://www.gstatic.com/generate_204');
      await ctx.route('https://www.gstatic.com/generate_204', r => setTimeout(() => r.fulfill({ status: 204, body: '' }).catch(() => {}), 1500));
      await page.evaluate(() => document.getElementById('qSend').click());
      await page.waitForTimeout(300);
      await page.evaluate(() => document.getElementById('qSend').click());
      await page.waitForFunction(() => window.__shareCalls.length === 1, null, { timeout: 15000 });
      await page.waitForTimeout(2500);
      assert.equal(await calls(page), 1, 'dwa kliknięcia w czasie sprawdzania sieci = jedno okno wyboru');
      await page.locator('[data-ok]').waitFor();

      STEP = '4 potwierdzenie';
      await page.locator('[data-ok]').click();
      await page.waitForFunction(() => !document.querySelector('[data-ok]'));
      q = await queue(page); assert.equal(q[0].status, 'sent', 'po „Potwierdzam, wysłane” status wysłany');
      st = await ppmStage(page); assert.equal(st.mail, 'sent', 'mail PPM „wysłany” dopiero po potwierdzeniu'); assert.notEqual(st.s, 'queued', 'PPM nie zostaje „W kolejce”');
      assert.match(await page.locator('#qSub').innerText(), /Wszystko wysłane/);
      assert.deepEqual(errors, []);
      await ctx.close();
    }

    STEP = '6 błąd wtyczki';
    {
      const { ctx, page, errors } = await open({ net: true, reject: true });
      await page.click('#toQueue');
      for (let i = 0; i < 150 && page.shares < 1; i++) await new Promise(r => setTimeout(r, 100));
      assert.equal(page.shares, 1, 'okno wyboru apki otwierane raz');
      for (let i = 0; i < 50 && !page.said.join(' ').includes('Nie udało się otworzyć'); i++) await new Promise(r => setTimeout(r, 100));
      assert.match(page.said.join(' '), /Nie udało się otworzyć Gmaila/, 'komunikat o błędzie');
      await page.waitForURL(u => !/\/inspekcje\//.test(u.href), { timeout: 8000 }).catch(() => {}); // po Wyślij inspekcja sama wychodzi do rodzica – nie ścigamy się z tym przejściem
      // kolejka w nowej karcie: ta karta pamięta otwartą inspekcję (sessionStorage) i czasem wraca do formularza zamiast kolejki
      const qp = await ctx.newPage(); qp.on('pageerror', e => errors.push(e.message));
      await qp.goto(base + '/inspekcje/index.html#queue'); await qp.locator('#qSend').waitFor({ state: 'visible' });
      await qp.waitForFunction(() => new Promise(res => { const rq = indexedDB.open('inspekcje'); rq.onsuccess = () => { const g = rq.result.transaction('queue').objectStore('queue').getAll(); g.onsuccess = () => res(g.result.length === 1 && g.result[0].status === 'err'); }; }), null, { timeout: 15000 });
      const q = await queue(qp); assert.ok(q[0].docx > 0, 'Word zostaje po błędzie');
      assert.deepEqual(errors, []);
      await ctx.close();
    }
    console.log('UDOSTEPNIJ UI PASS');
  } catch (e) {
    console.error('UDOSTEPNIJ UI FAIL [' + STEP + ']: ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})();
