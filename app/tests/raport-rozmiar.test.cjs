// ZASADA Grzegorza (05/11/2026 08:09): raport Word i PDF poniżej 1 MB. Flushing TB (20 kranów + 3 ogólne + kartka)
// z prawdziwymi zdjęciami: Word 708 KB, PDF 757 KB przy tych rozmiarach. Większe wartości = raport ponad 1 MB.
// Pomiar na różnych zdjęciach z Pixela: 480 px q0.55 ≈ 10–22 KB, 1000 px q0.6 ≈ 40–75 KB, kartka 1600 px q0.7 ≈ 170 KB.
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'inspekcje', 'index.html'), 'utf8');
function num(re) { const m = html.match(re); assert.ok(m, 'brak w kodzie: ' + re); return +m[1]; }

test('zdjęcia w raporcie: przy pytaniach/kranach/izolatorach ≤ 480 px, ogólne ≤ 1000 px, kartka ≤ 1600 px (raport < 1 MB)', () => {
  const rs = html.match(/var REPORT_SIZE = (\{[^;]*?\}\s*\})/);
  assert.ok(rs, 'REPORT_SIZE w inspekcje/index.html');
  const R = Function('return ' + rs[1])();
  for (const k of Object.keys(R)) { assert.ok(R[k].px <= 480, k + ' px ' + R[k].px); assert.ok(R[k].q <= 0.6, k + ' q ' + R[k].q); }
  assert.ok(num(/HALF_PX = (\d+)/) <= 1000, 'ogólne na pół A4');
  assert.ok(num(/HALF_Q = ([\d.]+)/) <= 0.6);
  assert.ok(num(/SHEET_PX = (\d+)/) <= 1600, 'kartka');
  // budżet Flushing TB: 20 kranów × 22 KB + 3 ogólne × 75 KB + kartka 180 KB + formularz/tekst ~150 KB < 1024 KB
  assert.ok(20 * 22 + 3 * 75 + 180 + 150 < 1024);
});
