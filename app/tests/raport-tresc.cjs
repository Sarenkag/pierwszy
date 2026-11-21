// Odczyt treści wygenerowanych raportów w testach (PROD-023: Word i PDF z tymi samymi danymi).
// Wspólny dla raport-ui-check.cjs i reactive-ui-check.cjs – testy sprawdzają, CO jest w plikach, nie tylko że powstały.
// Nie jest testem (nazwa bez .test.cjs / -ui-check.cjs), Quality Gate go nie uruchamia osobno.
'use strict';
const PizZip = require('pizzip');

const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// Tekst dokumentu Word: wszystkie w:t z word/document.xml (oraz nagłówków/stopek), akapity rozdzielone nową linią.
function docxText(buf) {
  const zip = new PizZip(buf), parts = Object.keys(zip.files).filter(f => /^word\/(document|header\d*|footer\d*)\.xml$/.test(f)).sort();
  if (!parts.includes('word/document.xml')) throw Error('DOCX bez word/document.xml');
  return parts.map(f => zip.file(f).asText().split('</w:p>').map(p => [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => unxml(m[1])).join('')).join('\n')).join('\n');
}

// Akapity Word (document.xml) z zaznaczeniem tła (w:highlight) – tekst akapitu, np. rok i miesiąc w tabeli QHS-031.
function docxHighlighted(buf) {
  const x = new PizZip(buf).file('word/document.xml').asText();
  return (x.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || []).filter(p => /<w:r[ >](?:(?!<\/w:r>)[\s\S])*<w:highlight /.test(p))
    .map(p => [...p.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => unxml(m[1])).join('').trim()).filter(Boolean);
}

// Liczba obrazów w Word (word/media/*).
function docxImages(buf) { return Object.keys(new PizZip(buf).files).filter(f => /^word\/media\/[^/]+$/.test(f)).length; }

// PDF czytany gotową biblioteką pdf.js (pdf-czytaj.mjs) – PDF raportów robi LibreOffice, nie nasz rysownik (Grzegorz 21/11/2026).
const czytane = new WeakMap();
function pdfCzytaj(buf) {
  if (buf.toString('latin1', 0, 5) !== '%PDF-') throw Error('To nie jest PDF');
  if (czytane.has(buf)) return czytane.get(buf);
  const r = require('node:child_process').spawnSync(process.execPath, [require('node:path').join(__dirname, 'pdf-czytaj.mjs')], { input: buf, maxBuffer: 1 << 28 });
  if (r.status !== 0) throw Error('pdf.js nie przeczytał PDF: ' + String(r.stderr).slice(0, 400));
  const out = JSON.parse(r.stdout.toString('utf8'));
  if (!Array.isArray(out.pages) || !out.pages.length) throw Error('PDF bez żadnej strony (pdf.js)');
  czytane.set(buf, out); return out;
}
function pdfText(buf) { return pdfCzytaj(buf).pages.flatMap(p => p.lines).join('\n'); }
// Liczba stron i obrazów w PDF.
function pdfPages(buf) { return pdfCzytaj(buf).pages.length; }
// orientacja kolejnych stron: 'L' pozioma, 'P' pionowa (wymiary strony z pdf.js)
function pdfOrientacja(buf) { return pdfCzytaj(buf).pages.map(p => p.w > p.h ? 'L' : 'P').join(''); }
function pdfImages(buf) { return pdfCzytaj(buf).pages.reduce((n, p) => n + p.images.length, 0); }

// Porównanie bez różnic w odstępach (Word i PDF łamią linie inaczej).
const flat = s => String(s).replace(/\s+/g, ' ').trim();
function includesFlat(hay, needle) { return flat(hay).includes(flat(needle)); }

