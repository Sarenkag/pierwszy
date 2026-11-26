#!/usr/bin/env node
// Buduje jeden plik bota do wklejenia w Apps Script (projekt „OEST bot Vantify”): app/www/vantify-akcje.js (te same funkcje
// zapytań co apka) + tools/bot-vantify/bot.js. Użycie: node tools/bot-vantify/zbuduj.cjs [plik-wynikowy] (domyślnie OEST-bot-Vantify.gs).
const fs = require("node:fs"), path = require("node:path"), { execSync } = require("node:child_process");
const ROOT = path.resolve(__dirname, "..", "..");
function zbuduj() {
  let wersja = ""; try { wersja = execSync("git rev-parse --short HEAD", { cwd: ROOT, encoding: "utf8" }).trim(); } catch (e) {}
  return "// OEST bot Vantify – plik zbudowany (tools/bot-vantify/zbuduj.cjs" + (wersja ? ", commit " + wersja : "") + "). Nie edytować tutaj: zmiany w repo.\n" +
    "// ===== app/www/vantify-akcje.js =====\n" + fs.readFileSync(path.join(ROOT, "app/www/vantify-akcje.js"), "utf8") + "\n" +
    "// ===== tools/bot-vantify/bot.js =====\n" + fs.readFileSync(path.join(__dirname, "bot.js"), "utf8");
}
if (require.main === module) { const out = path.resolve(process.argv[2] || "OEST-bot-Vantify.gs"); fs.writeFileSync(out, zbuduj()); console.log("Zapisano " + out); }
module.exports = { zbuduj };
