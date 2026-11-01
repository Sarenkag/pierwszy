/* Moduł aparatu (moduly/aparat) – JEDYNE miejsce, przez które apki OEST robią zdjęcia.
 *
 * Zdjęcie: aparat systemowy (wtyczka OESTKeys.capture) → podgląd „✓ OK / ✏️ Edytuj / ↺ Powtórz” →
 * gotowe zdjęcie. Edycja: własny prosty edytor w apce (strzałka, kółko, kwadrat, linia, kolor, grubość,
 * kadrowanie, cofnij). Decyzja Grzegorza 01/11/2026: edytory Google nie otwierają plików z wnętrza apki
 * („Editing is not supported for this image”), więc nie używamy OESTPhotoEdit. Działa offline, nic nie trafia do Galerii.
 *
 *   OESTAparat.take()  → Promise<Blob|null>   zdjęcie po podglądzie (null = anulowane)
 *   OESTAparat.available()           → true w apce Android
 *   OESTAparat.edit(blob) → Promise<Blob|null>   (null = bez zmian / anulowane)
 *   OESTAparat.review(blob) → Promise<{blob}|{retake:true}>  podgląd po zdjęciu: OK / Edytuj / Powtórz
 *   OESTAparat.button(label?)        → gotowy <button> „✏️ Edytuj” do wstawienia pod zdjęciem
 */