// ---------- Word = PDF (word-pdf-ui-check.cjs, 08/11/2026): treść tak, jak ją widać, i zdjęcia ----------
// Word: tekst treści i osobno nagłówków/stopek; <w:caps/> = wielkie litery (tak wyświetla Word); <w:tab/> = odstęp.
function docxParts(buf) {
  const zip = new PizZip(buf), files = Object.keys(zip.files);
  const text = f => zip.file(f).asText().split('</w:p>').map(p => [...p.matchAll(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g)].map(r => {
    const rp = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(r[1]), caps = !!(rp && /<w:caps\/>|<w:caps w:val="(?:true|1|on)"\/>/.test(rp[1]));
    return [...r[1].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<w:sym w:font="Wingdings 2" w:char="(F052|F054)"\/>/g)].map(m => m[1] !== undefined ? (caps ? unxml(m[1]).toUpperCase() : unxml(m[1])) : m[2] ? (m[2] === 'F052' ? '\u2611' : '\u2612') : m[0] === '<w:tab/>' ? '\t' : ' ').join(''); // kratka jako symbol Worda (Wingdings 2) = ☑/☒
  }).join('')).join('\n');
  if (!files.includes('word/document.xml')) throw Error('DOCX bez word/document.xml');
  // zdjęcia w treści (nie w nagłówku): wymiary obrazów wstawionych w word/document.xml
  const embeds = part => { const rf = part.replace(/^word\//, 'word/_rels/') + '.rels', rels = zip.file(rf) ? zip.file(rf).asText() : '';
    const target = id => { const m = new RegExp('Id="' + id + '"[^>]*Target="([^"]+)"').exec(rels) || new RegExp('Target="([^"]+)"[^>]*Id="' + id + '"').exec(rels); return m ? 'word/' + m[1].replace(/^\.?\//, '') : null; };
    return [...zip.file(part).asText().matchAll(/r:embed="([^"]+)"/g)].map(m => { const t = target(m[1]); return t && zip.file(t) ? imgSize(Buffer.from(zip.file(t).asUint8Array())) : null; }).filter(Boolean); };
  const hfFiles = files.filter(f => /^word\/(header|footer)\d*\.xml$/.test(f)).sort();
  // wiersze tabeli z <w:tblHeader/> Word powtarza na każdej stronie – jak nagłówek strony (PDF rysuje je na każdej stronie)
  const doc = zip.file('word/document.xml').asText(), rep = [...doc.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map(m => m[0]).filter(r => /<w:tblHeader\/>|<w:tblHeader w:val="(?:true|1|on)"\/>/.test(r));
  zip.file('__rep.xml', rep.join('')); zip.file('__body.xml', rep.reduce((d, r) => d.replace(r, ''), doc));
  return { body: text('__body.xml'), hf: hfFiles.map(text), powtarzane: text('__rep.xml'), photos: embeds('word/document.xml'), logo: hfFiles.flatMap(embeds) };
}
// wymiary JPEG/PNG z nagłówka pliku ('SZERxWYS')
function imgSize(b) {
  if (b[0] === 0x89 && b[1] === 0x50) return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20);
  for (let i = 2; i + 9 < b.length;) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return b.readUInt16BE(i + 7) + 'x' + b.readUInt16BE(i + 5); i += 2 + len; }
  return null;
}
// PDF: napisy w kolejności rysowania, strona po stronie (pdf.js); kratki ☑/☒ są w PDF z LibreOffice zwykłymi znakami, jak w Wordzie.
// Zdjęcia: wymiary każdego wstawienia.
function pdfParts(buf) { const r = pdfCzytaj(buf); return { pages: r.pages.map(p => p.lines), photos: r.pages.flatMap(p => p.images) }; }
// Porównanie treści Word i PDF. Słowa (bez znaczenia, gdzie się łamie linia), z ☑/☒; nagłówki/stopki Worda osobno
// (w PDF powtarzają się na każdej stronie, więc liczy się, że są, a nie ile razy). Wynik: słowa tylko w Wordzie / tylko w PDF.
// kratka ☑/☒ sklejona z pierwszym słowem hasła („☑Access”), żeby zamiana stanów dwóch punktów nie dała tej samej listy słów
const words = s => String(s).replace(/[   ]/g, ' ').replace(/([☐☑☒])\s+/g, '$1').split(/\s+/).filter(Boolean);
function wordPdfDiff(wordBufs, pdfBufs) {
  const W = wordBufs.map(docxParts), P = pdfBufs.map(pdfParts);
  const hf = new Set(W.flatMap(w => w.hf.flatMap(h => h.split(/[\n\t]/).map(l => words(l).join(' ')).filter(Boolean))));
  // wiersz nagłówka/stopki Worda rozstawiony spacjami lub tabulatorem jest w PDF kilkoma blokami tekstu obok siebie: 2–4 kolejne bloki razem = ten wiersz
  const pLines = [];
  for (const lines of P.flatMap(p => p.pages)) { const L = lines.map(l => words(l).join(' ')).filter(Boolean); for (let i = 0; i < L.length; i++) { const k = [4, 3, 2].find(k => i + k <= L.length && hf.has(L.slice(i, i + k).join(' '))) || 1; pLines.push(L.slice(i, i + k).join(' ')); i += k - 1; } }
  const bag = a => a.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());
  // słowo przełamane w wąskiej komórce bez łącznika (LibreOffice: „COMPLETE” / „D”): dwa sąsiednie kawałki PDF sklejone, gdy razem dają słowo Worda,
  // a któregoś kawałka jako osobnego słowa w Wordzie nie ma (także w wierszach nagłówka tabeli powtórzonych na kolejnej stronie)
  const wSlowa = new Set(W.flatMap(w => words(w.body).concat(words(w.powtarzane))));
  const sklej = seq => { const o = []; for (let i = 0; i < seq.length; i++) { const a = seq[i], b = seq[i + 1]; if (b !== undefined && wSlowa.has(a + b) && (!wSlowa.has(a) || !wSlowa.has(b))) { o.push(a + b); i++; } else o.push(a); } return o; };
  const rep = W.flatMap(w => words(w.powtarzane)), wb = bag(W.flatMap(w => words(w.body)).concat(rep)), pb = bag(sklej(pLines.filter(l => !hf.has(l)).flatMap(l => l.split(' '))));
  const only = (a, b) => [...a].flatMap(([t, n]) => Array(Math.max(0, n - (b.get(t) || 0))).fill(t));
  // nadwyżka w PDF, która jest dokładnie N kopiami powtarzanych wierszy nagłówka tabeli (kolejne strony), nie jest różnicą
  let tylkoPdf = only(pb, wb); const tylkoWord = only(wb, pb);
  if (rep.length && tylkoPdf.length && tylkoPdf.length % rep.length === 0) { const n = tylkoPdf.length / rep.length, rb = bag(rep), xb = bag(tylkoPdf); if ([...xb].every(([t, c]) => (rb.get(t) || 0) * n === c) && [...rb].every(([t, c]) => xb.get(t) === c * n)) tylkoPdf = []; }
  // logo i grafika nagłówka (obrazy z nagłówka Worda) nie są zdjęciami inspekcji – w PDF są na każdej stronie
  const logo = new Set(W.flatMap(w => w.logo)), wym = d => d.split('x').map(Number), pLogo = d => logo.has(d) || [...logo].some(l => { const [a, b] = wym(l), [c, e] = wym(d); return c <= a && e <= b && Math.abs(a / b - c / e) < 0.01 * a / b; }) /* LibreOffice zmniejsza duże logo nagłówka (300 dpi) – te same proporcje */, pSet = new Set(pLines), wph = bag(W.flatMap(w => w.photos).filter(d => !logo.has(d))), pph = bag(P.flatMap(p => p.photos).filter(d => !pLogo(d)));
  return {
    tylkoWord, tylkoPdf,
    naglowekBrakWPdf: [...hf].filter(l => !pSet.has(l)),
    zdjeciaTylkoWord: only(wph, pph), zdjeciaTylkoPdf: only(pph, wph), zdjeciaWord: [...wph.keys()], zdjeciaPdf: [...pph.keys()],
    slowa: { word: [...wb.values()].reduce((a, b) => a + b, 0), pdf: [...pb.values()].reduce((a, b) => a + b, 0) },
    zdjecia: { word: [...wph.values()].reduce((a, b) => a + b, 0), pdf: [...pph.values()].reduce((a, b) => a + b, 0) },
    tekstWord: W.map(w => w.body).join('\n'), tekstPdf: pLines.join('\n')
  };
}

// ---------- Czcionka według przebiegu (plan audytu 1.5, ustalenie nr 9) ----------
// Word: czcionka KAŻDEGO przebiegu z tekstem (dokument, nagłówki, stopki), tak jak ją wybiera Word: rFonts przebiegu → styl znakowy →
// styl akapitu → domyślny styl akapitu → docDefaults; czcionka motywu (asciiTheme) z word/theme. <w:sym> = czcionka symbolu.
// Wynik: [{ part, text, font }] – font null, gdy dokument nie podaje żadnej czcionki (Word wtedy dobiera ją sam).
function docxRunFonts(buf) {
  const zip = new PizZip(buf), xml = f => zip.file(f) ? zip.file(f).asText() : '';
  const theme = xml('word/theme/theme1.xml'), themeFont = t => { const blk = /^major/.test(t) ? /<a:majorFont>([\s\S]*?)<\/a:majorFont>/.exec(theme) : /<a:minorFont>([\s\S]*?)<\/a:minorFont>/.exec(theme); const m = blk && /<a:latin typeface="([^"]*)"/.exec(blk[1]); return m ? m[1] : null; };
  // k = 'ascii' (znaki do U+007F) albo 'hAnsi' (pozostałe znaki łacińskie, np. „—”, „ł”) – Word dobiera czcionkę osobno dla każdego zakresu
  const rf = (rpr, k) => { const m = rpr && /<w:rFonts\b([^>]*)\/?>/.exec(rpr); if (!m) return null; const a = new RegExp('w:' + k + '="([^"]+)"').exec(m[1]), t = new RegExp('w:' + k + 'Theme="([^"]+)"').exec(m[1]); return t ? themeFont(t[1]) : a ? unxml(a[1]) : null; };
  const styles = xml('word/styles.xml'), byId = new Map();
  for (const m of styles.matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g)) { const id = /w:styleId="([^"]+)"/.exec(m[1]); if (id) byId.set(id[1], { attrs: m[1], body: m[2] }); }
  const styleFont = (id, k, seen = new Set()) => { const st = id && byId.get(id); if (!st || seen.has(id)) return null; seen.add(id); const r = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(st.body), f = rf(r && r[1], k); if (f) return f; const b = /<w:basedOn w:val="([^"]+)"/.exec(st.body); return b ? styleFont(b[1], k, seen) : null; };
  const defPara = [...byId.entries()].find(([, v]) => /w:type="paragraph"/.test(v.attrs) && /w:default="(?:1|true)"/.test(v.attrs));
  const dd = /<w:rPrDefault>\s*<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(styles), docDefault = k => rf(dd && dd[1], k);
  const parts = Object.keys(zip.files).filter(f => /^word\/(document|header\d*|footer\d*)\.xml$/.test(f)).sort(), out = [];
  for (const part of parts) for (const p of xml(part).split('</w:p>')) {
    const pp = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(p), ps = pp && /<w:pStyle w:val="([^"]+)"/.exec(pp[1]);
    const paraFont = k => (ps && styleFont(ps[1], k)) || (defPara && styleFont(defPara[0], k)) || docDefault(k);
    for (const r of p.matchAll(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g)) {
      const rp = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(r[1]), rs = rp && /<w:rStyle w:val="([^"]+)"/.exec(rp[1]);
      const fontK = k => rf(rp && rp[1], k) || (rs && styleFont(rs[1], k)) || paraFont(k) || null;
      const sym = [...r[1].matchAll(/<w:sym\b[^>]*w:font="([^"]+)"[^>]*\/>/g)];
      for (const m of sym) out.push({ part: part.slice(5, -4), text: /w:char="F052"/.test(m[0]) ? '☑' : /w:char="F054"/.test(m[0]) ? '☒' : '(symbol)', font: unxml(m[1]), sym: true });
      const text = [...r[1].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)].map(m => unxml(m[1])).join('');
      // znaki ASCII czcionką w:ascii, pozostałe czcionką w:hAnsi – osobne wpisy, gdy przebieg ma oba rodzaje
      const asc = text.replace(/[^\u0000-\u007f]/g, ''), hi = text.replace(/[\u0000-\u007f]/g, '');
      if (asc.trim()) out.push({ part: part.slice(5, -4), text, font: fontK('ascii'), zakres: 'ascii' });
      if (hi.trim()) out.push({ part: part.slice(5, -4), text, font: fontK('hAnsi'), zakres: 'hAnsi' });
    }
  }
  return out;
}
// PDF: czcionka KAŻDEGO napisu (pdf.js: /BaseFont bez prefiksu podzbioru „ABCDEF+”). Wynik: [{ text, font }].
function pdfRunFonts(buf) { return pdfCzytaj(buf).pages.flatMap(p => p.runs); }
module.exports = { docxRunFonts, pdfRunFonts, docxHighlighted, docxText, docxImages, pdfText, pdfPages, pdfOrientacja, pdfImages, includesFlat, flat, docxParts, pdfParts, wordPdfDiff, imgSize };
