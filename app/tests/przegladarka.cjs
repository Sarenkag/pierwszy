// Przeglądarka testów OEST: Playwright z silnikiem LibreOffice jak w telefonie (Grzegorz 21/11/2026: PDF raportów TYLKO z Worda
// silnikiem LibreOffice, własnego rysownika nie ma). Każda strona dostaje wtyczkę Capacitor „LibreOffice” (toPdf), która konwertuje
// otrzymany Word PRAWDZIWYM LibreOffice na komputerze testów (soffice --headless), więc testy Word = PDF porównują Word z PDF-em
// z prawdziwego silnika, a nie z atrapą. Bez soffice na komputerze test kończy się błędem (żadnego cichego pomijania).
// Użycie w teście: const { chromium } = require('./przegladarka.cjs');  (zamiast require('playwright'))
// Test, który sam podstawia window.Capacitor (atrapy wtyczek telefonu), zachowuje wtyczkę LibreOffice (setter niżej).
'use strict';
const fs = require('node:fs'), os = require('node:os'), path = require('node:path'), { execFile } = require('node:child_process');
const pw = require(process.env.OEST_PLAYWRIGHT_PATH || 'playwright');

const SOFFICE = process.env.OEST_SOFFICE || 'soffice';
const katalog = fs.mkdtempSync(path.join(os.tmpdir(), 'oest-lo-'));
const profil = 'file://' + path.join(katalog, 'profil');
let kolejka = Promise.resolve(), licznik = 0;
// jedna konwersja naraz (jeden profil LibreOffice), jak jeden silnik w telefonie
function konwertuj(docxB64) {
  const run = () => new Promise((ok, zle) => {
    const n = ++licznik, wej = path.join(katalog, 'w' + n + '.docx'), wyj = path.join(katalog, 'w' + n + '.pdf');
    fs.writeFileSync(wej, Buffer.from(docxB64, 'base64'));
    execFile(SOFFICE, ['--headless', '--norestore', '-env:UserInstallation=' + profil, '--convert-to', 'pdf', '--outdir', katalog, wej], { timeout: 120000 }, (e) => {
      try { if (e) throw e; const pdf = fs.readFileSync(wyj); ok(pdf.toString('base64')); } catch (err) { zle(new Error('LibreOffice (soffice) nie zrobił PDF: ' + (err && err.message || err))); }
      finally { fs.rmSync(wej, { force: true }); fs.rmSync(wyj, { force: true }); }
    });
  });
  const p = kolejka.then(run, run); kolejka = p.catch(() => {}); return p;
}

// wtyczka w stronie: Capacitor.Plugins.LibreOffice.toPdf({ docx }) → { pdf } (base64), jak LibreOfficePlugin.java
function wtyczka() {
  const lo = { toPdf: ({ docx }) => window.__oestLibreOffice(docx).then(pdf => ({ pdf })) };
  const dodaj = (C) => {
    if (!C || typeof C !== 'object') return C;
    const jest = C.isPluginAvailable;
    C.isPluginAvailable = n => n === 'LibreOffice' || (typeof jest === 'function' ? jest(n) : false);
    if (typeof C.isNativePlatform !== 'function') C.isNativePlatform = () => false;
    if (!C.Plugins || !C.Plugins.LibreOffice) C.Plugins = Object.assign(C.Plugins || {}, { LibreOffice: lo }); // własna atrapa testu (pdf-z-docx) zostaje
    return C;
  };
  let cap = dodaj(window.Capacitor || {});
  Object.defineProperty(window, 'Capacitor', { configurable: true, get: () => cap, set: v => { cap = dodaj(v); } });
}

async function przygotuj(ctx) {
  await ctx.exposeFunction('__oestLibreOffice', konwertuj);
  await ctx.addInitScript(wtyczka);
  return ctx;
}
function przegladarka(b) {
  const newContext = b.newContext.bind(b);
  b.newContext = async (o) => przygotuj(await newContext(o));
  b.newPage = async (o) => { const ctx = await b.newContext(o), page = await ctx.newPage(); page.on('close', () => ctx.close().catch(() => {})); return page; };
  return b;
}
const chromium = Object.create(pw.chromium);
chromium.launch = async (o) => przegladarka(await pw.chromium.launch(o));
chromium.launchPersistentContext = async (dir, o) => przygotuj(await pw.chromium.launchPersistentContext(dir, o));

process.on('exit', () => { try { fs.rmSync(katalog, { recursive: true, force: true }); } catch (e) {} });
module.exports = Object.assign(Object.create(pw), { chromium });
