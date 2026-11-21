// Odczyt treści wygenerowanych raportów w testach (PROD-023: Word i PDF z tymi samymi danymi).
// Wspólny dla raport-ui-check.cjs i reactive-ui-check.cjs – testy sprawdzają, CO jest w plikach, nie tylko że powstały.
// Nie jest testem (nazwa bez .test.cjs / -ui-check.cjs), Quality Gate go nie uruchamia osobno.
'use strict';
const zlib = require('node:zlib'), PizZip = require('pizzip');

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

// Tekst PDF: rozpakowane strumienie (FlateDecode) i napisy z operatorów Tj/TJ. Wystarcza dla PDF z jsPDF (czcionki standardowe).
function pdfStreams(buf) {
  const s = buf.toString('latin1'), out = [];
  for (let i = s.indexOf('stream'); i >= 0; i = s.indexOf('stream', i + 6)) {
    if (s.slice(i - 3, i) === 'end') continue;
    let a = i + 6; if (s[a] === '\r') a++; if (s[a] === '\n') a++;
    const b = s.indexOf('endstream', a); if (b < 0) break;
    const raw = Buffer.from(s.slice(a, b), 'latin1');
    try { out.push(zlib.inflateSync(raw).toString('latin1')); } catch { out.push(raw.toString('latin1')); }
    i = b;
  }
  return out;
}
function pdfText(buf) {
  if (buf.toString('latin1', 0, 5) !== '%PDF-') throw Error('To nie jest PDF');
  const lit = t => t.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => /^[0-7]+$/.test(c) ? String.fromCharCode(parseInt(c, 8)) : ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[c] || c));
  // czcionki osadzone (np. DejaVu w formularzach inspekcji): tekst to numery glifów, tłumaczone przez ToUnicode CMap
  const cmap = new Map(), streams = pdfStreams(buf), u = h => String.fromCodePoint(...(h.match(/.{4}/g) || []).map(x => parseInt(x, 16)));
  for (const st of streams.filter(x => /begincmap/.test(x))) {
    for (const blk of st.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) cmap.set(m[1].toLowerCase(), u(m[2]));
    for (const blk of st.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const a = parseInt(m[1], 16), b = parseInt(m[2], 16), c = parseInt(m[3], 16), w = m[1].length;
      for (let k = a; k <= b && k - a < 65536; k++) cmap.set(k.toString(16).padStart(w, '0'), String.fromCodePoint(c + k - a));
    }
  }
  const hex = h => { h = h.replace(/\s+/g, '').toLowerCase(); if (cmap.size && h.length % 4 === 0) return (h.match(/.{4}/g) || []).map(g => cmap.get(g) ?? '').join(''); let t = ''; for (let k = 0; k + 1 < h.length; k += 2) t += String.fromCharCode(parseInt(h.slice(k, k + 2), 16)); return t; };
  const lines = [];
  for (const st of streams) {
    for (const m of st.matchAll(/\[((?:\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|[^\]])*)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*Tj|<([0-9A-Fa-f\s]+)>\s*Tj/g)) {
      if (m[1] !== undefined) lines.push([...m[1].matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g)].map(x => x[2] !== undefined ? hex(x[2]) : lit(x[1])).join(''));
      else if (m[2] !== undefined) lines.push(lit(m[2]));
      else lines.push(hex(m[3]));
    }
  }
  return lines.join('\n');
}
// Liczba stron i obrazów w PDF.
function pdfPages(buf) { return (buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length; }
function pdfImages(buf) { return (buf.toString('latin1').match(/\/Subtype\s*\/Image/g) || []).length; }

// Porównanie bez różnic w odstępach (Word i PDF łamią linie inaczej).
const flat = s => String(s).replace(/\s+/g, ' ').trim();
function includesFlat(hay, needle) { return flat(hay).includes(flat(needle)); }

// ---------- Word = PDF (word-pdf-ui-check.cjs, 08/11/2026): treść tak, jak ją widać, i zdjęcia ----------
// Word: tekst treści i osobno nagłówków/stopek; <w:caps/> = wielkie litery (tak wyświetla Word); <w:tab/> = odstęp.
function docxParts(buf) {
  const zip = new PizZip(buf), files = Object.keys(zip.files);
  const text = f => zip.file(f).asText().split('</w:p>').map(p => [...p.matchAll(/<w:r(?:\s[^>]*)?>([\s\S]*?)<\/w:r>/g)].map(r => {
    const rp = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(r[1]), caps = !!(rp && /<w:caps\/>|<w:caps w:val="(?:true|1|on)"\/>/.test(rp[1]));
    return [...r[1].matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:br\/>|<w:sym w:font="Wingdings 2" w:char="(F052|F054)"\/>/g)].map(m => m[1] !== undefined ? (caps ? unxml(m[1]).toUpperCase() : unxml(m[1])) : m[2] ? (m[2] === 'F052' ? '\u2611' : '\u2612') : ' ').join(''); // kratka jako symbol Worda (Wingdings 2) = ☑/☒
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
// PDF: napisy w kolejności rysowania, strona po stronie. Kratka rysowana przez apkę (mały kwadrat, a w nim ✓ = jedna łamana z 2 odcinków
// albo ✗ = 2 kreski; font PDF nie ma ☑/☒) zamieniona na ☑ / ☒ przed hasłem – tak jak w Wordzie. Zdjęcia: wymiary każdego wstawienia (Do).
function pdfParts(buf) {
  if (buf.toString('latin1', 0, 5) !== '%PDF-') throw Error('To nie jest PDF');
  const s = buf.toString('latin1'), st = pdfStreams(buf), cmap = new Map(), u = h => String.fromCodePoint(...(h.match(/.{4}/g) || []).map(x => parseInt(x, 16)));
  for (const x of st.filter(x => /begincmap/.test(x))) {
    for (const blk of x.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) cmap.set(m[1].toLowerCase(), u(m[2]));
    for (const blk of x.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const a = parseInt(m[1], 16), b = parseInt(m[2], 16), c = parseInt(m[3], 16), w = m[1].length;
      for (let k = a; k <= b && k - a < 65536; k++) cmap.set(k.toString(16).padStart(w, '0'), String.fromCodePoint(c + k - a));
    }
  }
  const lit = t => t.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => /^[0-7]+$/.test(c) ? String.fromCharCode(parseInt(c, 8)) : ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[c] || c));
  const hex = h => { h = h.replace(/\s+/g, '').toLowerCase(); if (cmap.size && h.length % 4 === 0) return (h.match(/.{4}/g) || []).map(g => cmap.get(g) ?? '').join(''); let t = ''; for (let k = 0; k + 1 < h.length; k += 2) t += String.fromCharCode(parseInt(h.slice(k, k + 2), 16)); return t; };
  // obrazy: nazwa zasobu (/I0) → numer obiektu → wymiary
  const objDict = n => { const m = new RegExp('(?:^|[^0-9])' + n + ' 0 obj\\s*<<([\\s\\S]*?)>>\\s*(?:stream|endobj)').exec(s); return m ? m[1] : ''; };
  const xo = new Map(); for (const d of s.matchAll(/\/XObject\s*<<([^>]*)>>/g)) for (const m of d[1].matchAll(/\/([^\s/]+)\s+(\d+)\s+0\s+R/g)) { const o = objDict(m[2]); if (/\/Subtype\s*\/Image/.test(o)) xo.set(m[1], (/\/Width\s+(\d+)/.exec(o) || [])[1] + 'x' + (/\/Height\s+(\d+)/.exec(o) || [])[1]); }
  const pages = [], photos = [];
  for (const x of st) {
    if (/begincmap/.test(x) || !/\b(?:Tj|TJ|Do)\b/.test(x)) continue;
    const lines = []; let box = false, subs = [], nums = [], name = null, m;
    const re = /\[((?:\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|[^\]])*)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*Tj|<([0-9A-Fa-f\s]+)>\s*Tj|(-?\d*\.?\d+)|\/([^\s/<>[\]()]+)|([A-Za-z*'"]+)/g;
    while ((m = re.exec(x))) {
      if (m[4] !== undefined) { nums.push(+m[4]); continue; }
      if (m[5] !== undefined) { name = m[5]; continue; }
      let t = null;
      if (m[1] !== undefined) t = [...m[1].matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g)].map(y => y[2] !== undefined ? hex(y[2]) : lit(y[1])).join('');
      else if (m[2] !== undefined) t = lit(m[2]); else if (m[3] !== undefined) t = hex(m[3]);
      if (t !== null) { const mark = box ? (subs.some(n => n === 2) ? '☑' : subs.filter(n => n === 1).length >= 2 ? '☒' : '☐') : ''; box = false; subs = []; lines.push(mark ? mark + ' ' + t : t); nums = []; continue; }
      const op = m[6];
      if (op === 're') { const [w, h] = nums.slice(-2); box = Math.abs(Math.abs(w) - Math.abs(h)) < 0.5 && Math.abs(w) < 20; subs = []; }
      else if (op === 'm') subs.push(0);
      else if (op === 'l' && subs.length) subs[subs.length - 1]++;
      else if (op === 'Do' && name && xo.has(name)) photos.push(xo.get(name));
      nums = [];
    }
    pages.push(lines);
  }
  return { pages, photos };
}
// Porównanie treści Word i PDF. Słowa (bez znaczenia, gdzie się łamie linia), z ☑/☒; nagłówki/stopki Worda osobno
// (w PDF powtarzają się na każdej stronie, więc liczy się, że są, a nie ile razy). Wynik: słowa tylko w Wordzie / tylko w PDF.
// kratka ☑/☒ sklejona z pierwszym słowem hasła („☑Access”), żeby zamiana stanów dwóch punktów nie dała tej samej listy słów
const words = s => String(s).replace(/[   ]/g, ' ').replace(/([☐☑☒])\s+/g, '$1').split(/\s+/).filter(Boolean);
function wordPdfDiff(wordBufs, pdfBufs) {
  const W = wordBufs.map(docxParts), P = pdfBufs.map(pdfParts);
  const hf = new Set(W.flatMap(w => w.hf.flatMap(h => h.split('\n').map(l => words(l).join(' ')).filter(Boolean))));
  const pLines = P.flatMap(p => p.pages.flat()).map(l => words(l).join(' ')).filter(Boolean);
  const bag = a => a.reduce((m, t) => m.set(t, (m.get(t) || 0) + 1), new Map());
  const rep = W.flatMap(w => words(w.powtarzane)), wb = bag(W.flatMap(w => words(w.body)).concat(rep)), pb = bag(pLines.filter(l => !hf.has(l)).flatMap(l => l.split(' ')));
  const only = (a, b) => [...a].flatMap(([t, n]) => Array(Math.max(0, n - (b.get(t) || 0))).fill(t));
  // nadwyżka w PDF, która jest dokładnie N kopiami powtarzanych wierszy nagłówka tabeli (kolejne strony), nie jest różnicą
  let tylkoPdf = only(pb, wb);
  if (rep.length && tylkoPdf.length && tylkoPdf.length % rep.length === 0) { const n = tylkoPdf.length / rep.length, rb = bag(rep), xb = bag(tylkoPdf); if ([...xb].every(([t, c]) => (rb.get(t) || 0) * n === c) && [...rb].every(([t, c]) => xb.get(t) === c * n)) tylkoPdf = []; }
  // logo i grafika nagłówka (obrazy z nagłówka Worda) nie są zdjęciami inspekcji – w PDF są na każdej stronie
  const logo = new Set(W.flatMap(w => w.logo)), pSet = new Set(pLines), wph = bag(W.flatMap(w => w.photos).filter(d => !logo.has(d))), pph = bag(P.flatMap(p => p.photos).filter(d => !logo.has(d)));
  return {
    tylkoWord: only(wb, pb), tylkoPdf,
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
// PDF: czcionka KAŻDEGO napisu (Tj/TJ) z operatora Tf w strumieniu strony → /BaseFont (bez prefiksu podzbioru „ABCDEF+”).
// Tekst czcionek osadzonych (Type0) tłumaczony przez ToUnicode tej czcionki. Wynik: [{ text, font }].
function pdfRunFonts(buf) {
  if (buf.toString('latin1', 0, 5) !== '%PDF-') throw Error('To nie jest PDF');
  const s = buf.toString('latin1'), obj = new Map();
  for (const m of s.matchAll(/(?:^|[\r\n\s])(\d+)\s+0\s+obj\b([\s\S]*?)endobj/g)) {
    const body = m[2], i = body.indexOf('stream'); let stream = null;
    if (i >= 0) { let a = i + 6; if (body[a] === '\r') a++; if (body[a] === '\n') a++; const b = body.lastIndexOf('endstream'); const raw = Buffer.from(body.slice(a, b < 0 ? body.length : b), 'latin1'); try { stream = zlib.inflateSync(raw).toString('latin1'); } catch { stream = raw.toString('latin1'); } }
    obj.set(m[1], { dict: i >= 0 ? body.slice(0, i) : body, stream });
  }
  const u = h => String.fromCodePoint(...(h.match(/.{4}/g) || []).map(x => parseInt(x, 16)));
  const cmapOf = n => { const o = obj.get(n), c = new Map(); if (!o || !o.stream) return c;
    for (const blk of o.stream.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) c.set(m[1].toLowerCase(), u(m[2]));
    for (const blk of o.stream.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) for (const m of blk[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) { const a = parseInt(m[1], 16), b = parseInt(m[2], 16), cc = parseInt(m[3], 16), w = m[1].length; for (let k = a; k <= b && k - a < 65536; k++) c.set(k.toString(16).padStart(w, '0'), String.fromCodePoint(cc + k - a)); }
    return c; };
  // zasób czcionki (/F1) → { name: BaseFont, cmap }
  const fonts = new Map();
  for (const d of s.matchAll(/\/Font\s*<<([^>]*)>>/g)) for (const m of d[1].matchAll(/\/([^\s/]+)\s+(\d+)\s+0\s+R/g)) {
    const o = obj.get(m[2]); if (!o) continue;
    const bf = /\/BaseFont\s*\/([^\s/<>[\]()]+)/.exec(o.dict), tu = /\/ToUnicode\s+(\d+)\s+0\s+R/.exec(o.dict);
    fonts.set(m[1], { name: bf ? bf[1].replace(/^[A-Z]{6}\+/, '').replace(/#20/g, ' ') : '?', cmap: tu ? cmapOf(tu[1]) : new Map() });
  }
  const lit = t => t.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_, c) => /^[0-7]+$/.test(c) ? String.fromCharCode(parseInt(c, 8)) : ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' }[c] || c));
  const out = [];
  for (const [, o] of obj) {
    const x = o.stream; if (!x || /begincmap/.test(x) || !/\bTf\b/.test(x)) continue;
    let cur = null, name = null, m;
    const hex = h => { h = h.replace(/\s+/g, '').toLowerCase(); const c = cur && cur.cmap; if (c && c.size) { const w = [...c.keys()][0].length; return (h.match(new RegExp('.{' + w + '}', 'g')) || []).map(g => c.get(g) ?? '').join(''); } let t = ''; for (let k = 0; k + 1 < h.length; k += 2) t += String.fromCharCode(parseInt(h.slice(k, k + 2), 16)); return t; };
    const re = /\[((?:\((?:\\.|[^\\)])*\)|<[0-9A-Fa-f\s]*>|[^\]])*)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]+)>\s*Tj|\/([^\s/<>[\]()]+)|\bTf\b/g;
    while ((m = re.exec(x))) {
      if (m[4] !== undefined) { name = m[4]; continue; }
      if (m[0] === 'Tf') { cur = fonts.get(name) || { name: '?' + name, cmap: new Map() }; continue; }
      const t = m[1] !== undefined ? [...m[1].matchAll(/\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]+)>/g)].map(y => y[2] !== undefined ? hex(y[2]) : lit(y[1])).join('') : m[2] !== undefined ? lit(m[2]) : hex(m[3]);
      if (t.trim()) out.push({ text: t, font: cur ? cur.name : null });
    }
  }
  return out;
}
module.exports = { docxRunFonts, pdfRunFonts, docxHighlighted, docxText, docxImages, pdfText, pdfPages, pdfImages, includesFlat, flat, docxParts, pdfParts, wordPdfDiff, imgSize };
