/* Dolny zapas przycisków (03/11, test Grzegorza): na Pixelu z przyciskami ◀●■ env() bywa 0, więc min. 44–56 px + zmienna od Capacitora.
 * Moduł aparatu (moduly/aparat) – JEDYNE miejsce, przez które apki OEST robią zdjęcia.
 *
 * Zdjęcie: aparat systemowy (wtyczka OESTKeys.capture) → podgląd „✓ OK / ✏️ Edytuj / ↺ Powtórz” →
 * gotowe zdjęcie. Edycja: własny prosty edytor w apce (strzałka, kółko, kwadrat, linia, kolor, grubość,
 * kadrowanie, cofnij). Decyzja Grzegorza 01/11/2026: edytory Google nie otwierają plików z wnętrza apki
 * („Editing is not supported for this image”), więc nie używamy OESTPhotoEdit. Działa offline, nic nie trafia do Galerii.
 *
 *   OESTAparat.take(opts?)  → Promise<Blob|null>   zdjęcie po podglądzie (null = anulowane)
 *     opts.max = dłuższy bok (px), w jakim zdjęcie i tak zostanie zapisane; aparat (Java) i edycja nie schodzą poniżej (bez = pełny)
 *     opts.prepare(blob) = wołane, gdy podgląd pokazuje zdjęcie (także po edycji): apka może je już zmniejszać w tle
 *   OESTAparat.available()           → true w apce Android
 *   OESTAparat.edit(blob, opts?) → Promise<Blob|null>   (null = bez zmian / anulowane; opts.max jak wyżej)
 *   OESTAparat.review(blob) → Promise<{blob}|{retake:true}|{cancel:true}>  podgląd po zdjęciu: OK / Edytuj / Powtórz (cancel = Wstecz telefonu)
 *   Wygląd (podgląd, edytor) rysuje szkielet Ionic + Vue (moduly/szkielet/src/czesci/Aparat.vue, EdytorZdjec.vue, OESTCzesci.pokaz);
 *   ten plik ma tylko logikę – bez HTML z kodu (bramka IONIC|modul-ui).
 */
