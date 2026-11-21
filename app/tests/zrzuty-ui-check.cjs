// Plan audytu 19/11/2026, punkt 1.6 (ustalenie nr 116): zrzuty kluczowych ekranów – „bez nich nie ruszamy CSS”.
// Wygląd ekranów porównywany piksel w piksel z wersją BAZOWĄ (main przed tą zmianą), w tej samej przeglądarce i z tymi samymi czcionkami,
// więc wynik nie zależy od wersji Chrome ani czcionek maszyny. Baza: OEST_ZRZUTY_BAZA (sha/gałąź), w GitHub Actions pierwszy rodzic HEAD
// (PR: aktualny main; push na main: poprzedni main), lokalnie wspólny przodek z main. Baza jest budowana jak w apce (app/scripts/copy-web.js).
// Ekrany: KAŻDY ekran z mapy moduly/ekrany/ekrany.json (z prawdziwymi rekordami, ekrany-dane.cjs) i formularze inspekcji PPM z listy ZRZUTY_INSPEKCJE.
// Telefon: Pixel 8 Pro (448×998 CSS px), stała data i strefa (Europe/London), bez animacji.
//  - ekran wygląda inaczej niż w bazie, a nie ma go na liście quality/zrzuty-zmiany.json = FAIL (zmiana wyglądu bez zgody),
//  - ekran z listy zmian wygląda tak samo jak w bazie = FAIL (usuń wpis – lista dotyczy tylko bieżącej zmiany),
//  - ten sam ekran zrzucony 2× w nowej wersji wygląda inaczej = FAIL (zrzut niestabilny, wynik byłby niewiarygodny),
//  - ekran nie dał się zrzucić = FAIL.
// Zrzuty (i przy różnicy: przed / po / różnica na czerwono) trafiają do quality-results/zrzuty (artefakt bramki) albo OEST_ZRZUTY_OUT.
// NIE sprawdza wyglądu na prawdziwym Pixelu (czcionka systemowa Androida) – to telefon.
'use strict';
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');
const { REPO, MAPA, serwer, KONTO, zasiej, szkic, adres } = require('./ekrany-dane.cjs');
const ZMIANY = path.join(REPO, 'quality/zrzuty-zmiany.json');
const OUT = path.resolve(process.env.OEST_ZRZUTY_OUT || path.join(REPO, 'quality-results/zrzuty'));
const ZRZUTY_INSPEKCJE = ['EFA-INS-001', 'EFA-INS-004', 'EFA-INS-008', 'EFA-INS-021', 'EFA-INS-024'];
const CZAS = '2026-11-21T10:00:00Z';
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function baza() {
  let sha = process.env.OEST_ZRZUTY_BAZA;
  if (!sha && process.env.GITHUB_ACTIONS) sha = (git('cat-file', '-p', 'HEAD').match(/^parent ([0-9a-f]{40})$/m) || [])[1];
  if (!sha) { try { git('rev-parse', '--verify', 'main^{commit}'); sha = git('merge-base', 'HEAD', 'main'); } catch { sha = git('merge-base', 'HEAD', 'origin/main'); } }
  if (!sha) throw Error('nie wiem, z czym porównać (brak OEST_ZRZUTY_BAZA, rodzica HEAD i main)');
  try { git('cat-file', '-e', sha + '^{commit}'); } catch { git('fetch', '--no-tags', '--depth=1', 'origin', sha); }
  return git('rev-parse', sha + '^{commit}');
}
// wersja bazowa zbudowana jak w apce: pliki z gita + copy-web.js (biblioteki z app/node_modules tej gałęzi)
function zbudujBaze(sha) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oest-zrzuty-')), sciezki = ['inspekcje', 'moduly', 'app/www', 'app/scripts', 'app/teksty'];
  const sa = git('ls-tree', '--name-only', sha, '--', 'inspekcje', 'moduly', 'app').split('\n');
  const jest = sciezki.filter(p => sa.includes(p) || sa.includes(p.split('/')[0]) && git('ls-tree', '--name-only', sha, '--', p));
  execFileSync('sh', ['-c', 'git archive "$0" -- "$@" | tar -x -C "' + dir + '"', sha, ...jest], { cwd: REPO, stdio: ['ignore', 'ignore', 'pipe'] });
  fs.symlinkSync(path.join(REPO, 'app/node_modules'), path.join(dir, 'app/node_modules'), 'dir');
  execFileSync(process.execPath, [path.join(dir, 'app/scripts/copy-web.js')], { cwd: path.join(dir, 'app'), stdio: ['ignore', 'ignore', 'pipe'] });
  return { dir, www: path.join(dir, 'app/www') };
}
// zrzut każdego ekranu jednej wersji strony: { ekran: Buffer PNG }
async function zrzuty(browser, www, errs) {
  const server = await serwer(www), B = server.url, out = {};
  const ctx = await browser.newContext({ viewport: { width: 448, height: 998 }, deviceScaleFactor: 1, serviceWorkers: 'block', timezoneId: 'Europe/London', locale: 'en-GB', reducedMotion: 'reduce' });
  try {
    await ctx.addInitScript(k => { localStorage.setItem('oest.account', k); localStorage.setItem('insp.cfg', JSON.stringify({ insp: 'G. Sarna', email: 'demo@example.com' }));
      window.Capacitor = { isNativePlatform: () => true, Plugins: { App: { addListener: () => Promise.resolve({ remove() {} }), exitApp: () => {} } } }; }, JSON.stringify(KONTO));
    // bez internetu: zapytania poza stronę testową (np. sprawdzanie aktualizacji) od razu kończą się błędem – zawsze tak samo
    await ctx.route(u => !u.href.startsWith(B + '/'), r => r.abort('internetdisconnected'));
    const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
    await pg.clock.setFixedTime(new Date(CZAS));
    await pg.goto(B + '/index.html#home'); await pg.waitForLoadState('networkidle');
    const ids = await zasiej(pg); ids.draft = await szkic(pg, B, ids.leaf);
    const strzal = async (nazwa, url) => {
      await pg.goto(url); await pg.waitForLoadState('networkidle'); await pg.evaluate(() => document.fonts.ready); await pg.mouse.move(0, 0);
      // jak toHaveScreenshot w Playwright: zrzut dopiero, gdy 2 kolejne są identyczne (ekran skończył się rysować); inaczej zostaje ostatni
      let a = null;
      for (let i = 0; i < 20; i++) { await pg.waitForTimeout(150); const b = await pg.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' }); if (a && a.equals(b)) break; a = b; }
      out[nazwa] = a;
    };
    for (const e of MAPA) { if (e.id === 'start') continue; await strzal(e.id, B + '/index.html#' + adres(e.id, ids)); }
    for (const id of ZRZUTY_INSPEKCJE) await strzal('inspekcja:' + id, B + '/inspekcje/index.html#ppm=' + id);
    // ekran startowy (bez konta) na końcu: czysty profil tej samej wersji
    await pg.evaluate(() => localStorage.removeItem('oest.account'));
    await ctx.addInitScript(() => localStorage.removeItem('oest.account'));
    await strzal('start', B + '/index.html#start');
  } finally { await ctx.close(); server.close(); }
  return out;
}
// PNG ↔ piksele RGBA bez dodatkowej biblioteki (zrzut Chromium: 8 bitów, RGBA/RGB, bez przeplotu)
const zlib = require('node:zlib');
function pngDekoduj(buf) {
  let i = 8, w = 0, h = 0, ct = 6; const idat = [];
  while (i < buf.length) { const len = buf.readUInt32BE(i), typ = buf.toString('latin1', i + 4, i + 8), d = buf.subarray(i + 8, i + 8 + len);
    if (typ === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw Error('PNG: nieobsługiwany format'); }
    if (typ === 'IDAT') idat.push(d); i += 12 + len; }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw Error('PNG: nieobsługiwany typ koloru ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, px = Buffer.alloc(w * h * 4); let prev = Buffer.alloc(st), o = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[o], line = Buffer.from(raw.subarray(o + 1, o + 1 + st)); o += 1 + st;
    for (let x = 0; x < st; x++) { const A = x >= bpp ? line[x - bpp] : 0, B = prev[x], C = x >= bpp ? prev[x - bpp] : 0;
      if (f === 1) line[x] += A; else if (f === 2) line[x] += B; else if (f === 3) line[x] += (A + B) >> 1;
      else if (f === 4) { const p = A + B - C, pa = Math.abs(p - A), pb = Math.abs(p - B), pc = Math.abs(p - C); line[x] += pa <= pb && pa <= pc ? A : pb <= pc ? B : C; } }
    for (let x = 0; x < w; x++) { px[(y * w + x) * 4] = line[x * bpp]; px[(y * w + x) * 4 + 1] = line[x * bpp + 1]; px[(y * w + x) * 4 + 2] = line[x * bpp + 2]; px[(y * w + x) * 4 + 3] = bpp === 4 ? line[x * bpp + 3] : 255; }
    prev = line;
  }
  return { w, h, px };
}
function pngKoduj(w, h, px) {
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, 'latin1'); d.copy(b, 8); b.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(t, 'latin1'), d])) >>> 0, 8 + d.length); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1)); for (let y = 0; y < h; y++) px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// porównanie piksel w piksel (bez progu): { rozne, wszystkie, inny rozmiar, roznica: PNG – różne piksele na czerwono na szarym tle }
function porownaj(a, b) {
  if (a.equals(b)) return { rozne: 0 };
  const A = pngDekoduj(a), B = pngDekoduj(b), w = Math.max(A.w, B.w), h = Math.max(A.h, B.h), out = Buffer.alloc(w * h * 4);
  const pix = (I, x, y) => x < I.w && y < I.h ? I.px.readUInt32BE((y * I.w + x) * 4) : -1;
  let rozne = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const pa = pix(A, x, y), pb = pix(B, x, y), k = (y * w + x) * 4;
    if (pa !== pb) { rozne++; out[k] = 255; out[k + 3] = 255; }
    else { const g = ((pb >>> 24) + ((pb >>> 16) & 255) + ((pb >>> 8) & 255)) / 3 | 0; out[k] = out[k + 1] = out[k + 2] = g; out[k + 3] = 90; }
  }
  return { rozne, wszystkie: w * h, inny: A.w !== B.w || A.h !== B.h ? A.w + '×' + A.h + ' → ' + B.w + '×' + B.h : '', roznica: pngKoduj(w, h, out) };
}

