// Czytanie PDF w testach gotową biblioteką pdf.js (Mozilla, pdfjs-dist) – PDF raportów robi LibreOffice (Grzegorz 21/11/2026).
// Wejście: bajty PDF na stdin. Wyjście (JSON na stdout): { pages: [{ w, h, lines: [tekst], runs: [{ text, font }], images: ['SZERxWYS'] }] }.
// Wiersze: napisy pdf.js złożone w linie (koniec linii = hasEOL, zmiana wysokości, przerwa w poziomie = komórka tabeli / tabulator), w kolejności rysowania.
// Czcionka: /BaseFont bez prefiksu podzbioru „ABCDEF+”. Uruchamiane synchronicznie z raport-tresc.cjs (spawnSync).
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';

const chunks = [];
for await (const c of process.stdin) chunks.push(c);
const data = new Uint8Array(Buffer.concat(chunks));
const doc = await getDocument({ data, disableFontFace: true, useSystemFonts: false, isEvalSupported: false, verbosity: 0 }).promise;
const pages = [];
for (let n = 1; n <= doc.numPages; n++) {
  const page = await doc.getPage(n), ops = await page.getOperatorList(), tc = await page.getTextContent();
  const fontName = id => { try { const f = page.commonObjs.get(id); return String(f && (f.name || f.loadedName) || id).replace(/^[A-Z]{6}\+/, ''); } catch { return id; } };
  // linia = napisy w tym samym wierszu, stykające się (odstęp < pół wysokości czcionki); osobna komórka tabeli = osobna linia
  const lines = [], runs = []; let cur = '', y = null, xEnd = null, hPrev = 10;
  for (const it of tc.items) {
    if (it.str === undefined) continue;
    it.str = it.str.replace(/\uF052/g, '\u2611').replace(/\uF054/g, '\u2612'); // kratka Worda (Wingdings 2 F052/F054, ToUnicode LibreOffice) = ☑/☒
    const t = it.transform || [0, 0, 0, 0, 0, y || 0], iy = t[5], x = t[4], h = Math.abs(it.height || t[3] || 10);
    // odstęp, który pdf.js wstawia jako sam biały znak szerszy niż wysokość tekstu = granica komórki tabeli
    if (!it.str.trim() && (it.width || 0) > hPrev) { if (cur) lines.push(cur); cur = ''; y = null; continue; }
    const styka = Math.abs(x - xEnd) < h * 0.5; // indeks górny/dolny (1ST) dotyka poprzedniego napisu, choć stoi wyżej
    if (cur && y !== null && ((Math.abs(iy - y) > 2 && !(styka && Math.abs(iy - y) < hPrev * 0.6)) || x - xEnd > h * 0.5 || x < xEnd - h)) { lines.push(cur); cur = ''; }
    if (it.str.trim()) hPrev = h;
    cur += it.str; if (y === null || Math.abs(iy - y) > 2 && !styka) y = iy; xEnd = x + (it.width || 0);
    if (it.str.trim()) runs.push({ text: it.str, font: fontName(it.fontName) });
    if (it.hasEOL) { lines.push(cur); cur = ''; y = null; }
  }
  if (cur) lines.push(cur);
  const images = [];
  for (let i = 0; i < ops.fnArray.length; i++) {
    if (ops.fnArray[i] !== OPS.paintImageXObject && ops.fnArray[i] !== OPS.paintInlineImageXObject) continue;
    const a = ops.argsArray[i];
    if (a && a[1] && a[2] && typeof a[1] === 'number') { images.push(a[1] + 'x' + a[2]); continue; }
    const id = a && a[0]; let img = null;
    try { img = typeof id === 'string' ? (page.objs.has(id) ? page.objs.get(id) : page.commonObjs.get(id)) : id; } catch {}
    if (img && img.width) images.push(img.width + 'x' + img.height);
  }
  const [x0, y0, x1, y1] = page.view, rot = (page.rotate || 0) % 180; // wymiary strony (MediaBox z obrotem)
  pages.push({ w: rot ? y1 - y0 : x1 - x0, h: rot ? x1 - x0 : y1 - y0, lines: lines.map(l => l.replace(/\s+$/, '')).filter(l => l.trim()), runs, images });
}
process.stdout.write(JSON.stringify({ pages }));
