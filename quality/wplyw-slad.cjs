// Ślad wczytanych plików (krok 2, tryb „tylko-raport”): ładowany przez run-gate.cjs (node -r) do procesu testu przeglądarkowego.
// Zapisuje, które istniejące pliki zbudowanej paczki app/www test faktycznie odczytał (serwer HTTP testu podaje je przeglądarce;
// prośby o pliki, których nie ma, np. favicon.ico, się nie liczą).
// Służy tylko do porównania z mapą wpływu (quality/wplyw.cjs): plik wczytany, a nieznany mapie = rozbieżność w raporcie.
// Nie zmienia działania testu: funkcje fs są tylko opakowane i wywołują oryginał z tymi samymi argumentami.
'use strict';
const fs = require('node:fs'), path = require('node:path');
const OUT = process.env.OEST_WPLYW_PLIK, WWW = process.env.OEST_WPLYW_WWW;
if (OUT && WWW) {
  const root = path.resolve(WWW) + path.sep, seen = new Set();
  const note = p => { try { const a = path.resolve(String(p)); if (a.startsWith(root) && fs.statSync(a, { throwIfNoEntry: false })?.isFile()) seen.add(a.slice(root.length).split(path.sep).join('/')); } catch {} };
  for (const name of ['readFile', 'readFileSync', 'createReadStream']) { const orig = fs[name]; fs[name] = function (p, ...rest) { note(p); return orig.call(this, p, ...rest); }; }
  const origP = fs.promises.readFile; fs.promises.readFile = function (p, ...rest) { note(p); return origP.call(this, p, ...rest); };
  process.on('exit', () => { try { fs.writeFileSync(OUT, JSON.stringify([...seen].sort())); } catch {} });
}
