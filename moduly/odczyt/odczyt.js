/* Moduł odczytu tekstu ze zdjęcia (OESTOdczyt): OCR na telefonie (ML Kit, offline), bez AI w chmurze.
   Nic nie trafia do pól bez stuknięcia — użytkownik wybiera linie albo liczby. Arkusz wyboru rysuje szkielet Ionic (OESTCzesci, czesci/OdczytArkusz.vue). */
(function (w) {
  'use strict';
  var UNIT = '(?:\\s?(?:mg\\/l|ppm|°c|°f|ph|bar|mbar|kpa|pa|hz|kw|kva|kwh|w|a|ma|v|kv|%|rpm|l\\/s|m3\\/h|m³\\/h|l\\/min|s|min|h))?';
  var NUM = new RegExp('(?:(?<![A-Za-z\\d.,])ph\\s?|(?<![A-Za-z\\d.,])(?<!\\d[eE][-+])(?<![A-Za-z][-+\u2212]))[-+]?\\d+(?:[.,]\\d+)?(?![.,]?\\d)' + UNIT.replace(')?', ')?(?![A-Za-z])'), 'gi');
  function available() { return !!(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform() && w.Capacitor.Plugins && w.Capacitor.Plugins.OESTKeys); }
  // Zdjęcie → JPEG ≤ 2000 px (wtyczka przyjmuje do 4 Mpx)
  function prepare(blob) {
    return w.OESTZdjecia.wczytaj(blob).then(function (bmp) { // wczytanie i zmniejszenie: moduly/zdjecia
      return w.OESTZdjecia.plotno(bmp, 2000).toDataURL('image/jpeg', 0.9).split(',')[1];
    });
  }
  function parse(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, ' ').replace(/[\u2212\u2012\u2013](?=\d)/g, '-').trim(); }).filter(Boolean), seen = {}, numbers = [];
    lines.forEach(function (l) { (l.match(NUM) || []).forEach(function (n) { n = n.trim(); if (/\d/.test(n) && !seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; numbers.push(n); } }); });
    var uniq = {}; lines = lines.filter(function (l) { var k = l.toLowerCase(); if (uniq[k]) return false; uniq[k] = 1; return true; });
    return { text: lines.join('\n'), lines: lines, numbers: numbers };
  }
  // jedyne miejsce w apce, które woła OCR telefonu (wtyczka OESTKeys.recognize) – Klucze, Power trace i pick()/read()
  function ocr(b64) { return w.Capacitor.Plugins.OESTKeys.recognize({ base64: b64 }); }
  /* tekst(canvas) – surowy tekst OCR z gotowego obrazu (bez zmiany rozmiaru i bez porządkowania linii), tak jak
     dotąd w Kluczach i Power trace; błąd wtyczki przechodzi bez zmian (ekran pokazuje go przez OESTBledy). */
  function tekst(canvas) {
    return Promise.resolve().then(function () { return ocr(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]); })
      .then(function (r) { return (r && r.text) || ''; });
  }
  function read(blob) {
    if (!available()) return Promise.reject(Error(w.OESTT('Odczyt tekstu działa w apce na telefonie.', 'Text reading works in the phone app.')));
    return prepare(blob).then(ocr)
      .then(function (r) { return parse(r && r.text); }, function (e) { throw Error(w.OESTT('Nie udało się odczytać: ', 'Could not read: ') + (e && e.message || e)); });
  }
  // pole liczbowe: dokładnie jedna liczba z tokenów parse() (bez cyfr z etykiet typu „Cl2”), przecinek → kropka; inaczej nic nie wpisuje
  function numberOf(v) { var n = parse(v).numbers; if (n.length !== 1) return null; var m = n[0].match(/[-+]?\d+(?:[.,]\d+)?/); return m ? m[0].replace(',', '.').replace(/^\+/, '') : null; }
  function put(el, v) {
    if (el.tagName === 'TEXTAREA') el.value = el.value ? el.value.replace(/\s+$/, '') + '\n' + v : v;
    else if (el.inputMode === 'decimal' || el.type === 'number') { var n = numberOf(v); if (n === null) return false; var was = el.value; el.value = n; if (el.value !== n) { el.value = was; return false; } }
    else el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  /* pick(blob, {targets:[{label, el}]}) – arkusz z odczytem (część OdczytArkusz.vue w okienku szkieletu); stuknięcie linii/liczby wpisuje ją
     do wybranego pola. Zwraca Promise<liczba wpisanych>. Kontroler: dane() → { url, podpowiedz, cele:[napis], cel, liczby:[{ k, tekst, wpisane }],
     linie:[…] }; akcja('cel', i) · ('wybierz', k). */
  function pick(blob, opts) {
    var targets = (opts && opts.targets || []).filter(function (t) { return t && t.el; });
    var url = URL.createObjectURL(blob), used = 0, r = null, cel = 0, on = {}, subs = [];
    var hint = w.OESTT('Czytam tekst na telefonie…', 'Reading text on the phone…');
    function dane() {
      var mk = function (p) { return function (t, i) { return { k: p + i, tekst: t, wpisane: !!on[p + i] }; }; };
      return { url: url, podpowiedz: hint, cele: targets.map(function (t) { return t.label; }), cel: cel,
        liczby: r ? r.numbers.map(mk('n')) : [], linie: r && r.lines.length ? r.lines.map(mk('l')) : [] };
    }
    function emit() { var d = dane(); subs.slice().forEach(function (f) { try { f(d); } catch (e) { console.error(e); } }); }
    var ctrl = { dane: dane, na: function (f) { subs.push(f); return function () { subs = subs.filter(function (x) { return x !== f; }); }; },
      akcja: function (a, x) {
        if (a === 'cel') { cel = Math.max(0, Math.min(targets.length - 1, +x || 0)); emit(); return; }
        if (a !== 'wybierz' || !r || !targets.length) return;
        var t = targets[targets.length > 1 ? cel : 0], v = x[0] === 'n' ? r.numbers[+x.slice(1)] : r.lines[+x.slice(1)];
        if (v == null) return;
        if (!put(t.el, v)) { hint = w.OESTT('Do tego pola stuknij jedną liczbę (z sekcji Liczby).', 'For this field tap a single number (from Numbers).'); emit(); return; }
        used++; on[x] = 1; emit();
      } };
    read(blob).then(function (x) {
      r = x;
      if (!r.lines.length) hint = w.OESTT('Nie znalazłem tekstu. Zrób zdjęcie bliżej i prosto, bez odblasków.', 'No text found. Take the photo closer and straight, without glare.');
      else hint = targets.length ? w.OESTT('Stuknij to, co ma trafić do pola. Nic nie wpisuję samo.', 'Tap what should go into the field. Nothing is filled in automatically.') : w.OESTT('Odczytany tekst.', 'Text read.');
      emit();
    }, function (e) { hint = e.message; emit(); });
    return w.OESTCzesci.okno('OdczytArkusz', ctrl, { tytul: w.OESTT('Odczyt ze zdjęcia', 'Read from photo'), ok: w.OESTT('Gotowe', 'Done'), anuluj: false })
      .then(function () { URL.revokeObjectURL(url); return used; });
  }
  w.OESTOdczyt = { available: available, tekst: tekst, read: read, parse: parse, pick: pick, numberOf: numberOf };
})(window);
