// Plan audytu 19/11/2026, punkt 1.4 (ustalenie nr 8, etap 1): PDF raportu powstał z TYCH SAMYCH bajtów Worda, który idzie mailem.
// Zasada (Grzegorz 04/11 i 20/11/2026, PROD-023): Word i PDF identyczne – PDF z tego samego wypełnionego Worda (moduly/word-pdf → zWorda,
// silnik LibreOffice w telefonie). W przeglądarce silnika nie ma, więc test podstawia wtyczkę LibreOffice (Capacitor.Plugins.LibreOffice.toPdf),
// która zapisuje skrót SHA-256 otrzymanego Worda w zwróconym PDF (raporty-kolejka.cjs). Potem dla KAŻDEJ inspekcji EFA-INS z listy PPM
// i dla raportu Reactive: każdy PDF, który ma obok siebie Word o tej samej nazwie, musi być PDF-em z wtyczki, a skrót w nim = SHA-256 tego Worda.
// PDF narysowany osobnym rysownikiem (buildPdf, buildPhotoPdf, buildFlushPdf, OESTWordPdf.pdf) albo z innego Worda = rozbieżność.
// Rozbieżności, które już są w apce, są na liście quality/baselines/pdf-z-docx.json (lista może tylko maleć):
// nowa = FAIL, z listy, której już nie ma = FAIL (usuń wpis), raport, którego nie da się sprawdzić = FAIL.
// NIE sprawdza: czy prawdziwy silnik LibreOffice na Pixelu daje dobry PDF (to workflow „PDF z Worda – emulator” i telefon).
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { zbierz, ZNACZNIK } = require('./raporty-kolejka.cjs');
const BASELINE = path.resolve(__dirname, '../../quality/baselines/pdf-z-docx.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');

(async () => {
  const bad = [], roz = [];
  let sprawdzen = 0;
  const sp = (ok, m) => { sprawdzen++; if (!ok) bad.push(m); return ok; };
  const { raporty, bledy, oczekiwane } = await zbierz({ wtyczka: true });
  bad.push(...bledy);
  for (const { id, pliki, errs } of raporty) {
    // pary Word + PDF o tej samej nazwie: PDF ma pochodzić z wtyczki i z tych samych bajtów Worda
    const buf = f => Buffer.from(f.data, 'base64'), word = new Map(pliki.filter(f => f.name.endsWith('.docx')).map(f => [f.name.slice(0, -5), f]));
    let par = 0;
    for (const p of pliki.filter(f => f.name.endsWith('.pdf'))) {
      const w = word.get(p.name.slice(0, -4)); if (!w) continue; par++;
      // Flushing: PDF = formularz firmy + basic form sklejone (moduly/word-pdf → zWordow) – znaczniki obu Wordów, w tej kolejności
      const tekst = buf(p).toString('latin1'), czesc = p.name.replace(/^.*?( - [^.]+)?\.pdf$/, (_, s) => s ? s.slice(3) : 'raport');
      const znaczniki = tekst.split(ZNACZNIK).slice(1).map(t => t.slice(0, 64)), basic = word.get(p.name.slice(0, -4) + ' - basic');
      const oczek = [sha(buf(w))].concat(basic ? [sha(buf(basic))] : []);
      if (!znaczniki.length) roz.push({ id: 'rysownik:' + id + ':' + czesc, opis: id + ': „' + p.name + '” narysowany osobno, nie z Worda „' + w.name + '”' });
      else if (znaczniki.join() !== oczek.join()) roz.push({ id: 'inny-word:' + id + ':' + czesc, opis: id + ': „' + p.name + '” powstał z innych bajtów niż wysyłane Wordy „' + w.name + '”' + (basic ? ' + „' + basic.name + '”' : '') });
      else sp(true, '');
    }
    sp(par > 0, id + ': w raporcie nie ma żadnej pary Word + PDF o tej samej nazwie (' + pliki.map(f => f.name).join(', ') + ')');
    sp(!errs.length, id + ': błędy strony: ' + errs.join(' | '));
  }
  sp(raporty.length === oczekiwane, 'sprawdzono ' + raporty.length + ' z ' + oczekiwane + ' raportów (pominięcie to nie PASS)');
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Set(base.entries.map(e => e.id)), now = new Set(roz.map(r => r.id));
  for (const r of roz) if (!known.has(r.id)) bad.push('nowa rozbieżność spoza listy ' + path.basename(BASELINE) + ': ' + r.id + ' – ' + r.opis);
  for (const k of known) if (!now.has(k)) bad.push('wpis ' + k + ' z listy ' + path.basename(BASELINE) + ' już nie występuje – usuń go (lista maleje)');
  if (process.env.OEST_DEBUG) console.log(JSON.stringify(roz, null, 1));
  if (bad.length) { console.error('PDF Z DOCX UI FAIL:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('PDF Z DOCX UI PASS: ' + raporty.length + ' raportów (inspekcje EFA-INS z listy PPM + Reactive), PDF z tych samych bajtów Worda; znane rozbieżności z listy: ' + roz.length + '; ' + sprawdzen + ' sprawdzeń');
})().catch(e => { console.error('PDF Z DOCX UI FAIL:', e && e.stack || e); process.exit(1); });
