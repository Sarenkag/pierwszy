/* Moduł Word → PDF (moduly/word-pdf) – PDF rysowany z TEGO SAMEGO wypełnionego Worda (formularz firmy),
 * żeby obie wersje raportu miały identyczną treść i układ formularza (zasada: każdy raport w dwóch identycznych wersjach Word i PDF).
 *
 * Użycie:  OESTWordPdf.pdf(docxBytes, { PizZip, jsPDF, czcionka })  → Uint8Array (PDF)
 *   czcionka: obiekt z dodaj(pdf), rejestrujący czcionkę „DV” normal/bold (moduly/czcionka-pdf).
 * Obsługuje to, czego używają formularze firmy: strona i marginesy z sectPr (też poziomo), nagłówek i stopka (tekst, tabela, logo),
 * akapity (wyrównanie, pogrubienie, wielkość, WIELKIE LITERY, zakreślenie), tabele (siatka, gridSpan, vMerge, obramowania
 * pojedyncze/podwójne/kropkowane, wysokość wierszy, wyrównanie w pionie) i łamanie stron między wierszami tabeli.
 * Czcionka zawsze DejaVu (Times/Calibri z Worda nie są wbudowane w telefon) – szerokość tekstu może się nieco różnić, treść nie.
 */
(function (root) {
  "use strict";
  var TW = 25.4 / 1440, EMU = 1 / 36000, PT = 25.4 / 72;
  var HL = { yellow: [255, 255, 0], green: [0, 255, 0], red: [255, 0, 0], cyan: [0, 255, 255], magenta: [255, 0, 255], blue: [0, 0, 255], darkYellow: [128, 128, 0], lightGray: [211, 211, 211], darkGray: [169, 169, 169] };

  function kids(el, name) { var out = []; for (var c = el ? el.firstChild : null; c; c = c.nextSibling) if (c.nodeType === 1 && (!name || c.nodeName === name)) out.push(c); return out; }
  function kid(el, name) { return kids(el, name)[0] || null; }
  function val(el, a) { return el ? el.getAttribute(a || "w:val") : null; }
  function on(el) { if (!el) return null; var v = val(el); return v === null || (v !== "0" && v !== "false" && v !== "none"); }
  function xml(s) { return new DOMParser().parseFromString(s, "application/xml"); }

  function pdf(bytes, libs) {
    var SK = libs.skala || 0.88; // DejaVu jest szerszy od Times/Calibri z formularzy – mniejsza czcionka, żeby wiersze łamały się jak w Wordzie
    var zip = new libs.PizZip(bytes), file = function (p) { var f = zip.file(p); return f ? f.asText() : ""; };
    var doc = xml(file("word/document.xml")), body = doc.getElementsByTagName("w:body")[0];
    // style akapitów: wielkość / pogrubienie / wyrównanie
    var st = {}, sx = xml(file("word/styles.xml") || "<w:styles/>"), dsz = 22;
    var dd = sx.getElementsByTagName("w:rPrDefault")[0]; if (dd && dd.getElementsByTagName("w:sz")[0]) dsz = +val(dd.getElementsByTagName("w:sz")[0]);
    Array.prototype.forEach.call(sx.getElementsByTagName("w:style"), function (s) {
      var r = kid(s, "w:rPr"), p = kid(s, "w:pPr");
      st[val(s, "w:styleId")] = { base: val(kid(s, "w:basedOn")), tabs: p ? kids(kid(p, "w:tabs"), "w:tab").map(function (t) { return +val(t, "w:pos") * TW; }) : null, sz: r && kid(r, "w:sz") ? +val(kid(r, "w:sz")) : null, b: r ? on(kid(r, "w:b")) : null, caps: r ? on(kid(r, "w:caps")) : null, jc: p ? val(kid(p, "w:jc")) : null };
    });
    function style(id, k) { for (var n = 0; id && st[id] && n < 10; n++, id = st[id].base) if (st[id][k] !== null && st[id][k] !== undefined) return st[id][k]; return null; }
    var setx = xml(file("word/settings.xml") || "<w:settings/>").getElementsByTagName("w:defaultTabStop")[0], DTAB = (setx ? +val(setx) : 720) * TW;
    var sect = body.getElementsByTagName("w:sectPr"), sp = sect[sect.length - 1], pg = kid(sp, "w:pgSz"), mar = kid(sp, "w:pgMar");
    var PW = +val(pg, "w:w") * TW, PH = +val(pg, "w:h") * TW, ML = +val(mar, "w:left") * TW, MR = +val(mar, "w:right") * TW, MT = +val(mar, "w:top") * TW, MB = +val(mar, "w:bottom") * TW, HD = +(val(mar, "w:header") || 720) * TW;
    var out = new libs.jsPDF({ unit: "mm", format: [PW, PH].sort(function (a, b) { return a - b; }), orientation: PW > PH ? "l" : "p", compress: true });
    libs.czcionka.dodaj(out);
    function rels(part) { var m = {}, r = xml(file(part.replace(/([^/]+)$/, "_rels/$1.rels")) || "<R/>"); Array.prototype.forEach.call(r.getElementsByTagName("Relationship"), function (x) { m[x.getAttribute("Id")] = x.getAttribute("Target"); }); return m; }
    function hf(kind) { // pierwszy nagłówek/stopka typu default
      var ref = Array.prototype.filter.call(sp.getElementsByTagName("w:" + kind + "Reference"), function (r) { return val(r, "w:type") !== "first" && val(r, "w:type") !== "even"; })[0];
      if (!ref) return null; var t = rels("word/document.xml")[val(ref, "r:id")]; if (!t) return null;
      var part = "word/" + t; return { el: xml(file(part)).documentElement, rels: rels(part), dir: part.replace(/[^/]+$/, "") };
    }

    // ---- akapit: kawałki tekstu (słowa ze spacjami) i obrazki, łamane do szerokości w ----
    function pieces(p, ctx) {
      var pPr = kid(p, "w:pPr"), sid = val(kid(pPr, "w:pStyle")) || "Normal", out = [];
      var psz = (style(sid, "sz") || dsz) * SK, pb = !!style(sid, "b"), pcaps = !!style(sid, "caps");
      var tabs = kids(kid(pPr, "w:tabs"), "w:tab").map(function (t) { return +val(t, "w:pos") * TW; }); if (!tabs.length) tabs = style(sid, "tabs") || [];
      (function walk(el) {
        kids(el).forEach(function (c) {
          var n = c.nodeName;
          if (n === "w:r") {
            var r = kid(c, "w:rPr"), sz = r && kid(r, "w:sz") ? +val(kid(r, "w:sz")) * SK : psz, b = r && kid(r, "w:b") ? on(kid(r, "w:b")) : pb, caps = r && kid(r, "w:caps") ? on(kid(r, "w:caps")) : pcaps, hl = r ? val(kid(r, "w:highlight")) : null;
            kids(c).forEach(function (e) {
              if (e.nodeName === "w:t") (caps ? e.textContent.toUpperCase() : e.textContent).split(/(\s+)/).forEach(function (t) { if (t) out.push({ t: t, b: b, sz: sz, hl: hl }); });
              else if (e.nodeName === "w:tab") out.push({ tab: true, t: " ", b: b, sz: sz });
              else if (e.nodeName === "w:br" && val(e, "w:type") !== "page") out.push({ br: true, sz: sz });
              else if (e.nodeName === "w:drawing") {
                var ext = e.getElementsByTagName("wp:extent")[0], blip = e.getElementsByTagName("a:blip")[0], tgt = blip && ctx.rels[blip.getAttribute("r:embed")];
                var f = tgt && zip.file((ctx.dir + tgt).replace(/[^/]+\/\.\.\//g, ""));
                if (f && ext) out.push({ img: f.asUint8Array(), type: /png$/i.test(tgt) ? "PNG" : "JPEG", w: +ext.getAttribute("cx") * EMU, h: +ext.getAttribute("cy") * EMU });
              }
            });
          } else if (/^w:(hyperlink|smartTag|ins|fldSimple|sdt|sdtContent)$/.test(n)) walk(c);
        });
      })(p);
      return { list: out, jc: val(kid(pPr, "w:jc")) || style(sid, "jc") || "left", sz: psz, tabs: tabs };
    }
    function font(k) { out.setFont("DV", k.b ? "bold" : "normal"); out.setFontSize(k.sz / 2); }
    function layout(p, w, ctx) {
      var pc = pieces(p, ctx), lines = [], cur = [], cw = 0;
      function push() { var h = cur.reduce(function (m, k) { return Math.max(m, k.img ? k.h : k.sz / 2 * PT * 1.17); }, pc.sz / 2 * PT * 1.17); while (cur.length && !cur[cur.length - 1].img && !cur[cur.length - 1].t.trim()) { cw -= cur[cur.length - 1].w; cur.pop(); } lines.push({ k: cur, w: cw, h: h }); cur = []; cw = 0; }
      pc.list.forEach(function (k) {
        if (k.br) { push(); return; }
        if (k.tab) { // tabulator: do następnego punktu tabulacji (z akapitu/stylu, potem co defaultTabStop); w PDF jako spacje w tej samej linii tekstu
          var stop = pc.tabs.filter(function (t) { return t > cw + 0.5; })[0]; if (stop === undefined) stop = (Math.floor(cw / DTAB) + 1) * DTAB;
          font(k); var sw = out.getTextWidth(" "), n = Math.max(1, Math.round((stop - cw) / sw)); k = { t: new Array(n + 1).join(" "), b: k.b, sz: k.sz, w: n * sw, tab: true };
          if (cw + k.w > w + 0.01) { push(); return; }
          cur.push(k); cw += k.w; return;
        }
        if (!k.img) { font(k); k.w = out.getTextWidth(k.t); }
        if (cw + k.w > w + 0.01 && cur.length && (k.img || k.t.trim())) push();
        if (!cur.length && !k.img && !k.t.trim() && lines.length) return; // spacje na początku zawiniętej linii
        cur.push(k); cw += k.w;
      });
      push();
      return { lines: lines, jc: pc.jc, h: lines.reduce(function (s, l) { return s + l.h; }, 0) };
    }
    function drawPara(lp, x, y, w) {
      lp.lines.forEach(function (l) {
        var cx = lp.jc === "center" ? x + (w - l.w) / 2 : lp.jc === "right" || lp.jc === "end" ? x + w - l.w : x;
        // kawałki o tym samym wyglądzie jednym tekstem; zmiana wyglądu w środku słowa (np. „Flow:”) – słowo zostaje całe
        var segs = []; l.k.forEach(function (k) { var s = segs[segs.length - 1]; if (s && !k.img && !s.img && ((s.b === k.b && s.sz === k.sz && s.hl === k.hl) || (/\S$/.test(s.t) && /^\S/.test(k.t)))) { s.t += k.t; s.w += k.w; } else segs.push(Object.assign({}, k)); });
        segs.forEach(function (k) {
          if (k.img) { try { out.addImage(k.img, k.type, cx, y + l.h - k.h, k.w, k.h); } catch (_) {} }
          else {
            if (k.hl && HL[k.hl] && k.t.trim()) { out.setFillColor.apply(out, HL[k.hl]); out.rect(cx, y + 0.3, k.w, l.h, "F"); }
            if (k.t.trim()) { font(k); out.text(k.t.replace(/\s+$/, ""), cx, y + l.h * 0.8); }
          }
          cx += k.w;
        });
        y += l.h;
      });
    }

    // ---- tabela: komórki na siatce, scalenia, obramowania ----
    function table(t, ctx) {
      var grid = kids(kid(t, "w:tblGrid"), "w:gridCol").map(function (g) { return +val(g, "w:w") * TW; });
      var tb = kid(kid(t, "w:tblPr"), "w:tblBorders"), rows = [];
      kids(t, "w:tr").forEach(function (tr) {
        var trPr = kid(tr, "w:trPr"), hgt = kid(trPr, "w:trHeight"), col = 0, cells = [];
        kids(tr, "w:tc").forEach(function (tc) {
          var pr = kid(tc, "w:tcPr"), span = +val(kid(pr, "w:gridSpan")) || 1, vm = kid(pr, "w:vMerge");
          var x = 0; for (var i = 0; i < col; i++) x += grid[i] || 0; var w = 0; for (i = col; i < col + span; i++) w += grid[i] || 0;
          cells.push({ tc: tc, x: x, w: w, col: col, span: span, cont: !!vm && val(vm) !== "restart", va: val(kid(pr, "w:vAlign")) || "top", bd: kid(pr, "w:tcBorders") });
          col += span;
        });
        rows.push({ cells: cells, min: hgt ? +val(hgt) * TW : 0, exact: hgt && val(hgt, "w:hRule") === "exact" });
      });
      rows.forEach(function (r) {
        r.h = r.min;
        r.cells.forEach(function (c) {
          c.paras = c.cont ? [] : kids(c.tc, "w:p").map(function (p) { return layout(p, c.w - 1.2, ctx); });
          c.need = c.paras.reduce(function (s, p) { return s + p.h; }, 0) + 0.8;
          if (!r.exact && !c.cont && !(val(kid(kid(c.tc, "w:tcPr"), "w:vMerge")) === "restart")) r.h = Math.max(r.h, c.need);
        });
      });
      return { rows: rows, tb: tb, x0: 0 };
    }
    function side(c, tb, name, inside) { var e = kid(c.bd, "w:" + name) || kid(tb, "w:" + (inside || name)); return e && val(e) !== "nil" && val(e) !== "none" ? val(e) : null; }
    function edge(kind, x1, y1, x2, y2) {
      if (!kind) return;
      out.setLineWidth(kind === "double" ? 0.45 : 0.2); out.setLineDashPattern(/dot|dash/i.test(kind) ? [0.6, 0.6] : [], 0);
      out.line(x1, y1, x2, y2); out.setLineDashPattern([], 0);
    }
    function drawRows(T, rows, x0, y0) { // rysuje wiersze (scalenia pionowe liczone w obrębie podanych wierszy)
      var y = y0;
      rows.forEach(function (r, ri) {
        r.cells.forEach(function (c) {
          if (c.cont) return;
          var h = r.h; // scalenie w dół: dolicz kolejne wiersze z kontynuacją w tej samej kolumnie
          for (var k = ri + 1; k < rows.length; k++) { var nx = rows[k].cells.filter(function (d) { return d.col === c.col; })[0]; if (nx && nx.cont) h += rows[k].h; else break; }
          var X = x0 + c.x, last = ri + 1 === rows.length;
          edge(side(c, T.tb, "top", ri ? "insideH" : "top"), X, y, X + c.w, y);
          edge(side(c, T.tb, "bottom", "insideH"), X, y + h, X + c.w, y + h);
          edge(side(c, T.tb, "left", c.col ? "insideV" : "left"), X, y, X, y + h);
          edge(side(c, T.tb, "right", "insideV"), X + c.w, y, X + c.w, y + h);
          var ty = y + 0.4 + (c.va === "center" ? Math.max(0, (h - c.need) / 2) : c.va === "bottom" ? Math.max(0, h - c.need) : 0);
          c.paras.forEach(function (p) { drawPara(p, X + 0.6, ty, c.w - 1.2); ty += p.h; });
          if (last) edge(side(c, T.tb, "bottom", "bottom"), X, y + h, X + c.w, y + h);
        });
        y += r.h;
      });
      return y;
    }

    // ---- nagłówek / stopka na każdej stronie ----
    var H = hf("header"), F = hf("footer"), headBottom = MT, footH = 0;
    function block(part, y, draw) { // akapity i tabele po kolei; zwraca y pod blokiem
      kids(part.el).forEach(function (e) {
        if (e.nodeName === "w:p") { var lp = layout(e, PW - ML - MR, part); if (draw) drawPara(lp, ML, y, PW - ML - MR); y += lp.h; }
        else if (e.nodeName === "w:tbl") { var T = table(e, part); y = draw ? drawRows(T, T.rows, ML, y) : y + T.rows.reduce(function (s, r) { return s + r.h; }, 0); }
      });
      return y;
    }
    if (H) headBottom = Math.max(MT, block(H, HD, false) + 1.5);
    if (F) footH = block(F, 0, false);
    var bottom = PH - Math.max(MB, footH + 4);
    function decorate() { if (H) block(H, HD, true); if (F) block(F, PH - footH - 4, true); out.setDrawColor(0); out.setTextColor(0); }

    // ---- treść ----
    var y = headBottom, ctx = { rels: rels("word/document.xml"), dir: "word/" }, els = kids(body).filter(function (e) { return e.nodeName === "w:p" || e.nodeName === "w:tbl"; });
    function newPage() { out.addPage(); y = headBottom; }
    els.forEach(function (e, i) {
      var W = PW - ML - MR;
      if (e.nodeName === "w:p") {
        var lp = layout(e, W, ctx), nx = els[i + 1], keep = lp.h;
        if (nx && nx.nodeName === "w:tbl") keep += table(nx, ctx).rows.slice(0, 3).reduce(function (s, r) { return s + r.h; }, 0); // podpis tabeli razem z jej początkiem
        if (y + keep > bottom && y > headBottom + 0.1) newPage();
        drawPara(lp, ML, y, W); y += lp.h; return;
      }
      var T = table(e, ctx), rows = T.rows, from = 0;
      while (from < rows.length) {
        var to = from, hh = 0;
        while (to < rows.length && (y + hh + rows[to].h <= bottom || to === from)) { hh += rows[to].h; to++; }
        while (to < rows.length && to > from + 1 && rows[to].cells.some(function (c) { return c.cont; })) { to--; } // nie rozcinaj scalenia pionowego
        if (y + rows[from].h > bottom && y > headBottom + 0.1) { newPage(); continue; }
        y = drawRows(T, rows.slice(from, to), ML, y); from = to;
        if (from < rows.length) newPage();
      }
    });
    for (var p = 1; p <= out.getNumberOfPages(); p++) { out.setPage(p); decorate(); }
    return new Uint8Array(out.output("arraybuffer"));
  }

  var api = { pdf: pdf };
  if (typeof module === "object" && module.exports) module.exports = api; else root.OESTWordPdf = api;
})(typeof window !== "undefined" ? window : globalThis);