(function (root) {
  'use strict';
  function TT(p) { return p ? root.OESTT(p[0], p[1]) : ''; } // para [pl, en] → tekst
  function plugin() { var C = root.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.OESTPhotoEdit; }
  /* ---------- edytor w apce (logika; wygląd: szkielet Ionic – moduly/szkielet/src/czesci/EdytorZdjec.vue) ---------- */
  var COLORS = ['#ff2d2d', '#ffd400', '#21d36b', '#2f8bff', '#ffffff', '#111111'];
  var WIDTHS = [{ k: 'S', v: 4 }, { k: 'M', v: 8 }, { k: 'L', v: 14 }]; // na 1000 px dłuższego boku
  // gotowe kółka: promień na 1000 px dłuższego boku; stuknięcie stawia kółko, przeciąganie przesuwa
  var RADII = { c1: 45, c2: 90, c3: 160 };
  // narzędzia w trzech grupach z podpisem pod grupą (lifting 07/11/2026: wszystko mieści się bez przewijania)
  var TOOL_GROUPS = [
    [['Rysuj', 'Draw'], [['arrow', ['Strzałka', 'Arrow']], ['line', ['Linia', 'Line']], ['rect', ['Kwadrat', 'Square']]]],
    [['Kółko', 'Circle'], [['c1', ['Małe kółko', 'Small circle']], ['c2', ['Średnie kółko', 'Medium circle']], ['c3', ['Duże kółko', 'Large circle']]]],
    [['Kadruj', 'Crop'], [['crop', ['Kadruj', 'Crop']]]]];
  function UI() { if (!root.OESTCzesci) throw Error(root.OESTT('Brak szkieletu apki (moduly/szkielet).', 'App skeleton missing (moduly/szkielet).')); return root.OESTCzesci; }
  // kontroler dla części Vue: dane() → zwykły obiekt, na(fn) → wyłącz; fn dostaje dane() po każdej zmianie
  function sluchacze(dane) { var subs = []; return { na: function (fn) { subs.push(fn); return function () { subs = subs.filter(function (f) { return f !== fn; }); }; }, emit: function () { var x = dane(); subs.slice().forEach(function (f) { try { f(x); } catch (e) { console.error(e); } }); } }; }

  /* Rysuje jeden kształt na kontekście g; k = skala z „współrzędnych zdjęcia” do pikseli płótna. */
  function drawShape(g, sh, k) {
    var x1 = sh.x1 * k, y1 = sh.y1 * k, x2 = sh.x2 * k, y2 = sh.y2 * k, w = sh.w * k;
    g.save(); g.strokeStyle = g.fillStyle = sh.c; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    if (sh.t === 'rect') g.rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
    else if (sh.t === 'circle') g.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.max(1, Math.abs(x2 - x1) / 2), Math.max(1, Math.abs(y2 - y1) / 2), 0, 0, Math.PI * 2);
    else { g.moveTo(x1, y1); g.lineTo(x2, y2); }
    g.stroke();
    if (sh.t === 'arrow') { // grot
      var a = Math.atan2(y2 - y1, x2 - x1), h = Math.max(w * 3.5, 12 * k);
      g.beginPath(); g.moveTo(x2, y2);
      g.lineTo(x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45));
      g.lineTo(x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45));
      g.closePath(); g.fill();
    }
    g.restore();
  }
  function normCrop(c, W, H) {
    if (!c) return null;
    var x = Math.max(0, Math.min(c.x1, c.x2)), y = Math.max(0, Math.min(c.y1, c.y2));
    var w = Math.min(W, Math.max(c.x1, c.x2)) - x, h = Math.min(H, Math.max(c.y1, c.y2)) - y;
    return w > 20 && h > 20 ? { x: x, y: y, w: w, h: h } : null;
  }
  /* Gotowe zdjęcie: zdjęcie + kształty, potem kadr. max (px, dłuższy bok) > 0 = od razu w rozmiarze, w jakim moduł zdjęć je zapisze
     (audyt wydajności 07/11/2026: bez pełnego płótna 12 MP i bez JPEG 12 MP, który i tak zaraz się zmniejsza). Bez max – jak dawniej. */
  function renderFinal(bmp, shapes, crop, max) {
    var W = bmp.width, H = bmp.height, c = normCrop(crop, W, H) || { x: 0, y: 0, w: W, h: H };
    var k = max > 0 ? Math.min(1, max / Math.max(c.w, c.h)) : 1;
    if (k < 1) {
      var out = UI().plotno(c.w * k, c.h * k); // płótno w pamięci daje szkielet (moduł nie tworzy elementów)
      var o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.scale(k, k); o.translate(-c.x, -c.y); o.drawImage(bmp, 0, 0);
      shapes.forEach(function (sh) { drawShape(o, sh, 1); });
      return new Promise(function (ok) { out.toBlob(ok, 'image/jpeg', 0.9); });
    }
    var full = UI().plotno(W, H);
    var g = full.getContext('2d'); g.drawImage(bmp, 0, 0); shapes.forEach(function (sh) { drawShape(g, sh, 1); });
    var cc = normCrop(crop, W, H), res = full;
    if (cc) { res = UI().plotno(cc.w, cc.h); res.getContext('2d').drawImage(full, cc.x, cc.y, cc.w, cc.h, 0, 0, res.width, res.height); }
    return new Promise(function (ok) { res.toBlob(ok, 'image/jpeg', 0.9); });
  }

  /* Edytor: kontroler dla części EdytorZdjec.vue. Logika rysowania, Cofnij, Zapisz i kadrowania bez zmian (dawniej w tej funkcji z HTML-em).
     dane() → { narzedzie, kolor, grubosc, zapisuje, koniec, grupy:[{ podpis, narzedzia:[{ k, etykieta }] }], kolory:[hex], grubosci:[{ k, v }] }
     akcja('plotno', canvas, scena) · ('narzedzie', k) · ('kolor', hex) · ('grubosc', v) · ('cofnij') · ('anuluj') · ('zapisz'); zamknij() = Wstecz */
  function editor(blob, opts) {
    var max = opts && opts.max > 0 ? opts.max : 0;
    return createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(blob); }).then(function (bmp) {
      return new Promise(function (done) {
        var W = bmp.width, H = bmp.height, unit = Math.max(W, H) / 1000;
        var st = { tool: 'arrow', color: COLORS[0], width: WIDTHS[1].v }, shapes = [], crop = null, cur = null, zapisuje = false, koniec = false;
        var cv = null, g = null, stage = null, k = 1;
        function dane() {
          return { narzedzie: st.tool, kolor: st.color, grubosc: st.width, zapisuje: zapisuje, koniec: koniec,
            grupy: TOOL_GROUPS.map(function (gr) { return { podpis: TT(gr[0]), narzedzia: gr[1].map(function (t) { return { k: t[0], etykieta: TT(t[1]) }; }) }; }),
            kolory: COLORS.slice(), grubosci: WIDTHS.map(function (w) { return { k: w.k, v: w.v, etykieta: root.OESTT('Grubość', 'Width') + ' ' + w.k }; }), etykietaKoloru: root.OESTT('Kolor', 'Colour') };
        }
        var S = sluchacze(dane);
        function fit() {
          if (!cv || !stage) return;
          var r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          var s = Math.min((r.width - 12) / W, (r.height - 12) / H, 1);
          var cw = Math.round(W * s), ch = Math.round(H * s);
          cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
          cv.style.display = 'block'; cv.style.touchAction = 'none'; cv.style.margin = Math.max(0, Math.round((r.height - ch) / 2)) + 'px auto 0'; // zdjęcie na środku sceny
          cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr); k = cv.width / W; draw();
        }
        function draw() {
          if (!g) return;
          g.clearRect(0, 0, cv.width, cv.height); g.drawImage(bmp, 0, 0, cv.width, cv.height);
          shapes.concat(cur && cur.t !== 'crop' ? [cur] : []).forEach(function (sh) { drawShape(g, sh, k); });
          var c = normCrop(cur && cur.t === 'crop' ? cur : crop, W, H);
          if (c) { // przyciemnienie poza kadrem
            g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.rect(c.x * k, c.y * k, c.w * k, c.h * k); g.fill('evenodd');
            g.strokeStyle = '#fff'; g.setLineDash([8, 6]); g.lineWidth = 2; g.strokeRect(c.x * k, c.y * k, c.w * k, c.h * k); g.restore();
          }
        }
        function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
        var drag = null;
        // kółko pod palcem: przy narzędziu kółka całe wnętrze, przy innych tylko obwódka
        function hitCircle(p) {
          var inside = !!RADII[st.tool];
          for (var i = shapes.length - 1; i >= 0; i--) {
            var sh = shapes[i]; if (sh.t !== 'circle') continue;
            var r = Math.abs(sh.x2 - sh.x1) / 2, d = Math.hypot(p.x - (sh.x1 + sh.x2) / 2, p.y - (sh.y1 + sh.y2) / 2);
            if (inside ? d < r + 25 * unit : Math.abs(d - r) < Math.max(25 * unit, sh.w)) return sh;
          }
          return null;
        }
        function down(e) {
          e.preventDefault(); cv.setPointerCapture(e.pointerId); var p = pt(e), hit = st.tool === 'crop' ? null : hitCircle(p);
          if (!hit && RADII[st.tool]) { // nowe gotowe kółko w miejscu stuknięcia
            var R = RADII[st.tool] * unit;
            hit = { t: 'circle', c: st.color, w: st.width * unit, x1: p.x - R, y1: p.y - R, x2: p.x + R, y2: p.y + R }; shapes.push(hit);
            drag = { s: hit, x: p.x, y: p.y, ox: hit.x1, oy: hit.y1, fresh: true }; draw(); return;
          }
          if (hit) { drag = { s: hit, x: p.x, y: p.y, ox: hit.x1, oy: hit.y1 }; return; }
          cur = { t: st.tool, c: st.color, w: st.width * unit, x1: p.x, y1: p.y, x2: p.x, y2: p.y }; draw();
        }
        function move(e) {
          var p = pt(e);
          if (drag) { var s = drag.s, wd = s.x2 - s.x1, ht = s.y2 - s.y1; s.x1 = drag.ox + p.x - drag.x; s.y1 = drag.oy + p.y - drag.y; s.x2 = s.x1 + wd; s.y2 = s.y1 + ht; draw(); return; }
          if (!cur) return; cur.x2 = p.x; cur.y2 = p.y; draw();
        }
        function end() {
          if (drag) { // przesunięcie zapisane do „Cofnij”
            var dx = drag.s.x1 - drag.ox, dy = drag.s.y1 - drag.oy;
            if (!drag.fresh && (dx || dy)) shapes.push({ t: 'move', s: drag.s, dx: dx, dy: dy });
            drag = null; draw(); return;
          }
          if (!cur) return;
          var big = Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) > 10 * unit;
          if (cur.t === 'crop') { if (normCrop(cur, W, H)) { crop = cur; shapes.push({ t: 'crop-mark', prev: shapes.length }); } }
          else if (big) shapes.push(cur);
          cur = null; draw();
        }
        function cancelPtr() { if (drag) return end(); cur = null; draw(); }
        function realShapes() { return shapes.filter(function (s) { return s.t !== 'crop-mark' && s.t !== 'move'; }); }
        function close(r) {
          if (koniec) return; koniec = true; window.removeEventListener('resize', fit);
          if (cv) { cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', end); cv.removeEventListener('pointercancel', cancelPtr); }
          if (bmp.close) bmp.close(); S.emit(); done(r);
        }
        // zapamiętaj kadr w znaczniku, żeby „Cofnij” mógł wrócić do poprzedniego
        var push = shapes.push; shapes.push = function (s) { if (s.t === 'crop-mark') s.crop = crop; return push.call(shapes, s); };
        var ctrl = {
          dane: dane, na: S.na,
          // Wstecz telefonu / zmiana ekranu = zamknij edytor bez zmian, wraca do podglądu zdjęcia
          zamknij: function () { close(null); },
          dopasuj: function () { fit(); }, // okno już na ekranie (po animacji): zdjęcie na całą scenę
          akcja: function (a, x, y) {
            if (koniec) return;
            if (a === 'plotno') { // część Vue podaje płótno i scenę (miejsce na zdjęcie)
              cv = x; stage = y; g = cv.getContext('2d');
              cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', cancelPtr);
              fit(); window.addEventListener('resize', fit); return;
            }
            if (a === 'dopasuj') return fit();
            if (a === 'narzedzie') st.tool = x;
            else if (a === 'kolor') st.color = x;
            else if (a === 'grubosc') st.width = +x;
            else if (a === 'cofnij') {
              var last = shapes.pop();
              if (last && last.t === 'move') { last.s.x1 -= last.dx; last.s.x2 -= last.dx; last.s.y1 -= last.dy; last.s.y2 -= last.dy; }
              if (last && last.t === 'crop-mark') { // cofnięcie kadru: poprzedni kadr albo brak
                var prev = null; for (var i = shapes.length - 1; i >= 0; i--) if (shapes[i].t === 'crop-mark') { prev = shapes[i].crop; break; }
                crop = prev;
              }
              draw();
            } else if (a === 'anuluj') return close(null);
            else if (a === 'zapisz') {
              if (zapisuje) return;
              if (!realShapes().length && !normCrop(crop, W, H)) return close(null);
              zapisuje = true; S.emit();
              return renderFinal(bmp, realShapes(), crop, max).then(function (out) { close(out || null); }, function () { close(null); });
            }
            S.emit();
          }
        };
        UI().pokaz('EdytorZdjec', ctrl);
      });
    });
  }

  var api = {
    available: function () { return !!plugin(); },
    // Edycja: własny edytor w apce (działa też w przeglądarce). null = bez zmian / anulowane.
    edit: function (blob, opts) { return editor(blob, opts); },
    _drawShape: drawShape, _normCrop: normCrop,
    take: function (opts) {
      var C = root.Capacitor, cam = C && C.Plugins && C.Plugins.OESTKeys;
      if (!api.available() || !cam) return Promise.reject(new Error(root.OESTT('Aparat działa w aplikacji na telefonie.', 'The camera works in the phone app.')));
      function shot() {
        // Audyt zdjęć, punkt 2 (zgoda Grzegorza 09/11/2026): Java zmniejsza 12 MP już przy odczycie z aparatu (dekodowanie 1/2, 1/4…),
        // ale nigdy poniżej opts.max – do WebView idzie ok. 0,5 MB zamiast 1,3–6 MB. Data i obrót z EXIF zostają. Bez opts.max: pełne zdjęcie.
        var max = opts && opts.max > 0 ? Math.round(opts.max) : 0;
        return cam.capture(max ? { max: max } : {}).then(function (r) {
          return fetch(C.convertFileSrc(r.path)).then(function (res) { if (!res.ok) throw new Error(root.OESTT('Nie udało się odczytać zdjęcia.', 'Could not read the photo.')); return res.blob(); })
            .then(function (b) { return cam.release({ path: r.path }).catch(function () {}).then(function () { return b; }); },
              function (e) { return cam.release({ path: r.path }).catch(function () {}).then(function () { throw e; }); });
        }, function (e) { if (/CANCELLED/.test(String(e && e.message || e))) return null; throw e; });
      }
      function loop() { return shot().then(function (b) { if (!b) return null; return api.review(b, opts).then(function (r) { return r.retake ? loop() : r.cancel ? null : r.blob; }); }); }
      return loop();
    },
    /* Podgląd po zdjęciu: duże zdjęcie + „OK”, „Edytuj”, „Powtórz” (wygląd: szkielet Ionic – moduly/szkielet/src/czesci/Aparat.vue).
       review(blob) → Promise<{blob}|{retake:true}|{cancel:true}>; Edytuj otwiera edytor w apce i wraca do podglądu.
       Kontroler: dane() → { url, komunikat, zajety, koniec }; akcja('ok' | 'retake' | 'edit'); zamknij() = Wstecz telefonu (cancel). */
    review: function (blob, opts) {
      return new Promise(function (done) {
        var cur = blob, url = '', msg = '', busy = false, koniec = false;
        function dane() { return { url: url, komunikat: msg, zajety: busy, koniec: koniec }; }
        var S = sluchacze(dane);
        function show() { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(cur); if (opts && typeof opts.prepare === 'function') try { opts.prepare(cur); } catch (_) {} S.emit(); }
        function close(r) { if (koniec) return; koniec = true; if (url) URL.revokeObjectURL(url); S.emit(); done(r); }
        var ctrl = {
          dane: dane, na: S.na,
          // Wstecz telefonu (stos okienek moduly/szkielet) = zamknij podgląd bez dodania zdjęcia, zostajesz w tej samej inspekcji
          zajety: function () { return busy; },
          zamknij: function () { close({ cancel: true }); },
          akcja: function (r) {
            if (busy || koniec) return;
            if (r === 'ok') close({ blob: cur });
            else if (r === 'retake') close({ retake: true });
            else if (r === 'edit') {
              busy = true; msg = ''; S.emit();
              api.edit(cur, opts).then(function (nb) { if (nb) { cur = nb; show(); } msg = nb ? root.OESTT('Zapisano zmiany.', 'Changes saved.') : ''; }, function (e) { msg = e.message; })
                .then(function () { busy = false; S.emit(); });
            }
          }
        };
        show(); UI().pokaz('Aparat', ctrl);
      });
    }
  };
  root.OESTAparat = api;
})(typeof window !== 'undefined' ? window : globalThis);