(function (root) {
  'use strict';
  function plugin() { var C = root.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.OESTPhotoEdit; }
  /* ---------- edytor w apce ---------- */
  var COLORS = ['#ff2d2d', '#ffd400', '#21d36b', '#2f8bff', '#ffffff', '#111111'];
  var WIDTHS = [{ k: 'S', v: 4 }, { k: 'M', v: 8 }, { k: 'L', v: 14 }]; // na 1000 px dłuższego boku
  var TOOLS = [['arrow', '↗', 'Strzałka'], ['circle', '◯', 'Kółko'], ['rect', '▢', 'Kwadrat'], ['line', '／', 'Linia'], ['crop', '⛶', 'Kadruj']];

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
  /* Gotowe zdjęcie w pełnej rozdzielczości: zdjęcie + kształty, potem kadr. */
  function renderFinal(bmp, shapes, crop) {
    var W = bmp.width, H = bmp.height, full = document.createElement('canvas'); full.width = W; full.height = H;
    var g = full.getContext('2d'); g.drawImage(bmp, 0, 0); shapes.forEach(function (sh) { drawShape(g, sh, 1); });
    var c = normCrop(crop, W, H), out = full;
    if (c) { out = document.createElement('canvas'); out.width = Math.round(c.w); out.height = Math.round(c.h); out.getContext('2d').drawImage(full, c.x, c.y, c.w, c.h, 0, 0, out.width, out.height); }
    return new Promise(function (ok) { out.toBlob(ok, 'image/jpeg', 0.9); });
  }

  function editor(blob) {
    return createImageBitmap(blob, { imageOrientation: 'from-image' }).catch(function () { return createImageBitmap(blob); }).then(function (bmp) {
      return new Promise(function (done) {
        var W = bmp.width, H = bmp.height, unit = Math.max(W, H) / 1000;
        var st = { tool: 'arrow', color: COLORS[0], width: WIDTHS[1].v }, shapes = [], crop = null, cur = null;
        var btn = 'min-height:44px;min-width:44px;border-radius:12px;border:1px solid #3a4152;background:#151a22;color:#fff;font:600 15px system-ui;padding:0 10px';
        var box = document.createElement('div'); box.className = 'oest-editor';
        box.setAttribute('style', 'position:fixed;inset:0;z-index:2147483001;background:#05070c;display:flex;flex-direction:column;touch-action:none;user-select:none');
        box.innerHTML =
          '<div style="display:flex;gap:8px;padding:10px 12px calc(6px);align-items:center"><button type="button" data-a="cancel" style="' + btn + '">✕ Anuluj</button><span style="flex:1"></span>' +
          '<button type="button" data-a="undo" style="' + btn + '">↶ Cofnij</button><button type="button" data-a="save" style="' + btn + ';border:0;background:linear-gradient(90deg,#5b7cff,#a35bff);font-weight:700">✓ Zapisz</button></div>' +
          '<div class="ed-stage" style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:6px"><canvas style="touch-action:none;max-width:100%;max-height:100%"></canvas></div>' +
          '<div style="display:flex;gap:8px;padding:6px 12px;overflow-x:auto">' + TOOLS.map(function (t) { return '<button type="button" data-t="' + t[0] + '" aria-label="' + t[2] + '" style="' + btn + '">' + t[1] + ' <small>' + t[2] + '</small></button>'; }).join('') + '</div>' +
          '<div style="display:flex;gap:6px;padding:6px 12px calc(14px + env(safe-area-inset-bottom));align-items:center;flex-wrap:wrap;justify-content:center">' +
          COLORS.map(function (c) { return '<button type="button" data-c="' + c + '" aria-label="Kolor" style="flex:none;width:32px;height:32px;border-radius:50%;border:3px solid #3a4152;background:' + c + '"></button>'; }).join('') +
          '<span style="width:8px"></span>' + WIDTHS.map(function (w) { return '<button type="button" data-w="' + w.v + '" style="' + btn + ';flex:none">' + w.k + '</button>'; }).join('') + '</div>';
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
        function mark() {
          box.querySelectorAll('[data-t]').forEach(function (b) { b.style.background = b.getAttribute('data-t') === st.tool ? '#3b4ad8' : '#151a22'; });
          box.querySelectorAll('[data-c]').forEach(function (b) { b.style.borderColor = b.getAttribute('data-c') === st.color ? '#fff' : '#3a4152'; });
          box.querySelectorAll('[data-w]').forEach(function (b) { b.style.background = +b.getAttribute('data-w') === st.width ? '#3b4ad8' : '#151a22'; });
        }
        function pt(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
        cv.addEventListener('pointerdown', function (e) { e.preventDefault(); cv.setPointerCapture(e.pointerId); var p = pt(e); cur = { t: st.tool, c: st.color, w: st.width * unit, x1: p.x, y1: p.y, x2: p.x, y2: p.y }; draw(); });
        cv.addEventListener('pointermove', function (e) { if (!cur) return; var p = pt(e); cur.x2 = p.x; cur.y2 = p.y; draw(); });
        function end() {
          if (!cur) return;
          var big = Math.hypot(cur.x2 - cur.x1, cur.y2 - cur.y1) > 10 * unit;
          if (cur.t === 'crop') { if (normCrop(cur, W, H)) { crop = cur; shapes.push({ t: 'crop-mark', prev: shapes.length }); } }
          else if (big) shapes.push(cur);
          cur = null; draw();
        }
        cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', function () { cur = null; draw(); });
        function realShapes() { return shapes.filter(function (s) { return s.t !== 'crop-mark'; }); }
        function close(r) { window.removeEventListener('resize', fit); box.remove(); if (bmp.close) bmp.close(); done(r); }
        box.addEventListener('click', function (e) {
          var b = e.target.closest('button'); if (!b) return;
          if (b.hasAttribute('data-t')) st.tool = b.getAttribute('data-t');
          else if (b.hasAttribute('data-c')) st.color = b.getAttribute('data-c');
          else if (b.hasAttribute('data-w')) st.width = +b.getAttribute('data-w');
          else if (b.getAttribute('data-a') === 'undo') {
            var last = shapes.pop();
            if (last && last.t === 'crop-mark') { // cofnięcie kadru: poprzedni kadr albo brak
              var prev = null; for (var i = shapes.length - 1; i >= 0; i--) if (shapes[i].t === 'crop-mark') { prev = shapes[i].crop; break; }
              crop = prev;
            }
            draw();
          } else if (b.getAttribute('data-a') === 'cancel') return close(null);
          else if (b.getAttribute('data-a') === 'save') {
            if (!realShapes().length && !normCrop(crop, W, H)) return close(null);
            b.disabled = true; b.textContent = 'Zapisuję…';
            return renderFinal(bmp, realShapes(), crop).then(function (out) { close(out || null); }, function () { close(null); });
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
    edit: function (blob) { return editor(blob); },
    _drawShape: drawShape, _normCrop: normCrop,
    take: function () {
      var C = root.Capacitor, cam = C && C.Plugins && C.Plugins.OESTKeys;
      if (!api.available() || !cam) return Promise.reject(new Error('Aparat działa w aplikacji na telefonie.'));
      function shot() {
        return cam.capture().then(function (r) {
          return fetch(C.convertFileSrc(r.path)).then(function (res) { if (!res.ok) throw new Error('Nie udało się odczytać zdjęcia.'); return res.blob(); })
            .then(function (b) { return cam.release({ path: r.path }).catch(function () {}).then(function () { return b; }); },
              function (e) { return cam.release({ path: r.path }).catch(function () {}).then(function () { throw e; }); });
        }, function (e) { if (/CANCELLED/.test(String(e && e.message || e))) return null; throw e; });
      }
      function loop() { return shot().then(function (b) { if (!b) return null; return api.review(b).then(function (r) { return r.retake ? loop() : r.blob; }); }); }
      return loop();
    },
    /* Podgląd po zdjęciu: duże zdjęcie + „✓ OK”, „✏️ Edytuj”, „↺ Powtórz”.
       review(blob) → Promise<{blob}|{retake:true}>; Edytuj otwiera edytor z telefonu i wraca do podglądu. */
    review: function (blob) {
      return new Promise(function (done) {
        var cur = blob, url = '', box = document.createElement('div');
        box.className = 'oest-review';
        box.setAttribute('style', 'position:fixed;inset:0;z-index:2147483000;background:#05070c;display:flex;flex-direction:column');
        box.innerHTML = '<div style="flex:1;min-height:0;display:flex;align-items:center;justify-content:center;padding:8px"><img alt="Podgląd zdjęcia" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px"></div>' +
          '<p class="oest-review-msg" role="status" style="margin:0;padding:0 16px;color:#f3c76b;font:500 14px system-ui;min-height:18px"></p>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;padding:12px 16px calc(16px + env(safe-area-inset-bottom))">' +
          '<button type="button" data-r="retake" style="min-height:56px;border-radius:14px;border:1px solid #3a4152;background:#151a22;color:#fff;font:600 16px system-ui">↺ Powtórz</button>' +
          '<button type="button" data-r="edit" style="min-height:56px;border-radius:14px;border:1px solid #3a4152;background:#151a22;color:#fff;font:600 16px system-ui">✏️ Edytuj</button>' +
          '<button type="button" data-r="ok" style="min-height:56px;border-radius:14px;border:0;background:linear-gradient(90deg,#5b7cff,#a35bff);color:#fff;font:700 16px system-ui">✓ OK</button></div>';
        var img = box.querySelector('img'), msg = box.querySelector('.oest-review-msg'), busy = false;
        function show() { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(cur); img.src = url; }
        function close(r) { if (url) URL.revokeObjectURL(url); box.remove(); done(r); }
        box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-r]'); if (!b || busy) return;
          var r = b.getAttribute('data-r');
          if (r === 'ok') close({ blob: cur });
          else if (r === 'retake') close({ retake: true });
          else { busy = true; msg.textContent = ''; api.edit(cur).then(function (nb) { if (nb) { cur = nb; show(); } msg.textContent = nb ? 'Zapisano zmiany.' : ''; }, function (e) { msg.textContent = e.message; }).then(function () { busy = false; }); }
        });
        show(); document.body.appendChild(box);
      });
    },
    button: function (label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn oest-edit'; b.textContent = label || '✏️ Edytuj'; return b; }
  };
  root.OESTAparat = api;
})(typeof window !== 'undefined' ? window : globalThis);
