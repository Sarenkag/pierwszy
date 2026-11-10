// Generuje app/www/vantify-plan.js (plan wbudowany w apkę) z eksportu Job z Vantify (CSV). Uruchom z katalogu repo:
//   node app/scripts/vantify-plan.cjs job.csv app/www/vantify-plan.js [task_frequencies.csv]
// Liczy tym samym modułem co wczytanie pliku w telefonie (moduly/eksport-vantify, Grzegorz 10/11/2026).
// Z eksportu Task Frequencies (opcjonalnie): pełna nazwa zadania jak w Vantify + numer zadania dla każdej częstotliwości
// (okno informacji klocka, Grzegorz 07/11/2026). Bez danych osobowych.
const fs = require("fs"), path = require("path");
const E = require("../../moduly/eksport-vantify/eksport-vantify.js");
const [csvFile, outFile, freqFile] = process.argv.slice(2);
if (!csvFile || !outFile) { console.error("użycie: node app/scripts/vantify-plan.cjs job.csv app/www/vantify-plan.js [task_frequencies.csv]"); process.exit(2); }
global.window = {}; global.localStorage = { getItem: () => null, setItem() {} };
require(path.resolve(__dirname, "..", "www", "ppm.js"));
const cards = window.OEST_PPM.tasks.map(t => [t.id, t.name]), match = E.matcher(cards);
// karty Vantify z poprzedniego pliku (eksport ma tylko otwarte zlecenia)
let prev = [];
if (fs.existsSync(outFile)) {
  const old = fs.readFileSync(outFile, "utf8"), m = /cards: (\[[^\]]*\])/.exec(old);
  prev = m ? JSON.parse(m[1]) : [...old.matchAll(/^  "([^"]+)": \[\{ no:/gm)].map(x => x[1]);
}
const p = E.plan(E.parseCsv(fs.readFileSync(csvFile, "utf8")), { match, prevCards: prev });
console.error("missing:", p.missing);
let js = "// Zlecenia PPM z Vantify (eksport Job " + p.date + "): numer zlecenia + termin (completeBy). Bez danych osobowych.\n" +
  "// Aktualizacja: nowy eksport → node app/scripts/vantify-plan.cjs job.csv app/www/vantify-plan.js [task_frequencies.csv]\n" +
  "// albo w telefonie: Ustawienia → Vantify → Wczytaj eksport. Klucz = id karty z ppm.js.\n" +
  "window.OEST_VANTIFY = { exported: \"" + p.exported + "\", jobs: {\n" +
  Object.keys(p.jobs).sort().map(k => '  "' + k + '": [' + p.jobs[k].map(j => '{ no: "' + j.no + '", due: "' + j.due + '", f: "' + j.f + '" }').join(", ") + "]").join(",\n") +
  "\n}, cards: " + JSON.stringify(p.cards).replace(/","/g, '", "');
if (freqFile) {
  const tk = {};
  for (const x of E.parseCsv(fs.readFileSync(freqFile, "utf8"))) {
    const n = x.taskName, m = /^Distribution Boards \((.+)\)$/.exec(n);
    const i = match(n) || (m && (match(m[1]) || match(m[1].replace("DB-TB-", ""))));
    if (i) (tk[i] = tk[i] || []).push({ f: x.frequency, no: x.frequencyId, name: n });
  }
  js += ", tasks: {\n" + Object.keys(tk).sort().map(k => '  "' + k + '": [' + tk[k].map(j => '{ f: "' + j.f + '", no: "' + j.no + '", name: ' + JSON.stringify(j.name) + " }").join(", ") + "]").join(",\n") + "\n}";
  console.error("tasks:", Object.keys(tk).length);
}
fs.writeFileSync(outFile, js + " };\n");
