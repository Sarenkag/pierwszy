// Plan audytu 19/11/2026, punkt 1.5 (ustalenie nr 9): czcionka raportu sprawdzana WEDŁUG PRZEBIEGU, a nie „wszystko Calibri”.
// Zasada (Grzegorz 20/11/2026, zmiana D2): tekst raportu Calibri, kratki ☑/☒ czcionką Wingdings 2; PDF = ten sam Word (PROD-023),
// więc każdy napis w PDF ma czcionkę tego przebiegu Worda, z którego pochodzi (albo jej odpowiednik metryczny, np. Carlito za Calibri).
// Test wypełnia KAŻDĄ inspekcję EFA-INS z listy PPM jak użytkownik i klika Wyślij (raporty-kolejka.cjs; PDF robi prawdziwy LibreOffice – przegladarka.cjs),
// do tego raport Reactive. Dla każdego Worda z kolejki:
//  - word:<id>:<plik>:<część>:<czcionka> – przebieg z tekstem nie w Calibri / kratka nie w Wingdings 2 („brak” = Word nie podaje czcionki);
// dla każdego PDF, który ma obok Word o tej samej nazwie (czcionka z /BaseFont przez operator Tf, docxRunFonts/pdfRunFonts w raport-tresc.cjs):
//  - pdf:<id>:<plik>:<czcionka Worda>→<czcionka PDF> – napis w PDF inną czcionką niż jego przebieg w Wordzie,
//  - pdf:<id>:<plik>:brak:<czcionka Worda> – czcionki z Worda nie ma w PDF w żadnym napisie, a nie wyszła jako „→” (np. kratki narysowane kreskami).
// Rozbieżności, które już są w apce, są na liście quality/baselines/czcionka-przebieg.json (lista może tylko maleć; naprawa: faza 4 planu):
// nowa = FAIL, z listy, której już nie ma = FAIL (usuń wpis), raport, którego nie da się sprawdzić = FAIL;
// „maks” = liczba trafień wpisu (przebiegi Worda / napisy PDF): więcej = FAIL (rozlanie), mniej = FAIL do czasu obniżenia „maks”.
// Word: znaki ASCII czcionką w:ascii, pozostałe (np. „—”, „ł”) czcionką w:hAnsi – każdy zakres sprawdzany osobno.
// NIE sprawdza: PDF z silnika LibreOffice na Pixelu (tam czcionki zależą od czcionek w APK – sprawdzenie na telefonie); tutaj LibreOffice z komputera testów.
const fs = require('node:fs'), path = require('node:path');
const { zbierz } = require('./raporty-kolejka.cjs');
const { docxRunFonts, pdfRunFonts, flat } = require('./raport-tresc.cjs');
const BASELINE = path.resolve(__dirname, '../../quality/baselines/czcionka-przebieg.json');
const KRATKA = /^[\s☐☑☒]+$/;
// rodzina czcionki: bez stylu (-Bold, ,Italic), spacji i wielkości liter; odpowiedniki metryczne w jednej grupie;
// Wingdings 2 = OpenSymbol (LibreOffice zamienia kratkę Worda na swoją czcionkę symboli – inspekcje/index.html, boxGlyphFont)
const GRUPY = [['calibri', 'carlito'], ['timesnewroman', 'times', 'liberationserif'], ['arial', 'arialmt', 'helvetica', 'liberationsans'], ['wingdings2', 'opensymbol']];
const rodzina = f => { const n = String(f || '').replace(/[-,].*$/, '').replace(/\s+/g, '').toLowerCase(); const g = GRUPY.find(x => x.includes(n)); return g ? g[0] : n; };
const czesc = n => n.replace(/^.*?( - [^.]+)?\.(docx|pdf)$/, (_, s) => s ? s.slice(3) : 'raport');

