// Płynność i stabilność wyglądu (Grzegorz 07/11/2026, audyt B1–B7 + tabela ruchu).
// Test przeglądarkowy (Quality Gate G2). Najpierw mierzy wszystko, potem sprawdza progi – w wyniku są liczby, nie tylko PASS/FAIL.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/plynnosc-ui-check.cjs  (po npm run copy-web)
// Ekran 412×915 jak Pixel 8 Pro. Wynik z przeglądarki NIE zastępuje sprawdzenia na telefonie.
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
const ROUTES = ['home', 'ppm', 'cal', 'settings', 'settings/profile', 'reactive', 'keys', 'handover', 'powertrace', 'questions', 'zdjecia'];
const R = {}, fails = [];
function check(ok, msg) { if (!ok) fails.push(msg); }

(async () => {
  // ---------- B1: żaden arkusz ani skrypt z internetu w apce (statycznie, po copy-web) ----------
  R.zasobyZSieci = {};
  for (const f of ['index.html', 'inspekcje/index.html']) {
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    const ext = [...html.matchAll(/<(?:link|script)\b[^>]*(?:href|src)\s*=\s*["'](https?:\/\/[^"']+)/gi)].map(m => m[1]);
    R.zasobyZSieci[f] = ext;
    check(ext.length === 0, `B1: ${f} ładuje z internetu: ${ext.join(', ')}`);
  }

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    async function ctx(opts) {
      const c = await browser.newContext({ viewport: { width: 412, height: 915 }, ...(opts || {}) });
      await c.addInitScript(() => {
        if (!localStorage.getItem('oest.account')) localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 }));
        window.__anim = []; // każda uruchomiona animacja CSS: nazwa + element
        document.addEventListener('animationstart', e => { const t = e.target; window.__anim.push({ n: e.animationName, el: (t.id || (t.getAttribute && t.getAttribute('class')) || t.tagName).toString().slice(0, 40), id: t.getAttribute && (t.getAttribute('data-id') || t.getAttribute('data-fam')) }); }, true);
      });
      return c;
    }
    const errors = [];

    // ---------- B1: pierwszy obraz inspekcji przy wolnym internecie (5 s opóźnienia każdego zapytania na zewnątrz) ----------
    console.error('[krok] B1: pierwszy obraz inspekcji przy wolnym internecie (5 s opó');
    {
      const c = await ctx();
      await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, async r => { await new Promise(z => setTimeout(z, 5000)); r.abort(); });
      R.pierwszyObraz = {};
      for (const [k, u] of [['inspekcja', '/inspekcje/index.html#ppm=EFA-INS-025'], ['ekranGlowny', '/index.html#home']]) {
        const p = await c.newPage();
        await p.goto(url + u, { waitUntil: 'commit' });
        await p.waitForFunction(() => performance.getEntriesByName('first-contentful-paint').length > 0, null, { timeout: 20000 }).catch(() => {});
        R.pierwszyObraz[k] = await p.evaluate(() => { const e = performance.getEntriesByName('first-contentful-paint')[0]; return e ? Math.round(e.startTime) : null; });
        await p.close();
      }
      check(R.pierwszyObraz.inspekcja !== null && R.pierwszyObraz.inspekcja < 1500, `B1: pierwszy obraz inspekcji przy wolnym internecie ${R.pierwszyObraz.inspekcja} ms (próg 1500 ms)`);
      await c.close();
    }

    const c = await ctx();
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort()); // bez internetu: test nie zależy od sieci
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '/index.html#home');
    const setLang = l => p.evaluate(l => { OESTSettings.update(s => { s.appearance.language = l; }); OESTSettingsUI.applyTheme(); }, l);

    // ---------- B2: geometria przy zmianie PL → EN na 11 ekranach ----------
    console.error('[krok] B2: geometria przy zmianie PL → EN na 11 ekranach');
    // Nic nie może zmienić pozycji w pionie ani wysokości. W poziomie wolno tylko w rzędzie przewijanym w bok (pasek dni, filtry Inspekcji – wariant A).
    const SEL = 'button,.tile,.k2,.chip,.day,.oest-sw,[role=button],.settings-card,.prow';
    const snap = () => p.evaluate(SEL => {
      const v = [...document.querySelectorAll('.view')].find(x => !x.hidden) || document.body;
      const inScrollRow = el => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll') return true; } return false; };
      return [...v.querySelectorAll(SEL)].filter(e => e.offsetWidth > 0 && e.offsetHeight > 0).map((e, i) => {
        const r = e.getBoundingClientRect();
        return { k: i + '|' + (e.id || e.dataset.go || e.dataset.id || e.dataset.g || e.dataset.day || e.dataset.route || ''), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: e.offsetWidth, h: e.offsetHeight, row: inScrollRow(e), t: (e.textContent || '').trim().slice(0, 24) };
      });
    }, SEL);
    R.plEn = {};
    for (const rt of ROUTES) {
      await setLang('pl'); await p.goto(url + '/index.html#' + rt); await p.waitForTimeout(700);
      const a = await snap();
      await p.evaluate(() => { window.__anim = []; });
      await setLang('en'); await p.waitForTimeout(700);
      const b = await snap(), mb = new Map(b.map(e => [e.k, e]));
      const moved = [], widthOnly = [];
      for (const e of a) {
        const f = mb.get(e.k); if (!f) continue;
        if (f.y !== e.y || f.h !== e.h || (!e.row && f.x !== e.x)) moved.push(`${e.t} ${e.w}x${e.h}@${e.x},${e.y} → ${f.w}x${f.h}@${f.x},${f.y}`);
        else if (f.w !== e.w || f.x !== e.x) widthOnly.push(e.t);
      }
      const anim = await p.evaluate(() => window.__anim.filter(a => !/spin/.test(a.n)).length);
      R.plEn[rt] = { elementy: a.length, przesuniete: moved.length, przyklady: moved.slice(0, 4), tylkoSzerokosc: widthOnly.length, animacjePrzyZmianieJezyka: anim };
      check(moved.length === 0, `B2: PL→EN na #${rt} przesuwa ${moved.length} elementów: ${moved.slice(0, 3).join(' | ')}`);
      check(anim === 0, `B3: zmiana języka na #${rt} uruchamia ${anim} animacji`);
    }
    await setLang('pl');

    // ---------- B5/B6: elementy tej samej klasy w jednej grupie mają tę samą wysokość (rozmiar układu, bez efektu wciśnięcia) ----------
    console.error('[krok] B5/B6: elementy tej samej klasy w jednej grupie mają tę samą');
    R.grupy = {};
    for (const rt of ['home', 'ppm', 'settings', 'reactive', 'questions']) {
      await p.goto(url + '/index.html#' + rt); await p.waitForTimeout(600);
      R.grupy[rt] = await p.evaluate(() => {
        const v = [...document.querySelectorAll('.view')].find(x => !x.hidden) || document.body, bad = [];
        for (const par of new Set([...v.querySelectorAll('button')].map(b => b.parentElement))) {
          const byCls = {};
          for (const b of par.children) { if (b.tagName !== 'BUTTON' || !b.offsetHeight) continue; const k = b.className.split(' ').filter(c => c !== 'on')[0] || 'button'; (byCls[k] = byCls[k] || []).push(b); }
          for (const k in byCls) { const hs = new Set(byCls[k].map(b => b.offsetHeight)); if (byCls[k].length > 1 && hs.size > 1) bad.push(`${par.id || par.className}: .${k} wysokości ${[...hs].join('/')}`); }
        }
        return bad;
      });
      check(R.grupy[rt].length === 0, `B6: #${rt} – przyciski jednej grupy różnej wysokości: ${R.grupy[rt].join(' | ')}`);
    }
    // B4/B5: Ustawienia – grupy bez ramki, wszystkie kafelki tej samej wysokości (412 px i wąski telefon 360 px, PL i EN)
    R.ustawienia = {};
    for (const [wdt, l] of [[412, 'pl'], [412, 'en'], [360, 'pl'], [360, 'en']]) {
      await p.setViewportSize({ width: wdt, height: 915 }); await setLang(l); await p.goto(url + '/index.html#settings'); await p.waitForTimeout(600);
      const s = await p.evaluate(() => ({
        ramki: [...document.querySelectorAll('#v-settings .settings-group')].map(g => parseFloat(getComputedStyle(g).borderTopWidth)).filter(x => x > 0).length,
        wysokosci: [...new Set([...document.querySelectorAll('#v-settings .settings-grid > .settings-card')].map(e => e.offsetHeight))]
      }));
      R.ustawienia[wdt + '-' + l] = s;
      check(s.ramki === 0, `B4: Ustawienia ${wdt}px ${l}: ${s.ramki} grup z ramką`);
      check(s.wysokosci.length === 1, `B5: Ustawienia ${wdt}px ${l}: kafelki różnej wysokości ${s.wysokosci.join('/')}`);
    }
    await p.setViewportSize({ width: 412, height: 915 }); await setLang('pl');

    // ---------- B2: filtry Inspekcji w jednym rzędzie, lista zawsze w tym samym miejscu ----------
    console.error('[krok] B2: filtry Inspekcji w jednym rzędzie, lista zawsze w tym sa');
    await p.goto(url + '/index.html#ppm'); await p.waitForTimeout(700);
    R.filtry = await p.evaluate(() => { const c = document.getElementById('ppmChips'); return { rzedy: new Set([...c.children].map(e => e.offsetTop)).size, listaOdY: Math.round(document.getElementById('ppmList').getBoundingClientRect().top) }; });
    check(R.filtry.rzedy === 1, `B2: filtry Inspekcji w ${R.filtry.rzedy} rzędach (ma być 1)`);
    // stuknięcie filtra za krawędzią ekranu nie przewija rzędu z powrotem na początek
    R.filtry.przewiniecieRzedu = await p.evaluate(async () => {
      const c = document.getElementById('ppmChips'); c.scrollLeft = c.scrollWidth; const x0 = c.scrollLeft;
      [...c.children].pop().click(); await new Promise(r => setTimeout(r, 300)); const x1 = document.getElementById('ppmChips').scrollLeft;
      [...document.getElementById('ppmChips').children].pop().click(); await new Promise(r => setTimeout(r, 300));
      return { przed: x0, po: x1 };
    });
    check(R.filtry.przewiniecieRzedu.przed === 0 || R.filtry.przewiniecieRzedu.po > 0, `B2: stuknięcie filtra przewinęło rząd na początek (${R.filtry.przewiniecieRzedu.przed} → ${R.filtry.przewiniecieRzedu.po})`);

    // ---------- B3: animacje listy tylko dla nowych kart ----------
    console.error('[krok] B3: animacje listy tylko dla nowych kart');
    R.animacjeListy = {};
    const tap = async (sel, key) => {
      await p.evaluate(() => { window.__anim = []; window.__ids = new Set([...document.querySelectorAll('#ppmList [data-id],#ppmList [data-fam]')].map(e => e.getAttribute('data-id') || e.getAttribute('data-fam'))); });
      await p.click(sel); await p.waitForTimeout(700);
      R.animacjeListy[key] = await p.evaluate(() => { const a = window.__anim.filter(x => x.n === getComputedStyle(document.documentElement).getPropertyValue('--ruch-lista-efekt').trim() || x.n === 'wyUp'); return { animacje: a.length, stareKarty: a.filter(x => x.id && window.__ids.has(x.id)).length }; });
    };
    await tap('#ppmChips [data-g=fire]', 'wszystkie→pożarowe');
    await tap('#ppmChips [data-g=all]', 'pożarowe→wszystkie');
    await tap('#ppmChips [data-g=all]', 'wszystkie→wszystkie');
    for (const k in R.animacjeListy) check(R.animacjeListy[k].stareKarty === 0, `B3: filtr ${k} animuje ${R.animacjeListy[k].stareKarty} kart, które już były na liście`);
    check(R.animacjeListy['wszystkie→pożarowe'].animacje === 0, `B3: zawężenie filtra uruchamia ${R.animacjeListy['wszystkie→pożarowe'].animacje} animacji (nie ma nowych kart)`);
    await p.evaluate(() => { window.__anim = []; window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(600);
    R.animacjeListy['powrót do apki'] = { animacje: await p.evaluate(() => window.__anim.length) };
    check(R.animacjeListy['powrót do apki'].animacje === 0, `B3: powrót do apki uruchamia ${R.animacjeListy['powrót do apki'].animacje} animacji`);

    // ---------- B7: odmiana dzień/dni ----------
    console.error('[krok] B7: odmiana dzień/dni');
    R.odmiana = await p.evaluate(() => ({ m1: OEST_PPM.endsText(-1), m3: OEST_PPM.endsText(-3), p1: OEST_PPM.endsText(1), p5: OEST_PPM.endsText(5), dni: [OEST_PPM.dni && OEST_PPM.dni(1), OEST_PPM.dni && OEST_PPM.dni(2)] }));
    check(R.odmiana.m1 === 'Po terminie 1 dzień' && R.odmiana.m3 === 'Po terminie 3 dni' && R.odmiana.p1 === 'Został 1 dzień' && R.odmiana.p5 === 'Zostało 5 dni', 'B7: odmiana ' + JSON.stringify(R.odmiana));
    const listText = await p.evaluate(() => document.getElementById('ppmList').textContent);
    check(!/\b1 dni\b/.test(listText) && !/\b1 days\b/.test(listText), 'B7: lista Inspekcji zawiera „1 dni” / „1 days”');

    // ---------- Wstecz: wraca na ten sam ekran, przewinięcie i wybór ----------
    console.error('[krok] Wstecz: wraca na ten sam ekran, przewinięcie i wybór');
    R.wstecz = {};
    await p.goto(url + '/index.html#home'); await p.waitForTimeout(500);
    await p.click('[data-go=ppm]'); await p.waitForTimeout(600); await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(200);
    let y0 = await p.evaluate(() => scrollY);
    await p.evaluate(() => [...document.querySelectorAll('#ppmList [data-id]')].find(e => e.getBoundingClientRect().top > 0).click());
    await p.waitForURL(/inspekcje\/index\.html/); await p.waitForTimeout(800); await p.goBack(); await p.waitForTimeout(1200);
    R.wstecz.inspekcje = { y0, po: await p.evaluate(() => location.hash + ' y=' + scrollY), y: await p.evaluate(() => scrollY) };
    check(/#ppm/.test(R.wstecz.inspekcje.po) && Math.abs(R.wstecz.inspekcje.y - y0) <= 10, 'Wstecz z inspekcji do listy: ' + JSON.stringify(R.wstecz.inspekcje));
    await p.goto(url + '/index.html#home'); await p.waitForTimeout(400); await p.click('[data-go=cal]'); await p.waitForTimeout(500);
    const day = await p.evaluate(() => { const b = [...document.querySelectorAll('#calGrid [data-cd]')].find(x => x.querySelector('i')); b.click(); return b.dataset.cd; });
    await p.waitForTimeout(300);
    const opened = await p.evaluate(() => { const b = document.querySelector('#calDay [data-id]'); if (b) b.click(); return !!b; });
    if (opened) { await p.waitForURL(/inspekcje\/index\.html/); await p.waitForTimeout(800); await p.goBack(); await p.waitForTimeout(1200); }
    R.wstecz.kalendarz = { dzien: day, otwarto: opened, po: await p.evaluate(() => location.hash + ' ' + ((document.querySelector('#calGrid .cd.on') || {}).dataset || {}).cd) };
    check(opened && R.wstecz.kalendarz.po === '#cal ' + day, 'Wstecz z inspekcji do kalendarza: ' + JSON.stringify(R.wstecz.kalendarz));
    await p.goto(url + '/index.html#home'); await p.waitForTimeout(400); await p.click('[data-go=settings]'); await p.waitForTimeout(500);
    await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(150); y0 = await p.evaluate(() => scrollY);
    await p.evaluate(() => [...document.querySelectorAll('#v-settings .settings-card[data-route]')].find(e => e.getBoundingClientRect().top > 0).click()); await p.waitForTimeout(500);
    await p.goBack(); await p.waitForTimeout(600);
    R.wstecz.ustawienia = { y0, po: await p.evaluate(() => location.hash + ' y=' + scrollY), y: await p.evaluate(() => scrollY) };
    check(R.wstecz.ustawienia.po.startsWith('#settings ') && Math.abs(R.wstecz.ustawienia.y - y0) <= 10, 'Wstecz z podstrony Ustawień: ' + JSON.stringify(R.wstecz.ustawienia));

    // ---------- płynność: czas klatek przy przewijaniu listy i przejściu ekranu (Chromium, nie telefon) ----------
    console.error('[krok] płynność: czas klatek przy przewijaniu listy i przejściu ekr');
    await p.goto(url + '/index.html#ppm'); await p.waitForTimeout(700);
    R.plynnosc = await p.evaluate(async () => {
      const frames = [], longT = []; let last = performance.now();
      try { new PerformanceObserver(l => l.getEntries().forEach(e => longT.push(Math.round(e.duration)))).observe({ type: 'longtask' }); } catch (e) {}
      await new Promise(done => { let n = 0; (function step(t) { frames.push(t - last); last = t; scrollBy(0, 40); if (++n < 90) requestAnimationFrame(step); else done(); })(performance.now()); });
      const s = frames.slice(1).sort((a, b) => a - b);
      return { klatki: s.length, medianaMs: +s[Math.floor(s.length / 2)].toFixed(1), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(1), dlugieZadania: longT.length };
    });
    R.plynnosc.przejscie = await p.evaluate(async () => {
      const frames = []; let last = performance.now(), stop = false;
      (function step(t) { frames.push(t - last); last = t; if (!stop) requestAnimationFrame(step); })(performance.now());
      document.querySelector('#v-ppm .top .back').click(); await new Promise(r => setTimeout(r, 500)); stop = true;
      const s = frames.slice(1).sort((a, b) => a - b); return { klatki: s.length, maxMs: +s[s.length - 1].toFixed(1) };
    });
    check(R.plynnosc.p95Ms < 50, `płynność: przewijanie listy p95 ${R.plynnosc.p95Ms} ms na klatkę (próg 50 ms)`);
    check(R.plynnosc.przejscie.maxMs < 200, `płynność: najdłuższa klatka przejścia ekranu ${R.plynnosc.przejscie.maxMs} ms (próg 200 ms)`);

    // ---------- tabela ruchu: wartości domyślne = dotychczasowy ruch, podmiana działa wszędzie bez zmian na ekranach ----------
    console.error('[krok] tabela ruchu: wartości domyślne = dotychczasowy ruch, podmia');
    R.tabelaRuchu = await p.evaluate(() => {
      const W = window.OESTWyglad && OESTWyglad.ruch; if (!W) return { brak: true };
      const el = document.createElement('div'); el.className = 'wy-pop'; document.body.appendChild(el);
      const przed = getComputedStyle(el).animationName + ' ' + getComputedStyle(el).animationDuration;
      W.ustaw('okno', 'zanikanie'); W.ustaw('okno', { czas: '.4s' });
      const po = getComputedStyle(el).animationName + ' ' + getComputedStyle(el).animationDuration;
      W.domyslne(); const powrot = getComputedStyle(el).animationName + ' ' + getComputedStyle(el).animationDuration; el.dataset.wyPop = ''; el.remove();
      const css = id => (document.getElementById(id) || {}).textContent || '';
      return { role: W.role(), okno: W.pobierz('okno'), przed, po, powrot, przyciskZTabeli: /--ruch-przycisk-nacisk/.test(css('oest-nacisk-css')), kafelekZTabeli: /--ruch-kafelek-nacisk/.test(css('oest-kafelek-css')) };
    });
    const T = R.tabelaRuchu;
    check(!T.brak, 'tabela ruchu: brak OESTWyglad.ruch');
    if (!T.brak) {
      check(T.przed === 'wyPop 0.22s' && T.powrot === T.przed, 'tabela ruchu: domyślne okno ≠ dotychczasowe wyPop .22s: ' + T.przed + ' / ' + T.powrot);
      check(T.po === 'wyFade 0.4s', 'tabela ruchu: podmiana okna nie działa: ' + T.po);
      check(T.przyciskZTabeli && T.kafelekZTabeli, 'tabela ruchu: przycisk/kafelek nie czytają z tabeli');
      check(['przycisk', 'kafelek', 'stan', 'status', 'okno', 'ekran', 'lista', 'znacznik'].every(r => T.role.includes(r)), 'tabela ruchu: brak ról ' + T.role);
    }
    await c.close();

    // ---------- tryb ograniczonych animacji: zero animacji (poza kółkiem ładowania) na ekranach, filtrze, Wstecz i okienku ----------
    console.error('[krok] tryb ograniczonych animacji: zero animacji (poza kółkiem ład');
    {
      const c2 = await ctx({ reducedMotion: 'reduce' });
      await c2.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const q = await c2.newPage(); q.on('pageerror', e => errors.push(e.message));
      await q.goto(url + '/index.html#home'); await q.waitForTimeout(500);
      for (const rt of ['ppm', 'cal', 'settings', 'reactive']) { await q.click(`[data-go=${rt}]`).catch(() => q.goto(url + '/index.html#' + rt)); await q.waitForTimeout(500); if (rt === 'ppm') { await q.click('#ppmChips [data-g=fire]'); await q.waitForTimeout(400); await q.click('#ppmChips [data-g=all]'); await q.waitForTimeout(400); } await q.goBack(); await q.waitForTimeout(400); }
      await q.evaluate(() => { if (window.OESTPytaj) OESTPytaj({ title: 'Test', text: 'x' }); }); await q.waitForTimeout(400);
      const press = await q.evaluate(() => { const b = document.querySelector('.kf'); return getComputedStyle(document.documentElement).getPropertyValue('--ruch-kafelek-nacisk').trim() + '/' + getComputedStyle(document.documentElement).getPropertyValue('--ruch-przycisk-nacisk').trim(); });
      R.mniejRuchu = { animacje: await q.evaluate(() => window.__anim.filter(a => !/spin/.test(a.n)).map(a => a.n + '@' + a.el)), nacisk: press };
      check(R.mniejRuchu.animacje.length === 0, 'mniej ruchu: uruchomione animacje ' + R.mniejRuchu.animacje.slice(0, 5).join(', '));
      check(press === 'none/none', 'mniej ruchu: naciśnięcie nadal zmniejsza (' + press + ')');
      await c2.close();
    }
    R.bledyStrony = errors.slice(0, 5);
    check(errors.length === 0, 'błędy JS na stronie: ' + errors.slice(0, 3).join(' | '));
  } finally { if (browser) await browser.close(); server.close(); }

  console.log(JSON.stringify(R, null, 1));
  if (process.env.OEST_PLYNNOSC_OUT) fs.writeFileSync(process.env.OEST_PLYNNOSC_OUT, JSON.stringify({ wyniki: R, bledy: fails }, null, 1));
  if (fails.length) { console.error('PLYNNOSC UI FAIL (' + fails.length + '):\n- ' + fails.join('\n- ')); process.exitCode = 1; return; }
  console.log(`PLYNNOSC UI PASS: B1 inspekcja ${R.pierwszyObraz.inspekcja} ms przy wolnym internecie, PL/EN ${ROUTES.length} ekranów bez przesunięć, filtry 1 rząd, animacje tylko nowych kart, Ustawienia równe, odmiana, Wstecz ×3, przewijanie p95 ${R.plynnosc.p95Ms} ms, tabela ruchu, mniej ruchu = 0 animacji.`);
})().catch(e => { console.error(e); process.exitCode = 1; });
