/* Moduł edycji zdjęć (moduly/edytor) – wielokrotnego użytku.
 *
 * Nie ma własnego edytora: otwiera gotowy edytor z telefonu (Markup albo Google Zdjęcia: kadrowanie,
 * strzałki, rysik, tekst, zakreślacz) przez natywną wtyczkę OESTPhotoEdit, a poprawione zdjęcie oddaje apce.
 *
 *   OESTEdytor.available()           → true w apce Android
 *   OESTEdytor.edit(blob) → Promise<Blob|null>   (null = bez zmian / anulowane)
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
    button: function (label) { var b = document.createElement('button'); b.type = 'button'; b.className = 'btn oest-edit'; b.textContent = label || '✏️ Edytuj'; return b; }
  };
  root.OESTEdytor = api;
})(typeof window !== 'undefined' ? window : globalThis);
