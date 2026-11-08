// Klocek inspekcji (Grzegorz 07/11/2026, zgoda na budowę 22:10): moduly/klocek → OESTKlocek.inspekcja + przytrzymaj + info.
// Zasada: wszystkie klocki identyczne, każdy element w STAŁYM miejscu i stałej wielkości, także gdy jest pusty; PL i EN bez skoków.
// Sprawdza w Chrome (412×915 jak Pixel 8 Pro) na prawdziwej liście Inspekcji i w Kalendarzu:
//  1) linia 1: nazwa + pigułka statusu (OESTZnacznik.status), linia 2: lokalizacja · słupki · częstotliwość · formularz,
//     linia 3: termin │ zdjęcia │ OK/pytania │ miejsce na usterki – te same x/szerokości w każdym klocku i w PL/EN,
//  2) teksty mieszczą się w swoich polach (najdłuższe: „28/12 tomorrow”, „TB/L13”, „11M”, „99/99”),
//  3) termin: „DD/MM za 4D”, „jutro” pomarańczowy, „dziś” i zaległe „−3D” czerwone, od 31 dni miesiące,
//  4) przytrzymanie ~0,4 s → okno informacji (pełna nazwa z Vantify), zostaje po puszczeniu palca, stuknięcie gdziekolwiek zamyka,
//     inspekcja się nie otwiera; krótkie stuknięcie dalej otwiera inspekcję.
// Uruchomienie: OEST_PLAYWRIGHT_PATH=… OEST_BROWSER_PATH=… node app/tests/klocek-inspekcji-ui-check.cjs  (po npm run copy-web)
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
const fails = [], R = {};
function check(ok, msg) { if (!ok) fails.push(msg); }
// stan jak w telefonie Grzegorza: kilka inspekcji w różnych etapach (Gotowa, W trakcie z usterkami, Wstrzymana)
const STAGE = now => ({
  'EFA-INS-014': { s: 'done', at: now, period: '2026-11-30', day: '2099-01-01', photos: 4, sheet: 1, used: 12, ok: 12, total: 12 },
  'EFA-INS-024': { s: 'prog', at: now, photos: 7, used: 20, ok: 8, total: 20, issues: 2 },
  'EFA-INS-019': { s: 'hold', at: now, photos: 2 }
});
const POLA = ['knm', 'oest-st', 'klok', 'kcz', 'kdt', 'kn2', 'kn5', 'kus'];

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + server.address().port;
  let browser; const errors = [];
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const c = await browser.newContext({ viewport: { width: 412, height: 915 } });
    await c.addInitScript(s => {
      localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 }));
      if (!sessionStorage.getItem('ki-seed')) { sessionStorage.setItem('ki-seed', '1'); localStorage.setItem('oest.ppm.stage', s); }
    }, JSON.stringify(STAGE(Date.now())));
    await c.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.goto(url + '/index.html#ppm'); await p.waitForTimeout(500);
    const setLang = l => p.evaluate(l => { window.OESTSettings.update(s => { s.appearance.language = l; }); window.OESTSettingsUI.applyTheme(); }, l);
    const geo = () => p.evaluate(POLA => {
      const out = [...document.querySelectorAll('#ppmList .ki')].map(k => {
        const kr = k.getBoundingClientRect(), o = { id: k.dataset.id || k.dataset.fam, h: Math.round(kr.height), linie: k.querySelectorAll(':scope > .kr').length };
        for (const c of POLA) {
          const e = k.querySelector('.' + c); if (!e) { o[c] = null; continue; }
          const r = e.getBoundingClientRect();
          o[c] = { x: Math.round(r.left - kr.left), y: Math.round(r.top - kr.top), w: Math.round(r.width), miesci: c === 'knm' || e.scrollWidth <= e.clientWidth + 1 };
        }
        o.ikony = [...k.querySelectorAll('.kic')].map(i => { const r = i.getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); });
        return o;
      });
      return out;
    }, POLA);
    await setLang('pl'); await p.waitForTimeout(300);
    R.pl = await geo();
    await setLang('en'); await p.waitForTimeout(300);
    R.en = await geo();
    check(R.pl.length > 20, `za mało klocków na liście: ${R.pl.length}`);
    check(R.pl.length === R.en.length, 'PL i EN: różna liczba klocków');
    const wzor = R.pl[0];
    for (const lang of ['pl', 'en']) R[lang].forEach((k, i) => {
      const gdzie = `${lang}/${k.id}`;
      check(k.linie === 3, `${gdzie}: ${k.linie} linie zamiast 3`);
      check(k.h === wzor.h, `${gdzie}: wysokość ${k.h} px, a pierwszy klocek ${wzor.h} px`);
      check((k.ikony.length === 5 || k.ikony.length === 6) && k.ikony.every(x => x === '21x21'), `${gdzie}: ikony ${k.ikony.join(',')} (ma być 5 × 21x21, usterki tylko gdy są)`);
      for (const c of POLA) {
        check(!!k[c], `${gdzie}: brak pola .${c}`); if (!k[c] || !wzor[c]) continue;
        check(k[c].miesci, `${gdzie}: tekst nie mieści się w .${c}`);
        if (c === 'knm') { check(k[c].x === wzor[c].x && k[c].y === wzor[c].y, `${gdzie}: nazwa zaczyna się w innym miejscu`); continue; }
        check(k[c].x === wzor[c].x && k[c].y === wzor[c].y && k[c].w === wzor[c].w, `${gdzie}: pole .${c} ${JSON.stringify(k[c])} zamiast ${JSON.stringify(wzor[c])}`);
      }
      const pl = R.pl[i];
      if (lang === 'en') for (const c of POLA) if (pl[c] && k[c]) check(pl[c].x === k[c].x && pl[c].w === k[c].w && pl[c].y === k[c].y, `${k.id}: pole .${c} skacze przy zmianie języka`);
    });
    // treść: Gotowa, W trakcie (8/20, usterki 2), Wstrzymana, ATS TB/L13
    R.tresc = await p.evaluate(() => {
      const q = id => document.querySelector('#ppmList .ki[data-id="' + id + '"]'), t = (k, s) => { const e = k && k.querySelector(s); return e ? e.textContent : null; };
      const a = q('EFA-INS-014'), b = q('EFA-INS-024'), h = q('EFA-INS-019');
      return { ats: { st: a && a.querySelector('.oest-st').className, lok: t(a, '.klok'), cz: t(a, '.kcz'), qa: t(a, '.kn5'), foto: t(a, '.kn2'), formOk: !!(a && a.querySelector('.kic .kz[style*="33, 196, 90"],.kic .kz[style*="#21c45a"]')) },
        wt: { st: b && b.querySelector('.oest-st').className, qa: t(b, '.kn5'), us: t(b, '.kus'), lok: t(b, '.klok') }, hold: h && h.querySelector('.oest-st').className };
    });
    check(/gotowa/.test(R.tresc.ats.st) && R.tresc.ats.lok === 'TB/L13' && R.tresc.ats.cz === '1M' && R.tresc.ats.qa === '12/12' && R.tresc.ats.foto === '4', 'ATS L13 (Gotowa): ' + JSON.stringify(R.tresc.ats));
    check(/wtrakcie/.test(R.tresc.wt.st) && R.tresc.wt.qa === '8/20' && R.tresc.wt.us === '2' && R.tresc.wt.lok === 'TB', 'Water Temperature TB (W trakcie): ' + JSON.stringify(R.tresc.wt));
    check(/wstrzymana/.test(R.tresc.hold || ''), 'AOV TB (Wstrzymana): ' + R.tresc.hold);
    // termin i najdłuższe teksty w polach (PL/EN)
    R.termin = await p.evaluate(() => {
      const K = window.OESTKlocek, d = new Date(2026, 11, 28), out = {};
      for (const l of ['pl', 'en']) {
        window.OESTSettings.update(s => { s.appearance.language = l; });
        out[l] = [-3, -45, 0, 1, 4, 30, 31, 40].map(n => { const x = K.termin(d, n); return x.text + '|' + x.tone; }).concat([K.termin(d, 9, true).text, K.termin(null, null).text]);
        const box = document.createElement('div'); box.style.cssText = 'position:absolute;left:0;top:0;width:412px';
        box.innerHTML = K.inspekcja({ id: 'x', name: 'X', status: 'wstrzymana', loc: 'TB/L13', freq: '11M', form: 'blad', due: d, left: 1, photos: 99, qa: { ok: 99, all: 99 }, issues: 99 }) +
          K.inspekcja({ id: 'y', name: 'Y', status: 'zalegla', loc: 'TA/GL', freq: '12M', due: d, left: -45, photos: 0, qa: null }) + K.inspekcja({ id: 'z', name: 'Z', status: 'gotowa', due: d, left: 30, photos: 5 });
        document.body.appendChild(box);
        out[l + 'Miesci'] = [...box.querySelectorAll('.klok,.kcz,.kdt,.kn,.oest-st')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.className + ':' + e.textContent);
        out[l + 'Kolor'] = [...box.querySelectorAll('.kdt')].map(e => getComputedStyle(e).color);
        out[l + 'Y'] = box.querySelectorAll('.kcz')[1].textContent;
        box.remove();
      }
      return out;
    });
    check(JSON.stringify(R.termin.pl) === JSON.stringify(['28/12 −3D|red', '28/12 −1M|red', '28/12 dziś|red', '28/12 jutro|jutro', '28/12 za 4D|', '28/12 za 30D|', '28/12 za 1M|', '28/12 za 1M|', '28/12', '–']), 'termin PL: ' + JSON.stringify(R.termin.pl));
    check(JSON.stringify(R.termin.en) === JSON.stringify(['28/12 −3D|red', '28/12 −1M|red', '28/12 today|red', '28/12 tomorrow|jutro', '28/12 in 4D|', '28/12 in 30D|', '28/12 in 1M|', '28/12 in 1M|', '28/12', '–']), 'termin EN: ' + JSON.stringify(R.termin.en));
    for (const l of ['pl', 'en']) {
      check(R.termin[l + 'Miesci'].length === 0, `${l}: najdłuższe teksty nie mieszczą się: ${R.termin[l + 'Miesci'].join(', ')}`);
      check(R.termin[l + 'Kolor'][0] === 'rgb(255, 138, 61)' && R.termin[l + 'Kolor'][1] === 'rgb(239, 59, 54)', `${l}: kolory terminu jutro/zaległy ${R.termin[l + 'Kolor']}`);
      check(R.termin[l + 'Y'] === 'Y', `${l}: 12M ma być „Y”, jest „${R.termin[l + 'Y']}”`);
    }
    // przytrzymanie → okno informacji; puszczenie palca → zostaje; stuknięcie gdziekolwiek → zamyka; inspekcja się nie otwiera
    await setLang('pl'); await p.waitForTimeout(200);
    const el = p.locator('#ppmList .ki[data-id="EFA-INS-024"]'); await el.scrollIntoViewIfNeeded();
    const bb = await el.boundingBox();
    await p.mouse.move(bb.x + 150, bb.y + 40); await p.mouse.down(); await p.waitForTimeout(650);
    R.info = { poPrzytrzymaniu: await p.evaluate(() => { const b = document.querySelector('.oest-ask.ki-info'); return b ? { tytul: b.querySelector('b').textContent, wiersze: b.querySelectorAll('.kir').length, przyciski: b.querySelectorAll('button').length, tekst: b.textContent } : null; }) };
    await p.mouse.up(); await p.waitForTimeout(400);
    R.info.poPuszczeniu = await p.evaluate(() => !!document.querySelector('.oest-ask.ki-info'));
    R.info.url = p.url();
    await p.mouse.click(30, 120); await p.waitForTimeout(600);
    R.info.poStuknieciu = await p.evaluate(() => !!document.querySelector('.oest-ask.ki-info'));
    R.info.urlPo = p.url();
    const inf = R.info.poPrzytrzymaniu || {};
    check(inf.tytul === 'Water Temperature Checks (Tower B)', 'okno informacji: tytuł (pełna nazwa z Vantify) = ' + inf.tytul);
    check(inf.przyciski === 0 && inf.wiersze === 7, `okno informacji: ${inf.wiersze} wierszy, ${inf.przyciski} przycisków (ma być 7 wierszy z usterkami, bez przycisków)`);
    check(/TB – Tower B/.test(inf.tekst || '') && /Vantify 959234/.test(inf.tekst || '') && /30\/11\/2026/.test(inf.tekst || '') && /OK 8 \/ 20/.test(inf.tekst || ''), 'okno informacji: treść ' + inf.tekst);
    check(R.info.poPuszczeniu, 'okno informacji znika po puszczeniu palca (ma zostać)');
    check(!R.info.poStuknieciu, 'okno informacji nie zamyka się po stuknięciu');
    check(/#ppm$/.test(R.info.url) && /#ppm$/.test(R.info.urlPo), 'przytrzymanie otworzyło inspekcję: ' + R.info.urlPo);
    // przesunięcie palca (przewijanie) – bez okna
    await p.mouse.move(bb.x + 150, bb.y + 40); await p.mouse.down(); await p.mouse.move(bb.x + 150, bb.y + 90, { steps: 4 }); await p.waitForTimeout(600);
    R.info.przewijanie = await p.evaluate(() => !!document.querySelector('.oest-ask.ki-info'));
    await p.mouse.move(30, 120); await p.mouse.up(); await p.waitForTimeout(300); // palec zjeżdża z klocka (przewijanie) – bez stuknięcia
    check(!R.info.przewijanie, 'ruch palca (przewijanie) otwiera okno informacji');
    // bardzo długie przytrzymanie (2,5 s): po puszczeniu palca okno zostaje, inspekcja się nie otwiera (uwaga Codex w PR #87)
    await p.mouse.move(bb.x + 150, bb.y + 40); await p.mouse.down(); await p.waitForTimeout(2500); await p.mouse.up(); await p.waitForTimeout(500);
    R.info.dlugie = { okno: await p.evaluate(() => !!document.querySelector('.oest-ask.ki-info')), url: p.url() };
    check(R.info.dlugie.okno && /index\.html#ppm$/.test(R.info.dlugie.url), 'przytrzymanie 2,5 s: ' + JSON.stringify(R.info.dlugie));
    await p.mouse.click(30, 120); await p.waitForTimeout(500);
    // Gotowa: okno pokazuje termin i zlecenie z klocka (zakończony okres 30/11), nie następne zlecenie (uwaga Codex w PR #87)
    const g = p.locator('#ppmList .ki[data-id="EFA-INS-014"]'); await g.scrollIntoViewIfNeeded(); const gb = await g.boundingBox();
    await p.mouse.move(gb.x + 150, gb.y + 40); await p.mouse.down(); await p.waitForTimeout(650); await p.mouse.up(); await p.waitForTimeout(300);
    R.info.gotowa = await p.evaluate(() => { const b = document.querySelector('.oest-ask.ki-info'); return b ? b.textContent : null; });
    check(/30\/11\/2026/.test(R.info.gotowa || '') && /OK 12 \/ 12/.test(R.info.gotowa || ''), 'okno informacji Gotowej: ' + R.info.gotowa);
    await p.mouse.click(30, 120); await p.waitForTimeout(500);
    // krótkie stuknięcie dalej otwiera inspekcję
    await p.locator('#ppmList .ki[data-id="EFA-INS-024"]').click(); await p.waitForTimeout(800);
    R.info.stukniecie = p.url();
    check(/inspekcje\/index\.html#ppm=EFA-INS-024/.test(R.info.stukniecie), 'krótkie stuknięcie nie otwiera inspekcji: ' + R.info.stukniecie);
    // Kalendarz: ten sam klocek
    await p.goto(url + '/index.html#cal'); await p.waitForTimeout(500);
    R.kalendarz = await p.evaluate(() => { const b = [...document.querySelectorAll('#calGrid [data-cd]')].find(x => x.querySelector('i')); b.click(); const k = document.querySelector('#calDay .ki'); return k ? { linie: k.querySelectorAll(':scope > .kr').length, st: !!k.querySelector('.oest-st'), dzien: k.dataset.day } : null; });
    // przyszły termin w Kalendarzu: okno bez postępu bieżącej inspekcji (uwaga Codex w PR #87)
    R.kalendarzInfo = await p.evaluate(st => new Promise(res => { localStorage.setItem('oest.ppm.stage', st); const o = window.OESTPrzycisk.ask; window.OESTPrzycisk.ask = a => { res(a.node.textContent); window.OESTPrzycisk.ask = o; return Promise.resolve(true); };
      const el = document.createElement('div'); el.className = 'ki'; el.dataset.id = 'EFA-INS-024'; el.dataset.day = '2026-12-30'; document.getElementById('calDay').appendChild(el);
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 })); setTimeout(() => { el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); el.remove(); }, 600); }), JSON.stringify(STAGE(Date.now())));
    check(/zrobiono 0/.test(R.kalendarzInfo) && !/OK 8/.test(R.kalendarzInfo) && !/Usterki/.test(R.kalendarzInfo), 'okno dla przyszłego terminu pokazuje postęp bieżącej inspekcji: ' + R.kalendarzInfo);
    check(R.kalendarz && R.kalendarz.linie === 3 && R.kalendarz.st && /^\d{4}-\d\d-\d\d$/.test(R.kalendarz.dzien), 'Kalendarz: klocek ' + JSON.stringify(R.kalendarz));
    await c.close();
    // wąskie i szerokie ekrany: każdy element klocka w całości wewnątrz klocka (uwaga Codex w PR #87: 360 px ucinało usterki)
    R.ekrany = {};
    for (const W of [360, 412, 448]) {
      const c2 = await browser.newContext({ viewport: { width: W, height: 800 } });
      await c2.addInitScript(s => { localStorage.setItem('oest.account', JSON.stringify({ provider: 'local', id: 'test', email: '', name: 'Test', t: 1 })); localStorage.setItem('oest.ppm.stage', s); }, JSON.stringify(STAGE(Date.now())));
      await c2.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
      const p2 = await c2.newPage(); p2.on('pageerror', e => errors.push(e.message));
      await p2.goto(url + '/index.html#ppm'); await p2.waitForTimeout(500);
      R.ekrany[W] = {};
      for (const lang of ['pl', 'en']) {
        await p2.evaluate(l => { window.OESTSettings.update(s => { s.appearance.language = l; }); window.OESTSettingsUI.applyTheme(); }, lang); await p2.waitForTimeout(250);
        R.ekrany[W][lang] = await p2.evaluate(() => {
          const zle = [];
          document.querySelectorAll('#ppmList .ki').forEach(k => {
            const kr = k.getBoundingClientRect(), go = k.querySelector('.kgo').getBoundingClientRect();
            k.querySelectorAll('.kr > *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && (r.right > kr.right - 6 || r.left < kr.left)) zle.push((k.dataset.id || k.dataset.fam) + ' .' + (e.getAttribute('class') || e.tagName)); });
            k.querySelectorAll('.kr:not(.kr3) > *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > go.left - 2 && r.bottom > go.top && r.top < go.bottom) zle.push((k.dataset.id || k.dataset.fam) + ' nachodzi na strzałkę .' + e.getAttribute('class')); });
            k.querySelectorAll('.kr3 > *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.top < go.bottom && r.bottom > go.top && r.right > go.left) zle.push((k.dataset.id || k.dataset.fam) + ' linia 3 nachodzi na strzałkę'); });
            k.querySelectorAll('.kdt,.kn,.klok,.kcz').forEach(e => { if (e.scrollWidth > e.clientWidth + 1) zle.push((k.dataset.id || k.dataset.fam) + ' nie mieści się: ' + e.textContent); });
          });
          return zle;
        });
        check(R.ekrany[W][lang].length === 0, `${W} px ${lang}: ` + R.ekrany[W][lang].slice(0, 6).join(', '));
      }
      await c2.close();
    }
    check(errors.length === 0, 'błędy strony: ' + errors.join(' | '));
  } catch (e) { fails.push('wyjątek: ' + (e && e.stack || e)); }
  finally { if (browser) await browser.close(); server.close(); }
  console.log(JSON.stringify({ klocki: R.pl && R.pl.length, wzor: R.pl && R.pl[0], tresc: R.tresc, termin: R.termin, info: R.info, kalendarz: R.kalendarz, kalendarzInfo: R.kalendarzInfo, ekrany: R.ekrany }, null, 1));
  if (fails.length) { console.error('KLOCEK INSPEKCJI UI FAIL\n- ' + fails.slice(0, 40).join('\n- ')); process.exit(1); }
  console.log('KLOCEK INSPEKCJI UI PASS (' + R.pl.length + ' klocków × PL/EN, stałe miejsca, okno informacji)');
})();
