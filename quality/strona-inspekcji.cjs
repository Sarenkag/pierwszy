'use strict';
// Strona inspekcji tak, jak ładuje ją przeglądarka (docs/podzial-modulow.md): inspekcje/index.html z treścią jej części
// wstawioną dokładnie w miejsce <script src="i-….js"></script> i <link rel="stylesheet" href="insp.css">, czyli w kolejności ładowania.
// Testy i zasady sprawdzają ten tekst, więc przeniesienie kodu do części niczego przed nimi nie chowa, a kolejność zostaje prawdziwa.
// Część, której strona nie ładuje, nie jest wstawiana – sprawdza się ją jak zwykły plik.
const fs = require('node:fs'), path = require('node:path');
const CZESC = /<script src="(i-[^"/]+\.js)"><\/script>|<link rel="stylesheet" href="(insp\.css)">/g;
function strona(dir) {
  const czesci = [], czytaj = f => fs.readFileSync(path.join(dir, f), 'utf8');
  const tekst = czytaj('index.html').replace(CZESC, (m, js, css) => { czesci.push(js || css); return js ? '<script>\n' + czytaj(js) + '</script>' : '<style>\n' + czytaj(css) + '</style>'; });
  return { tekst, czesci };
}
module.exports = { strona };
