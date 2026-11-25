/* Moduł Word → PDF (moduly/word-pdf) – PDF raportu TYLKO z wypełnionego Worda, silnikiem LibreOffice w telefonie
 * (wtyczka Capacitor „LibreOffice”, LibreOfficeKit). Własnego rysownika PDF nie ma (Grzegorz 21/11/2026: „mamy profesjonalny sprzęt”).
 *
 * Użycie:  OESTWordPdf.dostepny()                → true, gdy silnik jest w apce
 *          OESTWordPdf.zWorda(docxBytes)          → Promise<Uint8Array|null>
 *          OESTWordPdf.zWordow([docx, …], PDFLib?) → Promise<Uint8Array|null> (każdy Word przez silnik, strony sklejone pdf-lib)
 * null = PDF nie powstał (brak silnika / błąd) – wywołujący wysyła Word i mówi to wprost, nic nie rysuje zamiast.
 * To jedyne miejsce w JS, które woła wtyczkę LibreOffice.
 */
(function (root) {
  "use strict";
  function dostepny() {
    var C = root.Capacitor;
    return !!(C && C.isPluginAvailable && C.isPluginAvailable("LibreOffice") && C.Plugins && C.Plugins.LibreOffice);
  }
  function b64(bytes) { var s = ""; for (var i = 0; i < bytes.length; i += 32768) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 32768)); return root.btoa(s); }
  function zB64(t) { var s = root.atob(t), out = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
  function zWorda(docxBytes) {
    if (!dostepny() || !docxBytes || !docxBytes.length) return Promise.resolve(null);
    return root.Capacitor.Plugins.LibreOffice.toPdf({ docx: b64(docxBytes) }).then(function (r) {
      var pdfBytes = r && r.pdf ? zB64(r.pdf) : null;
      return pdfBytes && pdfBytes.length ? pdfBytes : null;
    }, function (e) { if (root.console) root.console.warn("LibreOffice PDF: " + (e && e.message || e)); return null; });
  }

  // Kilka Wordów → jeden PDF (Flushing: formularz firmy + basic form Smart): każdy przez silnik (zWorda), potem sklejenie stron
  // gotową biblioteką pdf-lib (PDFLib). null, gdy którykolwiek się nie uda – wtedy PDF-a nie ma i idzie sam Word (rysownika PDF nie ma).
  function zWordow(docs, PDFLib) {
    docs = (docs || []).filter(function (d) { return d && d.length; });
    if (!docs.length) return Promise.resolve(null);
    var pdfy = [];
    return docs.reduce(function (p, d) { return p.then(function () { return zWorda(d).then(function (b) { pdfy.push(b); }); }); }, Promise.resolve()).then(function () {
      if (pdfy.some(function (b) { return !b; })) return null;
      if (pdfy.length === 1) return pdfy[0];
      PDFLib = PDFLib || root.PDFLib;
      if (!PDFLib) return null;
      return PDFLib.PDFDocument.create().then(function (wynik) {
        return pdfy.reduce(function (p, b) {
          return p.then(function () { return PDFLib.PDFDocument.load(b); }).then(function (src) {
            return wynik.copyPages(src, src.getPageIndices()).then(function (strony) { strony.forEach(function (s) { wynik.addPage(s); }); });
          });
        }, Promise.resolve()).then(function () { return wynik.save({ useObjectStreams: false }); }); // zwykłe obiekty: czytelne dla każdej przeglądarki PDF
      }).then(function (b) { return new Uint8Array(b); }, function (e) { if (root.console) root.console.warn("Sklejanie PDF: " + (e && e.message || e)); return null; });
    });
  }
  var api = { zWorda: zWorda, zWordow: zWordow, dostepny: dostepny };
  if (typeof module === "object" && module.exports) module.exports = api; else root.OESTWordPdf = api;
})(typeof window !== "undefined" ? window : globalThis);
