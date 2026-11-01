/* Moduł edycji zdjęć (moduly/edytor) – wielokrotnego użytku.
 *
 * Nie ma własnego edytora: otwiera gotowy edytor z telefonu (Markup albo Google Zdjęcia: kadrowanie,
 * strzałki, rysik, tekst, zakreślacz) przez natywną wtyczkę OESTPhotoEdit, a poprawione zdjęcie oddaje apce.
 *
 *   OESTEdytor.available()           → true w apce Android
 *   OESTEdytor.edit(blob) → Promise<Blob|null>   (null = bez zmian / anulowane)
 *   OESTEdytor.review(blob) → Promise<{blob}|{retake:true}>  podgląd po zdjęciu: OK / Edytuj / Powtórz
 *   OESTEdytor.button(label?)        → gotowy <button> „✏️ Edytuj” do wstawienia pod zdjęciem
 */
(function (root) {
  'use strict';
  function plugin() { var C = root.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.OESTPhotoEdit; }
  function toB64(blob) { return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(',')[1]); }; r.onerror = function () { bad(r.error); }; r.readAsDataURL(blob); }); }
  function fromB64(b64, type) { var s = atob(b64), a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return new Blob([a], { type: type || 'image/jpeg' }); }
  function jpeg(blob) {
    if (blob.type === 'image/jpeg') return Promise.resolve(blob);
    return createImageBitmap(blob).then(function (bmp) { var c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); return new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', 0.92); }); });
  }
  var api = {
    available: function () { return !!plugin(); },
    edit: function (blob) {
      var p = plugin(); if (!p) return Promise.reject(new Error('Edycja zdjęć działa w aplikacji na telefonie.'));
      return jpeg(blob).then(toB64).then(function (b64) { return p.edit({ base64: b64 }); }).then(function (r) {
        return r && r.changed && r.base64 ? fromB64(r.base64, 'image/jpeg') : null;
      }, function (e) {
        var m = String(e && e.message || e);
        if (/NO_EDITOR/.test(m)) throw new Error('Na telefonie nie ma edytora zdjęć (Markup / Google Zdjęcia).');
        throw new Error('Edycja nie powiodła się: ' + m);
      });
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
        if (!api.available()) box.querySelector('[data-r=edit]').disabled = true;
        box.addEventListener('click', function (e) {
          var b = e.target.closest('[data-r]'); if (!b || busy) return;
          var r = b.getAttribute('data-r');
          if (r === 'ok') close({ blob: cur });
          else if (r === 'retake') close({ retake: true });
          else { busy = true; msg.textContent = 'Otwieram edytor…'; api.edit(cur).then(function (nb) { if (nb) { cur = nb; show(); } msg.textContent = nb ? 'Zapisano zmiany.' : ''; }, function (e) { msg.textContent = e.message; }).then(function () { busy = false; }); }
        });
        show(); document.body.appendChild(box);
      });
    },
    button: function (label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn oest-edit'; b.textContent = label || '✏️ Edytuj'; return b; }
  };
  root.OESTEdytor = api;
})(typeof window !== 'undefined' ? window : globalThis);
