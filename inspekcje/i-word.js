// i-word.js – teksty PL/EN (T), składanie Worda raportu.
// Korzysta ze wspólnych nazw całej strony (pliki 2–16 z tabeli w docs/podzial-modulow.md); ładować w kolejności z index.html.
// Nie ruszać: nazw T/OESTT – używa ich cała strona.
// Tekst na ekranie: OESTT('po polsku', 'in English') wg języka apki (moduly/bledy). Raporty zawsze po angielsku.
function T(pl, en) { return window.OESTT ? window.OESTT(pl, en) : pl; }
// miejsce pod PL i EN (moduly/podmien + moduly/bledy): ten sam fragment w drugim języku wyznacza min. wymiary tekstów – zmiana języka nic nie przesuwa
function both(el, html) { if (window.OESTPodmien && window.OESTBledy && OESTBledy.wJezyku) OESTPodmien.rezerwuj(el, OESTBledy.wJezyku(OESTBledy.drugi(), html)); }
// Statyczne teksty strony (data-en / data-en-aria-label / data-en-placeholder) – podmiana w miejscu, bez przerysowania.
(function () {
  function lang() { if (window.OESTBledy) OESTBledy.applyDom(document); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", lang); else lang();
  if (window.OESTBledy) OESTBledy.naZmianeJezyka(lang); // oest:lang i zmiana w innej stronie (moduly/bledy)
  window.addEventListener("storage", function (e) { if (e && e.key === "oest.settings") lang(); });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) lang(); });
})();
// Wypełnia szablon .docx: znaczniki {nazwa} -> tekst, {%zdjecie} / {%zdjecia} -> zdjęcia JPEG.
// {%zdjecie}: zdjęcia jedno pod drugim; {%zdjecia}: każde zdjęcie na osobnej stronie.
// Działa w przeglądarce (globalne PizZip, docxtemplater) i w node (test).
function fillDocx(PizZip, Docxtemplater, templateBytes, data, photos) {
  photos = photos || [];
  var M1 = "§ZDJ1§", M2 = "§ZDJ2§";
  var zip = new PizZip(templateBytes);
  var doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    nullGetter: function () { return ""; }
  });
  var d = Object.assign({}, data);
  d["%zdjecie"] = M1;
  d["%zdjecia"] = M2;
  d["%photos"] = M1; // wzór OEST-basic: zdjęcia na osobnej stronie (sekcja), jedno pod drugim
  doc.render(d);
  var out = doc.getZip();
  var xmlPath = "word/document.xml";
  var xml = out.file(xmlPath).asText();
  xml = tabsToColumns(xml);
  xml = boxGlyphFont(xml);

  var pw = /<w:pgSz[^>]*w:w="(\d+)"/.exec(xml);
  var ph = /<w:pgSz[^>]*w:h="(\d+)"/.exec(xml);
  var ml = /<w:pgMar[^>]*w:left="(\d+)"/.exec(xml);
  var mr = /<w:pgMar[^>]*w:right="(\d+)"/.exec(xml);
  var mt = /<w:pgMar[^>]*w:top="(\d+)"/.exec(xml);
  var mb = /<w:pgMar[^>]*w:bottom="(\d+)"/.exec(xml);
  var availW = (pw ? +pw[1] : 11906) - (ml ? +ml[1] : 1134) - (mr ? +mr[1] : 1134);
  var availH = (ph ? +ph[1] : 16838) - (mt ? +mt[1] : 1134) - (mb ? +mb[1] : 1134);
  var maxW = Math.round(availW * 635);

  function drawing(p, i, maxH, boxW) {
    var bw = boxW || maxW, cx = bw, cy = Math.round(bw * p.height / p.width);
    if (cy > maxH) { cy = maxH; cx = Math.round(maxH * p.width / p.height); }
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
  // znajdź akapit ze znacznikiem i zamień go na akapity ze zdjęciami
  function replacePara(mark, pageBreaks) {
    var idx = xml.indexOf(mark);
    if (idx < 0) return false;
    var s = idx;
    while (s > 0) { s = xml.lastIndexOf("<w:p", s - 1); var c = xml.charAt(s + 4); if (c === ">" || c === " ") break; }
    var e = xml.indexOf("</w:p>", idx) + 6;
    var para = xml.slice(s, e);
    var pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(para) || [""])[0];
    var maxH = Math.round(Math.min(availH * 635 * 0.8, 7.2e6)), body;
    if (pageBreaks) body = photos.map(function (p, i) {
      return "<w:p>" + pPr + '<w:r><w:br w:type="page"/></w:r>' + drawing(p, i, maxH) + "</w:p>";
    }).join("");
    else body = photoTables(); // wzór OEST-basic: do 12 zdjęć na stronę w siatce
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
            (ph && ph.caption ? "<w:p>" + P0 + '<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t xml:space="preserve">' + String(ph.caption).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</w:t></w:r></w:p>" : "") + "</w:tc>"; // zdjęcie przy kranie/punkcie: podpis jego nazwą (04/11)
        }
        t += "</w:tr>";
      }
      t += "</w:tbl>";
      out.push(t);
    });
    return out.join('<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>') +
      '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
  }
  // brak zdjęć: wytnij stronę na zdjęcia (podział sekcji + akapit znacznika), żeby nie było pustej strony
  if (!photos.length) dropPhotoSection(M1);
  function dropPhotoSection(mark) {
    var idx = xml.indexOf(mark); if (idx < 0) return;
    var s = idx;
    while (s > 0) { s = xml.lastIndexOf("<w:p", s - 1); var c = xml.charAt(s + 4); if (c === ">" || c === " ") break; }
    var e = xml.indexOf("</w:p>", idx) + 6;
    var before = xml.slice(0, s), pe = before.lastIndexOf("</w:p>");
    if (pe < 0 || pe + 6 !== before.length) return;
    var ps = pe; while (ps > 0) { ps = before.lastIndexOf("<w:p", ps - 1); var c2 = before.charAt(ps + 4); if (c2 === ">" || c2 === " ") break; }
    var brk = before.slice(ps), sect = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/.exec(brk);
    var bodyEnd = xml.lastIndexOf("</w:body>"), li = xml.lastIndexOf("<w:sectPr", bodyEnd);
    if (!sect || li < e || bodyEnd < 0) return;
    xml = xml.slice(0, ps) + xml.slice(e, li) + sect[0] + xml.slice(bodyEnd);
  }
  var used = replacePara(M2, true);
  used = replacePara(M1, false) || used;
  xml = xml.split(M1).join("").split(M2).join("");

  if (used && photos.length) {
    xml = xml.replace(/<w:document\b([^>]*)>/, function (m, attrs) {
      var add = "";
      if (attrs.indexOf("xmlns:wp=") < 0) add += ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
      if (attrs.indexOf("xmlns:r=") < 0) add += ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
      return "<w:document" + attrs + add + ">";
    });
    var relsPath = "word/_rels/document.xml.rels";
    var rels = out.file(relsPath).asText();
    var add = photos.map(function (p, i) {
      return '<Relationship Id="rIdZdj' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/zdjecie' + (i + 1) + '.jpeg"/>';
    }).join("");
    out.file(relsPath, rels.replace("</Relationships>", add + "</Relationships>"));
    var ct = out.file("[Content_Types].xml").asText();
    if (!/Extension="jpeg"/i.test(ct)) {
      out.file("[Content_Types].xml", ct.replace("</Types>", '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'));
    }
    photos.forEach(function (p, i) { out.file("word/media/zdjecie" + (i + 1) + ".jpeg", p.bytes); });
  }
  out.file(xmlPath, xml);
  var who = data.engineer || data.inspektor, core = out.file("docProps/core.xml");
  if (who && core) {
    var w = String(who).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    out.file("docProps/core.xml", core.asText().replace(/<dc:creator>[^<]*<\/dc:creator>/, "<dc:creator>" + w + "</dc:creator>")
      .replace(/<cp:lastModifiedBy>[^<]*<\/cp:lastModifiedBy>/, "<cp:lastModifiedBy>" + w + "</cp:lastModifiedBy>"));
  }
  return out;
}

