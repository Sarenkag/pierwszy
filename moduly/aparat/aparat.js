/* Dolny zapas przycisków (03/11, test Grzegorza): na Pixelu z przyciskami ◀●■ env() bywa 0, więc min. 44–56 px + zmienna od Capacitora.
 * Moduł aparatu (moduly/aparat) – JEDYNE miejsce, przez które apki OEST robią zdjęcia.
 *
 * Zdjęcie: aparat systemowy (wtyczka OESTKeys.capture) → podgląd „✓ OK / ✏️ Edytuj / ↺ Powtórz” →
 * gotowe zdjęcie. Edycja: własny prosty edytor w apce (strzałka, kółko, kwadrat, linia, kolor, grubość,
 * kadrowanie, cofnij). Decyzja Grzegorza 01/11/2026: edytory Google nie otwierają plików z wnętrza apki
 * („Editing is not supported for this image”), więc nie używamy OESTPhotoEdit. Działa offline, nic nie trafia do Galerii.
 *
 *   OESTAparat.take(opts?)  → Promise<Blob|null>   zdjęcie po podglądzie (null = anulowane)
 *     opts.max = dłuższy bok (px), w jakim zdjęcie i tak zostanie zapisane; edycja zapisze je od razu w tym rozmiarze (bez = pełny)
 *     opts.prepare(blob) = wołane, gdy podgląd pokazuje zdjęcie (także po edycji): apka może je już zmniejszać w tle
 *   OESTAparat.available()           → true w apce Android
 *   OESTAparat.edit(blob, opts?) → Promise<Blob|null>   (null = bez zmian / anulowane; opts.max jak wyżej)
 *   OESTAparat.review(blob) → Promise<{blob}|{retake:true}>  podgląd po zdjęciu: OK / Edytuj / Powtórz
 *   OESTAparat.button(label?)        → gotowy <button> „✏️ Edytuj” do wstawienia pod zdjęciem
 */
