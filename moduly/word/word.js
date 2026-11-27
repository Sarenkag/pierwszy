/* Moduł Word (moduly/word) – JEDYNE miejsce w apce, które otwiera, wypełnia, czyta i zapisuje pliki .docx
 * (Grzegorz 24/11/2026: „zmiana w jednym miejscu działa wszędzie”; wcześniej trzy kopie: inspekcje, Reactive, Moje raporty).
 * Biblioteki: PizZip + docxtemplater (globalne w apce; w node: OESTWord.biblioteki({ PizZip, Docxtemplater })).
 *
 * Użycie:  OESTWord.wypelnij(wzor, dane, zdjecia, { uklad })   → Uint8Array (.docx)
 *            uklad "siatka" (domyślny, inspekcje: {%photos}/{%zdjecie} siatka do 12 na stronę, {%zdjecia} strona na zdjęcie)
 *            uklad "przed-po" (Reactive: tabela 2 kolumny, podpis „Before/After — Photo n”, 10 na stronę)
 *          OESTWord.zdjeciaKartki(zdjecia, male)              → Uint8Array (Word z samych zdjęć formularza z kartki)
 *          OESTWord.zmien(wzor, { "word/document.xml": fn })   → Uint8Array (wzór firmy: podmiana tekstu w częściach pliku)
 *          OESTWord.otworz(bajty) / OESTWord.nowy()          → zip (PizZip) – do składania wzorów (moduly/wzory)
 *          OESTWord.zapisz(zip)                               → Uint8Array
 *          OESTWord.info(wzor)    → { headerText, footerText, logo, logoType } (nagłówek/stopka/logo wzoru)
 *          OESTWord.tekst(wzor)   → tekst dokumentu bez znaczników XML
 *          OESTWord.podglad(docx) → { lines, images } (podgląd Worda na ekranie, Moje raporty)
 *          OESTWord.dopasuj(raport, { rozmiar, buduj, min }) → Promise<raport> – plik ponad 1 MB: pytanie i mniejsze zdjęcia (inspekcje i Reactive)
 *          OESTWord.photoPages(lista), OESTWord.photoGrid(n) – układ stron ze zdjęciami (wspólny dla Worda i podglądu)
 * Zdjęcie: { bytes: Uint8Array (JPEG), width, height, caption?, tap?, sheet?, phase? }.
 */
