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

module.exports = { docxText, docxImages, pdfText, pdfPages, pdfImages, includesFlat, flat };