(function (root) {
  'use strict';
  function T(pl, en) { return root.OESTT ? root.OESTT(pl, en) : pl; }
  function TT(p) { return p ? T(p[0], p[1]) : ''; } // para [pl, en] → tekst
  function plugin() { var C = root.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.OESTPhotoEdit; }
  /* ---------- edytor w apce ---------- */
  var COLORS = ['#ff2d2d', '#ffd400', '#21d36b', '#2f8bff', '#ffffff', '#111111'];
  var WIDTHS = [{ k: 'S', v: 4 }, { k: 'M', v: 8 }, { k: 'L', v: 14 }]; // na 1000 px dłuższego boku
  // gotowe kółka: promień na 1000 px dłuższego boku; stuknięcie stawia kółko, przeciąganie przesuwa
  var RADII = { c1: 45, c2: 90, c3: 160 };
  // narzędzia w trzech grupach z podpisem pod grupą (lifting 07/11/2026: wszystko mieści się bez przewijania)
  var TOOL_GROUPS = [
    [['Rysuj', 'Draw'], [['arrow', '↗', ['Strzałka', 'Arrow']], ['line', '／', ['Linia', 'Line']], ['rect', '▢', ['Kwadrat', 'Square']]]],
    [['Kółko', 'Circle'], [['c1', '<span style="font-size:calc(var(--ed-w) * .25)">◯</span>', ['Małe kółko', 'Small circle']], ['c2', '<span style="font-size:calc(var(--ed-w) * .36)">◯</span>', ['Średnie kółko', 'Medium circle']], ['c3', '<span style="font-size:calc(var(--ed-w) * .5)">◯</span>', ['Duże kółko', 'Large circle']]]],
    [['Kadruj', 'Crop'], [['crop', '⛶', ['Kadruj', 'Crop']]]]];
  /* Szerokość przycisków (--ed-w) zwęża się płynnie na wąskich ekranach / przy większym rozmiarze wyświetlania, żeby oba rzędy
     mieściły się bez zawijania i przewijania (360 px i mniej); wysokość dotyku zostaje 44 px.
     Wygląd edytora (lifting 07/11/2026, styl „Szkło i poświata”): tylko tokeny z theme.css i moduly/wyglad (z wartościami zapasowymi).
     Anuluj = tekst, Cofnij = szkło z ramką, Zapisz = gradient z poświatą; aktywne narzędzie = przygaszony akcent + ramka + poświata. */
  var CSS =
    '.oest-editor{--ed-w:clamp(30px, calc((100vw - 100px) / 7), 44px);position:fixed;inset:0;z-index:2147483001;display:flex;flex-direction:column;touch-action:none;user-select:none;background:var(--bg,#0a0e1f);color:var(--ink,#eef1ff);font-family:var(--font-body,system-ui)}' +
    '.oest-editor button{-webkit-tap-highlight-color:transparent;cursor:pointer}' +
    '.oest-editor .ed-top{display:flex;gap:8px;align-items:center;padding:max(44px, calc(10px + var(--oest-gora,env(safe-area-inset-top,0px)))) 12px 8px}' +
    '.oest-editor .ed-b{min-height:44px;border-radius:var(--r-btn,14px);padding:0 16px;font:600 var(--fs-m,15px) var(--font-body,system-ui);color:var(--ink,#eef1ff);box-sizing:border-box}' +
    '.oest-editor .ed-ghost{background:transparent;border:1px solid transparent;color:var(--muted,#9aa3cc)}' +
    '.oest-editor .ed-sec{background:var(--panel,rgba(255,255,255,.06));border:1px solid var(--line,rgba(255,255,255,.12))}' +
    '.oest-editor .ed-main{background:var(--grad,linear-gradient(90deg,#5b7cff,#a35bff));border:1px solid transparent;color:#fff;font-weight:700;padding:0 20px;box-shadow:0 4px 18px rgba(124,132,255,.35)}' +
    '.oest-editor .ed-stage{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px}' +
    '.oest-editor canvas{border-radius:10px}' +
    '.oest-editor .ed-panel{margin:6px 12px max(44px, calc(14px + env(safe-area-inset-bottom, 0px)), calc(14px + var(--safe-area-inset-bottom, 0px)));padding:10px 10px 12px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:var(--r-panel,18px);background:rgba(255,255,255,.04)}' +
    '.oest-editor .ed-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;min-width:0}' +
    '.oest-editor .ed-grp{display:flex;flex-direction:column;align-items:center;gap:4px}' +
    '.oest-editor .ed-grp>small{font-size:var(--fs-xs,12px);color:var(--muted,#9aa3cc);font-weight:600}' +
    '.oest-editor .ed-seg{display:flex;gap:2px;padding:3px;border-radius:var(--r-btn,14px);background:rgba(255,255,255,.05);border:1px solid var(--line,rgba(255,255,255,.12))}' +
    '.oest-editor .ed-tool{width:var(--ed-w);height:44px;display:grid;place-items:center;border-radius:11px;border:1px solid transparent;background:transparent;color:var(--steel,#b9c2f0);font:600 18px var(--font-body,system-ui);padding:0;line-height:1}' +
    '.oest-editor .ed-tool.on{background:rgba(124,132,255,.18);border-color:rgba(124,132,255,.55);color:#fff;box-shadow:0 0 14px rgba(124,132,255,.30)}' +
    '.oest-editor .ed-sep{height:1px;background:var(--line,rgba(255,255,255,.12));margin:10px 2px}' +
    '.oest-editor .ed-style{align-items:center}' +
    '.oest-editor .ed-colors{display:flex;gap:2px}' +
    '.oest-editor .ed-col{width:calc(var(--ed-w) * .78);height:44px;display:grid;place-items:center;border:0;background:transparent;padding:0}' +
    '.oest-editor .ed-col i{width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);transition:transform var(--ruch-stan-czas,.24s) var(--ruch-easing,ease),box-shadow var(--ruch-stan-czas,.24s)}' +
    '.oest-editor .ed-col.on i{transform:scale(1.08);box-shadow:0 0 0 2px var(--bg,#0a0e1f),0 0 0 4px #fff}' +
    '.oest-editor .ed-widths .ed-tool{width:calc(var(--ed-w) * .78)}' +
    '.oest-editor .ed-widths i{border-radius:50%;background:var(--steel,#b9c2f0);transition:background-color var(--ruch-stan-czas,.24s)}' +
    '.oest-editor .ed-widths .on i{background:var(--dot,#fff)}';
  function css() {
    if (document.getElementById('oest-aparat-css')) return;
    var s = document.createElement('style'); s.id = 'oest-aparat-css'; s.textContent = CSS; document.head.appendChild(s);
  }

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
      var out = document.createElement('canvas'); out.width = Math.max(1, Math.round(c.w * k)); out.height = Math.max(1, Math.round(c.h * k));
      var o = out.getContext('2d'); o.imageSmoothingQuality = 'high'; o.scale(k, k); o.translate(-c.x, -c.y); o.drawImage(bmp, 0, 0);
      shapes.forEach(function (sh) { drawShape(o, sh, 1); });
      return new Promise(function (ok) { out.toBlob(ok, 'image/jpeg', 0.9); });
    }
    var full = document.createElement('canvas'); full.width = W; full.height = H;
    var g = full.getContext('2d'); g.drawImage(bmp, 0, 0); shapes.forEach(function (sh) { drawShape(g, sh, 1); });
    var cc = normCrop(crop, W, H), res = full;
    if (cc) { res = document.createElement('canvas'); res.width = Math.round(cc.w); res.height = Math.round(cc.h); res.getContext('2d').drawImage(full, cc.x, cc.y, cc.w, cc.h, 0, 0, res.width, res.height); }
    return new Promise(function (ok) { res.toBlob(ok, 'image/jpeg', 0.9); });
  }

  function editor(blob, opts) {
    var max = opts && opts.max > 0 ? opts.max : 0;
    return createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(blob); }).then(function (bmp) {
      return new Promise(function (done) {
        var W = bmp.width, H = bmp.height, unit = Math.max(W, H) / 1000;
        var st = { tool: 'arrow', color: COLORS[0], width: WIDTHS[1].v }, shapes = [], crop = null, cur = null;
        css();
        var box = document.createElement('div'); box.className = 'oest-editor';
        box.innerHTML =
          '<div class="ed-top"><button type="button" class="ed-b ed-ghost" data-a="cancel">' + T('Anuluj', 'Cancel') + '</button><span style="flex:1"></span>' +
          '<button type="button" class="ed-b ed-sec" data-a="undo">' + T('↶ Cofnij', '↶ Undo') + '</button><button type="button" class="ed-b ed-main" data-a="save">' + T('✓ Zapisz', '✓ Save') + '</button></div>' +
          '<div class="ed-stage"><canvas style="touch-action:none;max-width:100%;max-height:100%"></canvas></div>' +
          '<div class="ed-panel"><div class="ed-row ed-tools">' + TOOL_GROUPS.map(function (gr) {
            return '<div class="ed-grp"><div class="ed-seg">' + gr[1].map(function (t) { return '<button type="button" class="ed-tool" data-t="' + t[0] + '" aria-label="' + TT(t[2]) + '">' + t[1] + '</button>'; }).join('') + '</div><small>' + TT(gr[0]) + '</small></div>';
          }).join('') + '</div><div class="ed-sep"></div>' +
          '<div class="ed-row ed-style"><div class="ed-colors">' + COLORS.map(function (c) { return '<button type="button" class="ed-col" data-c="' + c + '" aria-label="' + T('Kolor', 'Colour') + '"><i style="background:' + c + '"></i></button>'; }).join('') + '</div>' +
          '<div class="ed-seg ed-widths">' + WIDTHS.map(function (w) { return '<button type="button" class="ed-tool" data-w="' + w.v + '" aria-label="' + T('Grubość', 'Width') + ' ' + w.k + '"><i style="width:' + (w.v + 2) + 'px;height:' + (w.v + 2) + 'px"></i></button>'; }).join('') + '</div></div></div>';
        var cv = box.querySelector('canvas'), g = cv.getContext('2d'), stage = box.querySelector('.ed-stage'), k = 1;
        function fit() {
          var r = stage.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          var s = Math.min((r.width - 12) / W, (r.height - 12) / H, 1);
          cv.style.width = Math.round(W * s) + 'px'; cv.style.height = Math.round(H * s) + 'px';
          cv.width = Math.round(W * s * dpr); cv.height = Math.round(H * s * dpr); k = cv.width / W; draw();
        }
        function draw() {
          g.clearRect(0, 0, cv.width, cv.height); g.drawImage(bmp, 0, 0, cv.width, cv.height);
          shapes.concat(cur && cur.t !== 'crop' ? [cur] : []).forEach(function (sh) { drawShape(g, sh, k); });
          var c = normCrop(cur && cur.t === 'crop' ? cur : crop, W, H);
          if (c) { // przyciemnienie poza kadrem
            g.save(); g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.rect(0, 0, cv.width, cv.height); g.rect(c.x * k, c.y * k, c.w * k, c.h * k); g.fill('evenodd');
            g.strokeStyle = '#fff'; g.setLineDash([8, 6]); g.lineWidth = 2; g.strokeRect(c.x * k, c.y * k, c.w * k, c.h * k); g.restore();
          }
        }
        function mark() { // stan aktywny przez klasę .on (wygląd w CSS modułu)
          box.querySelectorAll('[data-t]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === st.tool); });
          box.querySelectorAll('[data-c]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-c') === st.color); });
          box.querySelectorAll('[data-w]').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-w') === st.width); b.style.setProperty('--dot', st.color); });
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
        cv.addEventListener('pointerdown', function (e) {
          e.preventDefault(); cv.setPointerCapture(e.pointerId); var p = pt(e), hit = st.tool === 'crop' ? null : hitCircle(p);
          if (!hit && RADII[st.tool]) { // nowe gotowe kółko w miejscu stuknięcia
            var R = RADII[st.tool] * unit;
            hit = { t: 'circle', c: st.color, w: st.width * unit, x1: p.x - R, y1: p.y - R, x2: p.x + R, y2: p.y + R }; shapes.push(hit);
            drag = { s: hit, x: p.x, y: p.y, ox: hit.x1, oy: hit.y1, fresh: true }; draw(); return;
          }
          if (hit) { drag = { s: hit, x: p.x, y: p.y, ox: hit.x1, oy: hit.y1 }; return; }
          cur = { t: st.tool, c: st.color, w: st.width * unit, x1: p.x, y1: p.y, x2: p.x, y2: p.y }; draw();
        });
        cv.addEventListener('pointermove', function (e) {
          var p = pt(e);
          if (drag) { var s = drag.s, wd = s.x2 - s.x1, ht = s.y2 - s.y1; s.x1 = drag.ox + p.x - drag.x; s.y1 = drag.oy + p.y - drag.y; s.x2 = s.x1 + wd; s.y2 = s.y1 + ht; draw(); return; }
          if (!cur) return; cur.x2 = p.x; cur.y2 = p.y; draw();
        });
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
        cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', function () { if (drag) return end(); cur = null; draw(); });
        function realShapes() { return shapes.filter(function (s) { return s.t !== 'crop-mark' && s.t !== 'move'; }); }
        function close(r) { window.removeEventListener('resize', fit); box.remove(); if (bmp.close) bmp.close(); done(r); }
        box.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          if (b.hasAttribute('data-t')) st.tool = b.getAttribute('data-t');
          else if (b.hasAttribute('data-c')) st.color = b.getAttribute('data-c');
          else if (b.hasAttribute('data-w')) st.width = +b.getAttribute('data-w');
          else if (b.getAttribute('data-a') === 'undo') {
            var last = shapes.pop();
            if (last && last.t === 'move') { last.s.x1 -= last.dx; last.s.x2 -= last.dx; last.s.y1 -= last.dy; last.s.y2 -= last.dy; }
            if (last && last.t === 'crop-mark') { // cofnięcie kadru: poprzedni kadr albo brak
              var prev = null; for (var i = shapes.length - 1; i >= 0; i--) if (shapes[i].t === 'crop-mark') { prev = shapes[i].crop; break; }
              crop = prev;
            }
            draw();
          } else if (b.getAttribute('data-a') === 'cancel') return close(null);
          else if (b.getAttribute('data-a') === 'save') {
            if (!realShapes().length && !normCrop(crop, W, H)) return close(null);
            b.disabled = true; b.innerHTML = (root.OESTLadowanie ? root.OESTLadowanie.ring() + ' ' : '') + T('Zapisuję…', 'Saving…');
            return renderFinal(bmp, realShapes(), crop, max).then(function (out) { close(out || null); }, function () { close(null); });
          }
          mark();
        });
        // zapamiętaj kadr w znaczniku, żeby „Cofnij” mógł wrócić do poprzedniego
        var push = shapes.push; shapes.push = function (s) { if (s.t === 'crop-mark') s.crop = crop; return push.call(shapes, s); };
        document.body.appendChild(box); mark(); fit(); window.addEventListener('resize', fit);
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
      if (!api.available() || !cam) return Promise.reject(new Error(T('Aparat działa w aplikacji na telefonie.', 'The camera works in the phone app.')));
      function shot() {
        return cam.capture().then(function (r) {
          return fetch(C.convertFileSrc(r.path)).then(function (res) { if (!res.ok) throw new Error(T('Nie udało się odczytać zdjęcia.', 'Could not read the photo.')); return res.blob(); })
            .then(function (b) { return cam.release({ path: r.path }).catch(function () {}).then(function () { return b; }); },
              function (e) { return cam.release({ path: r.path }).catch(function () {}).then(function () { throw e; }); });
        }, function (e) { if (/CANCELLED/.test(String(e && e.message || e))) return null; throw e; });
      }
      function loop() { return shot().then(function (b) { if (!b) return null; return api.review(b, opts).then(function (r) { return r.retake ? loop() : r.blob; }); }); }
      return loop();
    },
    /* Podgląd po zdjęciu: duże zdjęcie + „✓ OK”, „✏️ Edytuj”, „↺ Powtórz”.
       review(blob) → Promise<{blob}|{retake:true}>; Edytuj otwiera edytor z telefonu i wraca do podglądu. */
    review: function (blob, opts) {
      return new Promise(function (done) {
        var cur = blob, url = '', box = document.createElement('div');
        box.className = 'oest-review';
        box.setAttribute('style', 'position:fixed;inset:0;z-index:2147483000;background:#05070c;display:flex;flex-direction:column');
        box.innerHTML = '<div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:max(44px, calc(8px + var(--oest-gora,env(safe-area-inset-top,0px)))) 8px 8px"><img alt="' + T('Podgląd zdjęcia', 'Photo preview') + '" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px"></div>' +
          '<p class="oest-review-msg" role="status" style="margin:0;padding:0 16px;color:#f3c76b;font:500 14px system-ui;min-height:18px"></p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:12px 16px max(56px, calc(16px + env(safe-area-inset-bottom, 0px)), calc(16px + var(--safe-area-inset-bottom, 0px)))">' +
          '<button type="button" data-r="retake" style="min-height:56px;border-radius:14px;border:1px solid #3a4152;background:#151a22;color:#fff;font:600 16px system-ui">' + T('↺ Powtórz', '↺ Retake') + '</button>' +
          '<button type="button" data-r="edit" style="min-height:56px;border-radius:14px;border:1px solid #3a4152;background:#151a22;color:#fff;font:600 16px system-ui">' + T('✏️ Edytuj', '✏️ Edit') + '</button>' +
          '<button type="button" data-r="ok" style="min-height:56px;border-radius:14px;border:0;background:linear-gradient(90deg,#5b7cff,#a35bff);color:#fff;font:700 16px system-ui">✓ OK</button></div>';
        var img = box.querySelector('img'), msg = box.querySelector('.oest-review-msg'), busy = false;
        function show() { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(cur); img.src = url; if (opts && typeof opts.prepare === 'function') try { opts.prepare(cur); } catch (_) {} }
        function close(r) { if (url) URL.revokeObjectURL(url); box.remove(); done(r); }
        box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-r]'); if (!b || busy) return;
          var r = b.getAttribute('data-r');
          if (r === 'ok') close({ blob: cur });
          else if (r === 'retake') close({ retake: true });
          else { busy = true; msg.textContent = ''; api.edit(cur, opts).then(function (nb) { if (nb) { cur = nb; show(); } msg.textContent = nb ? T('Zapisano zmiany.', 'Changes saved.') : ''; }, function (e) { msg.textContent = e.message; }).then(function () { busy = false; }); }
        });
        show(); document.body.appendChild(box);
      });
    },
    button: function (label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn oest-edit'; b.textContent = label || T('✏️ Edytuj', '✏️ Edit'); return b; }
  };
  root.OESTAparat = api;
})(typeof window !== 'undefined' ? window : globalThis);