(async () => {
  const bad = [], roz = new Map(), bezTekstu = [];
  let sprawdzen = 0;
  const sp = (ok, m) => { sprawdzen++; if (!ok) bad.push(m); return ok; };
  // liczba trafień każdej rozbieżności (przebiegi Worda / napisy PDF): rozlanie zastanej rozbieżności na kolejne miejsca = FAIL („maks” w liście)
  const dodaj = (id, opis) => { const v = roz.get(id); if (v) v.n++; else roz.set(id, { opis, n: 1 }); };
  const { raporty, bledy, oczekiwane } = await zbierz({ wtyczka: false });
  bad.push(...bledy);
  for (const { id, pliki, errs } of raporty) {
    const buf = f => Buffer.from(f.data, 'base64'), wordy = pliki.filter(f => f.name.endsWith('.docx'));
    sp(wordy.length > 0, id + ': w raporcie nie ma Worda (' + pliki.map(f => f.name).join(', ') + ')');
    const przebiegi = new Map(wordy.map(w => [w.name, docxRunFonts(buf(w))]));
    for (const w of wordy) {
      const cz = czesc(w.name); let runs = przebiegi.get(w.name);
      if (!runs.length) { bezTekstu.push(id + ':' + cz); continue; }
      // Word: tekst Calibri, kratki Wingdings 2 (D2)
      for (const r of runs) {
        // w Wordzie dokładnie te nazwy (bez zamienników – Carlito/OpenSymbol dopuszczalne tylko w PDF)
        const kratka = r.sym || KRATKA.test(r.text), nz = String(r.font || '').replace(/\s+/g, '').toLowerCase(), ok = kratka ? nz === 'wingdings2' : nz === 'calibri';
        sprawdzen++; if (ok) continue;
        dodaj('word:' + id + ':' + cz + ':' + r.part.replace(/\d+$/, '') + ':' + (r.font || 'brak'), id + ': „' + w.name + '” ' + (kratka ? 'kratka' : 'tekst') + ' „' + r.text.slice(0, 40) + '” czcionką ' + (r.font || '(brak – Word dobiera sam)'));
      }
      // PDF o tej samej nazwie: każdy napis czcionką swojego przebiegu w Wordzie
      const p = pliki.find(f => f.name === w.name.slice(0, -5) + '.pdf'); if (!p) continue;
      // PDF powstaje z tego Worda i z Wordów „<nazwa> - …docx” sklejonych za nim (Flushing: formularz firmy + basic form) – napis PDF ma odpowiednik w którymkolwiek z nich
      runs = wordy.filter(x => x.name === w.name || x.name.startsWith(w.name.slice(0, -5) + ' - ')).flatMap(x => przebiegi.get(x.name));
      const pr = pdfRunFonts(buf(p));
      if (!sp(pr.length > 0, id + ': „' + p.name + '” bez żadnego napisu z czcionką (Tf), a Word ma tekst')) continue;
      const zle = new Set(), wszystkie = [...new Set(runs.filter(r => !r.sym && !KRATKA.test(r.text)).map(r => r.font || 'brak'))];
      for (const t of pr) {
        // oczekiwane czcionki osobno dla każdego zakresu znaków napisu (ASCII → w:ascii, pozostałe → w:hAnsi): każdy zakres musi się zgadzać
        const fonty = rr => [...new Set(rr.map(r => r.font || 'brak'))];
        let grupy;
        if (KRATKA.test(t.text)) grupy = [fonty(runs.filter(r => r.sym || KRATKA.test(r.text)))];
        else { const ft = flat(t.text), pas = r => { const fr = flat(r.text).toUpperCase(), fu = ft.toUpperCase(); return !r.sym && fr.length > 0 && (fr.length > 1 && fu.length > 1 ? fr.includes(fu) || fu.includes(fr) : fr === fu || (fu.length === 1 && (fr.endsWith(fu) || (!/[\p{L}\p{N}]/u.test(fu) && fr.includes(fu))))); }; // wielkie litery: Word <w:caps/>; jeden znak = koniec słowa przełamanego w wąskiej komórce („COMPLETE”/„D”) albo znak rozdzielający odsunięty spacjami („LEVEL 49   ·   5/5”)
          grupy = ['ascii', 'hAnsi'].filter(z => (z === 'ascii' ? /[\u0000-\u007f]/ : /[^\u0000-\u007f]/).test(t.text.replace(/\s+/g, ''))).map(z => fonty(runs.filter(r => r.zakres === z && pas(r)))); }
        // napis PDF bez odpowiednika w żadnym przebiegu Worda: nie da się go sprawdzić – osobny wpis (nie przyjmujemy dowolnej czcionki dokumentu)
        grupy = grupy.filter(g => g.length);
        if (!grupy.length) { sprawdzen++; dodaj('pdf:' + id + ':' + cz + ':niedopasowany:' + t.font, id + ': „' + p.name + '” napis „' + t.text.slice(0, 40) + '” (' + t.font + ') bez odpowiednika w przebiegach Worda – czcionki nie da się sprawdzić'); continue; }
        const zleG = grupy.filter(g => !g.some(f => rodzina(f) === rodzina(t.font)));
        sprawdzen++; if (!zleG.length) continue;
        for (const ocz of zleG) for (const f of ocz) { zle.add(f); dodaj('pdf:' + id + ':' + cz + ':' + f + '→' + t.font, id + ': „' + p.name + '” napis „' + t.text.slice(0, 40) + '” czcionką ' + t.font + ', w Wordzie ' + ocz.join(' / ')); }
      }
      // czcionka z Worda, której nie ma w żadnym napisie PDF i nie wyszła wyżej (np. kratki Wingdings 2 narysowane w PDF kreskami)
      const wPdf = new Set(pr.map(t => rodzina(t.font)));
      for (const f of [...new Set(runs.map(r => r.font || 'brak'))]) { sprawdzen++; if (!wPdf.has(rodzina(f)) && !zle.has(f)) dodaj('pdf:' + id + ':' + cz + ':brak:' + f, id + ': w „' + p.name + '” żaden napis nie jest czcionką ' + f + ' z Worda'); }
    }
    sp(!errs.length, id + ': błędy strony: ' + errs.join(' | '));
  }
  sp(raporty.length === oczekiwane, 'sprawdzono ' + raporty.length + ' z ' + oczekiwane + ' raportów (pominięcie to nie PASS)');
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')), known = new Set(base.entries.map(e => e.id)), maks = new Map(base.entries.map(e => [e.id, e.maks]));
  for (const [k, { opis, n }] of roz) {
    if (!known.has(k)) { bad.push('nowa rozbieżność spoza listy ' + path.basename(BASELINE) + ': ' + k + ' – ' + opis); continue; }
    const m = maks.get(k);
    if (typeof m !== 'number' || n > m) bad.push(k + ': ' + n + ' trafień, na liście maks ' + m + ' – zastana rozbieżność objęła nowe miejsca');
    else if (n < m) bad.push(k + ': ' + n + ' trafień, na liście maks ' + m + ' – obniż „maks” do ' + n + ' (lista maleje)');
  }
  for (const k of known) if (!roz.has(k)) bad.push('wpis ' + k + ' z listy ' + path.basename(BASELINE) + ' już nie występuje – usuń go (lista maleje)');
  if (process.env.OEST_DEBUG) console.log(JSON.stringify([...roz].map(([id, { opis, n }]) => ({ id, maks: n, reason: opis })), null, 1));
  if (bad.length) { console.error('CZCIONKA PRZEBIEG UI FAIL:\n - ' + bad.join('\n - ')); process.exit(1); }
  console.log('CZCIONKA PRZEBIEG UI PASS: ' + raporty.length + ' raportów (inspekcje EFA-INS z listy PPM + Reactive), czcionka każdego przebiegu Worda i napisu PDF; Word bez tekstu (same zdjęcia): ' + (bezTekstu.join(', ') || 'brak') + '; znane rozbieżności z listy: ' + roz.size + '; ' + sprawdzen + ' sprawdzeń');
})().catch(e => { console.error('CZCIONKA PRZEBIEG UI FAIL:', e && e.stack || e); process.exit(1); });
