/* Moduł odczytu tekstu ze zdjęcia (OESTOdczyt): OCR na telefonie (ML Kit, offline), bez AI w chmurze.
   Nic nie trafia do pól bez stuknięcia — użytkownik wybiera linie albo liczby. */
(function (w) {
  'use strict';
  var UNIT = '(?:\\s?(?:mg\\/l|ppm|°c|°f|ph|bar|mbar|kpa|pa|hz|kw|kva|kwh|w|a|ma|v|kv|%|rpm|l\\/s|m3\\/h|m³\\/h|l\\/min|s|min|h))?';
  var NUM = new RegExp('(?:(?<![A-Za-z\\d.,])ph\\s?|(?<![A-Za-z\\d.,])(?<!\\d[eE][-+])(?<![A-Za-z][-+\u2212]))[-+]?\\d+(?:[.,]\\d+)?(?![.,]?\\d)' + UNIT.replace(')?', ')?(?![A-Za-z])'), 'gi');
  function available() { return !!(w.Capacitor && w.Capacitor.isNativePlatform && w.Capacitor.isNativePlatform() && w.Capacitor.Plugins && w.Capacitor.Plugins.OESTKeys); }
  // Zdjęcie → JPEG ≤ 2000 px (wtyczka przyjmuje do 4 Mpx)
  function prepare(blob) {
    return createImageBitmap(blob).then(function (bmp) {
      var s = Math.min(1, 2000 / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas');
      c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); if (bmp.close) bmp.close();
      return c.toDataURL('image/jpeg', 0.9).split(',')[1];
    });
  }
  function parse(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.replace(/\s+/g, ' ').replace(/[\u2212\u2012\u2013](?=\d)/g, '-').trim(); }).filter(Boolean), seen = {}, numbers = [];
    lines.forEach(function (l) { (l.match(NUM) || []).forEach(function (n) { n = n.trim(); if (/\d/.test(n) && !seen[n.toLowerCase()]) { seen[n.toLowerCase()] = 1; numbers.push(n); } }); });
    var uniq = {}; lines = lines.filter(function (l) { var k = l.toLowerCase(); if (uniq[k]) return false; uniq[k] = 1; return true; });
    return { text: lines.join('\n'), lines: lines, numbers: numbers };
  }
  function T(pl, en) { return w.OESTT ? w.OESTT(pl, en) : pl; }
  function read(blob) {
    if (!available()) return Promise.reject(Error(T('Odczyt tekstu działa w apce na telefonie.', 'Text reading works in the phone app.')));
    return prepare(blob).then(function (b64) { return w.Capacitor.Plugins.OESTKeys.recognize({ base64: b64 }); })
      .then(function (r) { return parse(r && r.text); }, function (e) { throw Error(T('Nie udało się odczytać: ', 'Could not read: ') + (e && e.message || e)); });
  }
  var css = false;
  function style() {
    if (css) return; css = true; var st = document.createElement('style');
    st.textContent = '.oest-ocr{position:fixed;inset:0;z-index:2147481000;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}.oest-ocr .sh{background:#14202a;color:#fff;width:100%;max-width:560px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));font:16px system-ui}.oest-ocr h3{margin:0 0 6px;font-size:19px}.oest-ocr .hint{opacity:.7;font-size:14px;margin:0 0 10px}.oest-ocr img{width:100%;max-height:28vh;object-fit:contain;border-radius:10px;background:#000}.oest-ocr .lbl{margin:14px 0 6px;font-size:13px;letter-spacing:.06em;opacity:.7;text-transform:uppercase}.oest-ocr .chips{display:flex;flex-wrap:wrap;gap:8px}.oest-ocr .chips button{border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.06);color:#fff;border-radius:12px;padding:10px 12px;font:600 16px system-ui;text-align:left;max-width:100%}.oest-ocr .chips button.on{background:#2e7d32;border-color:#2e7d32}.oest-ocr .num button{font-family:ui-monospace,monospace}.oest-ocr select{width:100%;padding:12px;border-radius:10px;font:16px system-ui;background:#0d161d;color:#fff;border:1px solid rgba(255,255,255,.3)}.oest-ocr .go{width:100%;margin-top:16px;padding:16px;border:0;border-radius:14px;background:#fff;color:#14202a;font:700 18px system-ui}';
    document.head.appendChild(st);
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
  /* pick(blob, {targets:[{label, el}]}) – arkusz z odczytem; stuknięcie linii/liczby wpisuje ją do wybranego pola.
     Zwraca Promise<liczba wpisanych>. */
  function pick(blob, opts) {
    style(); var targets = (opts && opts.targets || []).filter(function (t) { return t && t.el; });
    var o = document.createElement('div'), url = URL.createObjectURL(blob), used = 0; o.className = 'oest-ocr';
    var ttl = T('Odczyt ze zdjęcia', 'Read from photo');
    o.innerHTML = '<div class="sh" role="dialog" aria-label="' + ttl + '"><h3>🔍 ' + ttl + '</h3><p class="hint">' + T('Czytam tekst na telefonie…', 'Reading text on the phone…') + '</p><img alt="' + T('Zdjęcie', 'Photo') + '"><div class="body"></div><button type="button" class="go">' + T('Gotowe', 'Done') + '</button></div>';
    o.querySelector('img').src = url; document.body.appendChild(o);
    return new Promise(function (resolve) {
      function close() { URL.revokeObjectURL(url); o.remove(); resolve(used); }
      o.querySelector('.go').onclick = close; o.addEventListener('click', function (e) { if (e.target === o) close(); });
      read(blob).then(function (r) {
        var hint = o.querySelector('.hint'), body = o.querySelector('.body');
        if (!r.lines.length) { hint.textContent = T('Nie znalazłem tekstu. Zrób zdjęcie bliżej i prosto, bez odblasków.', 'No text found. Take the photo closer and straight, without glare.'); return; }
        hint.textContent = targets.length ? T('Stuknij to, co ma trafić do pola. Nic nie wpisuję samo.', 'Tap what should go into the field. Nothing is filled in automatically.') : T('Odczytany tekst.', 'Text read.');
        var h = '';
        if (targets.length > 1) h += '<div class="lbl">' + T('Wpisz do', 'Fill in') + '</div><select>' + targets.map(function (t, i) { return '<option value="' + i + '">' + esc(t.label) + '</option>'; }).join('') + '</select>';
        else if (targets.length) h += '<div class="lbl">' + T('Wpisz do: ', 'Fill in: ') + esc(targets[0].label) + '</div>';
        if (r.numbers.length) h += '<div class="lbl">' + T('Liczby', 'Numbers') + '</div><div class="chips num">' + r.numbers.map(function (n, i) { return '<button type="button" data-k="n' + i + '">' + esc(n) + '</button>'; }).join('') + '</div>';
        h += '<div class="lbl">' + T('Linie tekstu', 'Text lines') + '</div><div class="chips">' + r.lines.map(function (l, i) { return '<button type="button" data-k="l' + i + '">' + esc(l) + '</button>'; }).join('') + '</div>';
        body.innerHTML = h;
        body.querySelectorAll('[data-k]').forEach(function (b) {
          b.onclick = function () {
            if (!targets.length) return; var sel = body.querySelector('select'), t = targets[sel ? +sel.value : 0];
            var k = b.getAttribute('data-k'), v = k[0] === 'n' ? r.numbers[+k.slice(1)] : r.lines[+k.slice(1)];
            if (!put(t.el, v)) { o.querySelector('.hint').textContent = T('Do tego pola stuknij jedną liczbę (z sekcji Liczby).', 'For this field tap a single number (from Numbers).'); return; } used++; b.classList.add('on');
          };
        });
      }, function (e) { o.querySelector('.hint').textContent = e.message; });
    });
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  w.OESTOdczyt = { available: available, read: read, parse: parse, pick: pick, numberOf: numberOf };
})(window);
