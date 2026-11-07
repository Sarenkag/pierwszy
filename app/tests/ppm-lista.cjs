// Faktyczna lista PPM z app/www/ppm.js (window.OEST_PPM.tasks) – wykonana jak w apce, nie wyszukiwana w tekście pliku.
// Komentarze (np. usunięte z listy EFA-INS-028, Grzegorz 02/11/2026) nie są zadaniami i nie trafiają do listy.
// Używają go raport-ui-check.cjs (które inspekcje sprawdzić) i quality/run-gate.cjs (czy żadnej nie pominięto) – jedno źródło.
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

function tasks(wwwRoot) {
  const file = path.join(wwwRoot, 'ppm.js'), sandbox = { window: {}, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console };
  sandbox.window.localStorage = sandbox.localStorage; sandbox.self = sandbox.window;
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file, timeout: 5000 });
  const P = sandbox.window.OEST_PPM;
  if (!P || !Array.isArray(P.tasks) || !P.tasks.length) throw Error('ppm.js nie zawiera listy window.OEST_PPM.tasks');
  return P.tasks.map(t => ({ ...t }));
}

// Inspekcje z katalogu EFA-INS (pełne formularze raportów) – zakres raport-ui-check.
// DB, Isolators i podwykonawcy (s-*) są w inwentaryzacji quality/inwentaryzacja-ppm.md, bez wymagań raportu (decyzja Grzegorza 07/11/2026).
function inspections(wwwRoot) { return tasks(wwwRoot).filter(t => /^EFA-INS-\d{3}$/.test(t.id)).map(t => t.id).sort(); }

module.exports = { tasks, inspections };
