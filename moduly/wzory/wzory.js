// Moduł Wzory (Grzegorz 21/11/2026): JEDNO miejsce na wszystkie wzory Word raportów. Inspekcje i Reactive biorą wzór tylko stąd;
// zmiana wyglądu raportu = podmiana pliku .docx w tym folderze (te same nawiasy {…}), przepięcie inspekcji = zmiana nazwy wzoru
// w jej opisie (app/www/ppm.js, pole „wzor”). Kopii wzoru (plik .docx, base64) nigdzie indziej nie ma – pilnuje bramka (R25, rzecz „wzor-word”).
// Interfejs: OESTWzory.lista() → [{id, plik, nazwa, pola}], OESTWzory.wczytaj() → Promise (raz, przy starcie strony),
// OESTWzory.bajty(id) → Uint8Array (kopia; po wczytaj()), OESTWzory.pola(id) → nawiasy, które apka umie wypełnić,
// OESTWzory.slownik() → wspólny słownik nawiasów {nazwa: {opis: [pl, en], stare}}, OESTWzory.grupy(lista, o) → dane środka „grupy-basic”.
(function (g) {
  "use strict";
  // SŁOWNIK (Grzegorz 21/11/2026): jeden zestaw nawiasów dla wszystkich wzorów – ta sama nazwa = ta sama dana w każdym wzorze.
  // Wzór może użyć dowolnych pól ze słownika. „stare: true” = nazwa sprzed słownika, do zamiany na wspólną w osobnym kroku (po zgodzie Grzegorza).
  var SLOWNIK = {
    "site": ["obiekt", "site"], "date": ["data inspekcji dd/mm/rrrr", "inspection date dd/mm/yyyy"], "job number": ["nr zlecenia Vantify", "Vantify job number"],
    "engineer": ["inżynier", "engineer"], "building": ["budynek", "building"], "level": ["piętro", "level"], "title": ["rodzaj inspekcji", "inspection type"],
    "condition": ["stan ogólny", "overall condition"], "details": ["opis i ustalenia", "details and findings"], "quote": ["wycena tak/nie", "quote yes/no"],
    "%photos": ["zdjęcia (siatka)", "photos (grid)"],
    "o": { opis: ["Flushing: nazwa kranu (kod skryptu)", "Flushing: outlet name (script code)"], stare: true },
    "bld": { opis: ["Flushing: budynek w nagłówku (kod skryptu, wspólna = building)", "Flushing: header building (script code, common = building)"], stare: true },
    "twr": { opis: ["Flushing: wieża w tytule (kod skryptu)", "Flushing: tower in title (script code)"], stare: true }
  };
  // środek „grupy” (Grzegorz 27/11/2026: wszystkie inspekcje w stylu Flushing/Generator) – pętle, dane z OESTWzory.grupy()
  [["podtytul", "grupy: linia nad grupami", "groups: line above the groups"], ["grupy", "grupy: lista grup", "groups: group list"],
    ["nazwa", "grupy: nazwa grupy (pasek)", "groups: group name (bar)"], ["licznik", "grupy: licznik w pasku (np. 5/6)", "groups: count in the bar (e.g. 5/6)"],
    ["wiersze", "grupy: wiersz z 2 punktami", "groups: row with 2 points"], ["szare", "grupy: akapity szarej ramki", "groups: grey box paragraphs"]].forEach(function (x) { SLOWNIK[x[0]] = [x[1], x[2]]; });
  [1, 2].forEach(function (n) {
    SLOWNIK["n" + n] = ["grupy: nazwa punktu " + n + " w wierszu", "groups: point " + n + " name in row"]; SLOWNIK["u" + n] = ["grupy: szara uwaga punktu " + n, "groups: point " + n + " grey note"]; // ok/no/na 1–2: te same co we Flushingu
  });
  ["y0", "y1", "y2", "y3", "y4", "y5"].forEach(function (k, i) { SLOWNIK[k] = { opis: ["Flushing: rok " + (i + 1) + " (kod skryptu)", "Flushing: year " + (i + 1) + " (script code)"], stare: true }; });
  // basic form Weekly Flushing (Grzegorz 21/11/2026): kran nr i z listy kranów (ppm.js) i strefa nr k
  for (var i = 1; i <= 20; i++) {
    SLOWNIK["ok" + i] = ["Flushing basic: ☑ kran " + i + " przepłukany", "Flushing basic: ☑ outlet " + i + " flushed"];
    SLOWNIK["no" + i] = ["Flushing basic: ☒ kran " + i + " nie przepłukany", "Flushing basic: ☒ outlet " + i + " not flushed"];
    SLOWNIK["na" + i] = ["Flushing basic: N/A kran " + i, "Flushing basic: N/A outlet " + i];
    SLOWNIK["note" + i] = ["Flushing basic: notatka kranu " + i, "Flushing basic: outlet " + i + " note"];
  }
  for (var z = 1; z <= 6; z++) SLOWNIK["zone" + z] = ["Flushing basic: przepłukane w strefie " + z + " (np. 7/7)", "Flushing basic: flushed in zone " + z + " (e.g. 7/7)"];
  SLOWNIK.statement = ["Flushing basic: stałe zdanie pod strefami", "Flushing basic: fixed statement below zones"];
  for (var n = 1; n <= 12; n++) SLOWNIK["c" + n] = { opis: ["Flushing: kolumna " + n + " (kod skryptu)", "Flushing: column " + n + " (script code)"], stare: true };
  // środek basic form Flushing/Generator: nawiasy kranów i stref (plik środka z app/scripts/flush-basic-wzory.py); reszta nawiasów jest w ramce
  function flushPola(krany, strefy) {
    var p = ["statement"];
    for (var i = 1; i <= krany; i++) p.push("ok" + i, "no" + i, "na" + i, "note" + i);
    for (var k = 1; k <= strefy; k++) p.push("zone" + k);
    return p;
  }
  // pola = nawiasy, które apka wypełnia w danym wzorze (test app/tests/wzory.test.cjs: plik ma dokładnie te nawiasy, każdy jest w SŁOWNIKU)
  var WZORY = {
    basic: { plik: "basic.docx", nazwa: "OEST basic Engineers Report", pola: ["site", "date", "job number", "engineer", "building", "level", "title", "condition", "details", "quote", "%photos"] },
    flush: { plik: "flush.docx", nazwa: "Weekly Taps/Shower Flushing Record (TA / TB / P)", pola: ["o", "bld", "twr", "y0", "y1", "y2", "y3", "y4", "y5", "c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10", "c11", "c12"] },
    // RAMKA + ŚRODEK (Grzegorz 21/11/2026 09:10 i 17:33: „jak zmienisz w jednym, wszystko się zmieni”): wpis z „ramka” to plik SAMEGO środka;
    // bajty(id) wkłada go w aktualną ramkę (basic.docx) przy każdym raporcie – kopii ramki nigdzie nie ma.
    "flush-basic-ta": { plik: "flush-ta-srodek.docx", ramka: "basic", nazwa: "Weekly Flushing Tower A – basic form middle", pola: flushPola(12, 3) },
    "flush-basic-tb": { plik: "flush-tb-srodek.docx", ramka: "basic", nazwa: "Weekly Flushing Tower B – basic form middle", pola: flushPola(16, 4) },
    "flush-basic-p": { plik: "flush-p-srodek.docx", ramka: "basic", nazwa: "Weekly Flushing Pavilion – basic form middle", pola: flushPola(2, 1) },
    // Weekly Generator Check (Grzegorz 21/11/2026): środek w stylu Flushing (jeden generator: Visual check + Off-load test)
    "gen-basic": { plik: "gen-srodek.docx", ramka: "basic", nazwa: "Generator Checks – Weekly – basic form middle", pola: flushPola(12, 2) },
    // Reactive Job Sheet (Grzegorz 26/11/2026): bez wiersza „Overall Condition”; środek w stylu „grupy stref” (27/11/2026, app/scripts/reactive-srodek.py)
    "reactive-basic": { plik: "reactive-srodek.docx", ramka: "basic", nazwa: "Reactive Job Sheet – basic form middle (no Overall Condition)", pola: ["wstep", "sekcje", "tekstowa", "naglowek", "akapity", "tekst", "tabela", "pary", "l1", "w1", "l2", "w2", "koniec"] },
    // Inspekcje bez własnego środka (Grzegorz 27/11/2026): z pytaniami, Plant Rooms, Temp TB, Spa, AOV TB – JEDEN środek z pętlami grup
    "grupy-basic": { plik: "grupy-srodek.docx", ramka: "basic", nazwa: "Inspection groups – basic form middle", pola: ["podtytul", "tekst", "grupy", "nazwa", "licznik", "wiersze",
      "n1", "u1", "ok1", "no1", "na1", "n2", "u2", "ok2", "no2", "na2", "szare"] }
  };
  var baza = (function () { try { var s = g.document && g.document.currentScript && g.document.currentScript.src; return s ? new URL(".", s).href : ""; } catch (e) { return ""; } })();
  var pliki = {}, obietnica = null;

  function opis(id) { var w = WZORY[id]; if (!w) throw Error("REPORT_TEMPLATE_MISSING"); return w; }
  function lista() { return Object.keys(WZORY).map(function (id) { var w = WZORY[id]; return { id: id, plik: w.plik, nazwa: w.nazwa, pola: w.pola.slice(), ramka: w.ramka || "" }; }); }
  function wczytaj() {
    if (!obietnica) obietnica = Promise.all(Object.keys(WZORY).map(function (id) {
      return g.fetch(baza + WZORY[id].plik).then(function (r) { if (!r.ok) throw Error("REPORT_TEMPLATE_MISSING"); return r.arrayBuffer(); })
        .then(function (b) { pliki[id] = new Uint8Array(b); });
    })).catch(function (e) { obietnica = null; throw e; });
    return obietnica;
  }
  function surowe(id) { opis(id); var b = pliki[id]; if (!b) throw Error("REPORT_TEMPLATE_MISSING"); return b; }
  function bajty(id) { var w = opis(id); return w.ramka ? zloz(surowe(w.ramka), surowe(id)) : new Uint8Array(surowe(id)); }

  // Ramka + środek (stała reguła 21/11/2026 09:35): ramka góra = wiersze tabeli ramki do wiersza z {title} włącznie, ramka dół = od wiersza
  // „Works Complete” do końca; wiersze pomiędzy (Overall Condition, {details}) zastępuje JEDEN wiersz – ten z {details} (jego obramowanie
  // i szerokość) – a w jego komórce ląduje cała treść pliku środka. Ramka nietknięta poza tym miejscem; środek bez zdjęć i odnośników.
  function wiersze(x, od) { // wiersze najwyższego poziomu pierwszej tabeli: [{a, b, tekst}]
    var re = /<w:tbl[ >]|<\/w:tbl>|<w:tr[ >]|<\/w:tr>/g, gl = 0, out = [], m, start = -1; re.lastIndex = od;
    while ((m = re.exec(x))) {
      var t = m[0];
      if (t.indexOf("<w:tbl") === 0) gl++;
      else if (t === "</w:tbl>") { if (--gl === 0) break; }
      else if (gl === 1 && t.indexOf("<w:tr") === 0) start = m.index;
      else if (gl === 1 && t === "</w:tr>") { var b = m.index + t.length; out.push({ a: start, b: b, tekst: x.slice(start, b).replace(/<[^>]+>/g, "") }); }
    }
    return out;
  }
  function zloz(ramkaB, srodekB) {
    var W = g.OESTWord; if (!W) throw Error("REPORT_TEMPLATE_MISSING"); // pliki Word tylko przez moduly/word
    var rz = W.otworz(ramkaB), x = rz.file("word/document.xml").asText(), sx = W.otworz(srodekB).file("word/document.xml").asText();
    var body = sx.slice(sx.indexOf(">", sx.indexOf("<w:body")) + 1, sx.lastIndexOf("<w:sectPr"));
    if (/r:(embed|id)=/.test(body)) throw Error("REPORT_TEMPLATE_MIDDLE"); // środek bez zdjęć i odnośników (nie przenosimy relacji)
    var rs = wiersze(x, x.indexOf("<w:tbl")), ti = -1, wi = -1;
    rs.forEach(function (r, i) { if (ti < 0 && r.tekst.indexOf("{title}") >= 0) ti = i; if (wi < 0 && r.tekst.indexOf("Works Complete") >= 0) wi = i; });
    if (ti < 0 || wi <= ti + 1) throw Error("REPORT_TEMPLATE_FRAME");
    var mid = rs.slice(ti + 1, wi), kont = mid.filter(function (r) { return r.tekst.indexOf("{details}") >= 0; })[0] || mid[mid.length - 1];
    var tr = x.slice(kont.a, kont.b).replace(/<w:trHeight[^>]*\/>/g, "");
    var tcA = tr.indexOf("<w:tc>") >= 0 ? tr.indexOf("<w:tc>") : tr.search(/<w:tc /), tcEnd = tr.indexOf("</w:tc>");
    var tc = tr.slice(tcA, tcEnd), pr = (tc.match(/<w:tcPr>[\s\S]*?<\/w:tcPr>/) || [""])[0];
    if (!/<\/w:p>\s*$/.test(body) && !/<w:p\/>\s*$/.test(body)) body += "<w:p/>"; // komórka Worda musi kończyć się akapitem
    var nowy = tr.slice(0, tcA) + tr.slice(tcA, tcA + tc.indexOf(">") + 1) + pr + body + tr.slice(tcEnd);
    rz.file("word/document.xml", x.slice(0, mid[0].a) + nowy + x.slice(mid[mid.length - 1].b));
    return W.zapisz(rz);
  }
  // test w node: wzór podany z zewnątrz (plik z dysku), bez fetch
  function ustaw(id, b) { opis(id); pliki[id] = new Uint8Array(b); }

  // Dane środka „grupy-basic” (jedno miejsce dla wszystkich inspekcji): lista = [{ nazwa, punkty: [{ nazwa, stan: "ok"|"no"|"na", uwaga }] }],
  // o = { podtytul, szare: [akapity szarej ramki] }. Po 2 punkty w wierszu, licznik w pasku = ☑ / wszystkie punkty grupy (jak strefy Flushingu);
  // grupa bez punktów nie trafia do raportu. ☑ / ☒ / N/A – te same znaki co we Flushingu (OESTFlush.basicPola).
  function grupy(lista, o) {
    o = o || {};
    var gr = (lista || []).filter(function (g) { return g.punkty && g.punkty.length; }).map(function (g) {
      var w = [], ok = g.punkty.filter(function (p) { return p.stan === "ok"; }).length;
      for (var i = 0; i < g.punkty.length; i += 2) {
        var r = {};
        [g.punkty[i], g.punkty[i + 1]].forEach(function (p, k) {
          var n = k + 1; p = p || {};
          r["n" + n] = p.nazwa || ""; r["u" + n] = p.uwaga ? " \u2013 " + p.uwaga : "";
          r["ok" + n] = p.stan === "ok" ? "\u2611" : ""; r["no" + n] = p.stan === "no" ? "\u2612" : ""; r["na" + n] = p.stan === "na" ? "N/A" : "";
        });
        w.push(r);
      }
      return { nazwa: g.nazwa, licznik: ok + "/" + g.punkty.length, wiersze: w };
    });
    return { podtytul: o.podtytul ? [{ tekst: o.podtytul }] : [], grupy: gr, szare: (o.szare || []).filter(Boolean).map(function (t) { return { tekst: t }; }) };
  }

  function slownik() { var o = {}; Object.keys(SLOWNIK).forEach(function (k) { var v = SLOWNIK[k]; o[k] = Array.isArray(v) ? { opis: v.slice(), stare: false } : { opis: v.opis.slice(), stare: !!v.stare }; }); return o; }

  g.OESTWzory = { lista: lista, slownik: slownik, wczytaj: wczytaj, bajty: bajty, pola: function (id) { return opis(id).pola.slice(); }, ustaw: ustaw, grupy: grupy };
})(typeof window !== "undefined" ? window : globalThis);