// Strony ze zdjęciami (Grzegorz 05/11/2026), wspólne dla Worda i PDF-u:
//  - zdjęcia przy pytaniu / kranie / urządzeniu (z podpisem): do 12 na stronę, nazwa punktu POD zdjęciem,
//  - zdjęcia ogólne: na pół strony A4 (2 na stronę, jedno pod drugim), bez rozciągania.
// Zdjęcia formularza (sheet) idą osobno, każde na całą stronę.
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
// tabulator w tekście (checkpointy) → <w:tab/> + 3 równe kolumny w tym akapicie
function tabsToColumns(xml) {
  // akapit treści z wierszami „☑ hasło<TAB>zdanie” → tabela bez ramek: kratka z hasłem | zdanie; reszta tekstu zostaje akapitami
  if (xml.indexOf("\t") < 0) return xml;
  return xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, function (p) {
    if (!/<w:t[^>]*>[^<]*\t/.test(p)) return p;
    var pPr = (/<w:pPr>[\s\S]*?<\/w:pPr>/.exec(p) || [""])[0];
    var rPr = (/<w:r>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)\s*<w:t/.exec(p) || ["", ""])[1];
    var font = (/<w:rFonts[^>]*\/>/.exec(rPr) || [""])[0];
    // tekst akapitu jako linie (w:br = nowa linia)
    var lines = [""], re = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:t\/>|<w:br\/>|<w:tab\/>/g, m;
    while ((m = re.exec(p))) { if (m[0] === "<w:br/>") lines.push(""); else if (m[0] === "<w:tab/>") lines[lines.length - 1] += "\t"; else lines[lines.length - 1] += m[1] || ""; }
    var x = function (t) { return t.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#)/g, "&amp;"); };
    function run(t, sz, bold) { return '<w:r><w:rPr>' + font + (bold ? "<w:b/>" : "") + '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr><w:t xml:space="preserve">' + x(t) + "</w:t></w:r>"; }
    function para(ls) {
      var r = [];
      ls.forEach(function (l, i) { if (i) r.push("<w:r><w:br/></w:r>"); r.push(run(l, 22)); });
      return "<w:p>" + pPr + r.join("") + "</w:p>";
    }
    var CELL = '<w:tcPr><w:tcW w:w="0" w:type="auto"/><w:tcMar><w:top w:w="20" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/></w:tcMar></w:tcPr>';
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
// Kratki ☑/☒ w Wordzie: Calibri nie ma tych znaków, więc Word pokazywał pusty kwadracik/pytajnik (Grzegorz 20/11/2026).
// Kratka = symbol Worda z czcionki Wingdings 2 (F052 ☑, F054 ☒) – tak jak „Wstaw symbol” w Wordzie; jest w każdym Office
// (Windows, Mac, Android, przeglądarka), a LibreOffice zamienia ją na swoją czcionkę symboli. Reszta tekstu bez zmian.
function boxGlyphFont(xml) {
  if (!/[\u2611\u2612]/.test(xml)) return xml;
  var SYM = { "\u2611": "F052", "\u2612": "F054" };
  return xml.replace(/<w:r(\s[^>]*)?>(<w:rPr>(?:(?!<\/w:rPr>)[\s\S])*<\/w:rPr>)?<w:t(\s[^>]*)?>([^<]*[\u2611\u2612][^<]*)<\/w:t><\/w:r>/g, function (m, ra, rpr, ta, txt) {
    rpr = rpr || "";
    var symPr = rpr.replace(/<w:rFonts[^>]*\/>/, "");
    return txt.split(/([\u2611\u2612])/).filter(Boolean).map(function (t) {
      return "<w:r" + (ra || "") + ">" + (SYM[t] ? symPr + '<w:sym w:font="Wingdings 2" w:char="' + SYM[t] + '"/>' : rpr + '<w:t xml:space="preserve">' + t + "</w:t>") + "</w:r>";
    }).join("");
  });
}
// Tekst i logo z nagłówka/stopki szablonu (do PDF)
function templateInfo(PizZip, templateBytes) {
  var zip = new PizZip(templateBytes), info = { headerText: "", footerText: "", logo: null, logoType: "" };
  function text(path) {
    var f = zip.file(path); if (!f) return "";
    return f.asText().split("</w:p>").map(function (p) {
      return (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ""); }).join("");
    }).map(function (s) { return s.replace(/\s+/g, " ").trim(); }).filter(Boolean).join("\n");
  }
  var docRels = zip.file("word/_rels/document.xml.rels");
  var rels = docRels ? docRels.asText() : "";
  var h = /Type="[^"]*\/header" Target="([^"]+)"/.exec(rels);
  var ft = /Type="[^"]*\/footer" Target="([^"]+)"/.exec(rels);
  if (h) {
    info.headerText = text("word/" + h[1]);
    var hr = zip.file("word/_rels/" + h[1] + ".rels");
    var img = hr && /Type="[^"]*\/image" Target="([^"]+)"/.exec(hr.asText());
    if (img) {
      var p = "word/" + img[1].replace(/^\.\//, ""), f = zip.file(p);
      if (f && /\.(png|jpe?g)$/i.test(p)) { info.logo = f.asUint8Array(); info.logoType = /\.png$/i.test(p) ? "PNG" : "JPEG"; }
    }
  }
  if (ft) info.footerText = text("word/" + ft[1]);
  return info;
}

// Nazwa pliku według wzoru: {RRRR} {MM} {DD} {GG} {mm} {kod} {urzadzenie} {lokalizacja} {obiekt} {rodzaj} {nr}
function makeName(pattern, data, when) {
  var pad = window.OESTNarzedzia.pad;
  function clean(s) {
    return String(s || "").replace(/[(),]/g, " ").trim()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[łŁ]/g, function (c) { return c === "ł" ? "l" : "L"; }) // i18n-ok: zamiana liter w nazwie pliku
      .replace(/[^A-Za-z0-9._ -]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }
  var map = {
    RRRR: when.getFullYear(), MM: pad(when.getMonth() + 1), DD: pad(when.getDate()),
    GG: pad(when.getHours()), mm: pad(when.getMinutes()),
    kod: clean(data.urzadzenie).toLowerCase(),
    obiekt: clean(data.obiekt), urzadzenie: clean(data.urzadzenie), lokalizacja: clean(data.lokalizacja),
    rodzaj: clean(data.rodzaj), nr: clean(data.nr), zlecenie: clean(data["job number"])
  };
  // numer zlecenia Vantify (Grzegorz 20/11/2026): na końcu nazwy, także przy własnym wzorze bez {zlecenie}; bez numeru – nazwa jak dotąd
  if (map.zlecenie && pattern.indexOf("{zlecenie}") < 0) pattern += " {zlecenie}";
  var name = pattern.replace(/\{(\w+)\}/g, function (m, k) { return map[k] != null ? map[k] : ""; });
  name = name.replace(/[\/\\:*?"<>|]/g, "-").replace(/ +/g, " ").replace(/_+/g, "_").replace(/-+/g, "-").replace(/^[ _-]+|[ _-]+$/g, "");
  return name || "raport";
}



