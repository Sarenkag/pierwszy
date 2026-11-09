// Bramka Quality Gate po ponownym uruchomieniu joba (Grzegorz 09/11/2026, PR #109): w przebiegu zostawały dwa artefakty
// o tej samej nazwie (quality-g2-0 z FAIL i z PASS), a podsumowanie brało stary wynik – ponowne uruchomienie nie mogło zazielenić bramki.
// Zasada: każdy wynik części bramki jest wysyłany z overwrite: true (stary artefakt o tej nazwie jest usuwany), a podsumowanie pobiera
// wszystkie części jednym wzorcem quality-g* – więc w podsumowaniu jest tylko ostatni wynik każdej części.
const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs'), path = require('node:path');
const wf = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'quality-gate.yml'), 'utf8');
// kroki „- uses: …” z ich blokiem with: (do następnego kroku albo joba)
const kroki = wf.split(/\n(?=\s*- (?:uses|name|run):|\s{2}\S)/).filter(k => /uses:\s*actions\/(upload|download)-artifact@/.test(k));
test('każdy wynik części bramki nadpisuje stary artefakt (overwrite: true)', () => {
  const up = kroki.filter(k => /upload-artifact@/.test(k));
  assert.ok(up.length >= 3, 'za mało kroków upload-artifact: ' + up.length);
  for (const k of up) {
    const name = (/name:\s*(\S+)/.exec(k) || [])[1];
    assert.match(name || '', /^quality-g/, 'artefakt bramki musi mieć nazwę quality-g…: ' + name);
    assert.match(k, /\n\s+overwrite:\s*true\b/, 'brak overwrite: true przy ' + name);
  }
});
test('podsumowanie pobiera wszystkie części wzorcem quality-g*', () => {
  const down = kroki.filter(k => /download-artifact@/.test(k));
  assert.strictEqual(down.length, 1);
  assert.match(down[0], /pattern:\s*quality-g\*/);
});
