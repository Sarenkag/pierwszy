// Legenda nawiasów wzorów Word (Grzegorz 21/11/2026): plik tekstowy moduly/wzory/LEGENDA.md generowany ze słownika modułu Wzory.
// Użycie: node app/scripts/wzory-legenda.cjs  (zapisuje), node app/scripts/wzory-legenda.cjs --sprawdz (błąd, gdy legenda jest nieaktualna).
const fs = require("fs"), path = require("path");
const DIR = path.join(__dirname, "..", "..", "moduly", "wzory"), PLIK = path.join(DIR, "LEGENDA.md");
function legenda() {
  delete globalThis.OESTWzory; delete require.cache[require.resolve(path.join(DIR, "wzory.js"))];
  require(path.join(DIR, "wzory.js"));
  const W = globalThis.OESTWzory, s = W.slownik(), l = W.lista();
  const out = ["# Legenda nawiasów we wzorach Word (OEST)", "",
    "Plik generowany automatycznie ze słownika apki (moduly/wzory/wzory.js) poleceniem `node app/scripts/wzory-legenda.cjs`. Nie edytować ręcznie.",
    "Każdy nawias `{nazwa}` we wzorze Word apka zastępuje daną opisaną niżej. Ta sama nazwa znaczy to samo w każdym wzorze.",
    "Nawias spoza tej listy nie zostanie wypełniony (test go zatrzyma). „STARA” = nazwa sprzed wspólnego słownika, do zamiany.", "",
    "## Słownik", "", "| Nawias | Co wstawia apka | In English | Używają |", "|---|---|---|---|"];
  for (const k of Object.keys(s)) {
    const uz = l.filter(w => w.pola.includes(k)).map(w => w.id).join(", ");
    out.push(`| \`{${k}}\`${s[k].stare ? " STARA" : ""} | ${s[k].opis[0]} | ${s[k].opis[1]} | ${uz || "—"} |`);
  }
  out.push("", "## Wzory", "");
  for (const w of l) out.push(`- **${w.nazwa}** (\`${w.id}\`, plik \`${w.plik}\`): ` + w.pola.map(p => "`{" + p + "}`").join(" "));
  return out.join("\n") + "\n";
}
module.exports = { legenda, PLIK };
if (require.main === module) {
  const t = legenda();
  if (process.argv.includes("--sprawdz")) { if (!fs.existsSync(PLIK) || fs.readFileSync(PLIK, "utf8") !== t) { console.error("LEGENDA.md nieaktualna: node app/scripts/wzory-legenda.cjs"); process.exit(1); } console.log("LEGENDA.md aktualna"); }
  else { fs.writeFileSync(PLIK, t); console.log("zapisano", PLIK); }
}