(async () => {
  const fails = [], www = path.resolve(__dirname, '../www');
  let browser, bazaDir, sprawdzen = 0, sha;
  const check = (ok, msg) => { sprawdzen++; if (!ok) fails.push(msg); return ok; };
  try {
    sha = baza();
    const b = zbudujBaze(sha); bazaDir = b.dir;
    // rysowanie powtarzalne: jeden wątek rastra, bez częściowego rastra i GPU (inaczej krawędzie zaokrągleń różnią się o 1–2 piksele)
    browser = await chromium.launch({ headless: true, args: ['--num-raster-threads=1', '--disable-partial-raster', '--disable-gpu', '--force-color-profile=srgb', '--disable-skia-runtime-opts', '--disable-lcd-text'], ...(process.env.OEST_BROWSER_PATH ? { executablePath: process.env.OEST_BROWSER_PATH } : {}) });
    const eB = [], eN = [], eN2 = [];
    const przed = await zrzuty(browser, b.www, eB), po = await zrzuty(browser, www, eN), po2 = await zrzuty(browser, www, eN2);
    check(!eN.length && !eN2.length, 'błędy strony (nowa wersja): ' + [...new Set([...eN, ...eN2])].join(' | '));
    const lista = JSON.parse(fs.readFileSync(ZMIANY, 'utf8')), zgoda = new Map(lista.entries.map(e => [e.id, e.reason]));
    fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
    const plik = n => path.join(OUT, n.replace(/[^\w.-]+/g, '_'));
    const zmienione = [];
    const oczekiwane = MAPA.length + ZRZUTY_INSPEKCJE.length;
    check(Object.keys(po).length === oczekiwane, 'zrzucono ' + Object.keys(po).length + ' z ' + oczekiwane + ' ekranów');
    for (const [n, png] of Object.entries(po)) {
      fs.writeFileSync(plik(n) + '.png', png);
      const st = porownaj(png, po2[n]);
      if (!check(st.rozne === 0, n + ': zrzut niestabilny – ta sama wersja dała 2 różne obrazy (' + st.rozne + ' pikseli) – zobacz ' + path.relative(REPO, plik(n)) + '-niestabilny.png')) { fs.writeFileSync(plik(n) + '-niestabilny.png', st.roznica); continue; }
      if (!przed[n]) { check(zgoda.has(n), n + ': nowy ekran (nie ma go w bazie) – wpisz go na listę ' + path.basename(ZMIANY) + ' za zgodą'); continue; }
      const r = porownaj(przed[n], png);
      if (r.rozne) {
        zmienione.push(n);
        fs.writeFileSync(plik(n) + '-przed.png', przed[n]); fs.writeFileSync(plik(n) + '-roznica.png', r.roznica);
        check(zgoda.has(n), n + ': wygląd zmienił się względem bazy ' + sha.slice(0, 7) + ' (' + r.rozne + ' z ' + r.wszystkie + ' pikseli' + (r.inny ? ', rozmiar ' + r.inny : '') + ') bez wpisu na liście ' + path.basename(ZMIANY) + ' – zobacz ' + path.relative(REPO, plik(n)) + '-roznica.png');
      } else check(!zgoda.has(n), n + ': jest na liście ' + path.basename(ZMIANY) + ', a wygląda tak samo jak w bazie – usuń wpis');
    }
    for (const k of zgoda.keys()) check(k in po, k + ': wpis na liście ' + path.basename(ZMIANY) + ', a takiego ekranu nie ma – usuń wpis');
    if (fails.length) { console.error('ZRZUTY UI FAIL (baza ' + sha.slice(0, 7) + '):\n - ' + fails.join('\n - ')); process.exitCode = 1; return; }
    console.log('ZRZUTY UI PASS: ' + Object.keys(po).length + ' ekranów (mapa ekrany.json + inspekcje ' + ZRZUTY_INSPEKCJE.join(', ') + '), piksel w piksel z bazą ' + sha.slice(0, 7) + ', każdy zrzut 2× stabilny; zmienione za zgodą: ' + (zmienione.join(', ') || 'brak') + '; ' + sprawdzen + ' sprawdzeń; zrzuty: ' + path.relative(REPO, OUT));
  } finally { if (browser) await browser.close(); if (bazaDir) fs.rmSync(bazaDir, { recursive: true, force: true }); }
})().catch(e => { console.error('ZRZUTY UI FAIL:', e && e.stack || e); process.exit(1); });