(function (root, factory) {
  var node = typeof module === "object" && module.exports;
  if (node && !root.OESTNarzedzia) require("../narzedzia/narzedzia.js"); // esc z moduly/narzedzia (jedno miejsce)
  var api = factory(root);
  if (node) module.exports = api;
  else root.OESTWord = api;
})(typeof window !== "undefined" ? window : globalThis, function (root) {
  "use strict";
  var MIME = (root.OESTNarzedzia || require("../narzedzia/narzedzia.js")).DOCX; // typ pliku Word: moduly/narzedzia (jedno miejsce)
  var libs = null;
  function biblioteki(l) { libs = l || null; }
  function Zip() { var Z = (libs && libs.PizZip) || root.PizZip; if (!Z) throw Error("REPORT_TEMPLATE_MISSING"); return Z; }
  function Szablon() { var D = (libs && libs.Docxtemplater) || root.docxtemplater || root.Docxtemplater; if (!D) throw Error("REPORT_TEMPLATE_MISSING"); return D; }
  function otworz(bajty) { var Z = Zip(); return new Z(bajty); }
  function nowy() { var Z = Zip(); return new Z(); }
  function zapisz(zip) { return zip.generate({ type: "uint8array", compression: "DEFLATE", mimeType: MIME }); }
  function nz() { return root.OESTNarzedzia; } // moduly/narzedzia: esc (jedno miejsce)

  // ---------- zdjęcie w Wordzie: jeden rysunek dla każdego układu ----------
  function obraz(i, cx, cy) {
    return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/>' +
      '<wp:docPr id="' + (9001 + i) + '" name="Zdjecie ' + (i + 1) + '"/>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
      '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:nvPicPr><pic:cNvPr id="0" name="zdjecie' + (i + 1) + '.jpeg"/><pic:cNvPicPr/></pic:nvPicPr>' + // i18n-ok: nazwa wewnątrz .docx
      '<pic:blipFill><a:blip r:embed="rIdZdj' + (i + 1) + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm>' +
      '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
      '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }
  // zdjęcie wpisane w prostokąt (EMU), bez rozciągania
  function wpisz(p, maxW, maxH) {
    var cx = maxW, cy = Math.round(maxW * p.height / p.width);
    if (cy > maxH) { cy = maxH; cx = Math.round(maxH * p.width / p.height); }
    return [cx, cy];
  }
  // pliki zdjęć, relacje i typ JPEG w paczce Worda (raz, dla każdego układu)
  function dolaczZdjecia(out, xml, photos) {
    xml = xml.replace(/<w:document\b([^>]*)>/, function (m, attrs) {
      var add = "";
      if (attrs.indexOf("xmlns:wp=") < 0) add += ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
      if (attrs.indexOf("xmlns:r=") < 0) add += ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
      return "<w:document" + attrs + add + ">";
    });
    var relsPath = "word/_rels/document.xml.rels", rels = out.file(relsPath).asText();
    var add = photos.map(function (p, i) {
      return '<Relationship Id="rIdZdj' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/zdjecie' + (i + 1) + '.jpeg"/>';
    }).join("");
    out.file(relsPath, rels.replace("</Relationships>", add + "</Relationships>"));
    var ct = out.file("[Content_Types].xml").asText();
    if (!/Extension="jpeg"/i.test(ct)) out.file("[Content_Types].xml", ct.replace("</Types>", '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'));
    photos.forEach(function (p, i) { out.file("word/media/zdjecie" + (i + 1) + ".jpeg", p.bytes); });
    return xml;
  }
  // akapit ze znacznikiem: [początek, koniec]
  function akapit(xml, idx) {
    var s = idx;
    while (s > 0) { s = xml.lastIndexOf("<w:p", s - 1); var c = xml.charAt(s + 4); if (c === ">" || c === " ") break; }
    return [s, xml.indexOf("</w:p>", idx) + 6];
  }

  // ---------- wypełnianie wzoru ----------
  function wypelnij(wzor, data, photos, opcje) {
    photos = photos || []; opcje = opcje || {};
    var M1 = "§ZDJ1§", M2 = "§ZDJ2§", D = Szablon();
    var zip = otworz(wzor);
    var doc = new D(zip, { paragraphLoop: true, linebreaks: true, nullGetter: function () { return ""; } });
    var d = Object.assign({}, data);
    d["%zdjecie"] = M1;
    d["%zdjecia"] = M2;
    d["%photos"] = M1; // wzór OEST-basic: zdjęcia na osobnej stronie (sekcja)
    doc.render(d);
    var out = doc.getZip(), xmlPath = "word/document.xml";
    var xml = out.file(xmlPath).asText();
    xml = tabsToColumns(xml);
    xml = boxGlyphFont(xml);

    var pw = /<w:pgSz[^>]*w:w="(\d+)"/.exec(xml), ph = /<w:pgSz[^>]*w:h="(\d+)"/.exec(xml);
    var ml = /<w:pgMar[^>]*w:left="(\d+)"/.exec(xml), mr = /<w:pgMar[^>]*w:right="(\d+)"/.exec(xml);
    var mt = /<w:pgMar[^>]*w:top="(\d+)"/.exec(xml), mb = /<w:pgMar[^>]*w:bottom="(\d+)"/.exec(xml);
    var availW = (pw ? +pw[1] : 11906) - (ml ? +ml[1] : 1134) - (mr ? +mr[1] : 1134);
    var availH = (ph ? +ph[1] : 16838) - (mt ? +mt[1] : 1134) - (mb ? +mb[1] : 1134);
    var maxW = Math.round(availW * 635);

    function drawing(p, i, maxH, boxW) { var z = wpisz(p, boxW || maxW, maxH); return obraz(i, z[0], z[1]); }
    function replacePara(mark, pageBreaks) {
      var idx = xml.indexOf(mark);
      if (idx < 0) return false;
      var r = akapit(xml, idx), s = r[0], e = r[1], para = xml.slice(s, e);
      var pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(para) || [""])[0];
      var maxH = Math.round(Math.min(availH * 635 * 0.8, 7.2e6)), body;
      if (pageBreaks) body = photos.map(function (p, i) {
        return "<w:p>" + pPr + '<w:r><w:br w:type="page"/></w:r>' + drawing(p, i, maxH) + "</w:p>";
      }).join("");
      else body = opcje.uklad === "przed-po" ? przedPo() : photoTables();
      xml = xml.slice(0, s) + body + xml.slice(e);
      return true;
    }
    // siatka zdjęć: 1 = cała strona, 2 = połówki, … do 12 (3×4) na stronę; 13. zdjęcie idzie na następną stronę
    function photoTables() {
      // wymiary strony ze zdjęciami = ostatnia sekcja (we wzorze ma inne marginesy niż strona 1); nagłówek z logo
      // wystaje poniżej górnego marginesu, więc zostawiamy zapas, żeby siatka nie przelała się na następną stronę
      var sp = xml.slice(xml.lastIndexOf("<w:sectPr")), num = function (re, d) { var m = re.exec(sp); return m ? +m[1] : d; };
      var pW = num(/<w:pgSz[^>]*w:w="(\d+)"/, 11906) - num(/<w:pgMar[^>]*w:left="(\d+)"/, 1134) - num(/<w:pgMar[^>]*w:right="(\d+)"/, 1134);
      var pH = num(/<w:pgSz[^>]*w:h="(\d+)"/, 16838) - num(/<w:pgMar[^>]*w:top="(\d+)"/, 1134) - num(/<w:pgMar[^>]*w:bottom="(\d+)"/, 1134);
      var availW = pW, out = [], usableH = pH - 1500, P0 = '<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>';
      // zdjęcia kartek formularza: każde na całą stronę, potem zwykłe zdjęcia w siatce
      var all = photos.map(function (p, i) { return { p: p, i: i }; }), grid = all.filter(function (x) { return !x.p.sheet; });
      all.filter(function (x) { return x.p.sheet; }).forEach(function (x) { out.push("<w:p>" + P0 + drawing(x.p, x.i, usableH * 635, availW * 635) + "</w:p>"); });
      photoPages(grid).forEach(function (pg) {
        var chunkX = pg.items, chunk = chunkX.map(function (x) { return x.p; }), g = pg.g;
        var cw = Math.floor(availW / g.cols), rh = Math.floor(usableH / g.rows);
        var t = '<w:tbl><w:tblPr><w:tblW w:w="' + cw * g.cols + '" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/>' +
          '<w:tblCellMar><w:left w:w="57" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>';
        for (var c = 0; c < g.cols; c++) t += '<w:gridCol w:w="' + cw + '"/>';
        t += "</w:tblGrid>";
        for (var r = 0; r < g.rows; r++) {
          t += '<w:tr><w:trPr><w:cantSplit/><w:trHeight w:val="' + rh + '" w:hRule="exact"/></w:trPr>';
          for (c = 0; c < g.cols; c++) {
            var k = r * g.cols + c, ph = chunk[k], i = ph ? chunkX[k].i : 0;
            t += '<w:tc><w:tcPr><w:tcW w:w="' + cw + '" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr><w:p>' + P0 +
              (ph ? drawing(ph, i, (rh - (ph.caption ? 420 : 160)) * 635, (cw - 160) * 635) : "") + "</w:p>" +
              (ph && ph.caption ? "<w:p>" + P0 + '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">' + nz().esc(ph.caption) + "</w:t></w:r></w:p>" : "") + "</w:tc>"; // zdjęcie przy kranie/punkcie: podpis jego nazwą (04/11)
          }
          t += "</w:tr>";
        }
        t += "</w:tbl>";
        out.push(t);
      });
      return out.join('<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>') +
        '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
    }
    // Reactive: „Photographic evidence — before then after”, tabela 2 kolumny, 10 zdjęć na stronę, podpis nad zdjęciem
    function przedPo() {
      // siatka wyśrodkowana na stronie, zdjęcie i podpis na środku komórki, odstęp między zdjęciami (Grzegorz 26/11/2026 18:10: „żeby się nie zlewały”)
      var C = '<w:pPr><w:jc w:val="center"/></w:pPr>';
      function par(s, srodek) { return "<w:p>" + (srodek ? C : "") + '<w:r><w:t xml:space="preserve">' + nz().esc(s) + "</w:t></w:r></w:p>"; }
      var g = "";
      for (var start = 0; start < photos.length; start += 10) {
        var chunk = photos.slice(start, start + 10);
        if (start) g += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
        g += par("Photographic evidence — before then after");
        g += '<w:tbl><w:tblPr><w:tblW w:w="8306" w:type="dxa"/><w:jc w:val="center"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="170" w:type="dxa"/><w:left w:w="113" w:type="dxa"/><w:bottom w:w="170" w:type="dxa"/><w:right w:w="113" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="4153"/><w:gridCol w:w="4153"/></w:tblGrid>';
        var maxH = chunk.length <= 2 ? 2600000 : chunk.length <= 6 ? 1800000 : 1100000;
        for (var i = 0; i < chunk.length; i += 2) {
          g += "<w:tr>";
          for (var j = i; j < i + 2; j++) {
            var p = chunk[j];
            g += '<w:tc><w:tcPr><w:tcW w:w="4153" w:type="dxa"/></w:tcPr>';
            if (p) { var n = start + j, z = wpisz(p, 2400000, maxH); g += par((p.phase === "after" ? "After" : "Before") + " — Photo " + (n + 1), true) + "<w:p>" + C + obraz(n, z[0], z[1]) + "</w:p>"; }
            else g += par("");
            g += "</w:tc>";
          }
          g += "</w:tr>";
        }
        g += "</w:tbl>";
      }
      return g;
    }
    // brak zdjęć: wytnij stronę na zdjęcia (podział sekcji + akapit znacznika), żeby nie było pustej strony
    function dropPhotoSection(mark) {
      var idx = xml.indexOf(mark); if (idx < 0) return;
      var r = akapit(xml, idx), s = r[0], e = r[1];
      var before = xml.slice(0, s), pe = before.lastIndexOf("</w:p>");
      if (pe < 0 || pe + 6 !== before.length) return;
      var ps = pe; while (ps > 0) { ps = before.lastIndexOf("<w:p", ps - 1); var c2 = before.charAt(ps + 4); if (c2 === ">" || c2 === " ") break; }
      var brk = before.slice(ps), sect = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/.exec(brk);
      var bodyEnd = xml.lastIndexOf("</w:body>"), li = xml.lastIndexOf("<w:sectPr", bodyEnd);
      if (!sect || li < e || bodyEnd < 0) return;
      xml = xml.slice(0, ps) + xml.slice(e, li) + sect[0] + xml.slice(bodyEnd);
    }
    if (!photos.length) dropPhotoSection(M1);
    var used = replacePara(M2, true);
    used = replacePara(M1, false) || used;
    xml = xml.split(M1).join("").split(M2).join("");
    if (used && photos.length) xml = dolaczZdjecia(out, xml, photos);
    out.file(xmlPath, xml);
    autor(out, opcje.autor != null ? opcje.autor : (data.engineer || data.inspektor));
    return opcje.zip ? out : zapisz(out);
  }
  // autor pliku (Właściwości → Autor) = inżynier z raportu
  function autor(out, who) {
    var core = out.file("docProps/core.xml");
    if (!who || !core) return;
    var w = nz().esc(who), x = core.asText();
    if (/<dc:creator\b/.test(x)) x = x.replace(/<dc:creator\b[^>]*>[\s\S]*?<\/dc:creator>|<dc:creator\/>/, "<dc:creator>" + w + "</dc:creator>");
    else x = x.replace("</cp:coreProperties>", "<dc:creator>" + w + "</dc:creator></cp:coreProperties>");
    out.file("docProps/core.xml", x.replace(/<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy>" + w + "</cp:lastModifiedBy>"));
  }

  // ---------- Word z samych zdjęć formularza (kartki) ----------
  // jedno zdjęcie = jedna strona A4 (Grzegorz 04/11); „male” (Fire Test z kartki, 12/11): kartki strona po stronie,
  // potem małe zdjęcia po 4 w wyśrodkowanym rzędzie, 3 rzędy na stronę
  var SMALL = { cols: 4, rows: 3, M: 6, gap: 3 }, PUSTY = null;
  function pustyWzor() {
    if (PUSTY) return PUSTY;
    var z = nowy();
    z.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    z.file("_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    z.file("word/_rels/document.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
    z.file("word/document.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%zdjecia}</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="340" w:right="340" w:bottom="340" w:left="340" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>');
    return (PUSTY = z.generate({ type: "uint8array" }));
  }
  function zdjeciaKartki(pics, male) {
    var out = wypelnij(pustyWzor(), {}, pics, { zip: true }), x = out.file("word/document.xml").asText();
    if (male) x = maleZdjecia(x, pics);
    else x = x.replace('<w:r><w:br w:type="page"/></w:r>', ""); // pierwsze zdjęcie bez pustej strony przed nim
    out.file("word/document.xml", x);
    return zapisz(out);
  }
  function maleZdjecia(x, pics) {
    var TW = 56.7, EMU = 635, pg = { w: 11906, h: 16838 }, M = SMALL.M * TW;
    var dr = x.match(/<w:r><w:drawing>[\s\S]*?<\/w:drawing><\/w:r>/g) || [];
    function size(d, cx, cy) { return d.replace(/<wp:extent cx="\d+" cy="\d+"\/>/, '<wp:extent cx="' + cx + '" cy="' + cy + '"/>').replace(/<a:ext cx="\d+" cy="\d+"\/>/, '<a:ext cx="' + cx + '" cy="' + cy + '"/>'); }
    function sect(l) { return '<w:sectPr><w:pgSz w:w="' + (l ? pg.h : pg.w) + '" w:h="' + (l ? pg.w : pg.h) + '"' + (l ? ' w:orient="landscape"' : "") + '/><w:pgMar w:top="' + Math.round(M) + '" w:right="' + Math.round(M) + '" w:bottom="' + Math.round(M) + '" w:left="' + Math.round(M) + '" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>'; }
    var P0 = '<w:spacing w:before="0" w:after="0"/><w:jc w:val="center"/>', body = "", idx = pics.map(function (p, i) { return i; });
    var sh = idx.filter(function (i) { return pics[i].sheet; }), gen = idx.filter(function (i) { return !pics[i].sheet; });
    sh.forEach(function (i, k) {
      var p = pics[i], l = p.width > p.height, W = (l ? pg.h : pg.w) - 2 * M, H = (l ? pg.w : pg.h) - 2 * M - 300, z = wpisz(p, W, H);
      // ostatnia kartka bez małych zdjęć za nią: jej strona to sekcja końcowa dokumentu
      var last = k === sh.length - 1 && !gen.length;
      body += "<w:p><w:pPr>" + P0 + (last ? "" : sect(l)) + "</w:pPr>" + size(dr[i] || "", Math.round(z[0] * EMU), Math.round(z[1] * EMU)) + "</w:p>";
      if (last) body += "§LAST§" + (l ? "L" : "P");
    });
    var cw = ((pg.w - 2 * M) - (SMALL.cols - 1) * SMALL.gap * TW) / SMALL.cols, ch = cw * 4 / 3;
    for (var a = 0; a < gen.length; a += SMALL.cols) {
      var row = gen.slice(a, a + SMALL.cols), r = a / SMALL.cols, brk = r && r % SMALL.rows === 0;
      body += "<w:p><w:pPr>" + (brk ? "<w:pageBreakBefore/>" : "") + '<w:spacing w:before="0" w:after="' + Math.round(SMALL.gap * TW) + '" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>' +
        row.map(function (i, k) { var z = wpisz(pics[i], cw, ch); return (k ? '<w:r><w:t xml:space="preserve"> </w:t></w:r>' : "") + size(dr[i] || "", Math.round(z[0] * EMU), Math.round(z[1] * EMU)); }).join("") + "</w:p>";
    }
    var lm = /§LAST§([LP])$/.exec(body), fin = sect(lm ? lm[1] === "L" : false);
    body = body.replace(/§LAST§[LP]$/, "");
    return x.replace(/<w:body>[\s\S]*<\/w:body>/, "<w:body>" + body + fin + "</w:body>");
  }

  // ---------- wzór firmy: podmiana tekstu w częściach pliku (Flushing, temperatury) ----------
  function zmien(wzor, czesci) {
    var zip = otworz(wzor);
    Object.keys(czesci).forEach(function (p) { var f = zip.file(p); if (f) zip.file(p, czesci[p](f.asText())); });
    return zapisz(zip);
  }

  // ---------- czytanie ----------
  // tekst i logo z nagłówka/stopki wzoru
  function info(wzor) {
    var zip = otworz(wzor), out = { headerText: "", footerText: "", logo: null, logoType: "" };
    function text(path) {
      var f = zip.file(path); if (!f) return "";
      return f.asText().split("</w:p>").map(function (p) {
        return (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ""); }).join("");
      }).map(function (s) { return s.replace(/\s+/g, " ").trim(); }).filter(Boolean).join("\n");
    }
    var docRels = zip.file("word/_rels/document.xml.rels"), rels = docRels ? docRels.asText() : "";
    var h = /Type="[^"]*\/header" Target="([^"]+)"/.exec(rels), ft = /Type="[^"]*\/footer" Target="([^"]+)"/.exec(rels);
    if (h) {
      out.headerText = text("word/" + h[1]);
      var hr = zip.file("word/_rels/" + h[1] + ".rels"), img = hr && /Type="[^"]*\/image" Target="([^"]+)"/.exec(hr.asText());
      if (img) {
        var p = "word/" + img[1].replace(/^\.\//, ""), f = zip.file(p);
        if (f && /\.(png|jpe?g)$/i.test(p)) { out.logo = f.asUint8Array(); out.logoType = /\.png$/i.test(p) ? "PNG" : "JPEG"; }
      }
    }
    if (ft) out.footerText = text("word/" + ft[1]);
    return out;
  }
  function tekst(docx) { var f = otworz(docx).file("word/document.xml"); return f ? f.asText().replace(/<[^>]+>/g, "") : ""; }
  // podgląd Worda: tekst akapitów (komórki tabeli w wierszu razem) i zdjęcia z word/media
  function podglad(bytes) {
    var z = otworz(bytes), f = z.file("word/document.xml"), xml = f ? f.asText() : "", ent = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    function txt(x) { return (x.match(/<w:t[^>]*>[^<]*<\/w:t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ""); }).join("").replace(/&(amp|lt|gt|quot|apos);/g, function (_, k) { return ent[k]; }); }
    var lines = [];
    xml.replace(/<w:tr[ >][\s\S]*?<\/w:tr>|<w:p[ >][\s\S]*?<\/w:p>/g, function (blk) {
      var t = /^<w:tr/.test(blk) ? (blk.match(/<w:tc[ >][\s\S]*?<\/w:tc>/g) || []).map(txt).filter(Boolean).join(" | ") : txt(blk);
      t = t.replace(/\s+/g, " ").trim(); if (t) lines.push(t); return "";
    });
    var types = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif" };
    var images = z.file(/^word\/media\//).map(function (m) { var ext = (/\.([a-z]+)$/i.exec(m.name) || [])[1] || ""; return { name: m.name.replace(/^word\/media\//, ""), type: types[ext.toLowerCase()] || "", bytes: m.asUint8Array() }; })
      .filter(function (i) { return i.type; }).sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true }); });
    return { lines: lines, images: images };
  }

  // ---------- układ stron ze zdjęciami (Grzegorz 05/11/2026) ----------
  //  - zdjęcia przy pytaniu / kranie / urządzeniu (z podpisem): do 12 na stronę, nazwa punktu POD zdjęciem,
  //  - zdjęcia ogólne: na pół strony A4 (2 na stronę, jedno pod drugim), bez rozciągania.
  function photoPages(list) {
    var pts = list.filter(function (x) { var p = x.p || x; return p.caption || p.tap != null; }), gen = list.filter(function (x) { var p = x.p || x; return !(p.caption || p.tap != null); }), out = [];
    for (var a = 0; a < pts.length; a += 12) { var c = pts.slice(a, a + 12); out.push({ items: c, g: photoGrid(c.length) }); }
    for (var b = 0; b < gen.length; b += 2) out.push({ items: gen.slice(b, b + 2), g: { cols: 1, rows: 2 } });
    return out;
  }
  // układ zdjęć na stronie wg liczby: 1, 2 (jedno pod drugim), 2×2, 2×3, 3×3, 3×4
  function photoGrid(n) {
    return n <= 1 ? { cols: 1, rows: 1 } : n === 2 ? { cols: 1, rows: 2 } : n <= 4 ? { cols: 2, rows: 2 } : n <= 6 ? { cols: 2, rows: 3 } : n <= 9 ? { cols: 3, rows: 3 } : { cols: 3, rows: 4 };
  }

  // ---------- tekst w treści ----------
  // akapit „☑ hasło<TAB>zdanie” → tabela bez ramek: kratka z hasłem | zdanie; reszta tekstu zostaje akapitami
  function tabsToColumns(xml) {
    if (xml.indexOf("\t") < 0) return xml;
    return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, function (p) {
      if (!/<w:t[^>]*>[^<]*\t/.test(p)) return p;
      var pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(p) || [""])[0];
      var rPr = (/<w:r>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)\s*<w:t/.exec(p) || ["", ""])[1];
      var font = (/<w:rFonts[^>]*\/>/.exec(rPr) || [""])[0];
      var lines = [""], re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:t\/>|<w:br\/>|<w:tab\/>/g, m;
      while ((m = re.exec(p))) { if (m[0] === "<w:br/>") lines.push(""); else if (m[0] === "<w:tab/>") lines[lines.length - 1] += "\t"; else lines[lines.length - 1] += m[1] || ""; }
      var x = function (t) { return t.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, "&amp;"); };
      function run(t, sz, bold) { return '<w:r><w:rPr>' + font + (bold ? "<w:b/>" : "") + '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr><w:t xml:space="preserve">' + x(t) + "</w:t></w:r>"; }
      function para(ls) {
        var r = [];
        ls.forEach(function (l, i) { if (i) r.push("<w:r><w:br/></w:r>"); r.push(run(l, 22)); });
        return "<w:p>" + pPr + r.join("") + "</w:p>";
      }
      var SP = '<w:pPr><w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>';
      function table(rows) {
        // wielkość zależna od liczby punktów: mało = duże i przestronne, ponad 9 = mniejsze, żeby podpis został na 1. stronie
        var n = rows.length, sz = n <= 6 ? 22 : n <= 9 ? 20 : 18, lsz = sz + 2, bsz = n <= 6 ? 32 : n <= 9 ? 28 : 24, pad = n <= 6 ? 80 : 20;
        var CELL = '<w:tcPr><w:tcW w:w="0" w:type="auto"/><w:tcMar><w:top w:w="' + pad + '" w:type="dxa"/><w:bottom w:w="' + pad + '" w:type="dxa"/></w:tcMar></w:tcPr>';
        return '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:insideH w:val="single" w:sz="2" w:space="0" w:color="D0D0D0"/></w:tblBorders>' +
          '<w:tblLayout w:type="fixed"/><w:tblLook w:val="0000"/></w:tblPr><w:tblGrid><w:gridCol w:w="3300"/><w:gridCol w:w="6000"/></w:tblGrid>' +
          rows.map(function (l) {
            var c = l.split("\t"), lab = c[0], box = lab.charAt(0);
            var left = /[☑☒]/.test(box) ? run(box + " ", bsz) + run(lab.slice(1).trim(), lsz, true) : run(lab, lsz, true);
            return '<w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc>' + CELL + "<w:p>" + SP + left + "</w:p></w:tc><w:tc>" + CELL + "<w:p>" + SP + run(c.slice(1).join(" ").trim(), sz) + "</w:p></w:tc></w:tr>";
          }).join("") + "</w:tbl>";
      }
      var out = [], buf = [], rows = [];
      function flush() { if (rows.length) { out.push(table(rows)); rows = []; } if (buf.length) { out.push(para(buf)); buf = []; } }
      lines.forEach(function (l) {
        if (l.indexOf("\t") >= 0) { if (buf.length) { out.push(para(buf)); buf = []; } rows.push(l); }
        else { if (rows.length) { out.push(table(rows)); rows = []; } buf.push(l); }
      });
      flush();
      if (/<\/w:tbl>$/.test(out[out.length - 1])) out.push("<w:p>" + pPr + "</w:p>"); // komórka musi kończyć się akapitem
      return out.join("");
    });
  }
  // Kratki ☑/☒: Calibri nie ma tych znaków (Grzegorz 20/11/2026) → symbol Worda z czcionki Wingdings 2 (F052 ☑, F054 ☒)
  function boxGlyphFont(xml) {
    if (!/[☑☒]/.test(xml)) return xml;
    var SYM = { "☑": "F052", "☒": "F054" };
    return xml.replace(/<w:r(\s[^>]*)?>(<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*<\/w:rPr>)?<w:t(\s[^>]*)?>([^<]*[☑☒][^<]*)<\/w:t><\/w:r>/g, function (m, ra, rpr, ta, txt) {
      rpr = rpr || "";
      var symPr = rpr.replace(/<w:rFonts[^>]*\/>/, "");
      return txt.split(/([☑☒])/).filter(Boolean).map(function (t) {
        return "<w:r" + (ra || "") + ">" + (SYM[t] ? symPr + '<w:sym w:font="Wingdings 2" w:char="' + SYM[t] + '"/>' : rpr + '<w:t xml:space="preserve">' + t + "</w:t>") + "</w:r>";
      }).join("");
    });
  }

  /* Raport ponad 1 MB (Grzegorz 05/11/2026, PROD-023): przed wysłaniem pytanie „Zmniejsz zdjęcia / Zostaw tak”, bez cichego zmniejszania.
     „Zmniejsz” = mniejsze zdjęcia TYLKO w tym raporcie (kartka i zdjęcia w folderze bez zmian), do 4 prób, skala nie mniejsza niż o.min.
     o.rozmiar(raport) → bajty największego pliku; o.buduj(skala, poprzedni) → Promise<nowy raport>. Jedno miejsce: inspekcje i Reactive. */
  var LIMIT = 1048576;
  function zaDuzy(big) {
    var T = root.OESTT, P = root.OESTPrzycisk, mb = root.OESTNarzedzia.mb(big, T("pl", "en"));
    return P && P.confirm ? P.confirm(T("Plik raportu będzie miał " + mb + " MB (limit 1 MB). Zmniejszyć zdjęcia w raporcie, czy zostawić je tak, jak są?",
      "The report file will be " + mb + " MB (limit 1 MB). Make the photos in the report smaller, or keep them as they are?"),
      { ok: T("Zmniejsz zdjęcia", "Make smaller"), cancel: T("Zostaw tak", "Keep as is"), danger: false }) : Promise.resolve(false);
  }
  function dopasuj(r, o) {
    var big = o.rozmiar(r);
    if (big < LIMIT) return Promise.resolve(r);
    return zaDuzy(big).then(function (tak) {
      var skala = 1, i = 0;
      function krok() {
        if (!tak || i++ >= 4 || big < LIMIT || skala <= o.min) return r;
        skala = Math.max(o.min, skala * Math.sqrt(LIMIT * 0.9 / big));
        return Promise.resolve(o.buduj(skala, r)).then(function (n) { r = n; big = o.rozmiar(r); return krok(); });
      }
      return krok();
    });
  }

  return { MIME: MIME, dopasuj: dopasuj, biblioteki: biblioteki, otworz: otworz, nowy: nowy, zapisz: zapisz, wypelnij: wypelnij, zdjeciaKartki: zdjeciaKartki,
    zmien: zmien, info: info, tekst: tekst, podglad: podglad, photoPages: photoPages, photoGrid: photoGrid };
});
